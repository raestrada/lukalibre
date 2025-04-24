# LukaLibre - Technical Roadmap

## 🏗️ Architecture Overview

### Core Principles
- **Privacy First**: All sensitive data remains on client-side
- **Clean Architecture**: Separation of concerns with 3-layer design
- **Domain-Driven Design**: Focus on financial domain models
- **Incremental Development**: Building in small, testable iterations

### Backend Architecture
- **Framework**: FastAPI with async endpoints and dependency injection
- **Database**: 
  - PostgreSQL (main) for user auth, configuration, and non-sensitive data
  - Client-side SQLite SEE for encrypted personal financial data
- **ORM**: SQLAlchemy 2.0 with async support
  - Type-safe query building
  - Alembic migrations with versioning
- **Authentication**: 
  - OAuth2 with Google (required for Drive integration)
  - JWT for stateless session management
  - Strong password policies for local secrets
- **API Documentation**: OpenAPI/Swagger with security schemas
- **Testing**: 
  - pytest + pytest-asyncio for async testing
  - Factories for test data
  - Mocking for external dependencies
- **Dependency Management**: Poetry with lockfile
- **Logging**: Rich + structlog with contextual logging
- **Security**:
  - Rate limiting
  - Input validation
  - CORS policies
  - XSS protection

### Frontend Architecture
- **Framework**: Svelte + Vite
  - Component-based architecture
  - Reactive state management
  - Progressive Web App capabilities
- **State Management**: 
  - Svelte stores with derived states
  - Local storage integration
  - Persistent state management
- **UI Components**: 
  - Custom components with TailwindCSS
  - Accessibility-first design
  - Responsive mobile-first approach
- **Client-side Database**: 
  - SQLite SEE via wa-sqlite WebAssembly
  - Encrypted with user-provided key
  - Structured migrations
- **Encryption**: 
  - Web Crypto API for key derivation
  - End-to-end encryption
  - Zero-knowledge design
- **Backup**: 
  - Google Drive API for cloud backups
  - Local export/import functionality
  - Versioned backups
- **Build**: 
  - Vite with optimized bundling
  - PWA support for offline capabilities
  - Code splitting and lazy loading

## 🔄 Development Phases

### Phase 1: Core Backend Infrastructure

#### 1.1 Project Setup & Environment
```bash
lukalibre/
├── backend/
│   ├── alembic/              # Database migrations
│   │   ├── versions/         # Migration scripts
│   │   ├── env.py            # Alembic environment
│   │   └── script.py.mako    # Migration template
│   ├── app/
│   │   ├── api/              # API routes
│   │   │   ├── v1/           # API version 1
│   │   │   │   ├── auth.py   # Authentication endpoints
│   │   │   │   ├── users.py  # User management
│   │   │   │   └── config.py # Configuration endpoints
│   │   │   ├── deps.py       # Dependency injection
│   │   │   └── router.py     # Main router aggregation
│   │   ├── core/             # Core functionality
│   │   │   ├── config.py     # Configuration
│   │   │   ├── security.py   # Security utilities
│   │   │   └── logging.py    # Logging setup
│   │   ├── db/               # Database
│   │   │   ├── base.py       # Base models
│   │   │   └── session.py    # Session management
│   │   ├── models/           # SQLAlchemy models
│   │   ├── repositories/     # Data access layer
│   │   │   ├── base.py       # Base repository
│   │   │   └── user.py       # User repository
│   │   ├── schemas/          # Pydantic schemas
│   │   │   ├── base.py       # Base schemas
│   │   │   └── user.py       # User schemas
│   │   └── services/         # Business logic
│   │       ├── base.py       # Base service
│   │       └── user.py       # User service
│   ├── tests/                # Test suite
│   │   ├── conftest.py       # Test fixtures
│   │   ├── api/              # API tests
│   │   ├── repositories/     # Repository tests
│   │   └── services/         # Service tests
│   ├── alembic.ini           # Alembic configuration
│   ├── main.py               # App entrypoint
│   ├── pyproject.toml        # Dependencies and metadata
│   └── Dockerfile            # Container definition
```

#### 1.2 Database Setup & Models
```python
# app/db/base.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()
engine = create_async_engine(
    settings.DATABASE_URI,
    echo=settings.DEBUG,
    future=True  # Use SQLAlchemy 2.0 features
)
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Session dependency
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# app/models/user.py
from sqlalchemy import Column, String, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from uuid import uuid4
from datetime import datetime

from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_superuser = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    last_login = Column(DateTime, nullable=True)

    # Relationships will be defined here
```

#### 1.3 Repository Pattern Implementation
```python
# app/repositories/base.py
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, delete
from pydantic import BaseModel
from uuid import UUID

from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)

class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType], session: AsyncSession):
        self.model = model
        self.session = session

    async def get(self, id: UUID) -> Optional[ModelType]:
        result = await self.session.execute(
            select(self.model).where(self.model.id == id)
        )
        return result.scalars().first()

    async def get_all(self) -> List[ModelType]:
        result = await self.session.execute(select(self.model))
        return result.scalars().all()

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        obj_in_data = obj_in.dict()
        db_obj = self.model(**obj_in_data)
        self.session.add(db_obj)
        await self.session.commit()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(self, id: UUID, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> Optional[ModelType]:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)

        result = await self.session.execute(
            update(self.model)
            .where(self.model.id == id)
            .values(**update_data)
            .returning(self.model)
        )
        await self.session.commit()
        return result.scalars().first()

    async def delete(self, id: UUID) -> bool:
        result = await self.session.execute(
            delete(self.model).where(self.model.id == id)
        )
        await self.session.commit()
        return result.rowcount > 0

# app/repositories/user.py
from typing import Optional
from sqlalchemy.future import select
from uuid import UUID

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.repositories.base import BaseRepository

class UserRepository(BaseRepository[User, UserCreate, UserUpdate]):
    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalars().first()

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        result = await self.session.execute(
            select(User).where(User.google_id == google_id)
        )
        return result.scalars().first()
```

