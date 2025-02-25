import asyncio
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from auth import auth_handler
import logging
import random
import string
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database configuration
SQLALCHEMY_DATABASE_URL = "postgresql://numena_user:numena123@localhost/numena"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def generate_random_user():
    """Generate random user data"""
    # Start with a letter (a-z)
    first_letter = random.choice(string.ascii_lowercase)
    # Add 7 more random characters (letters and numbers only)
    random_string = first_letter + ''.join(random.choices(
        string.ascii_lowercase + string.digits, 
        k=7
    ))
    timestamp = int(time.time())
    
    return {
        "email": f"{random_string}_{timestamp}@test.com",
        "username": random_string,  # Username without timestamp to keep it shorter
        "password": "Test123!@#"  # Keep password simple for testing
    }

async def test_user_registration():
    """Test the registration process for multiple users"""
    db = SessionLocal()
    
    try:
        logger.info("Starting registration tests...")
        
        # Generate and test 3 random users
        for _ in range(3):
            user_data = generate_random_user()
            try:
                logger.info(f"\nTesting registration for user: {user_data['username']}")
                
                # Register user
                result = await auth_handler.register_user(
                    email=user_data["email"],
                    username=user_data["username"],
                    password=user_data["password"],
                    db=db
                )
                
                # Verify the result contains expected data
                assert result["email"] == user_data["email"], "Email mismatch"
                assert result["username"] == user_data["username"], "Username mismatch"
                assert "wallet_address" in result, "No wallet address generated"
                assert "identity_address" in result, "No identity address generated"
                
                logger.info(f"✓ Successfully registered user: {user_data['username']}")
                logger.info(f"  Wallet Address: {result['wallet_address']}")
                logger.info(f"  Identity Address: {result['identity_address']}")
                
            except Exception as e:
                logger.error(f"❌ Failed to register user {user_data['username']}: {str(e)}")
                continue
            
            # Optional: Test login
            try:
                login_result = await auth_handler.login_user(
                    username=user_data["username"],
                    password=user_data["password"],
                    db=db
                )
                logger.info(f"✓ Successfully logged in user: {user_data['username']}")
                
            except Exception as e:
                logger.error(f"❌ Failed to login user {user_data['username']}: {str(e)}")
    
    except Exception as e:
        logger.error(f"Test suite error: {str(e)}")
    
    finally:
        db.close()

if __name__ == "__main__":
    # Create tables if they don't exist
    logger.info("Initializing database...")
    Base.metadata.create_all(bind=engine)
    
    # Run the tests
    logger.info("Running tests...")
    asyncio.run(test_user_registration()) 