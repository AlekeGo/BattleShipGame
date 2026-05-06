from pydantic import BaseModel


class UserCreated(BaseModel):
    user_id: str


class RegionUpdate(BaseModel):
    region: str
