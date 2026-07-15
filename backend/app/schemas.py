from pydantic import BaseModel, EmailStr, Field


class Credentials(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=256)


class GoalRequest(BaseModel):
    goalText: str = Field(min_length=1, max_length=20000)


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
    scheduled_for: str | None = None