#### 1.4 Service Layer Implementation
```python
# app/services/base.py
from typing import Any, Dict, Generic, List, Optional, Type, TypeVar, Union
from pydantic import BaseModel
from uuid import UUID

from app.repositories.base import BaseRepository
from app.db.base import Base

ModelType = TypeVar("ModelType", bound=Base)
CreateSchemaType = TypeVar("CreateSchemaType", bound=BaseModel)
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=BaseModel)
RepositoryType = TypeVar("RepositoryType", bound=BaseRepository)

class BaseService(Generic[ModelType, CreateSchemaType, UpdateSchemaType, RepositoryType]):
    def __init__(self, repository: RepositoryType):
        self.repository = repository

    async def get(self, id: UUID) -> Optional[ModelType]:
        return await self.repository.get(id)

    async def get_all(self) -> List[ModelType]:
        return await self.repository.get_all()

    async def create(self, obj_in: CreateSchemaType) -> ModelType:
        return await self.repository.create(obj_in)

    async def update(self, id: UUID, obj_in: Union[UpdateSchemaType, Dict[str, Any]]) -> Optional[ModelType]:
        return await self.repository.update(id, obj_in)

    async def delete(self, id: UUID) -> bool:
        return await self.repository.delete(id)

# app/services/user.py
from typing import Optional
from uuid import UUID

from app.repositories.user import UserRepository
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.base import BaseService

class UserService(BaseService[User, UserCreate, UserUpdate, UserRepository]):
    async def get_by_email(self, email: str) -> Optional[User]:
        return await self.repository.get_by_email(email)

    async def get_by_google_id(self, google_id: str) -> Optional[User]:
        return await self.repository.get_by_google_id(google_id)
```

#### 1.5 API Routes Implementation
```python
# app/api/deps.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError
from typing import Generator, Optional

from app.core.config import settings
from app.core.security import verify_token
from app.db.session import get_db
from app.repositories.user import UserRepository
from app.services.user import UserService
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

async def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(User, db)

async def get_user_service(repo: UserRepository = Depends(get_user_repository)) -> UserService:
    return UserService(repo)

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    user_service: UserService = Depends(get_user_service)
) -> Optional[User]:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = verify_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = await user_service.get(UUID(user_id))
    if user is None:
        raise credentials_exception
        
    return user

# app/api/v1/users.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID

from app.api.deps import get_current_user, get_user_service
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, UserResponse
from app.services.user import UserService

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Retrieve all users. 
    Only accessible by superusers.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return await user_service.get_all()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    user_service: UserService = Depends(get_user_service)
):
    """
    Get a specific user by id.
    """
    # User can only access their own data unless they're an admin
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    
    user = await user_service.get(user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_in: UserCreate,
    user_service: UserService = Depends(get_user_service)
):
    """
    Create new user.
    """
    user = await user_service.get_by_email(email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists."
        )
    return await user_service.create(user_in)
```

### Phase 2: Authentication System

#### 2.1 OAuth2 Google Integration
```python
# app/core/security.py
from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from starlette.requests import Request
from jose import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import httpx

from app.core.config import settings

# OAuth setup
config = Config()
oauth = OAuth(config)

oauth.register(
    name="google",
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    client_kwargs={
        "scope": "openid email profile https://www.googleapis.com/auth/drive.file",
        "redirect_uri": settings.GOOGLE_REDIRECT_URI
    }
)

# JWT functionality
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        claims=to_encode,
        key=settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )
    
    return encoded_jwt

def verify_token(token: str) -> Dict[str, Any]:
    payload = jwt.decode(
        token=token,
        key=settings.SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM]
    )
    return payload

# Password handling
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)
```

#### 2.2 Authentication Endpoints
```python
# app/api/v1/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from uuid import uuid4

from app.core.config import settings
from app.core.security import create_access_token, oauth, verify_password
from app.schemas.auth import Token, GoogleAuthRequest
from app.services.user import UserService
from app.schemas.user import UserCreate, UserUpdate
from app.api.deps import get_user_service

router = APIRouter()

@router.post("/login", response_model=Token)
async def login_access_token(
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(get_user_service)
):
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = await user_service.get_by_email(email=form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Update last login time
    await user_service.update(user.id, {"last_login": datetime.utcnow()})
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"}, 
        expires_delta=refresh_token_expires
    )
    
    # Set refresh token as HTTP only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email
    }

@router.get("/google/authorize")
async def authorize_google(request: Request):
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback", response_model=Token)
async def google_callback(
    request: Request,
    response: Response,
    user_service: UserService = Depends(get_user_service)
):
    token = await oauth.google.authorize_access_token(request)
    user_info = token.get('userinfo')
    
    if not user_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not fetch user info from Google",
        )
    
    # Check if user exists
    user = await user_service.get_by_email(email=user_info['email'])
    
    # Create user if not exists
    if not user:
        user_data = UserCreate(
            email=user_info['email'],
            google_id=user_info['sub'],
            is_active=True,
            password=uuid4().hex  # Random password as it's not used for OAuth
        )
        user = await user_service.create(user_data)
    else:
        # Update Google ID if missing
        if not user.google_id:
            await user_service.update(
                user.id, 
                UserUpdate(google_id=user_info['sub'])
            )
    
    # Update last login time
    await user_service.update(user.id, {"last_login": datetime.utcnow()})
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email}, 
        expires_delta=access_token_expires
    )
    
    # Create refresh token
    refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    refresh_token = create_access_token(
        data={"sub": str(user.id), "type": "refresh"}, 
        expires_delta=refresh_token_expires
    )
    
    # Set refresh token as HTTP only cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT != "development",
        samesite="strict",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    
    # Store Google tokens for Drive API access
    await user_service.update(user.id, {
        "google_access_token": token.get('access_token'),
        "google_refresh_token": token.get('refresh_token', None)
    })
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user_id": str(user.id),
        "email": user.email
    }

@router.post("/refresh", response_model=Token)
async def refresh_token(
    request: Request,
    response: Response,
    user_service: UserService = Depends(get_user_service)
):
    """
    Refresh access token using refresh token cookie
    """
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        payload = verify_token(refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        user_id = payload.get("sub")
        user = await user_service.get(UUID(user_id))
        
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Inactive user or invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create new access token
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email}, 
            expires_delta=access_token_expires
        )
        
        # Create new refresh token (token rotation)
        refresh_token_expires = timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        new_refresh_token = create_access_token(
            data={"sub": str(user.id), "type": "refresh"}, 
            expires_delta=refresh_token_expires
        )
        
        # Set new refresh token as HTTP only cookie
        response.set_cookie(
            key="refresh_token",
            value=new_refresh_token,
            httponly=True,
            secure=settings.ENVIRONMENT != "development",
            samesite="strict",
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": str(user.id),
            "email": user.email
        }
    
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )
```

