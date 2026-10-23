# HOSTEL OUTPASS MANAGEMENT DASHBOARD
### MCA Major Project • Enterprise College Resident & Gate Movement Platform

A production-grade, full-stack college/university hostel outpass, leave, gate movement, and security management platform.

---

## 🌟 Key Highlights

- **Exact 5 Roles Only**: `STUDENT`, `WARDEN`, `DEAN`, `ADMIN`, `SECURITY_GUARD`.
  - **NO TEACHER ROLE** anywhere in the system.
  - **NO PARENT LOGIN**: Parents are contact records linked to students for notification dispatch (SMS/Email). Students cannot edit parent details; Warden/Dean/Admin can edit parent details with an audited reason.
- **Strict Server-Side RBAC & Identity Verification**:
  - Validates official College/Employee ID, password, and requested portal role against the database record.
  - Cross-portal logins (e.g. Student credentials entered on Warden or Admin portal) are rejected with a 403 error.
  - Brute-force protection: 5 consecutive failed attempts lock the account for 15 minutes.
- **Permanent QR Identity**:
  - Every student receives a permanent QR code (e.g. `QR-STU-COER253028008`).
  - Permanent QR represents **identity only**, not permanent leave authorization.
  - Server validates active approved outpass, movement state, gate status, and scanner device key.
- **Flexible Home Leave**:
  - **NO hardcoded 10-day or 30-day limits**.
  - Departure and return date/time dynamically calculate duration in days and hours.
- **Authoritative Server Timer & 15-Minute Grace**:
  - Timer is based **strictly on approved start and end times**, never shifting from the first exit.
  - **10-minute return reminder** notification sent automatically before deadline.
  - If a student is outside at expiry, a **15-minute grace entry window** activates. Entry during grace is permitted (`grace_extension_used = true`).
  - After grace, pass is marked `LATE` and staff/parents are alerted.
  - If a student never exits during the approved window, the pass is marked `NO_SHOW`.
- **Fixed Gate Scanner Flow**:
  - Registered hardware scanners authenticate with hashed device credentials (`x-scanner-code` and `x-api-key`).
  - Guards operate a kiosk with camera & manual scanner, receiving only required operational data (parent contacts and complete student lists are hidden).
- **Scalability for 5,000+ Students**:
  - Server-side pagination, compound database indexes, regex search, and safe batched CSV student ingestion.
- **100% Automated Test Coverage**:
  - 25 out of 25 Jest/Supertest integration tests covering authentication, wrong-role rejection, outpass workflows, fixed scanner movement transitions, and timer grace rules.

---

## 🚀 Quick Start (One-Click)

### Option 1: One-Click Startup Script (Windows)
Double-click `start-all.bat` or run:
```cmd
start-all.bat
```
This automatically boots both the backend API (port 5000) and the React frontend (port 3000).
The backend keeps local fallback database data in `.data/mongodb`, so accounts and registrations survive server restarts.

### Option 2: Manual Start

#### Backend:
```bash
cd backend
npm install
npm test       # Run 25 automated integration tests
npm start      # Starts on http://localhost:5000
```

#### Frontend:
```bash
cd frontend
npm install
npm run dev    # Starts Vite dev server on http://localhost:3000
```

On Windows PowerShell, use `npm.cmd` instead of `npm` if script execution is blocked:
```powershell
npm.cmd start
npm.cmd run dev
```

Start only one copy of each service. If port 5000 or 3000 is already in use, close the existing server window before running `start-all.bat` again.

Open **http://localhost:3000** in your browser.

---

## 🔑 Demo Test Credentials

All 5 role accounts are pre-seeded in the database:

| Role | Portal Login ID | Password | Name / Details |
| :--- | :--- | :--- | :--- |
| **STUDENT** | `COER253028008` | `Student@123` | Aditya Sharma (MCA Resident, Ramanujan Bhawan Rm 302) |
| **WARDEN** | `WRD-101` | `Warden@123` | Dr. Rajesh Kumar (Warden, Ramanujan Bhawan) |
| **DEAN** | `DEN-201` | `Dean@123` | Prof. Meenakshi Verma (Dean Student Welfare) |
| **ADMIN** | `ADM-001` | `Admin@123` | Vikram Malhotra (Chief System Administrator) |
| **SECURITY GUARD** | `GRD-301` | `Guard@123` | Surender Singh (Main Gate Security Checkpoint) |

> **Pro Tip**: On the Login screen, click any role tab and click the **"Fill Demo"** button to automatically populate credentials!

---

## 🧪 Automated Test Suite Verification

Run the test suite at any time:
```bash
cd backend
npm test
```

### Verified Test Suites:
1. `tests/auth_and_rbac.test.js`:
   - Valid student login
   - Wrong-role login rejected (Student -> Warden = 403)
   - Wrong-role login rejected (Student -> Admin = 403)
   - Wrong-role login rejected (Warden -> Student = 403)
   - Security Guard login
   - Parent cannot log in
   - Teacher role does not exist
   - Public student signup strictly creates STUDENT role with parent details
