from ..core.store import store


class DatabaseClient:
    """Small repository boundary so Supabase/Postgres can replace local storage without route changes."""
    def transaction(self): return store.lock

db = DatabaseClient()
