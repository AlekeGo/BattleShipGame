from app.engine.bots.base import Bot


class ProbBot(Bot):
    """
    Probability density bot (DataGenetics):
      - For each cell, count placements of remaining ships consistent with
        known hits/misses/sinks.
      - In hunt phase, restrict to parity cells. Targeting phase: orthogonal
        neighbors of unresolved hits.
    """

    def choose_shot(self, state: dict) -> tuple[int, int]:
        raise NotImplementedError
