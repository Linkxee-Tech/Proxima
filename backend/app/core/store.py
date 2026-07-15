import json
import ssl
from pathlib import Path
from threading import RLock
from urllib.parse import unquote, urlparse
from uuid import uuid4

from .config import settings


def empty_state() -> dict:
    return {"users": [], "workflows": [], "memories": [], "audit": []}


class Store:
    """Durable application state with local JSON and Supabase Postgres adapters."""

    def __init__(self) -> None:
        self.path = Path(settings.proxima_data_dir) / "state.json"
        self.lock = RLock()
        self.connection = None
        if settings.proxima_storage_backend == "postgres":
            self._connect_postgres()
        self.data = self._load()

    def _connect_postgres(self) -> None:
        if not settings.proxima_database_url:
            raise RuntimeError("PROXIMA_DATABASE_URL is required when PROXIMA_STORAGE_BACKEND=postgres.")
        try:
            import pg8000.dbapi
        except ImportError as error:
            raise RuntimeError("Install backend requirements to enable PostgreSQL storage.") from error

        parsed = urlparse(settings.proxima_database_url)
        if not parsed.hostname or not parsed.username or not parsed.path:
            raise RuntimeError("PROXIMA_DATABASE_URL must be a valid PostgreSQL connection URI.")
        self.connection = pg8000.dbapi.connect(
            user=unquote(parsed.username),
            password=unquote(parsed.password or ""),
            host=parsed.hostname,
            port=parsed.port or 5432,
            database=parsed.path.lstrip("/"),
            ssl_context=ssl.create_default_context(),
        )
        self.connection.autocommit = True
        with self.connection.cursor() as cursor:
            cursor.execute(
                "CREATE TABLE IF NOT EXISTS proxima_state (id SMALLINT PRIMARY KEY, state JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())"
            )

    def _load(self) -> dict:
        if self.connection:
            with self.connection.cursor() as cursor:
                cursor.execute("SELECT state FROM proxima_state WHERE id = 1")
                row = cursor.fetchone()
            state = row[0] if row else {}
            if isinstance(state, str):
                state = json.loads(state)
            return {**empty_state(), **state}
        try:
            with self.path.open("r", encoding="utf-8") as file:
                return {**empty_state(), **json.load(file)}
        except FileNotFoundError:
            return empty_state()

    def save(self) -> None:
        with self.lock:
            if self.connection:
                with self.connection.cursor() as cursor:
                    cursor.execute(
                        "INSERT INTO proxima_state (id, state, updated_at) VALUES (1, %s, NOW()) ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, updated_at = NOW()",
                        (json.dumps(self.data),),
                    )
                return
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix(".tmp")
            temporary.write_text(json.dumps(self.data, indent=2), encoding="utf-8")
            temporary.replace(self.path)

    def id(self) -> str:
        return str(uuid4())


store = Store()