### Phase 3: Financial Core

#### 3.1 Financial Data Models
```python
# app/models/financial.py
from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey, Text, Enum, JSON
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from uuid import uuid4
from datetime import datetime
import enum

from app.db.base import Base

class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"
    saving = "saving"

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    type = Column(Enum(CategoryType), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="categories")
    transactions = relationship("Transaction", back_populates="category")
    
    __table_args__ = (
        # Composite unique constraint for user + category name
        UniqueConstraint('user_id', 'name', name='uq_user_category_name'),
    )

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    amount = Column(Numeric(15, 2), nullable=False)
    description = Column(String(500), nullable=True)
    date = Column(DateTime, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    metadata = Column(JSON, nullable=True)
    source = Column(String(100), nullable=True)  # Source of transaction (manual, import, etc)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="transactions")
    category = relationship("Category", back_populates="transactions")

class SavingGoal(Base):
    __tablename__ = "saving_goals"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    target_amount = Column(Numeric(15, 2), nullable=False)
    current_amount = Column(Numeric(15, 2), default=0, nullable=False)
    target_date = Column(DateTime, nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    priority = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="saving_goals")
    contributions = relationship("SavingContribution", back_populates="goal")

class SavingContribution(Base):
    __tablename__ = "saving_contributions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    amount = Column(Numeric(15, 2), nullable=False)
    date = Column(DateTime, nullable=False)
    description = Column(String(500), nullable=True)
    goal_id = Column(UUID(as_uuid=True), ForeignKey("saving_goals.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="contributions")
    goal = relationship("SavingGoal", back_populates="contributions")

# Update User model with relationships
class User(Base):
    # existing fields...
    
    # Relationships
    categories = relationship("Category", back_populates="user")
    transactions = relationship("Transaction", back_populates="user")
    saving_goals = relationship("SavingGoal", back_populates="user")
    contributions = relationship("SavingContribution", back_populates="user")
```

#### 3.2 Financial Repositories
```python
# app/repositories/financial.py
from typing import List, Optional
from sqlalchemy.future import select
from sqlalchemy import func, and_, extract
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal

from app.models.financial import Category, Transaction, SavingGoal, SavingContribution, CategoryType
from app.schemas.financial import (
    CategoryCreate, CategoryUpdate, 
    TransactionCreate, TransactionUpdate,
    SavingGoalCreate, SavingGoalUpdate
)
from app.repositories.base import BaseRepository

class CategoryRepository(BaseRepository[Category, CategoryCreate, CategoryUpdate]):
    async def get_by_user(self, user_id: UUID) -> List[Category]:
        result = await self.session.execute(
            select(Category).where(Category.user_id == user_id)
        )
        return result.scalars().all()
    
    async def get_by_type(self, user_id: UUID, type: CategoryType) -> List[Category]:
        result = await self.session.execute(
            select(Category).where(
                and_(
                    Category.user_id == user_id,
                    Category.type == type
                )
            )
        )
        return result.scalars().all()
    
    async def get_by_name(self, user_id: UUID, name: str) -> Optional[Category]:
        result = await self.session.execute(
            select(Category).where(
                and_(
                    Category.user_id == user_id,
                    Category.name == name
                )
            )
        )
        return result.scalars().first()

class TransactionRepository(BaseRepository[Transaction, TransactionCreate, TransactionUpdate]):
    async def get_by_user(self, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Transaction]:
        result = await self.session.execute(
            select(Transaction)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.date.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
    
    async def get_by_category(self, user_id: UUID, category_id: UUID) -> List[Transaction]:
        result = await self.session.execute(
            select(Transaction).where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.category_id == category_id
                )
            )
        )
        return result.scalars().all()
    
    async def get_total_by_category(self, user_id: UUID, start_date: date, end_date: date) -> List[dict]:
        result = await self.session.execute(
            select(
                Category.id, 
                Category.name, 
                Category.type,
                func.sum(Transaction.amount).label("total")
            )
            .join(Transaction.category)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.date >= start_date,
                    Transaction.date <= end_date
                )
            )
            .group_by(Category.id, Category.name, Category.type)
        )
        return [
            {
                "category_id": row[0],
                "category_name": row[1],
                "category_type": row[2],
                "total": row[3]
            }
            for row in result.all()
        ]
    
    async def get_monthly_summary(self, user_id: UUID, year: int) -> List[dict]:
        # Get monthly totals for income and expenses
        result = await self.session.execute(
            select(
                extract('month', Transaction.date).label("month"),
                Category.type,
                func.sum(Transaction.amount).label("total")
            )
            .join(Transaction.category)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    extract('year', Transaction.date) == year
                )
            )
            .group_by(extract('month', Transaction.date), Category.type)
            .order_by(extract('month', Transaction.date))
        )
        
        # Process into monthly summary
        monthly_data = {}
        for row in result.all():
            month, category_type, total = row
            month = int(month)
            
            if month not in monthly_data:
                monthly_data[month] = {
                    "income": Decimal("0"),
                    "expense": Decimal("0"),
                    "saving": Decimal("0"),
                    "net": Decimal("0")
                }
            
            monthly_data[month][category_type] = total
            
            # Calculate net (income - expense)
            if category_type in ["income", "expense"]:
                monthly_data[month]["net"] = (
                    monthly_data[month]["income"] - monthly_data[month]["expense"]
                )
        
        # Convert to list format
        return [
            {
                "month": month,
                "income": data["income"],
                "expense": data["expense"],
                "saving": data["saving"],
                "net": data["net"]
            }
            for month, data in monthly_data.items()
        ]

class SavingGoalRepository(BaseRepository[SavingGoal, SavingGoalCreate, SavingGoalUpdate]):
    async def get_by_user(self, user_id: UUID) -> List[SavingGoal]:
        result = await self.session.execute(
            select(SavingGoal)
            .where(SavingGoal.user_id == user_id)
            .order_by(SavingGoal.priority.desc())
        )
        return result.scalars().all()
    
    async def get_active(self, user_id: UUID) -> List[SavingGoal]:
        result = await self.session.execute(
            select(SavingGoal)
            .where(
                and_(
                    SavingGoal.user_id == user_id,
                    SavingGoal.is_active == True
                )
            )
            .order_by(SavingGoal.priority.desc())
        )
        return result.scalars().all()
```

