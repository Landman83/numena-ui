from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from eth_account import Account
import secrets
from auth import auth_handler, AuthError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import (
    Base, 
    User,
    get_user_by_email,
    get_user_by_username,
    create_user,
    get_identity_by_user_id,
    Wallet
)
from utils import (
    handle_exceptions,
    InputValidator,
    ResponseFormatter,
    create_jwt_token,
    encrypt_private_key,
    ValidationError,
    decrypt_private_key
)

# Update database URL with the password you set
SQLALCHEMY_DATABASE_URL = "postgresql://numena_user@localhost/numena"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create all tables
print("\n=== Database Initialization ===")
try:
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully")
    # List all tables
    print("Available tables:", Base.metadata.tables.keys())
except Exception as e:
    print(f"Database initialization error: {e}")

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Initialize FastAPI app
app = FastAPI(title="Numena Trading Protocol API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configurations
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# Pydantic models
class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "username": "username",
                "password": "password123"
            }
        }

class User(UserBase):
    id: int
    wallet_address: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str):
    return pwd_context.hash(password)

def generate_ethereum_wallet():
    # Generate a new Ethereum account
    private_key = "0x" + secrets.token_hex(32)
    account = Account.from_key(private_key)
    return {
        "address": account.address,
        "private_key": private_key  # In production, encrypt this before storing
    }

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
        return {"username": username}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# Move process_registration function before the endpoints
async def process_registration(user_data: UserCreate, db = Depends(get_db)):
    return await auth_handler.register_user(
        email=user_data.email,
        username=user_data.username,
        password=user_data.password,
        db=db
    )

# Then your endpoints
@app.post("/api/auth/register")
async def register(user_data: UserCreate, db: SessionLocal = Depends(get_db)):
    try:
        print("\n=== Registration Request ===")
        print(f"Received data: {jsonable_encoder(user_data, exclude={'password'})}")
        print(f"Password length: {len(user_data.password)}")
        
        # Check if user exists
        existing_email = get_user_by_email(db, user_data.email)
        existing_username = get_user_by_username(db, user_data.username)
        
        if existing_email:
            print(f"Email already exists: {user_data.email}")
            return JSONResponse(
                status_code=400,
                content={"detail": "Email already registered"}
            )
            
        if existing_username:
            print(f"Username already exists: {user_data.username}")
            return JSONResponse(
                status_code=400,
                content={"detail": "Username already registered"}
            )
        
        # Process registration
        result = await auth_handler.register_user(
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            db=db
        )
        
        return JSONResponse(
            status_code=201,
            content={
                "message": "Registration successful",
                "data": jsonable_encoder(result)
            }
        )
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        print(f"Error type: {type(e)}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")
        return JSONResponse(
            status_code=400,
            content={"detail": str(e)}
        )

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: SessionLocal = Depends(get_db)):
    print("\n=== Login Attempt ===")
    print(f"Username: {form_data.username}")
    print(f"Password provided: {'yes' if form_data.password else 'no'}")
    
    try:
        result = await auth_handler.login_user(
            username=form_data.username,
            password=form_data.password,
            db=db
        )
        print("Login successful")
        return result
    except AuthError as e:
        print(f"Login error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )

@app.get("/api/user/me")
async def get_user_profile(
    current_user: dict = Depends(get_current_user),
    db: SessionLocal = Depends(get_db)
):
    try:
        print("\n=== Fetching User Profile ===")
        print(f"Username: {current_user['username']}")
        
        user = get_user_by_username(db, current_user['username'])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
            
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "wallet_address": user.wallet_address,
            "created_at": user.created_at,
            "last_login": user.last_login
        }
    except Exception as e:
        print(f"Error fetching user profile: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.get("/api/identity/{user_id}")
async def get_user_identity(
    user_id: int,
    db: SessionLocal = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    identity = get_identity_by_user_id(db, user_id)
    if not identity:
        raise HTTPException(
            status_code=404,
            detail="Identity not found"
        )
    return identity

@app.post("/api/identity/verify")
async def verify_identity(
    identity_address: str,
    db: SessionLocal = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    # Here you would add verification logic for the identity
    pass

@app.get("/api/user/private-key")
async def get_private_key(current_user: dict = Depends(get_current_user), db: SessionLocal = Depends(get_db)):
    try:
        user = get_user_by_username(db, current_user['username'])
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        wallet = db.query(Wallet).filter(Wallet.user_id == user.id).first()
        if not wallet:
            raise HTTPException(status_code=404, detail="Wallet not found")
            
        # Decrypt the private key
        private_key = decrypt_private_key(wallet.encrypted_private_key)
        
        return {"private_key": private_key}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {
        "status_code": exc.status_code,
        "detail": exc.detail
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
