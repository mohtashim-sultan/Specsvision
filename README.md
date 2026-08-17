# SpecsVision - Virtual Try-On & E-Commerce Platform

**SpecsVision** is an AI-powered eyewear e-commerce platform featuring dynamic 3D frame preview, live camera Virtual Try-On (webcam face-mesh tracking), comprehensive catalog management, administrative analytics, and seamless checkout.

---

## 🚀 Key Features

* **Virtual Try-On Studio**: Real-time 3D frame overlay on user camera stream using MediaPipe Face Landmarker & Three.js.
* **3D Frame Inspector**: Interactive 360° rotating showcase for `.glb` / `.gltf` frame models.
* **E-Commerce Capabilities**:
  * Product Catalog with Category & Search filters.
  * Frame Comparison (side-by-side specs comparison).
  * Wishlist & Cart management.
  * Stripe Checkout Integration.
  * Product Ratings & Customer Sentiment Analysis.
* **Admin Management Portal**:
  * Product Inventory creation & editing (supporting 2D image previews, 3D try-on models, specifications, and custom color swatches).
  * Sales & Revenue Analytics dashboard.
  * Customer & Order status tracking.
* **Robust Security & Auth**:
  * JWT Token Authentication with revocation.
  * Resend Email OTP verification.
  * Role-Based Authorization (Admin vs Customer).

---

## 🛠️ Architecture & Tech Stack

### **Frontend**
* **Framework**: React 19 + TypeScript
* **Styling**: Tailwind CSS + Framer Motion
* **3D Graphics & Vision**: Three.js, `@mediapipe/tasks-vision`
* **Icons & Notifications**: Lucide React, React Hot Toast

### **Backend**
* **Framework**: FastAPI (Python)
* **Database**: PostgreSQL (SQLAlchemy ORM + Alembic Migrations)
* **Authentication**: OAuth2 / JWT with Password Hashing (Bcrypt)
* **Payments & Email**: Stripe API, Resend API

---

## 📁 Repository Structure

```
specsvision-app/
├── backend/                  # FastAPI Server
│   ├── alembic/              # Database migration scripts
│   ├── config.py             # Application settings & environment parsing
│   ├── db.py                 # SQLAlchemy engine & DB session setup
│   ├── deps.py               # Dependency injection (Auth, DB session)
│   ├── main.py               # FastAPI entry point & CORS configuration
│   ├── models.py             # SQLAlchemy Database Entities
│   ├── routes.py             # API Endpoint Handlers
│   ├── schemas.py            # Pydantic Schemas for Request/Response validation
│   ├── seed.py               # Database seeder script
│   └── uploads/              # Local media file storage (.glb models & images)
├── frontend/                 # React Application
│   ├── public/               # Static assets & HTML template
│   └── src/
│       ├── api/              # HTTP Client API Services
│       ├── components/       # Reusable UI components & 3D viewers
│       ├── context/          # React Context Providers (Auth, Theme, Wishlist, Compare)
│       ├── pages/            # Application Page Views & Admin Portal
│       ├── types/            # TypeScript Interface Definitions
│       └── utils/            # Storefront helper utilities
├── docker-compose.yml        # Docker composition setup
├── package.json              # Monorepo task runner configuration
└── README.md                 # Project Documentation
```

---

## ⚙️ Environment Configuration

### **Backend (`backend/.env`)**
Create a `backend/.env` file:

```env
SECRET_KEY=your-secure-random-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=10080
DATABASE_URL=postgresql+psycopg://postgres:admin@localhost:5432/specsvision
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Optional Integration Keys
RESEND_API_KEY=re_your_resend_key
STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

### **Frontend (`frontend/.env.development.local`)**

```env
REACT_APP_API_URL=http://localhost:8000
```

---

## 🚦 Getting Started

### **Prerequisites**
* Node.js (v18+)
* Python (3.10+)
* PostgreSQL Server running on `localhost:5432`

---

### **1. Backend Setup**

From the repository root:

```bash
# 1. Create and activate a Python virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1

# 2. Install backend dependencies
pip install -r backend/requirements.txt

# 3. Apply database migrations to PostgreSQL
npm run backend:migrate

# 4. Start the FastAPI server
npm run backend:start
```

The backend server runs at **`http://localhost:8000`**.  
Interactive API Docs (Swagger UI) are available at **`http://localhost:8000/docs`**.

---

### **2. Frontend Setup**

In a new terminal window:

```bash
# 1. Install frontend dependencies
npm run frontend:install

# 2. Start the React development server
npm run frontend:start
```

The client application runs at **`http://localhost:3000`**.

---

## 🛒 Product Flow & Asset Management

1. **Asset Storage**:
   * Physical files (2D image thumbnails `.png`/`.jpg` and 3D frame models `.glb`/`.gltf`) uploaded by admins are stored in `backend/uploads/`.
2. **Database Referencing**:
   * The `products` PostgreSQL table stores metadata (`sku`, `name`, `price`, `stock_quantity`, `material`, dimensions, color options) alongside asset paths (`front_view`, `thumbnail`, `lifestyle_images`).
3. **Display Fallback**:
   * The frontend standardizes asset paths: 3D models (`.glb`) power the Try-On studio and 3D Showcase, while 2D images (`thumbnail`/`image_url`) are rendered across storefront grids and shopping cart rows.

---

## 🧪 Quick Test Commands

```bash
# Run FastAPI quick import check
npm run backend:check

# Run frontend build
npm run frontend:build
```
