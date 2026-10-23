const express = require('express');
const router = express.Router();
const OutpassController = require('../controllers/outpassController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { ROLES } = require('../config/constants');

// All routes require authentication
router.use(authenticate);

// Student endpoints
router.post('/', authorize(ROLES.STUDENT), OutpassController.apply);
router.get('/my', authorize(ROLES.STUDENT), OutpassController.getMyOutpasses);
router.get('/active', authorize(ROLES.STUDENT), OutpassController.getActiveOutpass);
router.post('/:id/cancel', authorize(ROLES.STUDENT), OutpassController.cancel);
router.post('/:id/extension', authorize(ROLES.STUDENT), OutpassController.requestExtension);

// Approver endpoints (Warden, Dean, Admin)
router.get('/pending', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), OutpassController.getPending);
router.put('/:id/approve', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), OutpassController.approve);
router.put('/:id/reject', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), OutpassController.reject);
router.put('/extension/:id/approve', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), OutpassController.approveExtension);

// Monitoring endpoints
router.get('/outside-students', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN, ROLES.SECURITY_GUARD), OutpassController.getOutsideStudents);
router.get('/grace-late', authorize(ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN), OutpassController.getGraceAndLate);

// Specific outpass lookup (enforces student ownership inside controller)
router.get('/:id', OutpassController.getById);

module.exports = router;