#### 3.3 Financial Services
```python
# app/services/financial.py
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date, datetime
import calendar
from decimal import Decimal

from app.repositories.financial import CategoryRepository, TransactionRepository, SavingGoalRepository
from app.models.financial import Category, Transaction, SavingGoal, CategoryType
from app.schemas.financial import (
    CategoryCreate, CategoryUpdate, CategoryResponse, 
    TransactionCreate, TransactionUpdate, TransactionResponse,
    SavingGoalCreate, SavingGoalUpdate, SavingGoalResponse,
    MonthlySummary, CategoryTotals
)
from app.services.base import BaseService

class CategoryService(BaseService[Category, CategoryCreate, CategoryUpdate, CategoryRepository]):
    async def get_by_user(self, user_id: UUID) -> List[Category]:
        return await self.repository.get_by_user(user_id)
    
    async def get_by_type(self, user_id: UUID, type: CategoryType) -> List[Category]:
        return await self.repository.get_by_type(user_id, type)
    
    async def get_or_create(self, user_id: UUID, name: str, type: CategoryType) -> Category:
        # Try to find existing category
        category = await self.repository.get_by_name(user_id, name)
        
        # Create if not exists
        if not category:
            category_data = CategoryCreate(
                name=name,
                type=type,
                user_id=user_id
            )
            category = await self.repository.create(category_data)
        
        return category

class TransactionService(BaseService[Transaction, TransactionCreate, TransactionUpdate, TransactionRepository]):
    def __init__(
        self, 
        repository: TransactionRepository,
        category_service: CategoryService
    ):
        super().__init__(repository)
        self.category_service = category_service
    
    async def get_by_user(self, user_id: UUID, skip: int = 0, limit: int = 100) -> List[Transaction]:
        return await self.repository.get_by_user(user_id, skip, limit)
    
    async def get_by_category(self, user_id: UUID, category_id: UUID) -> List[Transaction]:
        return await self.repository.get_by_category(user_id, category_id)
    
    async def get_monthly_summary(self, user_id: UUID, year: int = None) -> List[MonthlySummary]:
        # Default to current year if not specified
        if year is None:
            year = datetime.now().year
        
        return await self.repository.get_monthly_summary(user_id, year)
    
    async def get_category_totals(
        self, 
        user_id: UUID, 
        start_date: date = None, 
        end_date: date = None
    ) -> List[CategoryTotals]:
        # Default to current month if dates not specified
        if start_date is None or end_date is None:
            today = datetime.now()
            start_date = date(today.year, today.month, 1)
            last_day = calendar.monthrange(today.year, today.month)[1]
            end_date = date(today.year, today.month, last_day)
        
        return await self.repository.get_total_by_category(user_id, start_date, end_date)
    
    async def create_with_category(
        self, 
        user_id: UUID, 
        data: TransactionCreate,
        category_name: str = None
    ) -> Transaction:
        # If category doesn't exist but name is provided, create it
        if not data.category_id and category_name:
            category = await self.category_service.get_or_create(
                user_id=user_id,
                name=category_name,
                # Determine category type based on amount (positive=income, negative=expense)
                type=CategoryType.income if data.amount >= 0 else CategoryType.expense
            )
            data.category_id = category.id
        
        # Ensure user_id is set
        data.user_id = user_id
        
        return await self.repository.create(data)

class SavingGoalService(BaseService[SavingGoal, SavingGoalCreate, SavingGoalUpdate, SavingGoalRepository]):
    async def get_by_user(self, user_id: UUID) -> List[SavingGoal]:
        return await self.repository.get_by_user(user_id)
    
    async def get_active(self, user_id: UUID) -> List[SavingGoal]:
        return await self.repository.get_active(user_id)
    
    async def add_contribution(
        self, 
        goal_id: UUID, 
        user_id: UUID, 
        amount: Decimal,
        description: str = None
    ) -> SavingGoal:
        # Get the saving goal
        goal = await self.repository.get(goal_id)
        
        if not goal or goal.user_id != user_id:
            raise ValueError("Saving goal not found or not owned by user")
        
        if not goal.is_active:
            raise ValueError("Cannot contribute to inactive goal")
        
        # Update current amount
        goal.current_amount += amount
        
        # Create contribution record
        contribution = SavingContribution(
            amount=amount,
            date=datetime.utcnow(),
            description=description,
            goal_id=goal_id,
            user_id=user_id
        )
        
        # Save both records
        self.repository.session.add(contribution)
        await self.repository.session.commit()
        await self.repository.session.refresh(goal)
        
        return goal
```

### Phase 4: Frontend Implementation

#### 4.1 Project Structure
```bash
frontend/
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable components
│   │   ├── stores/          # Svelte stores
│   │   ├── utils/           # Utility functions
│   │   └── api/             # API client
│   ├── routes/              # Page components
│   ├── App.svelte
│   └── main.ts
```

#### 4.2 State Management
```typescript
// src/lib/stores/auth.ts
import { writable } from 'svelte/store';

export const authStore = writable<AuthState>({
    user: null,
    isAuthenticated: false
});
```

#### 4.3 API Client
```typescript
// src/lib/api/client.ts
export class ApiClient {
    private baseUrl: string;
    private token: string | null;

    constructor() {
        this.baseUrl = import.meta.env.VITE_API_BASE_URL;
    }

    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: this.getHeaders()
        });
        return response.json();
    }
}
```

## 🚀 Implementation Timeline

### Week 1: Project Foundation
- [x] Setup project repository structure
- [ ] Configure Poetry dependency management
- [ ] Implement SQLAlchemy base models
- [ ] Setup Alembic for migrations
- [ ] Create core logging configuration
- [ ] Implement settings from environment variables

### Week 2: Database & Repository Layer
- [ ] Design database schema
- [ ] Create SQLAlchemy models
- [ ] Implement repository pattern
- [ ] Create initial Alembic migrations
- [ ] Setup test database
- [ ] Write repository unit tests

### Week 3: Authentication System
- [ ] Implement OAuth2 Google integration
- [ ] Create JWT token system
- [ ] Setup refresh token mechanism
- [ ] Build authentication endpoints
- [ ] Create middleware for auth routes
- [ ] Test authentication flows

