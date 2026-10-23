# Deployment & Operations Guide: Hostel Outpass Management Dashboard

## 1. System Requirements
- **Node.js**: v18.0.0 or higher (Tested on Node v24.16.0)
- **npm**: v9.0.0 or higher
- **MongoDB**: MongoDB Atlas cluster, local MongoDB instance (v5.0+), or built-in embedded in-memory database runner.

---

## 2. Environment Variables Configuration

Create `.env` in `backend/`:
```env
# Server
PORT=5000
NODE_ENV=production

# Database
# If left empty, the server automatically starts an embedded MongoDB instance
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/hostel_outpass?retryWrites=true&w=majority
USE_MEMORY_DB=false

# Security
JWT_SECRET=super_secure_jwt_secret_key_change_in_production

# Business Policy
DEFAULT_GRACE_MINUTES=15
REMINDER_WINDOW_MINUTES=10
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME_MINUTES=15
```

---

## 3. Installation & Database Seeding

### Backend Setup
```bash
cd backend
npm install
npm run seed     # Populates demo accounts, gates, scanners, and sample outpasses
npm test         # Runs automated unit and integration test suite
npm start        # Launches production backend server
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build    # Compiles production-ready bundle
npm run preview  # Previews production build on port 3000
```

---

## 4. Default Demo Accounts

| Role | Portal Login ID | Default Password | Persona & Scope |
| :--- | :--- | :--- | :--- |
| **STUDENT** | `COER253028008` | `Student@123` | Aditya Sharma, MCA, Ramanujan Bhawan |
| **WARDEN** | `WRD-101` | `Warden@123` | Dr. Rajesh Kumar, Ramanujan Bhawan |
| **DEAN** | `DEN-201` | `Dean@123` | Prof. Meenakshi Verma, Dean Student Welfare |
| **ADMIN** | `ADM-001` | `Admin@123` | Vikram Malhotra, Chief System Administrator |
| **SECURITY GUARD** | `GRD-301` | `Guard@123` | Surender Singh, Main Gate Checkpoint |

---

## 5. Deployment Options

### Backend Deployment (Render / Railway / AWS EC2)
1. Set Environment Variables (`MONGODB_URI`, `JWT_SECRET`, `NODE_ENV=production`).
2. Build command: `npm install`
3. Start command: `npm start`
4. Health check URL: `https://<your-backend-domain>/api/health`

### Frontend Deployment (Vercel / Netlify / Cloudflare Pages)
1. Build command: `npm run build`
2. Publish directory: `dist`
3. Environment variables: `VITE_API_URL=https://<your-backend-domain>`
4. Configure SPA rewrite rule (redirect all `/*` routes to `index.html`).

---

## 6. Automated Backup & Recovery
- **MongoDB Atlas**: Automatic continuous backups with point-in-time recovery enabled.
- **Audit Logs Retention**: Audit logs and security event collections are indexed by `createdAt` to support compliance exports and data retention archiving.
