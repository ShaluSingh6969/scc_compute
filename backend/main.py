from datetime import datetime
import base64
import hashlib
import hmac
import io
import json
import math
import os
import time
import csv
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, Float, Integer, JSON, String, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
FRONTEND_DIST_DIR = PROJECT_ROOT / "frontend" / "dist"
FRONTEND_INDEX_FILE = FRONTEND_DIST_DIR / "index.html"
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    f"sqlite+aiosqlite:///{PROJECT_ROOT / 'telemetry.db'}",
)

SECRET_KEY = os.environ.get("SECRET_KEY", "tucdrive-secret-key-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_SECONDS = int(os.environ.get("ACCESS_TOKEN_EXPIRE_SECONDS", "3600"))
PASSWORD_SALT = b"tucdrive-local-salt"

cors_origins_raw = os.environ.get(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173",
)
CORS_ORIGINS = [origin.strip() for origin in cors_origins_raw.split(",") if origin.strip()]

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
async_session = async_sessionmaker(engine, expire_on_commit=False)
Base = declarative_base()

app = FastAPI(title="SmartCityCloud Compute Task Executor")
app.mount("/static", StaticFiles(directory=PROJECT_ROOT / "static"), name="static")
if (FRONTEND_DIST_DIR / "assets").exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="frontend-assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


class TelemetryRecord(Base):
    __tablename__ = "telemetry_records"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    source_file = Column(String(255), nullable=True)
    parameter_name = Column(String(255), nullable=True)
    parameter_value = Column(Float, nullable=True)
    raw_data = Column(JSON, nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class SignupRequest(Base):
    __tablename__ = "signup_requests"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="user", nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(150), nullable=True)


class UserMetaState(Base):
    __tablename__ = "user_meta_states"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(150), unique=True, nullable=False, index=True)
    payload = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    owner_username = Column(String(150), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    data_name = Column(String(255), nullable=False)
    ownership = Column(String(255), nullable=False)
    description = Column(String(1000), nullable=False)
    row_count = Column(Integer, nullable=False)
    column_count = Column(Integer, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, nullable=False, index=True)
    owner_username = Column(String(150), nullable=False, index=True)
    parameter_filter = Column(String(255), nullable=False)
    result = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class LoginRequest(BaseModel):
    username: str
    password: str


class PublicSignupRequest(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    username: str


class SignupResponse(BaseModel):
    message: str
    username: str
    status: str


class MetaStatePayload(BaseModel):
    data: Dict[str, Any] = {}


class ComputeOptions(BaseModel):
    source_file: Optional[str] = None
    parameter_filter: str = "All Parameters"
    detection_method: str = "Z-Score Statistical Analysis"
    sensitivity_level: int = 3
    altitude_threshold: int = 100
    battery_critical: int = 18
    vibration_limit: int = 5


SUPPORTED_TABULAR_EXTENSIONS = {".csv", ".tsv", ".xlsx", ".xls", ".json"}


def parse_tabular_upload(file: UploadFile, contents: bytes) -> pd.DataFrame:
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in SUPPORTED_TABULAR_EXTENSIONS:
        raise ValueError(
            "Unsupported file type. Please upload CSV, TSV, Excel, or JSON tabular data."
        )

    buffer = io.BytesIO(contents)
    if suffix == ".csv":
        # Auto-detect delimiters like ',', ';', and '\t' for mixed CSV exports.
        try:
            return pd.read_csv(buffer, sep=None, engine="python")
        except Exception:
            buffer.seek(0)
            return pd.read_csv(buffer)
    if suffix == ".tsv":
        return pd.read_csv(buffer, sep="\t")
    if suffix in {".xlsx", ".xls"}:
        return pd.read_excel(buffer)
    return pd.read_json(buffer)


def make_json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: make_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [make_json_safe(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "item"):
        return make_json_safe(value.item())
    if isinstance(value, float) and not math.isfinite(value):
        return None
    return value


async def build_dataset_profile() -> dict:
    async with async_session() as session:
        result = await session.execute(
            select(TelemetryRecord.raw_data, TelemetryRecord.source_file)
        )
        rows = result.all()

    records = [row[0] for row in rows if isinstance(row[0], dict)]
    source_files = sorted({row[1] for row in rows if row[1]})

    if not records:
        return {
            "row_count": 0,
            "column_count": 0,
            "file_count": 0,
            "source_files": [],
            "missing_cells": 0,
            "duplicate_rows": 0,
            "empty_columns": 0,
            "numeric_columns": 0,
            "categorical_columns": 0,
            "missing_rate": 0.0,
            "duplicate_rate": 0.0,
            "quality_score": 0,
            "quality_flags": ["No uploaded data yet."],
            "top_missing_columns": [],
            "preview_rows": [],
        }

    df = pd.json_normalize(records)
    row_count = len(df)
    column_count = len(df.columns)
    missing_matrix = df.isna()
    missing_cells = int(missing_matrix.sum().sum())
    duplicate_rows = int(df.duplicated().sum())
    empty_columns = int((missing_matrix.sum() == row_count).sum())
    numeric_columns = len(df.select_dtypes(include="number").columns)
    categorical_columns = len(df.select_dtypes(exclude="number").columns)
    total_cells = row_count * column_count
    missing_rate = round((missing_cells / total_cells) * 100, 2) if total_cells else 0.0
    duplicate_rate = round((duplicate_rows / row_count) * 100, 2) if row_count else 0.0

    quality_score = 100
    quality_score -= min(45, round(missing_rate * 0.75))
    quality_score -= min(25, round(duplicate_rate * 1.2))
    quality_score -= min(15, empty_columns * 3)
    quality_score = max(0, quality_score)

    missing_by_column = (
        df.isna().sum().sort_values(ascending=False).loc[lambda series: series > 0]
    )
    top_missing_columns = [
        {"column": column, "missing": int(count)}
        for column, count in missing_by_column.head(5).items()
    ]

    quality_flags = []
    if missing_cells:
        quality_flags.append(f"{missing_cells} missing cells")
    if duplicate_rows:
        quality_flags.append(f"{duplicate_rows} duplicate rows")
    if empty_columns:
        quality_flags.append(f"{empty_columns} empty columns")
    if not quality_flags:
        quality_flags.append("No major quality issues detected.")

    return {
        "row_count": row_count,
        "column_count": column_count,
        "file_count": len(source_files),
        "source_files": source_files,
        "missing_cells": missing_cells,
        "duplicate_rows": duplicate_rows,
        "empty_columns": empty_columns,
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
        "missing_rate": missing_rate,
        "duplicate_rate": duplicate_rate,
        "quality_score": quality_score,
        "quality_flags": quality_flags,
        "top_missing_columns": top_missing_columns,
        "preview_rows": [make_json_safe(record) for record in records[:8]],
    }


class UserListItem(BaseModel):
    id: int
    username: str
    role: str
    created_at: str
    status: str


class UserCreateRequest(BaseModel):
    username: str
    password: str
    role: str


class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None


class SignupRequestListItem(BaseModel):
    id: int
    username: str
    role: str
    status: str
    created_at: str
    reviewed_at: Optional[str] = None
    reviewed_by: Optional[str] = None


def hash_password(password: str) -> str:
    return hashlib.sha256(PASSWORD_SALT + password.encode()).hexdigest()


def verify_password(password: str, hashed_password: str) -> bool:
    return hash_password(password) == hashed_password


def base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def base64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(data: dict, expires_in: int = ACCESS_TOKEN_EXPIRE_SECONDS) -> str:
    header = {"alg": ALGORITHM, "typ": "JWT"}
    payload = data.copy()
    payload["exp"] = int(time.time()) + expires_in

    header_bytes = json.dumps(header, separators=(",", ":"), sort_keys=True).encode()
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    segments = [base64url_encode(header_bytes), base64url_encode(payload_bytes)]
    signing_input = ".".join(segments).encode()
    signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    segments.append(base64url_encode(signature))
    return ".".join(segments)


def decode_access_token(token: str) -> dict:
    try:
        header_b64, payload_b64, signature_b64 = token.split(".")
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    signing_input = f"{header_b64}.{payload_b64}".encode()
    expected_signature = hmac.new(SECRET_KEY.encode(), signing_input, hashlib.sha256).digest()
    actual_signature = base64url_decode(signature_b64)
    if not hmac.compare_digest(expected_signature, actual_signature):
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    payload = json.loads(base64url_decode(payload_b64))
    if payload.get("exp", 0) < int(time.time()):
        raise HTTPException(status_code=401, detail="Token has expired")

    return payload


auth_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
) -> User:
    payload = decode_access_token(credentials.credentials)
    username = payload.get("sub")
    if not username:
        raise HTTPException(status_code=401, detail="Invalid authentication token")

    async with async_session() as session:
        result = await session.execute(select(User).filter_by(username=username))
        user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid authentication token")
    return user


async def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Only super admin can access User Management")
    return current_user


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as session:
        # Create users with different roles
        users_to_create = [
            {"username": "admin@scc.tuc", "password": "123456", "role": "super_admin"},
            {"username": "admin", "password": "123456", "role": "admin"},
            {"username": "user", "password": "123456", "role": "user"},
            {"username": "student", "password": "123456", "role": "student"},
        ]

        for user_data in users_to_create:
            result = await session.execute(
                select(User).filter_by(username=user_data["username"])
            )
            existing_user = result.scalar_one_or_none()
            if existing_user is None:
                session.add(
                    User(
                        username=user_data["username"],
                        hashed_password=hash_password(user_data["password"]),
                        role=user_data["role"],
                    )
                )
        await session.commit()


@app.get("/", response_class=HTMLResponse)
async def homepage():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "index.html")


@app.get("/login", response_class=HTMLResponse)
async def login_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "login.html")