### Week 4: User Management
- [ ] Create user service layer
- [ ] Implement password hashing
- [ ] Build user CRUD API endpoints
- [ ] Create user profiles functionality
- [ ] Implement user preferences
- [ ] Test user management flows

### Week 5: Financial Models
- [ ] Design transaction data models
- [ ] Implement category management
- [ ] Create saving goals models
- [ ] Build financial data migrations
- [ ] Setup test data generator
- [ ] Test financial models

### Week 6: Transaction Services
- [ ] Implement transaction service layer
- [ ] Create data aggregation functions
- [ ] Build monthly summary functionality
- [ ] Implement category analytics
- [ ] Create transaction import/export
- [ ] Test transaction services

### Week 7: Frontend Foundation
- [ ] Setup Svelte + Vite project
- [ ] Implement CSS framework (TailwindCSS)
- [ ] Create component architecture
- [ ] Build responsive layout system
- [ ] Implement state management
- [ ] Build API client service

### Week 8: Authentication UI
- [ ] Create login/signup screens
- [ ] Implement OAuth flow UI
- [ ] Build user profile screens
- [ ] Create password management
- [ ] Implement session management
- [ ] Test authentication flows

### Week 9: Financial UI Basics
- [ ] Create dashboard layout
- [ ] Build transaction input forms
- [ ] Implement transaction listing
- [ ] Create category management
- [ ] Build financial summary views
- [ ] Add data visualization components

### Week 10: Advanced Financial UI
- [ ] Implement saving goals UI
- [ ] Build monthly reporting view
- [ ] Create budgeting interface
- [ ] Implement data export features
- [ ] Add data filters and search
- [ ] Create responsive mobile views

### Week 11: Client-side Database
- [ ] Setup SQLite SEE in WebAssembly
- [ ] Implement encryption mechanism
- [ ] Create synchronization system
- [ ] Build backup/restore functionality
- [ ] Implement offline capabilities
- [ ] Test database operations

### Week 12: Document Processing
- [ ] Implement file upload system
- [ ] Build document parsing service
- [ ] Create LLM integration for extraction
- [ ] Implement document categorization
- [ ] Build document review interface
- [ ] Test document processing flows

### Week 13: Testing & Optimization
- [ ] Comprehensive backend unit tests
- [ ] End-to-end testing with Playwright
- [ ] Performance optimization
- [ ] Load testing
- [ ] Security audits
- [ ] Accessibility testing

### Week 14: Documentation & Deployment
- [ ] Create technical documentation
- [ ] Write user guides
- [ ] Setup CI/CD pipeline
- [ ] Configure production environment
- [ ] Implement monitoring
- [ ] Prepare for public release

## 🧪 Testing Strategy

### Backend Testing Framework
- **Unit Tests**: Testing individual components and functions
  ```python
  # tests/repositories/test_user_repository.py
  import pytest
  from uuid import uuid4
  from sqlalchemy.ext.asyncio import AsyncSession
  
  from app.models.user import User
  from app.repositories.user import UserRepository
  from app.schemas.user import UserCreate
  
  @pytest.mark.asyncio
  async def test_create_user(db_session: AsyncSession):
      # Arrange
      repo = UserRepository(User, db_session)
      user_data = UserCreate(
          email="test@example.com",
          password="securepassword",
          is_active=True
      )
      
      # Act
      user = await repo.create(user_data)
      
      # Assert
      assert user.id is not None
      assert user.email == "test@example.com"
      assert user.is_active is True
  
  @pytest.mark.asyncio
  async def test_get_by_email(db_session: AsyncSession):
      # Arrange
      repo = UserRepository(User, db_session)
      user_data = UserCreate(
          email="find@example.com",
          password="securepassword",
          is_active=True
      )
      await repo.create(user_data)
      
      # Act
      user = await repo.get_by_email("find@example.com")
      
      # Assert
      assert user is not None
      assert user.email == "find@example.com"
  ```

- **Integration Tests**: Testing interactions between components
  ```python
  # tests/api/test_auth_api.py
  import pytest
  from fastapi.testclient import TestClient
  from httpx import AsyncClient
  
  from app.main import app
  
  @pytest.mark.asyncio
  async def test_login_success(async_client: AsyncClient, test_user):
      # Arrange - test_user fixture creates a user in DB
      
      # Act
      response = await async_client.post(
          "/api/v1/auth/login",
          data={
              "username": test_user["email"],
              "password": test_user["password"]
          }
      )
      
      # Assert
      assert response.status_code == 200
      assert "access_token" in response.json()
      assert response.json()["email"] == test_user["email"]
  ```

- **API Tests**: End-to-end testing of API endpoints
  ```python
  # tests/api/test_transactions_api.py
  import pytest
  from httpx import AsyncClient
  from datetime import datetime
  
  @pytest.mark.asyncio
  async def test_create_transaction(async_client: AsyncClient, auth_headers, test_category):
      # Arrange
      transaction_data = {
          "amount": 100.50,
          "description": "Test transaction",
          "date": datetime.now().isoformat(),
          "category_id": str(test_category.id)
      }
      
      # Act
      response = await async_client.post(
          "/api/v1/transactions/",
          json=transaction_data,
          headers=auth_headers
      )
      
      # Assert
      assert response.status_code == 201
      data = response.json()
      assert data["amount"] == "100.50"
      assert data["description"] == "Test transaction"
  ```

### Frontend Testing Framework
- **Component Tests**: Testing UI components in isolation
  ```javascript
  // src/components/TransactionForm.spec.js
  import { render, fireEvent, screen } from '@testing-library/svelte';
  import TransactionForm from './TransactionForm.svelte';
  
  describe('TransactionForm', () => {
    it('should render the form', () => {
      render(TransactionForm);
      
      expect(screen.getByText('Add Transaction')).toBeInTheDocument();
      expect(screen.getByLabelText('Amount')).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(screen.getByLabelText('Date')).toBeInTheDocument();
      expect(screen.getByLabelText('Category')).toBeInTheDocument();
    });
    
    it('should emit submit event when form is submitted', async () => {
      const { component } = render(TransactionForm);
      
      // Setup a mock event handler
      const submitHandler = jest.fn();
      component.$on('submit', submitHandler);
      
      // Fill the form
      await fireEvent.input(screen.getByLabelText('Amount'), { target: { value: '100.50' } });
      await fireEvent.input(screen.getByLabelText('Description'), { target: { value: 'Test expense' } });
      
      // Submit the form
      await fireEvent.click(screen.getByText('Save'));
      
      // Verify event was emitted
      expect(submitHandler).toHaveBeenCalled();
      const formData = submitHandler.mock.calls[0][0].detail;
      expect(formData.amount).toBe(100.5);
      expect(formData.description).toBe('Test expense');
    });
  });
  ```

