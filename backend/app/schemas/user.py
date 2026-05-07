from pydantic import BaseModel


class UserCreated(BaseModel):
    user_id: str


class RegionUpdate(BaseModel):
    region: str


class ProfileUpdate(BaseModel):
    display_name: str | None = None
    region: str | None = None


class UserResponse(BaseModel):
    id: str
    display_name: str | None
    region: str | None
    email: str | None
