import os

os.environ["PROXIMA_STORAGE_BACKEND"] = "local"

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health_and_core_discovery() -> None:
    assert client.get("/api/v1/health").status_code == 200
    assert len(client.get("/api/v1/tools").json()["items"]) == 8
    assert client.get("/api/v1/metrics").status_code == 200


def test_local_frontend_cors_preflight_is_allowed() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3000"


def test_any_local_development_port_can_send_cors_preflight() -> None:
    response = client.options(
        "/api/v1/health",
        headers={
            "Origin": "http://localhost:3002",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:3002"


def test_social_draft_and_approval_workflow() -> None:
    response = client.post("/api/v1/social/draft", json={"goal":"Launch v2", "platforms":["twitter", "linkedin"]})
    assert response.status_code == 200
    assert set(response.json()["drafts"]) == {"twitter", "linkedin"}
    workflow = client.post("/api/v1/deploy", json={"goalText":"Launch v2 on Twitter and LinkedIn"})
    assert workflow.status_code == 201


def test_approval_endpoint_advances_its_social_task() -> None:
    workflow = client.post("/api/v1/deploy", json={"goalText": "Launch v2 on Twitter"}).json()
    gate = next(task for task in workflow["tasks"] if task["id"] == "approval-twitter")
    response = client.post(f"/api/v1/approvals/{workflow['id']}:{gate['id']}/approve")
    assert response.status_code == 200
    updated = response.json()
    assert next(task for task in updated["tasks"] if task["id"] == "approval-twitter")["status"] == "done"
    assert next(task for task in updated["tasks"] if task["id"] == "twitter")["status"] == "done"
    assert updated["status"] == "waiting_approval"


def test_intent_endpoint_accepts_the_goal_payload_used_by_the_dashboard() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Launch v2 on Twitter"})
    assert response.status_code == 200
    assert response.json()["requiresApproval"] is True


def test_intent_preview_uses_human_readable_steps_for_research() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Research competitor pricing and create a report"})
    assert response.status_code == 200
    assert [task["title"] for task in response.json()["tasks"]] == [
        "Set the research focus",
        "Review credible competitor information",
        "Create a clear comparison report",
    ]
