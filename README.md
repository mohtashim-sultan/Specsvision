# SpecsVision

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
