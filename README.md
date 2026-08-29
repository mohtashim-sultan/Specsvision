# 👓 SpecsVision

<div align="center">

![SpecsVision Banner](https://img.shields.io/badge/SpecsVision-AI%20%26%20AR%20Eyewear%20Platform-6366f1?style=for-the-badge&logo=glasses&logoColor=white)

**An AI & AR-Powered Next-Gen Eyewear Shopping Experience**

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4.5-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Three.js](https://img.shields.io/badge/Three.js-0.151+-black?style=flat-square&logo=three.js&logoColor=white)](https://threejs.org/)
[![MediaPipe](https://img.shields.io/badge/MediaPipe-Tasks%20Vision-FF6F00?style=flat-square&logo=google&logoColor=white)](https://ai.google.dev/edge/mediapipe/solutions/guide)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payment_Integration-6772E5?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com/)

[Key Features](#-key-features) •
[Architecture & Tech Stack](#-architecture--tech-stack) •
[Getting Started](#-getting-started) •
[Environment Setup](#-environment-configuration) •
[Database & Seeding](#-database-management--seeding) •
[Monorepo Scripts](#-monorepo-scripts-reference) •
[Deployment](#-deployment)

</div>

---

## 🌟 Overview

**SpecsVision** is a full-stack, enterprise-grade e-commerce platform designed for eyewear retailers. It combines cutting-edge **WebAR 3D Virtual Try-On**, real-time **facial landmark tracking**, automated **face shape detection**, and **sentiment-analyzed customer reviews** into a seamless, high-performance web experience.

Whether inspecting 3D frame models (`.glb`/`.gltf`) in interactive 360° view, testing glasses via live webcam overlay, comparing frame dimensions side-by-side, or completing orders via Stripe, SpecsVision delivers a luxury virtual eyewear shopping workflow.

---

## ✨ Key Features

### 🕶️ 3D Virtual Try-On & AR Experience
* **Real-time Face Tracking**: Powered by `@mediapipe/tasks-vision` (FaceLandmarker) to track 478 3D facial landmarks live via webcam.
* **Three.js 3D Rendering**: Real-time positioning, scaling, and rotation of 3D frame models (`.glb`/`.gltf`) mapped to face geometry.
* **Pupillary Distance (PD) Measurement**: Automated estimation of pupillary distance for accurate optical frame sizing.
* **Face Shape Detection**: AI-assisted geometry calculations identifying Oval, Round, Square, Heart, or Diamond face shapes to suggest matching frame styles.

### 🛍️ E-Commerce Storefront
* **Dynamic Product Catalog**: Filter by style (Aviator, Wayfarer, Round, Cat-Eye, Rectangle), material, gender, frame color, and price.
* **Interactive 3D Inspector**: 360° product viewer using Three.js OrbitControls to examine frames from any angle before purchase.
* **Side-by-Side Comparison**: Compare up to 4 eyewear models side-by-side on dimensions, weight, material, price, and try-on fit.
* **Shopping Cart & Wishlist**: Persistent cart drawer and user wishlist storage.

### 💳 Payments & Order Management
* **Stripe Checkout Integration**: Express checkout pipeline with tax computation and free-shipping thresholds.
* **Transactional Email Service**: Automated order confirmations and delivery updates via Resend API integration.
* **Order History & Tracking**: Live status updates (Pending, Processing, Shipped, Delivered) in user profile.

### 🤖 Smart Reviews & Sentiment Engine
* **Automated Sentiment Scoring**: Built-in backend sentiment analysis service analyzing customer review feedback.
* **Review Aggregation**: Star ratings, sentiment distribution breakdowns, and verified buyer tags.

### 🔐 Authentication & Admin Management
* **Secure JWT Auth**: Token-based authentication with bcrypt password hashing and login rate-limiting.
* **Role-Based Access (RBAC)**: Distinct permissions for Customers and Admins.
* **Admin Control Center**: Comprehensive dashboard to manage product catalogs, inventory stock levels, order statuses, and upload 2D thumbnail assets alongside 3D `.glb` models.

---

## 🏗️ Architecture & Tech Stack

```
                                  +-----------------------+
                                  |    React 19 Frontend  |
                                  | (TypeScript/Tailwind) |
                                  +-----------+-----------+
                                              |
                                    HTTP / REST / WebSockets
                                              |
                                  +-----------v-----------+
                                  |   FastAPI Backend     |
                                  | (Python 3.10+/Uvicorn)|
                                  +-----+-----+-----+-----+
                                        |     |     |
               +------------------------+     |     +-----------------------+
               |                              |                             |
     +---------v----------+         +---------v----------+        +---------v----------+
     | PostgreSQL Database|         |  Stripe & Resend   |        |   MediaPipe & 3D   |
     | (SQLAlchemy/Alembic|         |  Third-Party APIs  |        | Asset Storage (GLB)|
     +--------------------+         +--------------------+        +--------------------+
```

### **Frontend Stack**
* **Framework**: React 19, TypeScript
* **Styling**: Tailwind CSS, Framer Motion, Lucide React
* **3D & AR Engine**: Three.js, `@mediapipe/tasks-vision`
* **Routing & State**: React Router v7, React Context API, React Hot Toast
* **Payments**: `@stripe/stripe-js`, `@stripe/react-stripe-js`

### **Backend Stack**
* **Framework**: Python 3.10+, FastAPI, Uvicorn
* **Database & ORM**: PostgreSQL, SQLAlchemy 2.0, Alembic
* **Security & Auth**: PyJWT, Passlib / Bcrypt, Custom Rate Limiter
* **Third-Party Integrations**: Stripe API, Resend Email API, Supabase Storage

---

## 📂 Project Structure

```
specsvision-app/
├── backend/                  # FastAPI Application
│   ├── alembic/              # Database migration revisions
│   ├── uploads/              # Physical 2D image and 3D frame (.glb) asset storage
│   ├── config.py             # Application settings & environment variables
│   ├── db.py                 # SQLAlchemy database session manager
│   ├── deps.py               # Authentication & dependency injection helpers
│   ├── main.py               # FastAPI entrypoint & CORS middleware setup
│   ├── models.py             # SQLAlchemy ORM data models (User, Admin, Product, Order, Review)
│   ├── routes.py             # REST API endpoints (Auth, Products, Orders, Reviews, Admin)
│   ├── schemas.py            # Pydantic schema validation models
│   ├── seed.py               # Idempotent database seeder (Admin & Initial Products)
│   ├── sentiment.py          # Custom review sentiment analyzer
│   ├── email_service.py      # Resend / SMTP email notifications
│   ├── stripe_service.py     # Stripe payment intent processor
│   ├── requirements.txt      # Python dependencies
│   └── Dockerfile            # Backend container definition
│
├── frontend/                 # React 19 Frontend Application
│   ├── public/               # Static assets & HTML template
│   ├── src/
│   │   ├── api/              # Axios/Fetch API client wrappers
│   │   ├── components/       # Reusable UI, Layout, Shop & AR components
│   │   │   └── ar/           # TryOnViewer (MediaPipe + Three.js) & faceShape calculation
│   │   ├── context/          # Auth, Cart, Wishlist, and Theme React Contexts
│   │   ├── pages/            # View pages (Home, Shop, Try-On Studio, Checkout, Profile, Admin)
│   │   └── types/            # TypeScript interface declarations
│   ├── package.json          # Frontend dependencies & scripts
│   ├── tailwind.config.js    # Tailwind CSS design system configuration
│   └── Dockerfile            # Frontend container (Nginx static build)
│
├── docker-compose.yml        # Multi-container orchestra (Frontend, Backend, PostgreSQL)
├── netlify.toml              # Netlify build configuration for frontend monorepo deployment
└── package.json              # Monorepo root scripts
```

---

## ⚙️ Environment Configuration

### **1. Backend Configuration (`backend/.env`)**

Create a `.env` file in the `backend/` directory:

```env
# Core Server & Auth Settings
ENVIRONMENT=development
SECRET_KEY=your-secure-random-secret-key-min-32-chars
ACCESS_TOKEN_EXPIRE_MINUTES=10080
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Database Connection (PostgreSQL)
DATABASE_URL=postgresql+psycopg://specsvision:specsvision_secure_password@localhost:5432/specsvision

# Stripe Payments (Optional / Development)
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# Resend Email Integration (Optional / Transactional Emails)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=SpecsVision <onboarding@resend.dev>

# Optional Seeding Overrides
SEED_ADMIN_EMAIL=admin@specsvision.local
SEED_ADMIN_PASSWORD=admin12345
```

### **2. Frontend Configuration (`frontend/.env.development.local`)**

Create a `.env.development.local` file in the `frontend/` directory:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
```

---

## 🚦 Getting Started

### **Prerequisites**
* **Node.js**: v18.0.0 or higher
* **Python**: v3.10 or higher
* **PostgreSQL**: v15+ (or run via Docker Compose)
* **Git**

---

### **Option 1: Quickstart with Docker Compose (Recommended)**

Launch the entire stack (PostgreSQL database, FastAPI backend, and React frontend) with a single command:

```bash
# Clone the repository
git clone https://github.com/mohtashim-sultan/Specsvision.git
cd specsvision-app

# Build and start all services
docker compose up --build
```

Access the application:
* 🌐 **Frontend Application**: `http://localhost` (or `http://localhost:3000`)
* ⚡ **FastAPI Backend**: `http://localhost:8000`
* 📚 **Interactive Swagger API Docs**: `http://localhost:8000/docs`

---

### **Option 2: Manual Local Development Setup**

#### **Step 1: Backend Setup**

```bash
# 1. Navigate to repository root and create a virtual environment
python -m venv .venv

# Activate the virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Ensure PostgreSQL is running and database 'specsvision' exists, then run migrations:
npm run backend:migrate

# 4. Seed initial catalog & admin account:
cd backend
python seed.py
cd ..

# 5. Start FastAPI development server:
npm run backend:start
```

The backend will start at **`http://localhost:8000`**.

#### **Step 2: Frontend Setup**

Open a new terminal window:

```bash
# 1. Install frontend dependencies
npm run frontend:install

# 2. Start the React development server
npm run frontend:start
```

The client application will open automatically at **`http://localhost:3000`**.

---

## 🗄️ Database Management & Seeding

SpecsVision uses **Alembic** for relational schema migrations and a python seeder script for initial dataset populations.

```bash
# Apply all pending Alembic migrations to PostgreSQL
npm run backend:migrate

# Create a new migration revision after modifying backend/models.py
cd backend
alembic revision --autogenerate -m "describe_your_change"
alembic upgrade head
cd ..

# Seed default admin user and product catalog
cd backend
python seed.py
```

### **Default Admin Credentials (Seeded)**
* **Email**: `admin@specsvision.local`
* **Password**: `admin12345`

---

## 📡 API Architecture & Key Endpoints Summary

Once the backend is running, full API documentation with live execution capabilities is available at **`http://localhost:8000/docs`**.

| Category | Endpoint | Method | Description | Auth Required |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | `/auth/register` | `POST` | Register a new customer account | No |
| **Auth** | `/auth/login` | `POST` | Authenticate & retrieve JWT access token | No |
| **Auth** | `/auth/me` | `GET` | Retrieve current user profile details | Yes |
| **Products** | `/products` | `GET` | Fetch paginated product catalog with filters | No |
| **Products** | `/products/{id}` | `GET` | Fetch product details, 3D assets, & reviews | No |
| **Products** | `/products` | `POST` | Create a new eyewear product | Admin |
| **Products** | `/products/upload-model` | `POST` | Upload `.glb`/`.gltf` 3D frame file | Admin |
| **Orders** | `/orders` | `POST` | Create a new order | Yes |
| **Orders** | `/orders/stripe-intent` | `POST` | Generate Stripe PaymentIntent | Yes |
| **Orders** | `/orders/my-orders` | `GET` | List user order history | Yes |
| **Reviews** | `/products/{id}/reviews` | `POST` | Submit product review (with auto-sentiment) | Yes |

---

## 🛒 Product Asset & 3D Model Guidelines

To maintain high visual fidelity in the **Virtual Try-On** and **3D Showcase**:

1. **3D Frames (`.glb` / `.gltf`)**:
   * Models should be centered at origin `(0, 0, 0)`.
   * Standard scale in millimeters or normalized units.
   * Model file size recommended `< 32 MB` (configured via `max_model_upload_bytes`).
   * Uploaded via the Admin Dashboard or placed in `backend/uploads/models/`.

2. **2D Thumbnails (`.png` / `.jpg` / `.webp`)**:
   * Aspect ratio `1:1` or `4:3` with transparent/clean background.
   * Uploaded via Admin Dashboard or placed in `backend/uploads/images/`.

---

## 🛠️ Monorepo Scripts Reference

All primary commands can be run from the root directory using standard `npm` scripts:

| Command | Description |
| :--- | :--- |
| `npm run start` | Starts the React frontend development server (`http://localhost:3000`). |
| `npm run build` | Builds the production bundle for the frontend application. |
| `npm run frontend:install` | Installs all npm dependencies inside `frontend/`. |
| `npm run frontend:start` | Runs `react-scripts start` in `frontend/`. |
| `npm run frontend:build` | Runs `react-scripts build` in `frontend/`. |
| `npm run backend:migrate` | Runs `alembic upgrade head` inside `backend/` to sync PostgreSQL schema. |
| `npm run backend:start` | Starts FastAPI server with Uvicorn auto-reload on port 8000. |
| `npm run backend:check` | Verifies FastAPI application imports and configuration sanity. |

---

## 🌐 Deployment

### **Deploying Frontend to Netlify**

The root directory contains a pre-configured `netlify.toml` file.

1. Connect the repository `mohtashim-sultan/Specsvision` to **Netlify**.
2. Netlify will auto-detect settings:
   * **Base Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Publish Directory**: `frontend/build`
3. Add environment variable `REACT_APP_API_URL` pointing to your deployed backend API URL.

### **Deploying Backend with Docker / Cloud Services**

The `backend/Dockerfile` produces a production-ready containerized FastAPI application running Uvicorn. Deploy to Render, Railway, AWS ECS, or DigitalOcean App Platform by supplying the environment variables defined in `.env`.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for details.

---

<div align="center">
  <sub>Built with ❤️ by <strong>Mohtashim Sultan</strong> & the SpecsVision Team</sub>
</div>
