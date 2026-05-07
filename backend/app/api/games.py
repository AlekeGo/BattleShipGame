import asyncio
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.repositories.analyses import AnalysesRepo
from app.db.repositories.games import GamesRepo
from app.deps import get_analyses_repo, get_auth_user, get_games_repo
from app.engine.bots.hunt_bot import HuntBot
from app.engine.bots.prob_bot import ProbBot
from app.engine.bots.random_bot import RandomBot
from app.engine.board import Board
from app.engine.fleet import FLEET_SPEC, Ship, auto_place, validate_fleet
from app.schemas.game import (
    AutoPlaceResponse,
    GameCreate,
    GameCreated,
    GameState,
    PlacementRequest,
)
from app.schemas.shot import BotMove, Coord, ShotRequest, ShotResult

router = APIRouter()

# Holds references to background analysis tasks so they aren't GC'd before completion.
_bg_tasks: set = set()


def _fire_analysis(game_id: str, games_repo: GamesRepo, analyses_repo: AnalysesRepo) -> None:
    """Start coach analysis as a background task (fire-and-forget)."""
    from app.api.analyze import _run_analysis  # local import avoids circular at module load

    task = asyncio.create_task(_run_analysis(game_id, games_repo, analyses_repo))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


def _ship_to_dict(ship: Ship) -> dict:
    return {
        "name": ship.name,
        "size": ship.size,
        "row": ship.row,
        "col": ship.col,
        "orientation": ship.orientation,
        "hits": [],
    }


def _fresh_board(ship_dicts: list[dict]) -> Board:
    """Create a board with ships but no hits (for replaying shots from move log)."""
    board = Board()
    for d in ship_dicts:
        board.place_ship(Ship(d["name"], d["size"], d["row"], d["col"], d["orientation"]))
    return board


def _get_bot(mode: str):
    if mode == "pvbot_easy":
        return RandomBot()
    if mode == "pvbot_medium":
        return HuntBot()
    return ProbBot()


def _parse_board(raw) -> dict:
    return raw if isinstance(raw, dict) else json.loads(raw)


def _parse_moves(raw) -> list:
    return raw if isinstance(raw, list) else json.loads(raw)


def _build_bot_state(moves: list, player_ships: list[dict]) -> dict:
    """Build state dict for bot.choose_shot from the game's move log."""
    bot_moves = [m for m in moves if m["by"] == "bot"]
    shots = [m["coord"] for m in bot_moves]
    hits = [m["coord"] for m in bot_moves if m["result"] in ("hit", "sunk")]

    # Reconstruct which player ships are sunk by replaying bot shots
    player_board = _fresh_board(player_ships)
    for m in bot_moves:
        player_board.receive_shot(m["coord"][0], m["coord"][1])

    sunk_cells = []
    remaining = []
    for ship in player_board.ships:
        if ship.is_sunk():
            sunk_cells.extend([list(c) for c in ship.cells()])
        else:
            remaining.append(ship.size)

    return {
        "shots": shots,
        "hits": hits,
        "sunk_cells": sunk_cells,
        "remaining_ships": remaining,
    }


@router.post("", response_model=GameCreated)
async def create_game(
    payload: GameCreate,
    repo: GamesRepo = Depends(get_games_repo),
    _auth_user=Depends(get_auth_user),
):
    bot_ships = [_ship_to_dict(s) for s in auto_place()]
    game = await repo.create(payload.user_id, payload.mode, bot_ships)
    fleet = [{"name": name, "size": size} for name, size in FLEET_SPEC]
    return GameCreated(game_id=game["id"], fleet=fleet)


