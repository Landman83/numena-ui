from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship, validates
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import re
from passlib.context import CryptContext
from typing import Optional

Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, nullable=False, index=True)
    username = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=False)
    wallet_address = Column(String, unique=True, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)
    identity_address = Column(String, unique=True, nullable=True, index=True)
    identity_created_at = Column(DateTime(timezone=True), nullable=True)

    # Relationship to future Wallet model
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    identity = relationship("Identity", back_populates="user", uselist=False)

    @validates('email')
    def validate_email(self, key, email: str) -> str:
        if not email:
            raise ValueError("Email is required")
        
        # Basic email validation pattern
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            raise ValueError("Invalid email format")
        
        return email.lower()

    @validates('username')
    def validate_username(self, key, username: Optional[str]) -> Optional[str]:
        if username:
            # Username requirements:
            # - 3-20 characters
            # - alphanumeric and underscore only
            # - must start with a letter
            if not re.match(r'^[a-zA-Z][a-zA-Z0-9_]{2,19}$', username):
                raise ValueError(
                    "Username must be 3-20 characters, start with a letter, "
                    "and contain only letters, numbers, and underscores"
                )
            return username.lower()
        return username

    @validates('wallet_address')
    def validate_wallet_address(self, key, address: str) -> str:
        # Basic Ethereum address validation
        if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
            raise ValueError("Invalid Ethereum wallet address format")
        return address.lower()

    @validates('identity_address')
    def validate_identity_address(self, key, address: str) -> Optional[str]:
        """Validate the format of an Ethereum identity contract address"""
        if address is None:
            return None
            
        # Basic Ethereum address validation
        if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
            raise ValueError("Invalid Ethereum identity address format")
        return address.lower()

    def set_password(self, password: str) -> None:
        """Hash and set the user's password"""
        # Password requirements:
        # - At least 8 characters
        # - At least one uppercase letter
        # - At least one lowercase letter
        # - At least one number
        # - At least one special character
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        
        if not any(c.isupper() for c in password):
            raise ValueError("Password must contain at least one uppercase letter")
        
        if not any(c.islower() for c in password):
            raise ValueError("Password must contain at least one lowercase letter")
        
        if not any(c.isdigit() for c in password):
            raise ValueError("Password must contain at least one number")
        
        if not any(c in '!@#$%^&*(),.?":{}|<>' for c in password):
            raise ValueError("Password must contain at least one special character")
        
        self.password_hash = pwd_context.hash(password)

    def verify_password(self, password: str) -> bool:
        """Verify the user's password"""
        return pwd_context.verify(password, self.password_hash)

    def update_last_login(self) -> None:
        """Update the user's last login timestamp"""
        self.last_login = datetime.utcnow()

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, unique=True, nullable=False, index=True)
    encrypted_private_key = Column(String, nullable=False)  # Store encrypted, never raw
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_used = Column(DateTime(timezone=True), nullable=True)

    # Relationship to User model
    user = relationship("User", back_populates="wallet")

    @validates('address')
    def validate_address(self, key, address: str) -> str:
        # Basic Ethereum address validation
        if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
            raise ValueError("Invalid Ethereum wallet address format")
        return address.lower()

    def update_last_used(self) -> None:
        """Update the wallet's last used timestamp"""
        self.last_used = datetime.utcnow()

class Identity(Base):
    """Model to store additional identity-related information"""
    __tablename__ = "identities"

    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    symbol = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_updated = Column(DateTime(timezone=True), nullable=True)

    # Relationship to User model
    user = relationship("User", back_populates="identity")

    @validates('address')
    def validate_address(self, key, address: str) -> str:
        if not re.match(r'^0x[a-fA-F0-9]{40}$', address):
            raise ValueError("Invalid Ethereum identity address format")
        return address.lower()

    def update_last_updated(self) -> None:
        """Update the last_updated timestamp"""
        self.last_updated = datetime.utcnow()

# Helper functions for database operations
def create_user(
    db_session,
    email: str,
    username: str,
    password: str,
    wallet_address: str
) -> User:
    """Create a new user with associated wallet"""
    user = User(
        email=email,
        username=username,
        wallet_address=wallet_address
    )
    user.set_password(password)
    
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    
    return user

def get_user_by_email(db_session, email: str):
    """Get user by email"""
    return db_session.query(User).filter(User.email == email).first()

def get_user_by_username(db_session, username: str):
    """Get user by username"""
    return db_session.query(User).filter(User.username == username).first()

def get_user_by_wallet(db_session, wallet_address: str) -> Optional[User]:
    """Get a user by wallet address"""
    return db_session.query(User).filter(
        User.wallet_address == wallet_address.lower()
    ).first()

def create_identity(
    db_session,
    user_id: int,
    address: str,
    name: str,
    symbol: str
) -> Identity:
    """Create a new identity record"""
    identity = Identity(
        user_id=user_id,
        address=address,
        name=name,
        symbol=symbol
    )
    
    # Update the associated user's identity_address
    user = db_session.query(User).filter(User.id == user_id).first()
    if user:
        user.identity_address = address
        user.identity_created_at = datetime.utcnow()
    
    db_session.add(identity)
    db_session.commit()
    db_session.refresh(identity)
    
    return identity

def get_identity_by_address(db_session, address: str) -> Optional[Identity]:
    """Get identity by contract address"""
    return db_session.query(Identity).filter(
        Identity.address == address.lower()
    ).first()

def get_identity_by_user_id(db_session, user_id: int) -> Optional[Identity]:
    """Get identity by user ID"""
    return db_session.query(Identity).filter(
        Identity.user_id == user_id
    ).first()
