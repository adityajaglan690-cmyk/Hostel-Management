# Role & Permission Matrix: Hostel Outpass Management Dashboard

## Exact Role Structure
The system has **EXACTLY FIVE** roles. 
- **TEACHER IS STRICTLY EXCLUDED** (no login, no APIs, no database model).
- **PARENT IS A NOTIFICATION-ONLY CONTACT ENTITY** (no login, cannot edit data).

| Feature / Action | STUDENT | WARDEN | DEAN | ADMIN | SECURITY GUARD |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Login via Official ID & Password** | Yes | Yes | Yes | Yes | Yes |
| **Cross-Portal Login Prevention** | Enforced | Enforced | Enforced | Enforced | Enforced |
| **Self-Registration (Public)** | Yes | No | No | No | No |
| **View Own Outpasses & Timer** | Yes | No | No | No | No |
| **Apply Standard Outpass** | Yes | No | No | No | No |
| **Apply Home Leave (Flexible)** | Yes | No | No | No | No |
| **Apply Emergency Leave** | Yes | No | No | No | No |
| **Cancel Outpass (Before Exit)** | Yes | No | No | No | No |
| **Request Outpass Extension** | Yes | No | No | No | No |
| **View Own Parent Details** | Read-Only | Read-Only | Read-Only | Read-Only | No |
| **Edit Parent Details (With Audit)** | Forbidden | Yes | Yes | Yes | Forbidden |
| **Approve/Reject Outpass** | Forbidden | Yes (Hostel) | Yes (All) | Yes | Forbidden |
| **Approve Extension Request** | Forbidden | Yes (Hostel) | Yes (All) | Yes | Forbidden |
| **View Assigned Hostel Students** | Forbidden | Yes | Yes | Yes | Forbidden |
| **View Master Student Directory** | Forbidden | Yes (Scoped) | Yes | Yes | Forbidden |
| **Gate QR Scan & Verification** | Forbidden | Forbidden | Forbidden | Yes | Yes |
| **View Guard Operational Kiosk** | Forbidden | Forbidden | Forbidden | Yes | Yes |
| **View Parent Contact Info at Gate** | Forbidden | Forbidden | Forbidden | Forbidden | **Forbidden** |
| **Revoke / Regenerate QR Code** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **Provision Staff Accounts** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **Manage Gates & Scanners** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **Rotate Scanner Credentials** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **Bulk CSV Student Ingestion** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **View Audit Trail Logs** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **View Security Events Monitor** | Forbidden | Forbidden | Forbidden | Yes | Forbidden |
| **Publish Notices** | Forbidden | Yes (Hostel) | Yes (Campus) | Yes | Forbidden |
| **Export Data (CSV / Excel)** | Forbidden | Forbidden | Yes | Yes | Forbidden |
| **System Settings (Curfew / Grace)**| Forbidden | Forbidden | Forbidden | Yes | Forbidden |

---

## Acceptance Constraints Verified
1. **Student cannot login as Warden/Dean/Admin/Guard**: Tested and rejected with 403 Forbidden.
2. **Warden cannot login as Student**: Tested and rejected with 403 Forbidden.
3. **Role switching in JWT or frontend**: Cross-checked with fresh database record on every protected request.
4. **Student ownership checks**: Student A cannot view or modify Student B's outpass or parent records.
5. **Security Guard privacy**: Guard responses strictly strip parent phone numbers, emails, and full student directories.
6. **Parent cannot login**: No user record exists for parents; role string `'PARENT'` returns 400 Bad Request.
7. **Teacher does not exist**: No code, database model, or route recognizes a Teacher role.
8. **Last active Admin protection**: Deactivating or deleting the last active Admin is rejected with 403 Forbidden.