@app.get("/signup", response_class=HTMLResponse)
async def signup_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "signup.html")


@app.get("/users", response_class=HTMLResponse)
async def users_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "users.html")


@app.get("/roles", response_class=HTMLResponse)
async def roles_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "roles.html")


@app.get("/groups", response_class=HTMLResponse)
async def groups_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "groups.html")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "index.html")


@app.get("/data-import", response_class=HTMLResponse)
async def data_import_page():
    if FRONTEND_INDEX_FILE.exists():
        return FileResponse(FRONTEND_INDEX_FILE)
    return FileResponse(PROJECT_ROOT / "static" / "index.html")


@app.post("/login", response_model=TokenResponse)
@app.post("/api/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    async with async_session() as session:
        result = await session.execute(select(User).filter_by(username=data.username))
        user = result.scalar_one_or_none()

        if user is None:
            request_result = await session.execute(
                select(SignupRequest).where(SignupRequest.username == data.username)
            )
            signup_request = request_result.scalar_one_or_none()
            if signup_request and signup_request.status == "pending":
                raise HTTPException(
                    status_code=403,
                    detail="Your account creation request is pending super admin approval.",
                )
            if signup_request and signup_request.status == "declined":
                raise HTTPException(
                    status_code=403,
                    detail="Your account creation request was declined.",
                )
            raise HTTPException(status_code=401, detail="Invalid username or password")

    if not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    access_token = create_access_token({"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}


@app.post("/signup", response_model=SignupResponse)
@app.post("/api/signup", response_model=SignupResponse)
async def signup(data: PublicSignupRequest):
    username = data.username.strip()
    password = data.password.strip()
    role = (data.role or "user").strip().lower()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")
    if role not in {"user", "student"}:
        raise HTTPException(status_code=400, detail="Only user or student accounts can be created")

    async with async_session() as session:
        existing_user = await session.execute(select(User).filter_by(username=username))
        if existing_user.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Username already exists")

        existing_request_result = await session.execute(
            select(SignupRequest).where(SignupRequest.username == username)
        )
        existing_request = existing_request_result.scalar_one_or_none()
        if existing_request and existing_request.status == "pending":
            raise HTTPException(status_code=409, detail="An approval request already exists for this username")

        if existing_request and existing_request.status == "declined":
            existing_request.password_hash = hash_password(password)
            existing_request.role = role
            existing_request.status = "pending"
            existing_request.reviewed_at = None
            existing_request.reviewed_by = None
            request = existing_request
        else:
            request = SignupRequest(
                username=username,
                password_hash=hash_password(password),
                role=role,
            )
            session.add(request)
        await session.commit()

    return {"message": "Signup request submitted for approval.", "username": username, "status": "pending"}


@app.get("/api/signup-requests", response_model=List[SignupRequestListItem])
async def list_signup_requests(current_user: User = Depends(require_super_admin)):
    async with async_session() as session:
        result = await session.execute(select(SignupRequest).order_by(SignupRequest.created_at.desc()))
        requests = result.scalars().all()

    return [
        {
            "id": request.id,
            "username": request.username,
            "role": request.role,
            "status": request.status,
            "created_at": request.created_at.isoformat(),
            "reviewed_at": request.reviewed_at.isoformat() if request.reviewed_at else None,
            "reviewed_by": request.reviewed_by,
        }
        for request in requests
    ]


@app.post("/api/signup-requests/{request_id}/approve")
async def approve_signup_request(request_id: int, current_user: User = Depends(require_super_admin)):
    async with async_session() as session:
        result = await session.execute(select(SignupRequest).where(SignupRequest.id == request_id))
        request = result.scalar_one_or_none()
        if request is None:
            raise HTTPException(status_code=404, detail="Signup request not found")
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Signup request has already been processed")

        user_exists = await session.execute(select(User).where(User.username == request.username))
        if user_exists.scalar_one_or_none() is not None:
            request.status = "declined"
            request.reviewed_at = datetime.utcnow()
            request.reviewed_by = current_user.username
            await session.commit()
            raise HTTPException(status_code=409, detail="Username already exists")

        session.add(
            User(
                username=request.username,
                hashed_password=request.password_hash,
                role=request.role,
            )
        )
        request.status = "approved"
        request.reviewed_at = datetime.utcnow()
        request.reviewed_by = current_user.username
        await session.commit()

    return {"message": "Signup request approved."}


@app.post("/api/signup-requests/{request_id}/decline")
async def decline_signup_request(request_id: int, current_user: User = Depends(require_super_admin)):
    async with async_session() as session:
        result = await session.execute(select(SignupRequest).where(SignupRequest.id == request_id))
        request = result.scalar_one_or_none()
        if request is None:
            raise HTTPException(status_code=404, detail="Signup request not found")
        if request.status != "pending":
            raise HTTPException(status_code=400, detail="Signup request has already been processed")

        request.status = "declined"
        request.reviewed_at = datetime.utcnow()
        request.reviewed_by = current_user.username
        await session.commit()

    return {"message": "Signup request declined."}


@app.post("/logout")
@app.post("/api/logout")
async def logout():
    return {"message": "Successfully logged out."}


@app.post("/upload-csv")
async def upload_csv(
    file: UploadFile = File(...),
    parameter_filter: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user),
):
    contents = await file.read()
    filename = Path(file.filename or "").name
    async with async_session() as session:
        existing = await session.execute(
            select(Dataset).where(
                Dataset.owner_username == current_user.username,
                Dataset.filename == filename,
            )
        )
        if existing.scalar_one_or_none() is not None:
            return JSONResponse(
                {"error": f"{filename} is already saved. Open it from Reports instead."},
                status_code=409,
            )

    try:
        df = parse_tabular_upload(file, contents)
    except Exception as exc:
        return JSONResponse({"error": str(exc)}, status_code=400)

    rows = [make_json_safe(row) for row in df.to_dict(orient="records")]
    saved = 0
    async with async_session() as session:
        for row in rows:
            parameter_value = None
            if parameter_filter and parameter_filter in row:
                try:
                    parameter_value = float(row[parameter_filter])
                except Exception:
                    parameter_value = None

            record = TelemetryRecord(
                source_file=filename,
                parameter_name=parameter_filter if parameter_filter else None,
                parameter_value=parameter_value,
                raw_data=row,
            )
            session.add(record)
            saved += 1
        await session.commit()

    return {
        "message": f"Uploaded {saved} rows from {filename}.",
        "columns": list(df.columns),
        "source_file": filename,
        "row_count": int(len(df)),
        "column_count": int(len(df.columns)),
        "file_type": Path(filename).suffix.lower().lstrip("."),
        "preview_rows": rows[:8],
    }


@app.get("/api/parameters")
async def get_parameters(
    source_file: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    async with async_session() as session:
        query = select(TelemetryRecord.raw_data)
        if source_file:
            query = query.where(TelemetryRecord.source_file == source_file)
        result = await session.execute(query)
        records = result.scalars().all()

    if not records:
        return {"parameters": []}

    all_columns = set()
    for record in records:
        if isinstance(record, dict):
            all_columns.update(record.keys())

    return {"parameters": sorted(all_columns)}


@app.get("/api/summary")
async def get_summary(current_user: User = Depends(get_current_user)):
    async with async_session() as session:
        total = await session.execute(select(TelemetryRecord))
        records = total.scalars().all()

    if not records:
        return {
            "total_readings": 0,
            "parameters_analyzed": [],
            "loaded_files": [],
        }

    files = sorted({record.source_file for record in records if record.source_file})
    parameter_names = sorted({record.parameter_name for record in records if record.parameter_name})
    return {
        "total_readings": len(records),
        "parameters_analyzed": parameter_names,
        "loaded_files": files,
    }


@app.get("/api/profile")
async def get_profile(current_user: User = Depends(get_current_user)):
    return await build_dataset_profile()


@app.get("/api/meta")
async def get_meta_state(current_user: User = Depends(get_current_user)):
    async with async_session() as session:
        result = await session.execute(
            select(UserMetaState).where(UserMetaState.username == current_user.username)
        )
        record = result.scalar_one_or_none()

    if record is None:
        return {"data": {}}

    return {"data": record.payload or {}}


@app.post("/api/meta")
async def save_meta_state(
    payload: MetaStatePayload,
    current_user: User = Depends(get_current_user),
):
    source_file = str(payload.data.get("source_file") or "").strip()
    required_fields = ("data_name", "ownership", "description")
    if not source_file or any(not str(payload.data.get(field) or "").strip() for field in required_fields):
        raise HTTPException(
            status_code=400,
            detail="A file, data name, ownership, and description are required to save a dataset.",
        )

    async with async_session() as session:
        existing_dataset = await session.execute(
            select(Dataset).where(
                Dataset.owner_username == current_user.username,
                Dataset.filename == source_file,
            )
        )
        if existing_dataset.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="This dataset is already saved.")

        count_result = await session.execute(
            select(func.count(TelemetryRecord.id)).where(
                TelemetryRecord.source_file == source_file
            )
        )
        row_count = int(count_result.scalar_one() or 0)
        if not row_count:
            raise HTTPException(status_code=400, detail="Upload the file before saving its metadata.")

        columns_result = await session.execute(
            select(TelemetryRecord.raw_data)
            .where(TelemetryRecord.source_file == source_file)
            .limit(1)
        )
        first_row = columns_result.scalar_one_or_none() or {}
        dataset = Dataset(
            owner_username=current_user.username,
            filename=source_file,
            data_name=str(payload.data["data_name"]).strip(),
            ownership=str(payload.data["ownership"]).strip(),
            description=str(payload.data["description"]).strip(),
            row_count=row_count,
            column_count=len(first_row),
        )
        session.add(dataset)

        result = await session.execute(
            select(UserMetaState).where(UserMetaState.username == current_user.username)
        )
        record = result.scalar_one_or_none()

        if record is None:
            record = UserMetaState(
                username=current_user.username,
                payload=payload.data,
                updated_at=datetime.utcnow(),
            )
            session.add(record)
        else:
            record.payload = payload.data
            record.updated_at = datetime.utcnow()

        await session.commit()

    return {"message": "Meta data saved.", "updated_at": datetime.utcnow().isoformat()}


@app.get("/api/reports")
async def get_reports(current_user: User = Depends(get_current_user)):
    async with async_session() as session:
        datasets_result = await session.execute(
            select(Dataset)
            .where(Dataset.owner_username == current_user.username)
            .order_by(Dataset.created_at.desc())
        )
        datasets = datasets_result.scalars().all()
        runs_result = await session.execute(
            select(AnalysisRun)
            .where(AnalysisRun.owner_username == current_user.username)
            .order_by(AnalysisRun.created_at.desc())
        )
        runs = runs_result.scalars().all()

    runs_by_dataset = {}
    for run in runs:
        runs_by_dataset.setdefault(run.dataset_id, []).append(
            {
                "id": run.id,
                "parameter_filter": run.parameter_filter,
                "created_at": run.created_at.isoformat(),
                "result": run.result,
            }
        )

    return {
        "datasets": [
            {
                "id": dataset.id,
                "filename": dataset.filename,
                "data_name": dataset.data_name,
                "ownership": dataset.ownership,
                "description": dataset.description,
                "row_count": dataset.row_count,
                "column_count": dataset.column_count,
                "created_at": dataset.created_at.isoformat(),
                "analysis_runs": runs_by_dataset.get(dataset.id, []),
            }
            for dataset in datasets
        ]
    }


@app.get("/api/preview")
async def preview(
    source_file: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
):
    async with async_session() as session:
        selected_file = source_file
        if not selected_file:
            latest_file_result = await session.execute(
                select(TelemetryRecord.source_file)
                .order_by(TelemetryRecord.id.desc())
                .limit(1)
            )
            selected_file = latest_file_result.scalar_one_or_none()
        if not selected_file:
            return {"source_file": None, "preview": []}
        result = await session.execute(
            select(TelemetryRecord.raw_data)
            .order_by(TelemetryRecord.id.desc())
            .where(TelemetryRecord.source_file == selected_file)
            .limit(12)
        )
        records = list(reversed(result.scalars().all()))

    return {"source_file": selected_file, "preview": records}


@app.get("/api/users", response_model=List[UserListItem])
async def get_users(
    username: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_super_admin),
):
    async with async_session() as session:
        query = select(User)
        if username:
            query = query.where(User.username.ilike(f"%{username.strip()}%"))
        if role and role != "all":
            query = query.where(User.role == role)
        query = query.order_by(User.created_at.desc())
        result = await session.execute(query)
        users = result.scalars().all()

    return [
        {
            "id": user.id,
            "username": user.username,
            "role": user.role,
            "created_at": user.created_at.isoformat(),
            "status": "Active",
        }
        for user in users
    ]


@app.get("/api/super-admin/access")
async def super_admin_access(current_user: User = Depends(require_super_admin)):
    return {"allowed": True, "username": current_user.username, "role": current_user.role}


@app.get("/api/roles-summary")
async def roles_summary(current_user: User = Depends(require_super_admin)):
    async with async_session() as session:
        result = await session.execute(
            select(User.role, func.count(User.id)).group_by(User.role).order_by(User.role)
        )
        rows = result.all()

    return [{"role": role, "users": count} for role, count in rows]


@app.get("/api/groups-summary")
async def groups_summary(current_user: User = Depends(require_super_admin)):
    async with async_session() as session:
        result = await session.execute(select(User.username, User.role).order_by(User.username))
        users = result.all()

    grouped = {
        "Platform Owners": [],
        "Operations Team": [],
        "General Users": [],
        "Students": [],
    }
    for username, role in users:
        if role == "super_admin":
            grouped["Platform Owners"].append(username)
        elif role == "admin":
            grouped["Operations Team"].append(username)
        elif role == "student":
            grouped["Students"].append(username)
        else:
            grouped["General Users"].append(username)

    return [
        {
            "group": name,
            "members": members,
            "member_count": len(members),
        }
        for name, members in grouped.items()
    ]


@app.post("/api/users", response_model=UserListItem)
async def create_user(
    payload: UserCreateRequest,
    current_user: User = Depends(require_super_admin),
):
    username = payload.username.strip()
    role = payload.role.strip()
    password = payload.password.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Username is required")
    if not role:
        raise HTTPException(status_code=400, detail="Role is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    async with async_session() as session:
        existing = await session.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none() is not None:
            raise HTTPException(status_code=409, detail="Username already exists")

        user = User(
            username=username,
            hashed_password=hash_password(password),
            role=role,
        )
        session.add(user)
        await session.commit()
        await session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "created_at": user.created_at.isoformat(),
        "status": "Active",
    }


@app.put("/api/users/{user_id}", response_model=UserListItem)
async def update_user(
    user_id: int,
    payload: UserUpdateRequest,
    current_user: User = Depends(require_super_admin),
):
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        if payload.username is not None:
            new_username = payload.username.strip()
            if not new_username:
                raise HTTPException(status_code=400, detail="Username cannot be empty")
            if new_username != user.username:
                conflict = await session.execute(select(User).where(User.username == new_username))
                if conflict.scalar_one_or_none() is not None:
                    raise HTTPException(status_code=409, detail="Username already exists")
                user.username = new_username

        if payload.role is not None:
            new_role = payload.role.strip()
            if not new_role:
                raise HTTPException(status_code=400, detail="Role cannot be empty")
            user.role = new_role

        if payload.password is not None and payload.password.strip():
            user.hashed_password = hash_password(payload.password.strip())

        await session.commit()
        await session.refresh(user)

    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "created_at": user.created_at.isoformat(),
        "status": "Active",
    }


