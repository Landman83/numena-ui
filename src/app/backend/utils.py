from datetime import datetime, timedelta
from typing import Dict, Optional, Any, Union
from jose import jwt, JWTError
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import base64
import os
import re
from fastapi import HTTPException, status
import json
from pydantic import BaseModel, EmailStr

# Security Constants
JWT_SECRET_KEY = "your-secret-key-here"  # Move to environment variables
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_MINUTES = 30
ENCRYPTION_KEY = Fernet.generate_key()  # Store securely in production
fernet = Fernet(ENCRYPTION_KEY)

class AuthError(Exception):
    """Custom authentication error"""
    def __init__(self, message: str, status_code: int = 401):
        self.message = message
        self.status_code = status_code

class ValidationError(Exception):
    """Custom validation error"""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field

# JWT Token Functions
def create_jwt_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=JWT_EXPIRATION_MINUTES)
    
    to_encode.update({"exp": expire})
    try:
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    except JWTError as e:
        raise AuthError(f"Could not create token: {str(e)}")

def verify_jwt_token(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        if datetime.fromtimestamp(payload["exp"]) < datetime.utcnow():
            raise AuthError("Token has expired")
        return payload
    except JWTError:
        raise AuthError("Invalid token")

# Wallet Encryption Functions
def derive_key(password: str, salt: Optional[bytes] = None) -> tuple[bytes, bytes]:
    """Derive an encryption key from a password"""
    if salt is None:
        salt = os.urandom(16)
    
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    key = base64.urlsafe_b64encode(kdf.derive(password.encode()))
    return key, salt

def encrypt_private_key(private_key: str, password: str) -> Dict[str, str]:
    """Encrypt a wallet private key"""
    try:
        key, salt = derive_key(password)
        f = Fernet(key)
        encrypted_data = f.encrypt(private_key.encode())
        return {
            "encrypted_key": base64.b64encode(encrypted_data).decode(),
            "salt": base64.b64encode(salt).decode()
        }
    except Exception as e:
        raise SecurityError(f"Encryption failed: {str(e)}")

def decrypt_private_key(encrypted_data: str, password: str, salt: str) -> str:
    """Decrypt a wallet private key"""
    try:
        salt = base64.b64decode(salt)
        key, _ = derive_key(password, salt)
        f = Fernet(key)
        decrypted_data = f.decrypt(base64.b64decode(encrypted_data))
        return decrypted_data.decode()
    except Exception as e:
        raise SecurityError(f"Decryption failed: {str(e)}")

# Input Validation Functions
class InputValidator:
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    @staticmethod
    def validate_password(password: str) -> tuple[bool, str]:
        """Validate password strength"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        if not re.search(r'[A-Z]', password):
            return False, "Password must contain at least one uppercase letter"
        if not re.search(r'[a-z]', password):
            return False, "Password must contain at least one lowercase letter"
        if not re.search(r'\d', password):
            return False, "Password must contain at least one number"
        if not re.search(r'[@$!%*?&]', password):
            return False, "Password must contain at least one special character"
        return True, "Password is valid"

    @staticmethod
    def validate_ethereum_address(address: str) -> bool:
        """Validate Ethereum address format"""
        return bool(re.match(r'^0x[a-fA-F0-9]{40}$', address))

# Response Formatting
class ResponseFormatter:
    @staticmethod
    def success_response(data: Any = None, message: str = "Success") -> Dict:
        """Format successful response"""
        return {
            "status": "success",
            "message": message,
            "data": data
        }

    @staticmethod
    def error_response(message: str, error_code: int = 400) -> Dict:
        """Format error response"""
        return {
            "status": "error",
            "message": message,
            "error_code": error_code
        }

# Error Handling
def handle_exceptions(func):
    """Decorator for handling exceptions"""
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except AuthError as e:
            raise HTTPException(
                status_code=e.status_code,
                detail=e.message
            )
        except ValidationError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"message": e.message, "field": e.field}
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )
    return wrapper

# Date/Time Helpers
class DateTimeHelper:
    @staticmethod
    def utc_now() -> datetime:
        """Get current UTC datetime"""
        return datetime.utcnow()

    @staticmethod
    def format_timestamp(dt: datetime) -> str:
        """Format datetime to ISO string"""
        return dt.isoformat()

    @staticmethod
    def parse_timestamp(timestamp: str) -> datetime:
        """Parse ISO timestamp string to datetime"""
        return datetime.fromisoformat(timestamp)

# Security Utilities
class SecurityUtils:
    @staticmethod
    def generate_random_string(length: int = 32) -> str:
        """Generate a random string"""
        return base64.urlsafe_b64encode(os.urandom(length)).decode()[:length]

    @staticmethod
    def sanitize_input(input_string: str) -> str:
        """Sanitize user input"""
        # Remove common XSS patterns
        input_string = re.sub(r'<[^>]*>', '', input_string)
        # Remove null bytes
        input_string = input_string.replace('\x00', '')
        return input_string

class SecurityError(Exception):
    """Custom security error"""
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
