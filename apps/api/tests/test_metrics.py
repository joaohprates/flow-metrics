from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.metrics import calculate_metrics


def test_calculate_metrics_from_transition_history() -> None:
    now = datetime.now(timezone.utc)
    card_id = uuid4()
    cards = [
        {
            "id": card_id,
            "title": "Metricas",
            "owner": "Joao",
            "card_type": "Feature",
            "priority": "Alta",
            "column_id": "done",
            "created_at": now - timedelta(days=6),
            "updated_at": now - timedelta(days=1),
        }
    ]
    transitions = [
        {"card_id": card_id, "to_column": "backlog", "moved_at": now - timedelta(days=6)},
        {"card_id": card_id, "to_column": "doing", "moved_at": now - timedelta(days=4)},
        {"card_id": card_id, "to_column": "done", "moved_at": now - timedelta(days=1)},
    ]

    result = calculate_metrics(cards, transitions)

    assert result["lead_time_days"] == 5
    assert result["cycle_time_days"] == 3
    assert result["throughput_7d"] == 1