- **Integration Tests**: Testing interactions between components
  ```javascript
  // src/routes/Dashboard.spec.js
  import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';
  import Dashboard from './Dashboard.svelte';
  import { authStore } from '../lib/stores/auth';
  import { apiClient } from '../lib/api/client';
  
  // Mock API client
  jest.mock('../lib/api/client', () => ({
    apiClient: {
      get: jest.fn().mockResolvedValue({
        transactions: [
          { id: '1', amount: 100, description: 'Test', date: '2023-01-01' }
        ],
        summary: {
          income: 500,
          expenses: 300,
          balance: 200
        }
      })
    }
  }));
  
  describe('Dashboard', () => {
    beforeEach(() => {
      // Setup auth state
      authStore.set({ 
        isAuthenticated: true, 
        user: { id: 'user1', email: 'test@example.com' } 
      });
    });
    
    it('should load and display transaction data', async () => {
      render(Dashboard);
      
      // Verify loading state
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
      
      // Verify data display
      expect(screen.getByText('Test')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
      expect(screen.getByText('Balance: $200.00')).toBeInTheDocument();
    });
  });
  ```

- **E2E Tests**: Testing the full application flow
  ```javascript
  // e2e/transaction.spec.js
  import { test, expect } from '@playwright/test';
  
  test('user can add a new transaction', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to transactions
    await page.goto('/transactions');
    
    // Add new transaction
    await page.click('[data-testid="add-transaction"]');
    await page.fill('[data-testid="amount"]', '50.75');
    await page.fill('[data-testid="description"]', 'Grocery shopping');
    await page.selectOption('[data-testid="category"]', 'Food');
    await page.click('[data-testid="save-transaction"]');
    
    // Verify transaction was added
    await expect(page.locator('[data-testid="transaction-list"]')).toContainText('Grocery shopping');
    await expect(page.locator('[data-testid="transaction-list"]')).toContainText('$50.75');
  });
  ```

### Continuous Integration Pipeline
- **Pull Request Checks**:
  1. Linting (flake8, eslint)
  2. Type checking (mypy, typescript)
  3. Unit tests
  4. Integration tests
  5. Build verification

- **Main Branch Checks**:
  1. All PR checks
  2. E2E tests
  3. Security scans
  4. Performance benchmarks
  5. Generate documentation

## 🔐 Security Considerations

### 1. Data Protection Strategy
- **Client-Side Encryption**
  - SQLite SEE for local database encryption
  - Secret derivation using PBKDF2 with high iteration count
  - Encryption key never sent to server
  - Browser's Web Crypto API for cryptographic operations
  ```javascript
  // Key derivation from user password + salt
  async function deriveKey(password, salt) {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      const saltBuffer = encoder.encode(salt);
      
      // Import key material
      const keyMaterial = await window.crypto.subtle.importKey(
          "raw",
          passwordBuffer,
          { name: "PBKDF2" },
          false,
          ["deriveBits", "deriveKey"]
      );
      
      // Derive actual key using PBKDF2
      return window.crypto.subtle.deriveKey(
          {
              name: "PBKDF2",
              salt: saltBuffer,
              iterations: 100000,
              hash: "SHA-256"
          },
          keyMaterial,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"]
      );
  }
  ```

- **Data Segregation**
  - User authentication data in PostgreSQL
  - Financial data in client-side encrypted SQLite
  - Zero sensitive data on server
  - Backup encryption before upload

- **TLS Throughout**
  - TLS 1.3 for all communications
  - HSTS headers
  - Strong cipher suites
  - Certificate pinning for API endpoints

### 2. Authentication Security
- **OAuth2 Implementation**
  - PKCE (Proof Key for Code Exchange) extension
  - State parameter validation
  - Restricted redirect URIs
  - Minimal scope requirements

- **Token Management**
  - Short-lived JWT access tokens (15 minutes)
  - Secure HTTP-only cookies for refresh tokens
  - Token rotation on refresh
  - Revocation capability
  ```python
  # app/core/config.py
  JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 15
  JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7
  
  # Token settings in cookie
  response.set_cookie(
      key="refresh_token",
      value=refresh_token,
      httponly=True,  # Not accessible via JavaScript
      secure=True,    # HTTPS only
      samesite="strict",  # Prevent CSRF
      max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
  )
  ```

- **Password Security**
  - Argon2id password hashing
  - Password strength enforcement
  - Brute force protection
  - No password recovery (OAuth-based)

### 3. API Security
- **Input Validation**
  - Pydantic schema validation
  - Type checking
  - Sanitization of inputs
  - Validation at service layer
  ```python
  # app/schemas/financial.py
  class TransactionCreate(BaseModel):
      amount: confloat(gt=0)  # Positive value constraint
      description: constr(max_length=500)  # Length constraint
      date: datetime
      category_id: UUID
      
      class Config:
          extra = "forbid"  # Prevent additional fields
  ```

- **Rate Limiting**
  - Per-user and per-IP limits
  - Exponential backoff
  - Anti-DoS protection
  - Bot detection
  ```python
  # app/api/deps.py
  from fastapi import Depends, HTTPException, Request
  from slowapi import Limiter
  from slowapi.util import get_remote_address
  
  limiter = Limiter(key_func=get_remote_address)
  
  @router.post("/transactions/")
  @limiter.limit("20/minute")  # 20 requests per minute
  async def create_transaction(
      request: Request,
      transaction: TransactionCreate,
      current_user: User = Depends(get_current_user)
  ):
      # ...implementation
  ```

- **CORS Policies**
  - Strict origin checking
  - Limited allowed methods
  - Credential restrictions
  - Preflight caching
  ```python
  # app/main.py
  from fastapi.middleware.cors import CORSMiddleware
  
  app.add_middleware(
      CORSMiddleware,
      allow_origins=[settings.FRONTEND_URL],
      allow_credentials=True,
      allow_methods=["GET", "POST", "PUT", "DELETE"],
      allow_headers=["Authorization", "Content-Type"],
      max_age=600  # Cache preflight for 10 minutes
  )
  ```

