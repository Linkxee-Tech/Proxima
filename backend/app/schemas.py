from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class Credentials(BaseModel):
    email: EmailStr
    # Keep login compatible with existing accounts that may have longer passwords.
    password: str = Field(min_length=6, max_length=256)


class RegistrationCredentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=8)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=20, max_length=512)
    password: str = Field(min_length=6, max_length=8)


class PreparedWorkRequest(BaseModel):
    title: str = Field(min_length=1, max_length=180)
    type: str = Field(default="general", max_length=50)
    content: str = Field(min_length=1, max_length=12000)


class GoalRequest(BaseModel):
    goalText: str = Field(min_length=1, max_length=20000)
    # The reviewed draft is sent back when a user starts or saves the plan, so the
    # workflow keeps the same content they saw in the preview.
    preparedWork: PreparedWorkRequest | None = None


class MemoryRequest(BaseModel):
    text: str = Field(min_length=1, max_length=20000)


class ApprovalRequest(BaseModel):
    all: bool = False


class SocialDraftRequest(BaseModel):
    goal: str = Field(min_length=1, max_length=12000)
    platforms: list[str] = Field(default_factory=lambda: ["twitter", "linkedin", "facebook", "whatsapp"])
    generate_image: bool = False
    image_prompt: str | None = Field(default=None, max_length=4000)


class SocialPublishRequest(BaseModel):
    content: dict[str, str]
    platforms: list[str]
    image_id: str | None = None
    image_url: str | None = None
    scheduled_for: datetime | None = None
    schedule_timezone: str = Field(default="UTC", max_length=100)
    whatsapp_recipient: str | None = Field(default=None, max_length=32)