2. `tests/outpass_and_workflow.test.js`:
   - Flexible Home Leave (20 days calculated dynamically)
   - Warden approval activates QR authorization
   - Student ownership isolation (Student A cannot access Student B's outpass)
   - Cancellation of pending outpass before exit
3. `tests/gate_scanner_movement.test.js`:
   - Unauthenticated scanner rejection
   - Closed gate rejection
   - Valid EXIT allowed (INSIDE -> OUTSIDE)
   - Duplicate EXIT while OUTSIDE denied
   - Valid ENTRY allowed (OUTSIDE -> INSIDE)
   - Duplicate ENTRY while INSIDE denied
   - Guard operational view privacy (parent info stripped)
   - Immediate duplicate scan triggers replay protection (<3s)
4. `tests/timer_grace_late_noshow.test.js`:
   - Timer based strictly on approved start and end (first exit does not shift timer)
   - 15-minute grace period entry allowed (`grace_extension_used = true`)
   - Late return marking after grace period expires
   - No-show detected when student never exits
   - Last active Administrator cannot be deactivated

---

## 📁 Project Structure

```
hostel-outpass-management/
├── backend/
│   ├── src/
│   │   ├── config/             # constants.js, db.js (Atlas & MongoMemoryServer fallback)
│   │   ├── models/             # User, Student, Parent, Outpass, QRAuth, Gate, Scanner, Log...
│   │   ├── middleware/         # authMiddleware, roleMiddleware, scannerAuth, rateLimiter...
│   │   ├── controllers/        # auth, outpass, gate, admin, report, common controllers
│   │   ├── routes/             # authRoutes, outpassRoutes, gateRoutes, adminRoutes...
│   │   ├── services/           # scanService, outpassService, notificationService, backgroundJobs...
│   │   ├── socket/             # socketHandler for real-time live events
│   │   ├── seed/               # seedData.js with rich demo records
│   │   ├── app.js              # Express app setup
│   │   └── server.js           # Server entry point with Socket.IO & background worker
│   ├── tests/                  # 4 Jest/Supertest integration test suites (25 tests)
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/         # Navbar, Sidebar, LiveTimer, QRViewer, StatusBadge, Modal...
│   │   ├── context/            # AuthContext, SocketContext
│   │   ├── pages/
│   │   │   ├── Login.jsx       # 5-role portal switcher with one-click demo credentials
│   │   │   ├── Register.jsx    # Student registration with mandatory parent contacts
│   │   │   ├── student/        # StudentPortal: Dashboard, Day Outpass, Home Leave, QR ID...
│   │   │   ├── warden/         # WardenPortal: Approvals, Movements, Grace/Late Monitor...
│   │   │   ├── dean/           # DeanPortal: Campus Overview, Leave Approvals, Reports...
│   │   │   ├── guard/          # GuardKiosk: Camera scanner, Big ALLOW/DENY decision card...
│   │   │   └── admin/          # AdminPortal: Student Directory, Staff Provisioning, Gates...
│   │   ├── services/           # api.js, socket.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── docs/
│   ├── ARCHITECTURE.md         # Detailed architectural design & state machines
│   ├── API_DOCUMENTATION.md    # Complete REST API specifications
│   ├── ROLE_PERMISSION_MATRIX.md # Permission matrix across all 5 roles
│   └── DEPLOYMENT_GUIDE.md     # Production deployment instructions
├── start-all.bat               # Windows one-click launcher
└── README.md
```

---

## 🏛️ MCA Major Project Compliance Checklist

- [x] Exact 5 roles: `STUDENT`, `WARDEN`, `DEAN`, `ADMIN`, `SECURITY_GUARD`.
- [x] Teacher role completely removed everywhere.
- [x] Parent login completely removed (contact-only for notifications).
- [x] Strict server-side RBAC & role cross-checking on login.
- [x] Generic login errors and 15-minute brute-force lockout.
- [x] Public student signup forces `STUDENT` role with mandatory parent details.
- [x] Permanent QR identity (`QR-STU-COER253028008`) verified server-side.
- [x] Flexible Home Leave duration calculated dynamically (no fixed 10 or 30 days).
- [x] Fixed gate scanner authentication with hashed API credentials.
- [x] Security Guard kiosk view strips parent contact details.
- [x] Strict movement state machine (`INSIDE` <-> `OUTSIDE`) with idempotency.
- [x] Authoritative timer based strictly on approved start and end.
- [x] 10-minute return reminder notification.
- [x] 15-minute grace period entry permitted (`grace_extension_used = true`).
- [x] Overdue return marked `LATE` with calculated late minutes.
- [x] No-show detection when student never exited.
- [x] Student ownership checks prevent cross-student data leakage.
- [x] Scalable server-side pagination for 5,000+ students.
- [x] Immutable audit trail for all administrative actions.
- [x] Security events monitoring for suspicious attempts.
- [x] Last active Administrator cannot be deactivated.
- [x] All 25 automated tests passing with 0 errors.
