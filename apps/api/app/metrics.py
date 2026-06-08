from datetime import datetime, timezone
from typing import Any

COLUMN_NAMES = {
    "backlog": "Backlog",
    "todo": "A fazer",
    "doing": "Em progresso",
    "review": "Revisao",
    "done": "Concluido",
}

ACTIVE_COLUMNS = ["backlog", "todo", "doing", "review"]


def days_between(start: datetime, end: datetime) -> float:
    return max(0.0, (end - start).total_seconds() / 86_400)


def average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 2)


def calculate_metrics(cards: list[dict[str, Any]], transitions: list[dict[str, Any]]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    events_by_card: dict[str, list[dict[str, Any]]] = {}
    for event in transitions:
        events_by_card.setdefault(str(event["card_id"]), []).append(event)

    for events in events_by_card.values():
        events.sort(key=lambda item: item["moved_at"])

    lead_times: list[float] = []
    cycle_times: list[float] = []
    throughput_7d = 0

    for card in cards:
        card_events = events_by_card.get(str(card["id"]), [])
        done_event = first_to(card_events, "done")
        doing_event = first_to(card_events, "doing")

        if done_event:
            lead_times.append(days_between(card["created_at"], done_event["moved_at"]))
            if days_between(done_event["moved_at"], now) <= 7:
                throughput_7d += 1
        if done_event and doing_event:
            cycle_times.append(days_between(doing_event["moved_at"], done_event["moved_at"]))

    column_metrics = []
    for column_id, column_name in COLUMN_NAMES.items():
        durations: list[float] = []
        active_cards = 0
        for card in cards:
            card_events = events_by_card.get(str(card["id"]), [])
            durations.extend(durations_in_column(card_events, column_id, now))
            if card["column_id"] == column_id:
                active_cards += 1
        column_metrics.append(
            {
                "column_id": column_id,
                "column_name": column_name,
                "average_days": average(durations),
                "active_cards": active_cards,
            }
        )

    bottleneck_candidates = [item for item in column_metrics if item["column_id"] in ACTIVE_COLUMNS]
    bottleneck = max(bottleneck_candidates, key=lambda item: item["average_days"], default=None)

    return {
        "lead_time_days": average(lead_times),
        "cycle_time_days": average(cycle_times),
        "throughput_7d": throughput_7d,
        "bottleneck_column": bottleneck["column_name"] if bottleneck else "Sem dados",
        "bottleneck_days": bottleneck["average_days"] if bottleneck else 0.0,
        "column_metrics": column_metrics,
    }


def first_to(events: list[dict[str, Any]], column_id: str) -> dict[str, Any] | None:
    return next((event for event in events if event["to_column"] == column_id), None)


def durations_in_column(events: list[dict[str, Any]], column_id: str, now: datetime) -> list[float]:
    durations: list[float] = []
    for index, event in enumerate(events):
        if event["to_column"] != column_id:
            continue
        next_event = events[index + 1] if index + 1 < len(events) else None
        end = next_event["moved_at"] if next_event else now
        durations.append(days_between(event["moved_at"], end))
    return durations
