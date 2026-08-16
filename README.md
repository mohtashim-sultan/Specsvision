# SpecsVision

This repository is organized into separate frontend and backend applications.

## Project Structure

- `frontend/`: React client app (Create React App + Tailwind)
- `backend/`: FastAPI server — flat layout (`main.py`, `routes.py`, `models.py`, …)

## Run Frontend

From repo root:

- Install frontend dependencies: `npm run frontend:install`
- Start client: `npm run frontend:start` (from repo root) or `npm start` inside `frontend/`.
- API base URL: set `REACT_APP_API_URL` in `frontend/.env.development.local` (see `frontend/.env.example`). Defaults to `http://127.0.0.1:8000` to match the FastAPI dev server.
- Build frontend: `npm run frontend:build`

Frontend runs on `http://localhost:3000`.

## Run Backend

Use one virtualenv at the repo root (recommended): `python -m venv .venv`, activate it, then:

`pip install -r backend/requirements.txt`

Do not use a second `venv` inside `backend/`; the project assumes a single environment.

From repo root:

- Apply database migrations: `npm run backend:migrate`
- Start API server: `npm run backend:start`
- Quick import check: `npm run backend:check`

Backend runs on `http://127.0.0.1:8000`.

Optional environment file: `backend/.env` (see `backend/config.py` for variables).

## Backend dependencies

Declared in `backend/requirements.txt`.
