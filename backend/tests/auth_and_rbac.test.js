const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Student = require('../src/models/Student');
const seedDatabase = require('../src/seed/seedData');
const { ROLES } = require('../src/config/constants');

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.USE_MEMORY_DB = 'true';
  await connectDB();
  await seedDatabase(true);
});

afterAll(async () => {
  await disconnectDB();
});

describe('Authentication & Strict RBAC Tests', () => {
  test('1. Student can log in via Student portal with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'COER253028008',
        password: 'Student@123',
        role: 'STUDENT'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe(ROLES.STUDENT);
    expect(res.body.user.college_id).toBe('COER253028008');
  });

  test('2. Student credentials on Warden portal MUST BE REJECTED (Role Cross-Check)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'COER253028008',
        password: 'Student@123',
        role: 'WARDEN' // Attempting to log into Warden portal
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/not authorized to access the WARDEN portal/i);
  });

  test('3. Student credentials on Admin portal MUST BE REJECTED', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'COER253028008',
        password: 'Student@123',
        role: 'ADMIN'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('4. Warden can log in on Warden portal', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'WRD-101',
        password: 'Warden@123',
        role: 'WARDEN'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(ROLES.WARDEN);
  });

  test('5. Warden credentials on Student portal MUST BE REJECTED', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'WRD-101',
        password: 'Warden@123',
        role: 'STUDENT'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('6. Security Guard can log in on Security Guard portal', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'GRD-301',
        password: 'Guard@123',
        role: 'SECURITY_GUARD'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(ROLES.SECURITY_GUARD);
  });

  test('7. Parent cannot log in (Parent is NOT a login role)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'parent.sharma@demo.com',
        password: 'AnyPassword',
        role: 'PARENT'
      });

    expect(res.status).toBe(400); // Invalid login role specified
    expect(res.body.message).toMatch(/Invalid login role/i);
  });

  test('8. Teacher role does NOT exist anywhere in system', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        college_id: 'TCH-001',
        password: 'Teacher@123',
        role: 'TEACHER'
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid login role/i);
  });

  test('9. Public Student registration creates only STUDENT with parent details & permanent QR', async () => {
    const newStudentId = `TEST${Date.now().toString().slice(-6)}`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        student_id: newStudentId,
        name: 'Test Student',
        official_email: `${newStudentId.toLowerCase()}@testcollege.edu`,
        phone: '+91 9123456780',
        password: 'Password@123',
        course: 'MCA',
        department: 'Computer Applications',
        hostel: 'Ramanujan Bhawan',
        block: 'B',
        floor: 2,
        room: '205',
        academic_year: '2025-2026',
        semester: 2,
        role: 'ADMIN', // Injected role must be IGNORED
        parent_name: 'Rajendra Kumar',
        parent_relationship: 'Father',
        parent_phone: '+91 9876543299',
        parent_email: 'rajendra@parent.com',
        parent_address: 'Dehradun, Uttarakhand'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe(ROLES.STUDENT); // STRICTLY STUDENT
    expect(res.body.student.permanent_qr_id).toBe(`QR-STU-${newStudentId}`);
    expect(res.body.student.parent_id).toBeDefined();
    expect(res.body.student.parent_id.student_editable).toBe(false);
  });
});
