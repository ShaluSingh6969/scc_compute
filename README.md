# SmartCityCloud Compute Task Executor

## Overview

This project now uses:

- Frontend: React + Vite (under `frontend/`)
- Backend: Python + FastAPI (under `backend/`)

The API behavior and current visual design are preserved.

## Setup

1. Install backend dependencies:
   ```bash
   pip install -r backend/requirements.txt
   ```
2. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   cd ..
   ```

## Run in Development

1. Start backend:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```
2. Start frontend (new terminal):
   ```bash
   cd frontend
   npm run dev
   ```
3. Open http://127.0.0.1:5173

## Run in Production-Like Mode

1. Build frontend:
   ```bash
   cd frontend
   npm run build
   cd ..
   ```
2. Start backend:
   ```bash
   python -m uvicorn backend.main:app --reload
   ```
3. Open http://127.0.0.1:8000

## Run With Docker (Anywhere)

### Single image (upload and run on any machine)

If you want one Dockerfile only, use the root `Dockerfile`. It builds the frontend and runs the backend in one container.

Build image:

```bash
docker build -t smartcitycloud-app:latest .
```

Run container:

```bash
docker run -d --name smartcitycloud-app -p 8000:8000 -v scc_data:/app/data smartcitycloud-app:latest
```

Open app:

- http://localhost:8000

Stop and remove:

```bash
docker stop smartcitycloud-app
docker rm smartcitycloud-app
```

This repo now includes:

- Backend image config: `backend/Dockerfile`
- Frontend image config: `frontend/Dockerfile`
- Frontend reverse proxy config: `frontend/nginx.conf`
- Orchestration: `docker-compose.yml`

### One-command start

From the project root:

```bash
docker compose up --build -d
```

Access:

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000

### Stop containers

```bash
docker compose down
```

### Notes

- SQLite data is persisted in a named Docker volume: `telemetry_data`.
- Upload size is configured up to 100 MB in `frontend/nginx.conf`.

## Production Stack (Frontend + Backend + MariaDB)

For a production-grade setup, this repo now includes:

- `docker-compose.prod.yml` (frontend + backend + MariaDB)
- `.env.prod.example` (production environment template)

### Deploy steps

1. Copy production env template:

```bash
cp .env.prod.example .env.prod
```

2. Edit `.env.prod` and set strong secrets/passwords.

3. Start production stack:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up --build -d
```

4. Open the app:

- `http://<your-server-ip-or-domain>`

### Production operations

View status:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
```

View logs:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f
```

Stop stack:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

### Production notes

- Backend is not exposed publicly; only frontend is published on port `80`.
- API traffic is reverse-proxied from frontend Nginx to backend service.
- MariaDB data persists in Docker volume `db_data`.
- Health checks are configured for frontend, backend, and database services.

## Default credentials

- Username: `admin`
- Password: `123456`

## MariaDB Setup

Use `backend/setup_mariadb.sql` to configure the local MariaDB root password, database, and application user:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY '123456';
CREATE DATABASE IF NOT EXISTS tucdrive;
USE tucdrive;
CREATE USER IF NOT EXISTS 'tucdrive_user'@'localhost' IDENTIFIED BY '123456';
GRANT ALL PRIVILEGES ON tucdrive.* TO 'tucdrive_user'@'localhost';
FLUSH PRIVILEGES;
```

Then configure the application to use MariaDB instead of SQLite by setting `DATABASE_URL`:

```powershell
$env:DATABASE_URL = "mysql+aiomysql://tucdrive_user:123456@localhost/tucdrive"
```

Or update `backend/main.py` directly:

```python
DATABASE_URL = "mysql+aiomysql://tucdrive_user:123456@localhost/tucdrive"
```

The app will still create the default `admin` user (`admin` / `123456`) on first startup if it does not exist.
