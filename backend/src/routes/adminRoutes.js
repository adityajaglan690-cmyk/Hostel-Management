const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const ReportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// All admin routes require authentication and ADMIN role (or Warden/Dean for allowed sub-endpoints)
router.use(authenticate);

// Student management
router.get('/students', authorize(ROLES.ADMIN, ROLES.WARDEN, ROLES.DEAN), AdminController.getStudents);
router.post('/students/import', authorize(ROLES.ADMIN), AdminController.bulkImportStudents);
router.post('/qr/:studentId/revoke', authorize(ROLES.ADMIN), AdminController.revokeQR);
router.post('/qr/:studentId/regenerate', authorize(ROLES.ADMIN), AdminController.regenerateQR);

// Staff user management
router.get('/users', authorize(ROLES.ADMIN), AdminController.getUsers);
router.post('/users', authorize(ROLES.ADMIN), AdminController.createUser);
router.put('/users/:id/status', authorize(ROLES.ADMIN), AdminController.toggleUserStatus);

// Gate & Scanner management
router.post('/gates', authorize(ROLES.ADMIN), AdminController.createGate);
router.put('/gates/:id/status', authorize(ROLES.ADMIN), AdminController.updateGateStatus);
router.post('/scanners', authorize(ROLES.ADMIN), AdminController.registerScanner);
router.post('/scanners/:id/rotate-credentials', authorize(ROLES.ADMIN), AdminController.rotateScannerKey);

// Parent details modification (Strictly Warden / Dean / Admin only with audit log)
router.put('/parents/:id', authorize(ROLES.ADMIN, ROLES.WARDEN, ROLES.DEAN), AdminController.updateParentDetails);

// Audits & Security Events
router.get('/audit-logs', authorize(ROLES.ADMIN), AdminController.getAuditLogs);
router.get('/security-events', authorize(ROLES.ADMIN), AdminController.getSecurityEvents);

// System Settings
router.get('/system-settings', authorize(ROLES.ADMIN), AdminController.getSettings);
router.put('/system-settings', authorize(ROLES.ADMIN), AdminController.updateSetting);

// Reports & Data Export
router.get('/reports/overview', authorize(ROLES.ADMIN, ROLES.DEAN, ROLES.WARDEN), ReportController.getOverviewMetrics);
router.get('/reports/export', authorize(ROLES.ADMIN, ROLES.DEAN), ReportController.exportOutpassCSV);

module.exports = router;
