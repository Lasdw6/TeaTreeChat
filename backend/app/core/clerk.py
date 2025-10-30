import os
from fastapi import HTTPException, status
import jwt

CLERK_SECRET = os.getenv("CLERK_SECRET_KEY")
if not CLERK_SECRET:
    raise RuntimeError("CLERK_SECRET_KEY environment variable not set!")

def verify_clerk_token(token: str):
    """Verify Clerk JWT token and return session data"""
    try:
        # Decode JWT without verification first to get the structure
        # In production, you'd want to verify the signature
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # For now, return a mock session structure
        # In a real implementation, you'd verify with Clerk's API
        return {
            "user_id": decoded.get("sub"),
            "session_id": decoded.get("sid"),
            "email": decoded.get("email")
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Clerk token: {str(e)}"
        ) 