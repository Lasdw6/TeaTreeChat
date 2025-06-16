from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ...models.user import User
from ...core.database import get_db
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from fastapi.security import OAuth2PasswordBearer
from fastapi import Security
from datetime import datetime
from ...models.chat import Chat, MessageDB
from cryptography.fernet import Fernet
import os

router = APIRouter()

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    api_key: str | None = None

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

SECRET_KEY = "your-secret-key"  # Change this in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Fernet key for encryption (should be set in environment securely)
FERNET_KEY = os.environ.get("FERNET_KEY")
if not FERNET_KEY:
    raise RuntimeError("FERNET_KEY environment variable not set!")
fernet = Fernet(FERNET_KEY)

def encrypt_api_key(api_key: str) -> str:
    return fernet.encrypt(api_key.encode()).decode()

def decrypt_api_key(encrypted_key: str) -> str:
    return fernet.decrypt(encrypted_key.encode()).decode()

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/user/login")

def get_current_user(token: str = Security(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    api_key: str | None = None

class Token(BaseModel):
    access_token: str
    token_type: str

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    encrypted_api_key = encrypt_api_key(user.api_key) if user.api_key else None
    new_user = User(name=user.name, email=user.email, hashed_password=hashed_password, api_key=encrypted_api_key)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Create default welcome chat
    welcome_chat = Chat(
        title="Welcome!",
        user_id=new_user.id,
        model_used="gpt-3.5-turbo"
    )
    db.add(welcome_chat)
    db.commit()
    db.refresh(welcome_chat)

    # Add user message
    user_msg = MessageDB(
        chat_id=welcome_chat.id,
        role="user",
        content="What is TeaTree Chat?",
        model="gpt-3.5-turbo"
    )
    db.add(user_msg)
    db.commit()

    # Add assistant message
    assistant_msg = MessageDB(
        chat_id=welcome_chat.id,
        role="assistant",
        content=(
            "**🌳 Welcome to TeaTree Chat! 🌳**\n\n"
            "TeaTree Chat is a T3chat clone made as part of the Cloneathon. \n It works on a BYOK (Bring Your Own Key) basis using OpenRouter.\n\n"
            "To get started, go to **Settings** and set your OpenRouter API key.\n\n"
            "✨ _More features coming soon: web search, chat search, and more!_ ✨"
        ),
        model="gpt-3.5-turbo"
    )
    db.add(assistant_msg)
    db.commit()

    return UserResponse(id=new_user.id, name=new_user.name, email=new_user.email, api_key=None)

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return UserResponse(id=current_user.id, name=current_user.name, email=current_user.email, api_key=None)

@router.delete("/me")
def delete_user_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"detail": "Account deleted"}

class ApiKeyUpdate(BaseModel):
    api_key: str

@router.put("/me/api_key", response_model=UserResponse)
def update_api_key(update: ApiKeyUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    current_user.api_key = encrypt_api_key(update.api_key)
    db.commit()
    db.refresh(current_user)
    return UserResponse(id=current_user.id, name=current_user.name, email=current_user.email, api_key=None) 