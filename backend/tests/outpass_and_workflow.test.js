const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seedDatabase = require('../src/seed/seedData');
const OutpassRequest = require('../src/models/OutpassRequest');
const QRAuthorization = require('../src/models/QRAuthorization');
const Student = require('../src/models/Student');

let studentToken;
let wardenToken;
let deanToken;
let student2Token;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_MEMORY_DB = 'true';
  await connectDB();
  await seedDatabase(true);

  // Login Student 1 (Aditya Sharma - COER253028008)
  const sRes = await request(app).post('/api/auth/login').send({
    college_id: 'COER253028008',
    password: 'Student@123',
    role: 'STUDENT'
  });
  studentToken = sRes.body.token;

  // Login Student 2 (Priya Patel - COER253028009)
  const s2Res = await request(app).post('/api/auth/login').send({
    college_id: 'COER253028009',
    password: 'Student@123',
    role: 'STUDENT'
  });
  student2Token = s2Res.body.token;

  // Login Warden (Dr. Rajesh Kumar - WRD-101)
  const wRes = await request(app).post('/api/auth/login').send({
    college_id: 'WRD-101',
    password: 'Warden@123',
    role: 'WARDEN'
  });
  wardenToken = wRes.body.token;

  // Login Dean (Prof. Meenakshi Verma - DEN-201)
  const dRes = await request(app).post('/api/auth/login').send({
    college_id: 'DEN-201',
    password: 'Dean@123',
    role: 'DEAN'
  });
  deanToken = dRes.body.token;
});

afterAll(async () => {
  await disconnectDB();
});

describe('Outpass & Leave Workflow Tests', () => {
  test('1. Student can apply for flexible Home Leave (20 days) - Not restricted to 10 or 30 days', async () => {
    const now = new Date();
    const startDate = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const endDate = new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000); // 20 days duration

    const res = await request(app)
      .post('/api/outpasses')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({
        type: 'HOME_LEAVE',
        reason: 'Mid-term break at home',
        destination: 'Jaipur, Rajasthan',
        home_address: '44 Malviya Nagar, Jaipur',
        requested_start_time: startDate,
        requested_end_time: endDate
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.outpass.type).toBe('HOME_LEAVE');
    expect(res.body.outpass.approved_duration_minutes).toBe(20 * 24 * 60); // 20 days dynamically calculated
  });

  test('2. Warden can view pending outpasses and approve request', async () => {
    // Fetch pending
    const listRes = await request(app)
      .get('/api/outpasses/pending')
      .set('Authorization', `Bearer ${wardenToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);

    const pendingPass = listRes.body.data[0];

    // Approve
    const approveRes = await request(app)
      .put(`/api/outpasses/${pendingPass._id}/approve`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({
        comment: 'Verified and approved by Warden'
      });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.success).toBe(true);
    expect(approveRes.body.outpass.status).toBe('APPROVED');

    // Verify QR Authorization was activated
    const qrAuth = await QRAuthorization.findOne({ outpass_id: pendingPass._id });
    expect(qrAuth).toBeDefined();
    expect(qrAuth.status).toBe('ACTIVE');
  });

  test('3. Student Ownership: Student A cannot view or access Student B outpass', async () => {
    // Get Student 2's outpasses
    const s2Student = await Student.findOne({ student_id: 'COER253028009' });
    const s2Outpass = await OutpassRequest.findOne({ student_id: s2Student._id });

    // Student 1 tries to access Student 2's outpass
    const res = await request(app)
      .get(`/api/outpasses/${s2Outpass._id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot view another student/i);
  });

  test('4. Student can cancel their own PENDING outpass', async () => {
    // Create a fresh pending outpass for Student 1 in future
    const now = new Date();
    const createRes = await request(app)
      .post('/api/outpasses')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        type: 'OUTPASS',
        reason: 'Doctor consultation',
        destination: 'City Hospital',
        requested_start_time: new Date(now.getTime() + 50 * 60 * 60 * 1000),
        requested_end_time: new Date(now.getTime() + 54 * 60 * 60 * 1000)
      });

    expect(createRes.status).toBe(201);
    const passId = createRes.body.outpass._id;

    // Cancel
    const cancelRes = await request(app)
      .post(`/api/outpasses/${passId}/cancel`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ reason: 'Appointment rescheduled' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.outpass.status).toBe('CANCELLED');
  });
});
