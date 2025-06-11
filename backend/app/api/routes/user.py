from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ...models.user import User
from ...core.database import get_db
from pydantic import BaseModel

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email
    ) 