import json


def parse_json_field(raw) -> list | dict:
    return raw if isinstance(raw, (list, dict)) else json.loads(raw)
