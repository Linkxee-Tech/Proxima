from dataclasses import dataclass
from urllib.parse import urlencode
from fastapi import HTTPException
from ..core.config import settings


def credential(name: str) -> str:
    """Read a configured credential without depending on dotenv mutating os.environ."""
    return str(getattr(settings, name.lower(), ""))


def populated(name: str) -> bool:
    value = credential(name).strip()
    return bool(value) and not value.lower().startswith(("your_", "replace_", "example_", "changeme"))


@dataclass(frozen=True)
class ToolDefinition:
    name: str
    label: str
    auth_url: str
    token_url: str
    scopes: tuple[str, ...]
    client_id_env: str
    client_secret_env: str = ""
    pkce: bool = False
    required_envs: tuple[str, ...] = ()
    oauth: bool = True

    def configured(self) -> bool:
        required = self.required_envs or (self.client_id_env, self.client_secret_env)
        return all(populated(name) for name in required if name)


TOOLS = {
    "gmail": ToolDefinition("gmail", "Gmail", "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token", ("https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.modify"), "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    "calendar": ToolDefinition("calendar", "Google Calendar", "https://accounts.google.com/o/oauth2/v2/auth", "https://oauth2.googleapis.com/token", ("https://www.googleapis.com/auth/calendar", "https://www.googleapis.com/auth/calendar.events"), "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"),
    "slack": ToolDefinition("slack", "Slack", "https://slack.com/oauth/v2/authorize", "https://slack.com/api/oauth.v2.access", ("chat:write", "channels:manage", "groups:read", "users:read", "incoming-webhook"), "SLACK_CLIENT_ID", "SLACK_CLIENT_SECRET"),
    "notion": ToolDefinition("notion", "Notion", "https://api.notion.com/v1/oauth/authorize", "https://api.notion.com/v1/oauth/token", ("read_content", "update_content", "insert_content"), "NOTION_CLIENT_ID", "NOTION_CLIENT_SECRET"),
    "twitter": ToolDefinition("twitter", "X / Twitter", "https://x.com/i/oauth2/authorize", "https://api.x.com/2/oauth2/token", ("tweet.read", "tweet.write", "users.read", "offline.access"), "TWITTER_CLIENT_ID", pkce=True),
    "linkedin": ToolDefinition("linkedin", "LinkedIn", "https://www.linkedin.com/oauth/v2/authorization", "https://www.linkedin.com/oauth/v2/accessToken", ("w_member_social", "r_liteprofile", "r_organization_social"), "LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"),
    "facebook": ToolDefinition("facebook", "Facebook Pages", "https://www.facebook.com/v22.0/dialog/oauth", "https://graph.facebook.com/v22.0/oauth/access_token", ("pages_manage_posts", "pages_read_engagement", "public_profile"), "FACEBOOK_APP_ID", "FACEBOOK_APP_SECRET"),
    "whatsapp": ToolDefinition("whatsapp", "WhatsApp Business", "", "", (), "WHATSAPP_ACCESS_TOKEN", required_envs=("WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"), oauth=False),
}


def definition(name: str) -> ToolDefinition:
    if name not in TOOLS:
        raise HTTPException(status_code=404, detail="Unknown tool.")
    return TOOLS[name]


def authorization_url(tool: ToolDefinition, state: str, verifier: str | None = None) -> str:
    if not tool.oauth:
        raise HTTPException(status_code=409, detail=f"{tool.label} uses server-side credentials and cannot be connected through OAuth.")
    params = {"response_type": "code", "client_id": credential(tool.client_id_env), "redirect_uri": f"{settings.proxima_public_api_url}/api/v1/tools/{tool.name}/callback", "scope": " ".join(tool.scopes), "state": state}
    if tool.name == "notion":
        params["owner"] = "user"
        params.pop("scope")
    if tool.pkce and verifier:
        import base64, hashlib
        params.update({"code_challenge": base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip("="), "code_challenge_method": "S256"})
    return f"{tool.auth_url}?{urlencode(params)}"
