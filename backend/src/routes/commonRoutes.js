const express = require('express');
const router = express.Router();
const CommonControllers = require('../controllers/commonControllers');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

router.use(authenticate);

// Notices
router.get('/notices', CommonControllers.getNotices);
router.post('/notices', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), CommonControllers.createNotice);
router.put('/notices/:id', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), CommonControllers.updateNotice);

// Incidents
router.get('/incidents', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN, ROLES.SECURITY_GUARD), CommonControllers.getIncidents);
router.post('/incidents', authorize(ROLES.SECURITY_GUARD, ROLES.WARDEN, ROLES.ADMIN), CommonControllers.createIncident);
router.put('/incidents/:id', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), CommonControllers.updateIncident);

// Notifications
router.get('/notifications', CommonControllers.getMyNotifications);
router.put('/notifications/:id/read', CommonControllers.markNotificationRead);

module.exports = router;