@router.post("/{game_id}/place")
async def place_ships(
    game_id: str,
    payload: PlacementRequest,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "placing":
        raise HTTPException(400, "Ships already placed")

    ships = [Ship(s.name, s.size, s.row, s.col, s.orientation) for s in payload.ships]
    try:
        validate_fleet(ships)
    except ValueError as e:
        raise HTTPException(422, str(e))

    player_board = {"ships": [_ship_to_dict(s) for s in ships], "shots_received": []}
    await repo.update_state(game_id, player_board=player_board, status="active")
    return {"ok": True}


@router.post("/{game_id}/place-auto", response_model=AutoPlaceResponse)
async def place_auto(
    game_id: str,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "placing":
        raise HTTPException(400, "Ships already placed")

    ships = auto_place()
    player_board = {"ships": [_ship_to_dict(s) for s in ships], "shots_received": []}
    await repo.update_state(game_id, player_board=player_board, status="active")
    return AutoPlaceResponse(ships=[_ship_to_dict(s) for s in ships])


@router.post("/{game_id}/shoot", response_model=ShotResult)
async def shoot(
    game_id: str,
    payload: ShotRequest,
    repo: GamesRepo = Depends(get_games_repo),
    analyses_repo: AnalysesRepo = Depends(get_analyses_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")
    if game["status"] != "active":
        raise HTTPException(400, f"Game is not active (status: {game['status']})")

    row, col = payload.coord.row, payload.coord.col
    bot_board_data = _parse_board(game["bot_board"])
    player_board_data = _parse_board(game["player_board"])
    moves = _parse_moves(game["moves"])

    # Check duplicate shot
    player_shot_coords = {(m["coord"][0], m["coord"][1]) for m in moves if m["by"] == "player"}
    if (row, col) in player_shot_coords:
        raise HTTPException(400, "Cell already shot")

    # Replay all previous player shots on a fresh bot board, then apply new shot
    bot_board = _fresh_board(bot_board_data["ships"])
    for m in moves:
        if m["by"] == "player":
            bot_board.receive_shot(m["coord"][0], m["coord"][1])
    p_result, p_ship = bot_board.receive_shot(row, col)
    p_sunk_name = p_ship.name if p_result == "sunk" else None

    # Sync hits back to bot_board_data so GET /game reflects them
    for ship_dict in bot_board_data["ships"]:
        for s in bot_board.ships:
            if s.name == ship_dict["name"]:
                ship_dict["hits"] = [list(h) for h in s.hits]

    player_move = {
        "turn": len(moves),
        "by": "player",
        "coord": [row, col],
        "result": p_result,
        "sunk_ship": p_sunk_name,
        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    moves.append(player_move)

    if bot_board.is_lost():
        await repo.update_state(
            game_id,
            bot_board=bot_board_data,
            moves=moves,
            status="finished",
            winner="player",
            ended_at=datetime.now(timezone.utc).isoformat(),
        )
        _fire_analysis(game_id, repo, analyses_repo)
        return ShotResult(result=p_result, sunk_ship=p_sunk_name, game_over=True, winner="player")

    # Hot-seat: no bot counter-move
    if game["mode"] == "hotseat":
        await repo.update_state(game_id, bot_board=bot_board_data, moves=moves)
        return ShotResult(result=p_result, sunk_ship=p_sunk_name, game_over=False)

    # Bot's turn
    bot = _get_bot(game["mode"])
    bot_state = _build_bot_state(moves, player_board_data["ships"])
    br, bc = bot.choose_shot(bot_state)

    # Replay all previous bot shots on a fresh player board, then apply bot's new shot
    player_board = _fresh_board(player_board_data["ships"])
    for m in moves:
        if m["by"] == "bot":
            player_board.receive_shot(m["coord"][0], m["coord"][1])
    b_result, b_ship = player_board.receive_shot(br, bc)
    b_sunk_name = b_ship.name if b_result == "sunk" else None

    # Sync hits back to player_board_data
    for ship_dict in player_board_data["ships"]:
        for s in player_board.ships:
            if s.name == ship_dict["name"]:
                ship_dict["hits"] = [list(h) for h in s.hits]

    bot_move_record = {
        "turn": len(moves),
        "by": "bot",
        "coord": [br, bc],
        "result": b_result,
        "sunk_ship": b_sunk_name,
        "ts": int(datetime.now(timezone.utc).timestamp() * 1000),
    }
    moves.append(bot_move_record)

    game_over = player_board.is_lost()
    winner = "bot" if game_over else None
    new_status = "finished" if game_over else "active"
    update = {
        "bot_board": bot_board_data,
        "player_board": player_board_data,
        "moves": moves,
        "status": new_status,
    }
    if game_over:
        update["winner"] = winner
        update["ended_at"] = datetime.now(timezone.utc).isoformat()
    await repo.update_state(game_id, **update)

    if game_over:
        _fire_analysis(game_id, repo, analyses_repo)

    return ShotResult(
        result=p_result,
        sunk_ship=p_sunk_name,
        bot_move=BotMove(coord=Coord(row=br, col=bc), result=b_result, sunk_ship=b_sunk_name),
        game_over=game_over,
        winner=winner,
    )


@router.get("/{game_id}", response_model=GameState)
async def get_game(
    game_id: str,
    repo: GamesRepo = Depends(get_games_repo),
):
    game = await repo.get(game_id)
    if not game:
        raise HTTPException(404, "Game not found")

    player_board_data = _parse_board(game["player_board"])
    moves = _parse_moves(game["moves"])

    my_shots = [
        {"coord": m["coord"], "result": m["result"], "sunk_ship": m.get("sunk_ship")}
        for m in moves if m["by"] == "player"
    ]
    shots_received = [
        {"coord": m["coord"], "result": m["result"], "sunk_ship": m.get("sunk_ship")}
        for m in moves if m["by"] == "bot"
    ]

    return GameState(
        game_id=game["id"],
        status=game["status"],
        player_ships=player_board_data.get("ships", []),
        player_shots_received=shots_received,
        my_shots=my_shots,
        winner=game.get("winner"),
    )
