# API Documentation: Hostel Outpass Management Dashboard

## Base URL
`/api`

## Authentication & Headers
- **JWT Authorization**: `Authorization: Bearer <token>`
- **Hardware Scanner Credentials**:
  - `x-scanner-code: SCANNER-001`
  - `x-api-key: SCN-KEY-MAIN-001`
  - `x-gate-code: GATE-001`

---

## 1. Authentication APIs (`/api/auth`)

### `POST /api/auth/login`
Universal login with strict role cross-checking and brute-force protection.
- **Request Body**:
  ```json
  {
    "college_id": "COER253028008",
    "password": "Student@123",
    "role": "STUDENT"
  }
  ```
- **Responses**:
  - `200 OK`: Successful login with JWT and user profile.
  - `401 Unauthorized`: Bad password or unverified ID.
  - `403 Forbidden`: Role mismatch (e.g., student logging in at Warden portal) or account locked.

### `POST /api/auth/register`
Public student self-registration with mandatory parent details. Role is strictly forced to `STUDENT`.
- **Request Body**:
  ```json
  {
    "name": "Aditya Sharma",
    "student_id": "COER253028008",
    "official_email": "student@demo.com",
    "phone": "+91 9876500001",
    "password": "Student@123",
    "course": "MCA",
    "department": "Computer Science & Applications",
    "hostel": "Ramanujan Bhawan",
    "block": "A",
    "floor": 3,
    "room": "302",
    "academic_year": "2025-2026",
    "semester": 4,
    "parent_name": "Ramesh Sharma",
    "parent_relationship": "Father",
    "parent_phone": "+91 9876543210",
    "parent_email": "parent.sharma@demo.com",
    "parent_address": "House 42, Civil Lines, Roorkee"
  }
  ```
- **Response**: `201 Created` with token, student record, and generated permanent QR identity (`QR-STU-COER253028008`).

### `GET /api/auth/profile`
Returns current authenticated user details and linked student/parent record.

---

## 2. Outpass & Leave Workflow APIs (`/api/outpasses`)

### `POST /api/outpasses`
Student submits Outpass, Home Leave, or Emergency Leave.
- **Roles**: `STUDENT`
- **Request Body**:
  ```json
  {
    "type": "HOME_LEAVE",
    "reason": "Mid-term break at home",
    "destination": "Jaipur, Rajasthan",
    "home_address": "44 Malviya Nagar, Jaipur",
    "requested_start_time": "2026-09-15T14:00:00Z",
    "requested_end_time": "2026-09-30T18:00:00Z"
  }
  ```
- **Response**: `201 Created` with dynamically calculated duration.

### `GET /api/outpasses/my?page=1&limit=10&status=APPROVED`
Paginated history of the authenticated student's own outpasses.
- **Roles**: `STUDENT`

### `GET /api/outpasses/active`
Fetches current active outpass for live countdown timer calculation.
- **Roles**: `STUDENT`

### `POST /api/outpasses/:id/cancel`
Cancels pending or approved pass before first exit.
- **Roles**: `STUDENT`

### `POST /api/outpasses/:id/extension`
Requests an emergency extension for an approved/active pass.
- **Request Body**:
  ```json
  {
    "reason": "Traffic delay on highway",
    "requested_new_end_time": "2026-09-15T19:00:00Z"
  }
  ```

### `GET /api/outpasses/pending?page=1&limit=20`
Returns pending leave applications for approver review (Warden scope / Dean institute-wide).
- **Roles**: `WARDEN`, `DEAN`, `ADMIN`

### `PUT /api/outpasses/:id/approve`
Approves outpass and activates QR authorization window.
- **Roles**: `WARDEN`, `DEAN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "comment": "Approved by Hostel Warden"
  }
  ```

### `PUT /api/outpasses/:id/reject`
Rejects outpass with mandatory reason.
- **Roles**: `WARDEN`, `DEAN`, `ADMIN`
- **Request Body**:
  ```json
  {
    "rejection_reason": "Curfew restrictions during examination week"
  }
  ```

### `GET /api/outpasses/grace-late`
Returns real-time list of students in the 15-minute grace period or marked LATE.
- **Roles**: `WARDEN`, `DEAN`, `ADMIN`

---

## 3. Gate & Scanner APIs (`/api/gate`)

### `POST /api/gate/scan`
Validates student QR identity and processes ENTRY/EXIT movement transition.
- **Authentication**: Scanner Device API Key or Security Guard Session.
- **Request Body**:
  ```json
  {
    "qr_data": "QR-STU-COER253028008",
    "gate_code": "GATE-001",
    "scanner_code": "SCANNER-001",
    "idempotency_key": "IDEMP-1726055000"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "result": "ALLOWED",
    "eventType": "EXIT",
    "movementTransition": "INSIDE -> OUTSIDE",
    "isGraceEntry": false,
    "isLate": false,
    "student": {
      "name": "Aditya Sharma",
      "student_id": "COER253028008",
      "hostel": "Ramanujan Bhawan",
      "room": "302",
      "movement_status": "OUTSIDE"
    },
    "serverTime": "2026-09-11T14:10:00.000Z"
  }
  ```

### `POST /api/gate/heartbeat`
Fixed scanner sends alive ping.

### `GET /api/gate/logs?gate_id=...&limit=20`
Recent operational scan log for gate kiosk.
- **Roles**: `SECURITY_GUARD`, `ADMIN`, `WARDEN`

---

## 4. Administration & Management APIs (`/api/admin`)

### `GET /api/admin/students?page=1&limit=20&search=...`
Server-side paginated master student list with filters.
- **Roles**: `ADMIN`, `WARDEN`, `DEAN`

### `POST /api/admin/students/import`
Batched CSV ingestion with validation, duplicate rejection, and audit log.
- **Roles**: `ADMIN`

### `POST /api/admin/qr/:studentId/revoke`
Revokes a student's permanent QR code.
- **Roles**: `ADMIN`

### `POST /api/admin/qr/:studentId/regenerate`
Regenerates student permanent QR code.
- **Roles**: `ADMIN`

### `POST /api/admin/users`
Provisions staff accounts (`WARDEN`, `DEAN`, `SECURITY_GUARD`, `ADMIN`).
- **Roles**: `ADMIN`

### `PUT /api/admin/users/:id/status`
Toggles staff account active status. **Protects last active Administrator**.
- **Roles**: `ADMIN`

### `PUT /api/admin/parents/:id`
Updates parent contact details with mandatory audit reason.
- **Roles**: `ADMIN`, `WARDEN`, `DEAN`

### `GET /api/admin/audit-logs`
Fetches chronological audit events.
- **Roles**: `ADMIN`

### `GET /api/admin/security-events`
Fetches suspicious logins, wrong-role attempts, fake scanners, and replay alerts.
- **Roles**: `ADMIN`

### `GET /api/admin/reports/overview`
System metrics, hostel-wise distribution, and leave trend analytics.
- **Roles**: `ADMIN`, `DEAN`, `WARDEN`

---

## 5. Health & Diagnostic API (`/api/health`)

### `GET /api/health`
Returns health status of API, MongoDB database, background reconciliation jobs, and online scanner counts.
- **Public endpoint**:
  ```json
  {
    "status": "HEALTHY",
    "timestamp": "2026-10-10T00:20:00.000Z",
    "uptimeSeconds": 3600,
    "services": {
      "api": "UP",
      "database": "UP",
      "backgroundJobs": "RUNNING",
      "scanners": {
        "total": 2,
        "online": 2
      }
    }
  }
  ```
