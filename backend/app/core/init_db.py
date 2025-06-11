from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from ..models.user import User
from ..models.chat import Chat, MessageDB
from .database import SQLALCHEMY_DATABASE_URL
import asyncio

async def init_db():
    # Create async engine
    engine = create_async_engine(SQLALCHEMY_DATABASE_URL, echo=True)
    
    # Create all tables
    async with engine.begin() as conn:
        from ..models.user import Base
        await conn.run_sync(Base.metadata.create_all)
    
    # Create async session
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    # Add test user if it doesn't exist
    async with async_session() as session:
        result = await session.execute(
            "SELECT id FROM users WHERE id = 1"
        )
        user = result.scalar()
        
        if not user:
            test_user = User(
                id=1,
                name="John Doe",
                email="john.doe@example.com"
            )
            session.add(test_user)
            await session.commit()

if __name__ == "__main__":
    asyncio.run(init_db()) 