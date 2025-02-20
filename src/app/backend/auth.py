from datetime import datetime, timedelta
from typing import Optional, Dict
from passlib.context import CryptContext
from jose import jwt
from eth_account import Account
import secrets
from pydantic import BaseModel, EmailStr
from fastapi import HTTPException, status
from models import (
    User, 
    get_user_by_email, 
    get_user_by_username,
    create_user
)

# Security configurations
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "your-secret-key-here"  # Move to environment variable in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

class AuthError(Exception):
    """Custom exception for authentication errors"""
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code

class WalletGenerator:
    @staticmethod
    def generate_wallet() -> Dict[str, str]:
        """Generate a new Ethereum wallet"""
        private_key = "0x" + secrets.token_hex(32)
        account = Account.from_key(private_key)
        return {
            "address": account.address,
            "private_key": private_key
        }

class PasswordHandler:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash a password using bcrypt"""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash"""
        return pwd_context.verify(plain_password, hashed_password)

class TokenHandler:
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a new JWT token"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class AuthHandler:
    def __init__(self):
        self.wallet_generator = WalletGenerator()
        self.password_handler = PasswordHandler()
        self.token_handler = TokenHandler()

    async def register_user(self, email: str, username: str, password: str, db) -> Dict:
        # Check if user exists (remove await)
        if get_user_by_email(db, email) or get_user_by_username(db, username):
            raise AuthError("Username or email already registered")

        # Generate wallet
        wallet = self.wallet_generator.generate_wallet()
        
        # Create user
        user = create_user(
            db,
            email=email,
            username=username,
            password=password,
            wallet_address=wallet["address"]
        )
        
        # Print account details for testing
        print("\n=== New Account Created ===")
        print(f"Email: {email}")
        print(f"Username: {username}")
        print(f"Wallet Address: {wallet['address']}")
        print(f"Private Key: {wallet['private_key']}")  # Remove in production
        print(f"Created at: {user.created_at}")
        print("========================\n")
        
        return {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "wallet_address": user.wallet_address,
            "created_at": user.created_at
        }

    async def login_user(self, username: str, password: str, db) -> Dict:
        """Authenticate a user and return a token"""
        # Get user synchronously
        user = get_user_by_username(db, username)
        if not user:
            raise AuthError("Invalid username or password")

        # Verify password
        if not user.verify_password(password):
            raise AuthError("Invalid username or password")

        # Update last login
        user.update_last_login()
        db.commit()
        
        # Create access token
        access_token = self.token_handler.create_access_token(
            data={"sub": username}
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "email": user.email
            }
        }

    async def get_user_by_username(self, username: str) -> Optional[Dict]:
        """Retrieve user by username"""
        user = self._mock_db.get(username)
        if not user:
            return None
            
        return {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "wallet_address": user["wallet_address"],
            "created_at": user["created_at"],
            "last_login": user["last_login"]
        }

    async def validate_token(self, token: str) -> Dict:
        """Validate a JWT token and return user data"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username = payload.get("sub")
            if not username:
                raise AuthError(
                    detail="Invalid token",
                    status_code=status.HTTP_401_UNAUTHORIZED
                )
            return await self.get_user_by_username(username)
        except jwt.JWTError:
            raise AuthError(
                detail="Invalid token",
                status_code=status.HTTP_401_UNAUTHORIZED
            )

# Create a global instance of AuthHandler
auth_handler = AuthHandler()
