# SpecsVision Project Milestones & Roadmap

Status tracking for the milestones defined in **[issue #1](../../issues/1)**, which is
the source of truth for scope. Every item below links to the issue that tracks it and
is closed against the commits that implemented it.

---

## 🎨 Frontend (React + TypeScript)

### Milestone 1: Project Initialization & Structure
* [x] Initialize the React project with modern tooling and configuration
* [x] Establish a scalable monorepo layout (`frontend/`, `backend/`)

### Milestone 2: UI Development

#### Authentication
* [x] #2 Login form and authenticated session
* [x] #3 Registration form and account creation

#### Pages
* [x] #5 Home page and hero showcase
* [x] #4 About page
* [x] #6 Contact page

#### Components
* [x] #7 Product card component
* [x] #8 Reusable dropdown component
* [x] #9 Loading spinner and empty states

#### Layout
* [x] #10 Responsive header and navigation
* [x] #11 Footer and navigation links
* [x] #12 Mobile touch menu sheet

#### Shop
* [x] #13 Shop filter dropdown — category, price, material, gender, face-shape suitability
* [x] #14 Shop search bar

### Milestone 3: WebAR Virtual Try-On
* [x] #19 WebAR virtual try-on studio — MediaPipe face tracking, Three.js fitting
* [x] #44 Reliability: backend cold starts and 3D model payload

### Milestone 4: Content & Asset Integration
* [x] #17 Replace placeholder copy and imagery with real frame photography and `.glb` models

---

## ⚡ Backend (FastAPI + SQLAlchemy)

* [x] #31 FastAPI project setup and configuration
* [x] #32 Database models and Alembic migrations
* [x] #33 JWT authentication and role-based access control
* [x] #34 Products and catalog API
* [x] #35 Cart, orders and Stripe payment API
* [x] #36 Reviews API with sentiment classification
* [x] #37 Wishlist and frame comparison support
* [x] #38 Transactional email service
* [x] #39 Rate limiting and security hardening

---

## 🛠 Admin

* [x] #40 Admin dashboard — metrics, catalog, orders, users and sentiment analytics

---

## 🚀 DevOps & Documentation

* [x] #41 Docker Compose and container builds
* [x] #42 Netlify deployment and SPA routing
* [x] #43 Supabase object storage for 3D frame assets
* [x] #45 README, setup and architecture guides

---

## 🔄 Branch Strategy

| Branch | Purpose |
| --- | --- |
| **`Main`** | Default branch. All feature work merges here via pull request. |
| **`Deployment`** | Production release branch, advanced from `Main` once milestones verify. |

Commits follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification (`feat:`, `fix:`, `refactor:`, `perf:`, `docs:`, `chore:`), each scoped
to a single change.
