from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Department
from app.db.session import get_db
from app.schemas.department import DepartmentOut

router = APIRouter(prefix="/departments", tags=["departments"])


@router.get("", response_model=list[DepartmentOut])
def list_departments(db: Session = Depends(get_db)) -> list[Department]:
    return list(db.scalars(select(Department).order_by(Department.name)).all())
