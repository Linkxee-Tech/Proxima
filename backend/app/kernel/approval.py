from datetime import datetime, timedelta, timezone


def defer(gate: dict, hours: int = 24) -> dict:
    gate["status"]="deferred"; gate["reviewAt"]=(datetime.now(timezone.utc)+timedelta(hours=hours)).isoformat(); return gate


def approve(gate: dict) -> dict:
    gate["status"]="done"; return gate
