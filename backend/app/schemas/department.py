import uuid

from pydantic import BaseModel, ConfigDict


class DepartmentOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None

    model_config = ConfigDict(from_attributes=True)
