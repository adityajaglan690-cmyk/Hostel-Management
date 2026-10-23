const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seedDatabase = require('../src/seed/seedData');
const Student = require('../src/models/Student');
const OutpassRequest = require('../src/models/OutpassRequest');
const ScanLog = require('../src/models/ScanLog');
const Gate = require('../src/models/Gate');

let guardToken;
const VALID_SCANNER_CODE = 'SCANNER-001';
const VALID_API_KEY = 'SCN-KEY-MAIN-001';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_MEMORY_DB = 'true';
  await connectDB();
  await seedDatabase(true);

  const gRes = await request(app).post('/api/auth/login').send({
    college_id: 'GRD-301',
    password: 'Guard@123',
    role: 'SECURITY_GUARD'
  });
  guardToken = gRes.body.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Gate Scanner & Movement State Machine Tests', () => {
  test('1. Unauthenticated / Fake scanner request is rejected', async () => {
    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', 'FAKE-SCANNER-999')
      .set('x-api-key', 'INVALID-KEY')
      .send({
        qr_data: 'QR-STU-COER253028008'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('2. Scan at a CLOSED gate is rejected', async () => {
    // GATE-003 is seeded as CLOSED
    const res = await request(app)
      .post('/api/gate/scan')
      .set('Authorization', `Bearer ${guardToken}`)
      .send({
        qr_data: 'QR-STU-COER253028008',
        gate_code: 'GATE-003'
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/closed/i);
  });

  test('3. Valid QR scan at Open Gate: Student is INSIDE -> EXIT ALLOWED', async () => {
    // Aditya Sharma has an approved active outpass seeded
    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', VALID_SCANNER_CODE)
      .set('x-api-key', VALID_API_KEY)
      .send({
        qr_data: 'QR-STU-COER253028008'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBe('ALLOWED');
    expect(res.body.eventType).toBe('EXIT');
    expect(res.body.movementTransition).toBe('INSIDE -> OUTSIDE');

    // Verify DB state updated
    const student = await Student.findOne({ student_id: 'COER253028008' });
    expect(student.movement_status).toBe('OUTSIDE');

    // Verify Guard privacy: Parent contact fields must NEVER be sent to Guard
    expect(res.body.student.parent_id).toBeUndefined();
    expect(res.body.student.parentPhone).toBeUndefined();
    expect(res.body.student.parentEmail).toBeUndefined();
  });

  test('4. Immediate duplicate scan triggers Replay Protection (< 3 seconds)', async () => {
    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', VALID_SCANNER_CODE)
      .set('x-api-key', VALID_API_KEY)
      .send({
        qr_data: 'QR-STU-COER253028008'
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('DENIED');
    expect(res.body.rejection_reason).toMatch(/Replay scan detected/i);
  });

  test('5. Duplicate EXIT while student is already OUTSIDE must be DENIED', async () => {
    // Age previous scan beyond replay window (5 seconds ago)
    await ScanLog.updateMany({}, { scanned_at: new Date(Date.now() - 5000) });

    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', VALID_SCANNER_CODE)
      .set('x-api-key', VALID_API_KEY)
      .send({
        qr_data: 'QR-STU-COER253028008',
        event_type: 'EXIT'
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('DENIED');
    expect(res.body.rejection_reason).toMatch(/already.*outside/i);
  });

  test('6. Valid ENTRY scan: Student is OUTSIDE -> ENTRY ALLOWED', async () => {
    await ScanLog.updateMany({}, { scanned_at: new Date(Date.now() - 5000) });

    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', VALID_SCANNER_CODE)
      .set('x-api-key', VALID_API_KEY)
      .send({
        qr_data: 'QR-STU-COER253028008'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.result).toBe('ALLOWED');
    expect(res.body.eventType).toBe('ENTRY');
    expect(res.body.movementTransition).toBe('OUTSIDE -> INSIDE');

    const student = await Student.findOne({ student_id: 'COER253028008' });
    expect(student.movement_status).toBe('INSIDE');
  });

  test('7. Duplicate ENTRY while student is already INSIDE must be DENIED', async () => {
    await ScanLog.updateMany({}, { scanned_at: new Date(Date.now() - 5000) });

    const res = await request(app)
      .post('/api/gate/scan')
      .set('x-scanner-code', VALID_SCANNER_CODE)
      .set('x-api-key', VALID_API_KEY)
      .send({
        qr_data: 'QR-STU-COER253028008',
        event_type: 'ENTRY'
      });

    expect(res.status).toBe(200);
    expect(res.body.result).toBe('DENIED');
    expect(res.body.rejection_reason).toMatch(/already.*inside/i);
  });
});
