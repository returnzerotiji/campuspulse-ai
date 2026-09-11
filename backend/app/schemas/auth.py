import uuid

from pydantic import BaseModel, ConfigDict, Field


class LoginRequest(BaseModel):
    # Plain str, not EmailStr: this is an internal admin identifier, not an
    # address we send mail to, and EmailStr's deliverability check rejects
    # reserved-looking TLDs like the default admin's ".local" domain.
    email: str = Field(min_length=3, max_length=255)
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    department: str | None

    model_config = ConfigDict(from_attributes=True)
