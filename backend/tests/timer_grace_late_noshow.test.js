const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seedDatabase = require('../src/seed/seedData');
const Student = require('../src/models/Student');
const OutpassRequest = require('../src/models/OutpassRequest');
const ScanService = require('../src/services/scanService');
const BackgroundJobService = require('../src/services/backgroundJobService');
const Gate = require('../src/models/Gate');
const GateScanner = require('../src/models/GateScanner');
const User = require('../src/models/User');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_MEMORY_DB = 'true';
  await connectDB();
  await seedDatabase(true);
});

afterAll(async () => {
  await disconnectDB();
});

describe('Timer, Grace Period, Late Return & No-Show Tests', () => {
  test('1. Timer is STRICTLY based on approved start and end time (not first exit)', async () => {
    const student = await Student.findOne({ student_id: 'COER253028008' });
    const now = new Date();
    const approvedStart = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const approvedEnd = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour in future

    const pass = await OutpassRequest.create({
      student_id: student._id,
      type: 'OUTPASS',
      reason: 'Urgent Lab Component',
      destination: 'Roorkee',
      requested_start_time: approvedStart,
      requested_end_time: approvedEnd,
      approved_start_time: approvedStart,
      approved_end_time: approvedEnd,
      timer_started_at: approvedStart,
      expires_at: approvedEnd,
      status: 'APPROVED'
    });

    // Simulate first exit occurring now (1 hour after approved start)
    student.movement_status = 'INSIDE';
    await student.save();

    const gate = await Gate.findOne({ gate_code: 'GATE-001' });
    const scanner = await GateScanner.findOne({ scanner_code: 'SCANNER-001' });

    const scanRes = await ScanService.processScan({
      qr_data: student.permanent_qr_id,
      scanner,
      gate
    });

    expect(scanRes.result).toBe('ALLOWED');
    expect(scanRes.eventType).toBe('EXIT');

    // Verify expiry did NOT shift to (now + 2 hours)
    const updatedPass = await OutpassRequest.findById(pass._id);
    expect(new Date(updatedPass.expires_at).getTime()).toBe(approvedEnd.getTime());
  });

  test('2. 15-Minute Grace Period: Student returns during grace -> ENTRY ALLOWED', async () => {
    const student = await Student.findOne({ student_id: 'COER253028011' }); // Ananya Roy
    const now = new Date();
    // Set approved window that ended 5 minutes ago (within 15-min grace period)
    const expired5MinsAgo = new Date(now.getTime() - 5 * 60 * 1000);
    const start2HoursAgo = new Date(now.getTime() - 125 * 60 * 1000);

    const outpass = await OutpassRequest.create({
      student_id: student._id,
      type: 'OUTPASS',
      reason: 'Medical checkup',
      destination: 'Clinic',
      requested_start_time: start2HoursAgo,
      requested_end_time: expired5MinsAgo,
      approved_start_time: start2HoursAgo,
      approved_end_time: expired5MinsAgo,
      timer_started_at: start2HoursAgo,
      expires_at: expired5MinsAgo,
      status: 'ACTIVE',
      first_exit_at: start2HoursAgo
    });

    // Student is currently OUTSIDE
    student.movement_status = 'OUTSIDE';
    await student.save();

    const gate = await Gate.findOne({ gate_code: 'GATE-001' });
    const scanner = await GateScanner.findOne({ scanner_code: 'SCANNER-001' });

    // Student scans entry during grace
    const scanRes = await ScanService.processScan({
      qr_data: student.permanent_qr_id,
      scanner,
      gate
    });

    expect(scanRes.result).toBe('ALLOWED');
    expect(scanRes.eventType).toBe('ENTRY');
    expect(scanRes.isGraceEntry).toBe(true);

    const refreshedPass = await OutpassRequest.findById(outpass._id);
    expect(refreshedPass.grace_extension_used).toBe(true);
    expect(refreshedPass.return_status).toBe('ON_TIME');
  });

  test('3. After 15-Minute Grace Period without return: Marked LATE with minutes calculated', async () => {
    const student = await Student.findOne({ student_id: 'COER253028012' }); // Kunal Verma
    const now = new Date();
    // Ended 30 minutes ago (15 minutes past grace)
    const ended30MinsAgo = new Date(now.getTime() - 30 * 60 * 1000);

    const outpass = await OutpassRequest.create({
      student_id: student._id,
      type: 'OUTPASS',
      reason: 'Bank visit',
      destination: 'City Bank',
      requested_start_time: new Date(now.getTime() - 150 * 60 * 1000),
      requested_end_time: ended30MinsAgo,
      approved_start_time: new Date(now.getTime() - 150 * 60 * 1000),
      approved_end_time: ended30MinsAgo,
      timer_started_at: new Date(now.getTime() - 150 * 60 * 1000),
      expires_at: ended30MinsAgo,
      status: 'ACTIVE',
      first_exit_at: new Date(now.getTime() - 150 * 60 * 1000)
    });

    student.movement_status = 'OUTSIDE';
    await student.save();

    // Trigger reconciliation job
    await BackgroundJobService.runReconciliation();

    const updatedPass = await OutpassRequest.findById(outpass._id);
    expect(updatedPass.status).toBe('LATE');
    expect(updatedPass.return_status).toBe('LATE');
    expect(updatedPass.late_minutes).toBeGreaterThanOrEqual(25);
  });

  test('4. No-Show Detection: Approved outpass ended and student never exited', async () => {
    const student = await Student.findOne({ student_id: 'COER253028010' });
    const now = new Date();
    const expired25MinsAgo = new Date(now.getTime() - 25 * 60 * 1000);

    const outpass = await OutpassRequest.create({
      student_id: student._id,
      type: 'OUTPASS',
      reason: 'Shopping',
      destination: 'Market',
      requested_start_time: new Date(now.getTime() - 120 * 60 * 1000),
      requested_end_time: expired25MinsAgo,
      approved_start_time: new Date(now.getTime() - 120 * 60 * 1000),
      approved_end_time: expired25MinsAgo,
      expires_at: expired25MinsAgo,
      status: 'APPROVED',
      first_exit_at: null // Never exited
    });

    student.movement_status = 'INSIDE';
    await student.save();

    await BackgroundJobService.runReconciliation();

    const updatedPass = await OutpassRequest.findById(outpass._id);
    expect(updatedPass.status).toBe('NO_SHOW');
  });

  test('5. Admin Safeguard: Last active Administrator cannot be deactivated', async () => {
    // Login Admin
    const aRes = await request(app).post('/api/auth/login').send({
      college_id: 'ADM-001',
      password: 'Admin@123',
      role: 'ADMIN'
    });
    const adminToken = aRes.body.token;

    const adminUser = await User.findOne({ college_id: 'ADM-001' });

    // Attempt to deactivate the only active admin
    const res = await request(app)
      .put(`/api/admin/users/${adminUser._id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Accidental deactivation attempt' });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot deactivate the last active/i);
  });
});