- **Security Headers**
  - Content Security Policy (CSP)
  - X-Content-Type-Options
  - X-Frame-Options
  - Referrer-Policy
  ```python
  # app/middleware/security.py
  @app.middleware("http")
  async def add_security_headers(request: Request, call_next):
      response = await call_next(request)
      
      # CSP to prevent XSS
      response.headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; object-src 'none';"
      # Prevent MIME type sniffing
      response.headers["X-Content-Type-Options"] = "nosniff"
      # Prevent clickjacking
      response.headers["X-Frame-Options"] = "DENY"
      # Control referrer information
      response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
      
      return response
  ```

### 4. Client-Side Security
- **XSS Prevention**
  - Content Security Policy
  - Strict input sanitization
  - Template escaping in Svelte
  - Avoiding innerHTML

- **Local Storage Protection**
  - No sensitive data in localStorage
  - Session-only temporary data
  - Encrypted IndexedDB/SQLite
  - Proper key management
  ```javascript
  // Bad practice - avoided
  localStorage.setItem('token', accessToken);
  
  // Good practice - used instead
  // Access token in memory only during session
  let accessToken = null;
  
  // Refresh token in HttpOnly cookie (not accessible via JS)
  // All sensitive data in encrypted SQLite
  ```

- **HTTPS Enforcement**
  - HSTS preloading
  - Automatic HTTP->HTTPS redirection
  - Secure and HttpOnly cookie flags
  - Subresource Integrity for CDN resources

## 📊 Performance Optimization

### 1. Backend Optimization
- **Database Optimization**
  - Strategic indexing
  ```sql
  -- app/models/financial.py
  __table_args__ = (
      Index('ix_transactions_user_date', Transaction.user_id, Transaction.date),
      Index('ix_transactions_category', Transaction.category_id),
  )
  ```
  
  - Query optimization with SQLAlchemy
  ```python
  # Efficient query with joins and specific column selection
  result = await self.session.execute(
      select(
          Transaction.id,
          Transaction.amount,
          Transaction.date,
          Category.name.label("category_name")
      )
      .join(Category)
      .where(Transaction.user_id == user_id)
      .order_by(Transaction.date.desc())
      .limit(limit)
  )
  ```
  
  - Connection pooling
  ```python
  # app/db/session.py
  engine = create_async_engine(
      settings.DATABASE_URI,
      pool_size=20,
      max_overflow=10,
      pool_pre_ping=True,
      pool_recycle=3600,
  )
  ```
  
  - Read/write query separation

- **API Response Optimization**
  - Response compression
  ```python
  # app/main.py
  from fastapi.middleware.gzip import GZipMiddleware
  
  app.add_middleware(GZipMiddleware, minimum_size=1000)
  ```
  
  - JSON serialization optimization
  ```python
  # app/core/utils.py
  import orjson
  
  def orjson_dumps(v, *, default):
      # orjson.dumps returns bytes, need to decode
      return orjson.dumps(v, default=default).decode()
  
  class ORJSONResponse(JSONResponse):
      media_type = "application/json"
      
      def render(self, content: Any) -> bytes:
          return orjson.dumps(content)
  
  # Use in FastAPI app
  app = FastAPI(default_response_class=ORJSONResponse)
  ```
  
  - Response pagination
  ```python
  # app/api/v1/transactions.py
  @router.get("/", response_model=Page[TransactionResponse])
  async def get_transactions(
      pagination: Params = Depends(),
      current_user: User = Depends(get_current_user),
      transaction_service: TransactionService = Depends(get_transaction_service)
  ):
      """
      Get paginated transactions for current user.
      """
      return paginate(
          await transaction_service.get_by_user(current_user.id),
          pagination
      )
  ```
  
  - Field filtering
  ```python
  # app/api/v1/transactions.py
  @router.get("/{transaction_id}", response_model=TransactionResponse)
  async def get_transaction(
      transaction_id: UUID,
      fields: List[str] = Query(None),
      current_user: User = Depends(get_current_user),
      transaction_service: TransactionService = Depends(get_transaction_service)
  ):
      """
      Get transaction by ID with field filtering.
      """
      transaction = await transaction_service.get(transaction_id)
      
      # Apply field filtering if requested
      if fields:
          return {k: v for k, v in transaction.dict().items() if k in fields}
      
      return transaction
  ```

- **Caching Strategy**
  - Redis-based caching
  ```python
  # app/core/cache.py
  from redis import asyncio as aioredis
  
  redis = aioredis.from_url(settings.REDIS_URL, encoding="utf8", decode_responses=True)
  
  async def get_cache(key: str) -> Optional[str]:
      return await redis.get(key)
      
  async def set_cache(key: str, value: str, expire: int = 3600) -> bool:
      return await redis.set(key, value, ex=expire)
  
  # Usage in API
  @router.get("/summary/{year}")
  async def get_yearly_summary(
      year: int,
      current_user: User = Depends(get_current_user),
      transaction_service: TransactionService = Depends(get_transaction_service)
  ):
      cache_key = f"summary:{current_user.id}:{year}"
      
      # Try to get from cache
      cached = await get_cache(cache_key)
      if cached:
          return json.loads(cached)
      
      # If not in cache, compute
      summary = await transaction_service.get_yearly_summary(current_user.id, year)
      
      # Store in cache
      await set_cache(cache_key, json.dumps(summary))
      
      return summary
  ```
  
  - ETags for HTTP caching
  ```python
  # app/api/v1/categories.py
  @router.get("/")
  async def get_categories(
      request: Request,
      response: Response,
      current_user: User = Depends(get_current_user),
      category_service: CategoryService = Depends(get_category_service)
  ):
      categories = await category_service.get_by_user(current_user.id)
      
      # Generate ETag based on data
      categories_json = json.dumps([c.dict() for c in categories])
      etag = hashlib.md5(categories_json.encode()).hexdigest()
      
      # Check If-None-Match header
      if request.headers.get("if-none-match") == etag:
          return Response(status_code=304)  # Not Modified
      
      # Set ETag in response
      response.headers["ETag"] = etag
      
      return categories
  ```
  
  - Pre-aggregated data
  ```python
  # app/models/financial.py
  class MonthlySummary(Base):
      __tablename__ = "monthly_summaries"
      
      id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
      user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
      year = Column(Integer, nullable=False)
      month = Column(Integer, nullable=False)
      income = Column(Numeric(15, 2), default=0, nullable=False)
      expense = Column(Numeric(15, 2), default=0, nullable=False)
      saving = Column(Numeric(15, 2), default=0, nullable=False)
      
      __table_args__ = (
          UniqueConstraint('user_id', 'year', 'month', name='uq_user_year_month'),
      )
  ```

