import os
import atexit
import shutil
import tempfile
from uuid import uuid4

os.environ["PROXIMA_STORAGE_BACKEND"] = "local"
os.environ["OPENAI_API_KEY"] = ""
TEST_DATA_DIR = tempfile.mkdtemp(prefix="proxima-test-")
os.environ["PROXIMA_DATA_DIR"] = TEST_DATA_DIR
atexit.register(shutil.rmtree, TEST_DATA_DIR, ignore_errors=True)

from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def headers() -> dict[str, str]:
    response = client.post(
        "/api/v1/auth/register",
        json={"email": f"test-{uuid4()}@example.com", "password": "test-password-123"},
    )
    assert response.status_code == 201
    return {"Authorization": f"Bearer {response.json()['token']}"}


def test_health_and_core_discovery() -> None:
    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/health").status_code == 200
    tools = client.get("/api/v1/tools", headers=headers()).json()["items"]
    assert len(tools) == 8
    assert next(item for item in tools if item["name"] == "whatsapp")["connectionRequired"] is False
    assert client.get("/api/v1/metrics", headers=headers()).status_code == 200


def test_root_swagger_aliases_reach_the_api_schema() -> None:
    docs = client.get("/docs", follow_redirects=True)
    schema = client.get("/openapi.json", follow_redirects=True)
    assert docs.status_code == 200
    assert "Swagger UI" in docs.text
    assert schema.status_code == 200
    assert "/health" in schema.json()["paths"]


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
    auth = headers()
    response = client.post("/api/v1/social/draft", json={"goal":"Launch v2", "platforms":["twitter", "linkedin"]}, headers=auth)
    assert response.status_code == 200
    assert set(response.json()["drafts"]) == {"twitter", "linkedin"}
    workflow = client.post("/api/v1/deploy", json={"goalText":"Launch v2 on Twitter and LinkedIn"}, headers=auth)
    assert workflow.status_code == 201


def test_approval_endpoint_advances_its_social_task() -> None:
    auth = headers()
    workflow = client.post("/api/v1/deploy", json={"goalText": "Launch v2 on Twitter"}, headers=auth).json()
    gate = next(task for task in workflow["tasks"] if task["id"] == "approval-twitter")
    response = client.post(f"/api/v1/approvals/{workflow['id']}:{gate['id']}/approve", headers=auth)
    assert response.status_code == 200
    updated = response.json()
    assert next(task for task in updated["tasks"] if task["id"] == "approval-twitter")["status"] == "done"
    assert next(task for task in updated["tasks"] if task["id"] == "twitter")["status"] == "done"
    assert updated["status"] == "waiting_approval"


def test_intent_endpoint_accepts_the_goal_payload_used_by_the_dashboard() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Launch v2 on Twitter"}, headers=headers())
    assert response.status_code == 200
    assert response.json()["requiresApproval"] is True


def test_intent_preview_uses_human_readable_steps_for_research() -> None:
    response = client.post("/api/v1/intent", json={"goalText": "Research competitor pricing and create a report"}, headers=headers())
    assert response.status_code == 200
    assert [task["title"] for task in response.json()["tasks"]] == [
        "Set the research focus",
        "Review credible competitor information",
        "Create a clear comparison report",
    ]


def test_artifact_download_and_prometheus_metrics_are_available() -> None:
    auth = headers()
    workflow = client.post("/api/v1/workflows", json={"goalText": "Create a launch brief"}, headers=auth).json()
    artifact = workflow["artifacts"][0]
    response = client.get(f"/api/v1/workflows/{workflow['id']}/artifacts/{artifact['id']}/download", headers=auth)
    assert response.status_code == 200
    assert response.text == "Create a launch brief"
    assert client.get("/api/v1/metrics/prometheus").status_code == 200