@app.delete("/api/users/{user_id}")
async def delete_user(
    user_id: int,
    current_user: User = Depends(require_super_admin),
):
    async with async_session() as session:
        result = await session.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")

        if user.username == current_user.username:
            raise HTTPException(status_code=400, detail="You cannot delete your own account")

        await session.delete(user)
        await session.commit()

    return {"message": "User deleted successfully"}


@app.post("/api/compute")
async def compute(options: ComputeOptions, current_user: User = Depends(get_current_user)):
    async with async_session() as session:
        query = select(TelemetryRecord.raw_data)
        if options.source_file:
            query = query.where(TelemetryRecord.source_file == options.source_file)
        result = await session.execute(query)
        records = result.scalars().all()

    if not records:
        return JSONResponse(
            {"error": "No telemetry data is available for the selected file."},
            status_code=400,
        )

    df = pd.json_normalize(records)
    numeric_columns = df.select_dtypes(include="number").columns.tolist()
    selected_column = None
    if options.parameter_filter and options.parameter_filter != "All Parameters":
        if options.parameter_filter in df.columns:
            selected_column = options.parameter_filter
    elif numeric_columns:
        selected_column = numeric_columns[0]

    anomalies = []
    if selected_column is not None and selected_column in df.columns:
        values = pd.to_numeric(
            df[selected_column].astype(str).str.replace(",", ".", regex=False),
            errors="coerce",
        ).dropna()
        if len(values) > 1:
            mean = float(values.mean())
            std = float(values.std())
            threshold = max(0.1, 3.0 - (options.sensitivity_level * 0.2))
            z_scores = (
                ((values - mean).abs() / std).fillna(0)
                if std > 0
                else values * 0
            )
            anomaly_scores = z_scores[z_scores > threshold].head(20)
            for idx, z_score in anomaly_scores.items():
                anomalies.append(
                    {
                        "row": int(idx),
                        "parameter": selected_column,
                        "value": values.loc[idx],
                        "z_score": round(float(z_score), 3),
                    }
                )

    battery_issues = []
    if "battery_voltage" in df.columns:
        battery_issues = df[df["battery_voltage"] < options.battery_critical].to_dict(orient="records")

    altitude_issues = []
    if "altitude" in df.columns:
        altitude_issues = df[df["altitude"] > options.altitude_threshold].to_dict(orient="records")

    vibration_issues = []
    if "vibration" in df.columns:
        vibration_issues = df[df["vibration"] > options.vibration_limit].to_dict(orient="records")

    issues = []
    if battery_issues:
        issues.append(f"{len(battery_issues)} low battery events")
    if altitude_issues:
        issues.append(f"{len(altitude_issues)} altitude threshold breaches")
    if vibration_issues:
        issues.append(f"{len(vibration_issues)} high vibration events")

    safety_level = "OK"
    if len(issues) > 1 or len(anomalies) > 10:
        safety_level = "CAUTION"
    elif issues:
        safety_level = "WATCH"

    overall_anomaly_percentage = round(len(anomalies) / len(df), 4)
    recommendations = []
    if altitude_issues:
        recommendations.append("Review flights above altitude threshold.")
    if battery_issues:
        recommendations.append("Inspect battery health for low-voltage events.")
    if vibration_issues:
        recommendations.append("Check propeller balance and motor vibrations.")
    if not recommendations:
        recommendations.append("All monitored systems are within expected ranges.")

    time_labels = []
    if "timestamp" in df.columns:
        time_labels = df["timestamp"].astype(str).tolist()
    else:
        time_labels = [str(i + 1) for i in range(len(df))]

    battery_trend = []
    if "battery_voltage" in df.columns:
        battery_trend = [
            {"label": label, "value": float(value)}
            for label, value in zip(time_labels, df["battery_voltage"].fillna(0))
        ]

    altitude_trend = []
    if "altitude" in df.columns:
        altitude_trend = [
            {"label": label, "value": float(value)}
            for label, value in zip(time_labels, df["altitude"].fillna(0))
        ]

    result_payload = {
        "total_readings": len(df),
        "flight_duration_seconds": round(len(df) * 1.0, 1),
        "parameters_analyzed": [options.parameter_filter or "All Parameters"],
        "detection_method": options.detection_method,
        "sensitivity_level": options.sensitivity_level,
        "total_anomalies": len(anomalies),
        "overall_anomaly_percentage": overall_anomaly_percentage,
        "safety_level": safety_level,
        "safety_issues": issues,
        "recommendations": recommendations,
        "altitude_max_threshold": options.altitude_threshold,
        "battery_critical_threshold": options.battery_critical,
        "vibration_limit_threshold": options.vibration_limit,
        "anomaly_report": anomalies[:10],
        "parameter_details": [selected_column] if selected_column else [],
        "battery_trend": battery_trend,
        "altitude_trend": altitude_trend,
    }

    if options.source_file:
        async with async_session() as session:
            dataset_result = await session.execute(
                select(Dataset).where(
                    Dataset.owner_username == current_user.username,
                    Dataset.filename == options.source_file,
                )
            )
            dataset = dataset_result.scalar_one_or_none()
            if dataset is not None:
                session.add(
                    AnalysisRun(
                        dataset_id=dataset.id,
                        owner_username=current_user.username,
                        parameter_filter=options.parameter_filter,
                        result=make_json_safe(result_payload),
                    )
                )
                await session.commit()

    return result_payload