- **Asynchronous Processing**
  - Task queue with Celery
  ```python
  # app/worker.py
  from celery import Celery
  
  celery = Celery(__name__)
  celery.conf.broker_url = settings.CELERY_BROKER_URL
  celery.conf.result_backend = settings.CELERY_RESULT_BACKEND
  
  @celery.task
  def generate_monthly_report(user_id: str, year: int, month: int):
      # Long-running task to generate PDF report
      pass
  
  # Usage in API
  @router.post("/reports/monthly/{year}/{month}")
  async def request_monthly_report(
      year: int,
      month: int,
      current_user: User = Depends(get_current_user)
  ):
      # Queue the task
      task = generate_monthly_report.delay(str(current_user.id), year, month)
      
      return {"task_id": task.id, "status": "processing"}
  ```
  
  - Background tasks with FastAPI
  ```python
  # app/api/v1/transactions.py
  from fastapi import BackgroundTasks
  
  @router.post("/import")
  async def import_transactions(
      file: UploadFile,
      background_tasks: BackgroundTasks,
      current_user: User = Depends(get_current_user),
  ):
      # Store file temporarily
      file_path = f"/tmp/{uuid4()}.csv"
      with open(file_path, "wb") as f:
          f.write(await file.read())
      
      # Process in background
      background_tasks.add_task(
          process_transaction_import,
          file_path,
          current_user.id
      )
      
      return {"status": "processing"}
  ```

### 2. Frontend Optimization
- **Code Splitting**
  - Route-based splitting
  ```javascript
  // vite.config.js
  export default defineConfig({
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor': ['svelte', 'svelte-router-spa'],
            'auth': ['./src/lib/auth'],
            'charts': ['chart.js', './src/lib/charts'],
            'sqlite': ['wa-sqlite', './src/lib/db']
          }
        }
      }
    }
  });
  ```
  
  - Dynamic imports
  ```javascript
  // src/routes.js
  const routes = [
    {
      path: '/',
      component: () => import('./routes/Home.svelte')
    },
    {
      path: '/transactions',
      component: () => import('./routes/Transactions.svelte')
    },
    {
      path: '/reports',
      component: () => import('./routes/Reports.svelte')
    }
  ];
  ```

- **Lazy Loading**
  - Component lazy loading
  ```javascript
  // src/lib/utils/lazyLoad.js
  import { readable } from 'svelte/store';
  
  export function lazyLoad(importFn) {
    const loading = readable({ component: null, loading: true }, set => {
      importFn().then(module => {
        set({ component: module.default, loading: false });
      });
      
      return () => {};
    });
    
    return loading;
  }
  
  // Usage in component
  <script>
    import { lazyLoad } from '../lib/utils/lazyLoad';
    import LoadingSpinner from './LoadingSpinner.svelte';
    
    const chartComponent = lazyLoad(() => import('./Chart.svelte'));
  </script>
  
  {#if $chartComponent.loading}
    <LoadingSpinner />
  {:else}
    <svelte:component this={$chartComponent.component} />
  {/if}
  ```
  
  - Deferred loading of non-critical resources
  ```html
  <!-- index.html -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/css/critical.css">
  <link rel="stylesheet" href="/css/non-critical.css" media="print" onload="this.media='all'">
  ```

- **Asset Optimization**
  - Image optimization
  ```javascript
  // vite.config.js
  import { defineConfig } from 'vite';
  import { imagetools } from 'vite-imagetools';
  
  export default defineConfig({
    plugins: [
      imagetools({
        defaultDirectives: new URLSearchParams(
          'format=webp;quality=80;w=600;h=0'
        )
      })
    ]
  });
  
  // Usage in component
  <script>
    import optimizedImage from '../assets/hero.jpg?w=800;h=600;format=webp';
  </script>
  
  <img src={optimizedImage} alt="Hero" />
  ```
  
  - CSS optimization with PurgeCSS
  ```javascript
  // postcss.config.js
  module.exports = {
    plugins: [
      require('autoprefixer'),
      require('@fullhuman/postcss-purgecss')({
        content: [
          './src/**/*.svelte',
          './src/**/*.html'
        ],
        defaultExtractor: content => content.match(/[A-Za-z0-9-_:/]+/g) || []
      })
    ]
  };
  ```
  
  - Font optimization
  ```html
  <!-- index.html -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preload" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" as="style">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap">
  ```

- **Service Worker and PWA**
  - Offline capabilities
  ```javascript
  // vite.config.js
  import { VitePWA } from 'vite-plugin-pwa';
  
  export default defineConfig({
    plugins: [
      VitePWA({
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/api\.lukalibre\.org\/v1/,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                }
              }
            }
          ]
        },
        manifest: {
          name: 'LukaLibre',
          short_name: 'LukaLibre',
          description: 'Maneja tus finanzas de forma simple y segura',
          theme_color: '#3A6351',
          icons: [
            // Icons configuration
          ]
        }
      })
    ]
  });
  ```
  
  - Background sync
  ```javascript
  // src/lib/sync/backgroundSync.js
  export async function registerSyncEvent() {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      
      // Register for background sync
      try {
        await registration.sync.register('sync-transactions');
        console.log('Background sync registered');
      } catch (err) {
        console.error('Background sync failed to register', err);
      }
    }
  }
  
  // Listen for sync event in service worker
  self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-transactions') {
      event.waitUntil(syncTransactions());
    }
  });
  
  async function syncTransactions() {
    const db = await openDatabase();
    const pendingTransactions = await db.getPendingTransactions();
    
    for (const transaction of pendingTransactions) {
      try {
        await fetch('/api/v1/transactions', {
          method: 'POST',
          body: JSON.stringify(transaction),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Mark as synced in local DB
        await db.markTransactionSynced(transaction.id);
      } catch (err) {
        console.error('Failed to sync transaction', err);
      }
    }
  }
  