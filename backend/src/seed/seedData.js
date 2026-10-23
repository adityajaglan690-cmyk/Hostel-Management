const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const Gate = require('../models/Gate');
const GateScanner = require('../models/GateScanner');
const OutpassRequest = require('../models/OutpassRequest');
const QRAuthorization = require('../models/QRAuthorization');
const Notice = require('../models/Notice');
const SystemSetting = require('../models/SystemSetting');
const { ROLES, USER_STATUS, OUTPASS_STATUS, GATE_STATUS, SCANNER_STATUS, LEAVE_TYPES, MOVEMENT_STATUS } = require('../config/constants');

const seedDatabase = async (force = false) => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0 && !force) {
      console.log('[Seed] Database already seeded. Skipping initial seed.');
      return;
    }

    if (force) {
      console.log('[Seed] Force flag active: clearing existing collections...');
      await Promise.all([
        User.deleteMany({}),
        Student.deleteMany({}),
        Parent.deleteMany({}),
        Gate.deleteMany({}),
        GateScanner.deleteMany({}),
        OutpassRequest.deleteMany({}),
        QRAuthorization.deleteMany({}),
        Notice.deleteMany({}),
        SystemSetting.deleteMany({})
      ]);
    }

    console.log('[Seed] Seeding realistic demo data with EXACT 5 ROLES...');

    // 1. Password Hashes
    const studentPass = await bcrypt.hash('Student@123', 10);
    const wardenPass = await bcrypt.hash('Warden@123', 10);
    const deanPass = await bcrypt.hash('Dean@123', 10);
    const adminPass = await bcrypt.hash('Admin@123', 10);
    const guardPass = await bcrypt.hash('Guard@123', 10);

    // 2. Demo Users for All 5 Roles
    const [uStudent, uWarden, uDean, uAdmin, uGuard] = await Promise.all([
      User.create({
        college_id: 'COER253028008',
        name: 'Aditya Sharma',
        official_email: 'student@demo.com',
        phone: '+91 9876500001',
        password_hash: studentPass,
        role: ROLES.STUDENT,
        status: USER_STATUS.ACTIVE
      }),
      User.create({
        college_id: 'WRD-101',
        name: 'Dr. Rajesh Kumar',
        official_email: 'warden@demo.com',
        phone: '+91 9876500002',
        password_hash: wardenPass,
        role: ROLES.WARDEN,
        status: USER_STATUS.ACTIVE
      }),
      User.create({
        college_id: 'DEN-201',
        name: 'Prof. Meenakshi Verma',
        official_email: 'dean@demo.com',
        phone: '+91 9876500003',
        password_hash: deanPass,
        role: ROLES.DEAN,
        status: USER_STATUS.ACTIVE
      }),
      User.create({
        college_id: 'ADM-001',
        name: 'Vikram Malhotra',
        official_email: 'admin@demo.com',
        phone: '+91 9876500004',
        password_hash: adminPass,
        role: ROLES.ADMIN,
        status: USER_STATUS.ACTIVE
      }),
      User.create({
        college_id: 'GRD-301',
        name: 'Surender Singh',
        official_email: 'guard@demo.com',
        phone: '+91 9876500005',
        password_hash: guardPass,
        role: ROLES.SECURITY_GUARD,
        status: USER_STATUS.ACTIVE
      })
    ]);

    // 3. Student Record (Aditya Sharma)
    const permanentQrId = 'QR-STU-COER253028008';
    const sStudent = await Student.create({
      user_id: uStudent._id,
      student_id: 'COER253028008',
      name: 'Aditya Sharma',
      course: 'MCA (Master of Computer Applications)',
      department: 'Computer Science & Applications',
      hostel: 'Ramanujan Bhawan',
      block: 'A',
      floor: 3,
      room: '302',
      academic_year: '2025-2026',
      semester: 4,
      permanent_qr_id: permanentQrId,
      movement_status: MOVEMENT_STATUS.INSIDE,
      status: 'ACTIVE'
    });

    // 4. Parent Record (Non-login, contact only, student_editable: false)
    const pParent = await Parent.create({
      student_id: sStudent._id,
      name: 'Ramesh Sharma',
      relationship: 'Father',
      phone: '+91 9876543210',
      email: 'parent.sharma@demo.com',
      address: 'House 42, Civil Lines, Roorkee, Uttarakhand - 247667',
      verified: true,
      student_editable: false
    });

    sStudent.parent_id = pParent._id;
    await sStudent.save();

    // 5. Additional Realistic Students for Scalability & Hostel Views
    const extraStudentsData = [
      { id: 'COER253028009', name: 'Priya Patel', course: 'B.Tech CSE', dept: 'Computer Science', hostel: 'Gargi Bhawan', block: 'B', floor: 2, room: '204', pName: 'Suresh Patel', pPhone: '+91 9876543211', pEmail: 'suresh.patel@demo.com' },
      { id: 'COER253028010', name: 'Rohan Gupta', course: 'MCA', dept: 'Computer Science', hostel: 'Ramanujan Bhawan', block: 'A', floor: 1, room: '108', pName: 'Alok Gupta', pPhone: '+91 9876543212', pEmail: 'alok.gupta@demo.com' },
      { id: 'COER253028011', name: 'Ananya Roy', course: 'B.Tech ECE', dept: 'Electronics', hostel: 'Gargi Bhawan', block: 'A', floor: 3, room: '312', pName: 'Debabrata Roy', pPhone: '+91 9876543213', pEmail: 'debabrata.roy@demo.com' },
      { id: 'COER253028012', name: 'Kunal Verma', course: 'B.Tech Mechanical', dept: 'Mechanical Engineering', hostel: 'Aryabhata Bhawan', block: 'C', floor: 2, room: '215', pName: 'Mahesh Verma', pPhone: '+91 9876543214', pEmail: 'mahesh.verma@demo.com' }
    ];

    for (const ex of extraStudentsData) {
      const uEx = await User.create({
        college_id: ex.id,
        name: ex.name,
        official_email: `${ex.id.toLowerCase()}@demo.com`,
        phone: '+91 9876599999',
        password_hash: studentPass,
        role: ROLES.STUDENT,
        status: USER_STATUS.ACTIVE
      });

      const sEx = await Student.create({
        user_id: uEx._id,
        student_id: ex.id,
        name: ex.name,
        course: ex.course,
        department: ex.dept,
        hostel: ex.hostel,
        block: ex.block,
        floor: ex.floor,
        room: ex.room,
        academic_year: '2025-2026',
        semester: 4,
        permanent_qr_id: `QR-STU-${ex.id}`,
        movement_status: MOVEMENT_STATUS.INSIDE,
        status: 'ACTIVE'
      });

      const pEx = await Parent.create({
        student_id: sEx._id,
        name: ex.pName,
        relationship: 'Father',
        phone: ex.pPhone,
        email: ex.pEmail,
        address: 'Campus Enclave, University Town',
        verified: true,
        student_editable: false
      });

      sEx.parent_id = pEx._id;
      await sEx.save();
    }

    // 6. Gates Setup
    const [gate1, gate2, gate3] = await Promise.all([
      Gate.create({
        gate_code: 'GATE-001',
        gate_name: 'Main Campus Gate',
        location: 'South Highway Entry Post',
        status: GATE_STATUS.OPEN
      }),
      Gate.create({
        gate_code: 'GATE-002',
        gate_name: 'North Campus Gate',
        location: 'Hostel Ring Road Post',
        status: GATE_STATUS.OPEN
      }),
      Gate.create({
        gate_code: 'GATE-003',
        gate_name: 'Sports Complex Gate',
        location: 'West Perimeter Road',
        status: GATE_STATUS.CLOSED
      })
    ]);

    // 7. Scanners Setup with Predefined API Keys
    const scannerKeyHash1 = await bcrypt.hash('SCN-KEY-MAIN-001', 10);
    const scannerKeyHash2 = await bcrypt.hash('SCN-KEY-NORTH-002', 10);

    await Promise.all([
      GateScanner.create({
        scanner_code: 'SCANNER-001',
        scanner_name: 'Main Gate Turnstile Camera A',
        gate_id: gate1._id,
        api_key_hash: scannerKeyHash1,
        status: SCANNER_STATUS.ONLINE
      }),
      GateScanner.create({
        scanner_code: 'SCANNER-002',
        scanner_name: 'North Gate Kiosk Scanner B',
        gate_id: gate2._id,
        api_key_hash: scannerKeyHash2,
        status: SCANNER_STATUS.ONLINE
      })
    ]);

    // 8. Active Approved Outpass for Aditya Sharma
    // Window: 2 hours ago to 3 hours in future (Immediately ready for testing live QR & timer)
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 60 * 1000); // started 30 mins ago
    const endTime = new Date(now.getTime() + 2.5 * 60 * 60 * 1000); // expires in 2.5 hours
    const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));

    const activeOutpass = await OutpassRequest.create({
      student_id: sStudent._id,
      type: LEAVE_TYPES.OUTPASS,
      reason: 'Personal Work & Project Hardware Purchase',
      destination: 'Roorkee Central Market',
      requested_start_time: startTime,
      requested_end_time: endTime,
      approved_start_time: startTime,
      approved_end_time: endTime,
      approved_duration_minutes: durationMinutes,
      timer_started_at: startTime,
      expires_at: endTime,
      status: OUTPASS_STATUS.APPROVED,
      approved_by: uWarden._id,
      approval_comment: 'Approved by Hostel Warden Dr. Rajesh Kumar',
      expected_return: endTime
    });

    // Create Active QR Authorization for Aditya's outpass
    const graceEnd = new Date(endTime.getTime() + 15 * 60 * 1000);
    await QRAuthorization.create({
      student_id: sStudent._id,
      permanent_qr_id: permanentQrId,
      outpass_id: activeOutpass._id,
      status: 'ACTIVE',
      timer_started_at: startTime,
      expires_at: endTime,
      grace_entry_until: graceEnd,
      grace_extension_used: false
    });

    // 9. Sample Pending Outpass (for Warden to approve)
    const tomorrow10AM = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrow5PM = new Date(now.getTime() + 31 * 60 * 60 * 1000);
    await OutpassRequest.create({
      student_id: (await Student.findOne({ student_id: 'COER253028009' }))._id,
      type: LEAVE_TYPES.OUTPASS,
      reason: 'Library Research & Book Return',
      destination: 'IIT Roorkee Central Library',
      requested_start_time: tomorrow10AM,
      requested_end_time: tomorrow5PM,
      approved_duration_minutes: 420,
      status: OUTPASS_STATUS.PENDING
    });

    // 10. Sample Flexible Home Leave (15 Days Duration - Proves dynamic duration calculation)
    const leaveStart = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    const leaveEnd = new Date(now.getTime() + (48 + 15 * 24) * 60 * 60 * 1000); // 15 days later
    await OutpassRequest.create({
      student_id: (await Student.findOne({ student_id: 'COER253028010' }))._id,
      type: LEAVE_TYPES.HOME_LEAVE,
      reason: 'Family Function & Mid-Semester Vacation',
      destination: 'Haldwani, Nainital District',
      home_address: '42 Hill View Colony, Haldwani',
      requested_start_time: leaveStart,
      requested_end_time: leaveEnd,
      approved_duration_minutes: 15 * 24 * 60,
      status: OUTPASS_STATUS.PENDING
    });

    // 11. Notices
    await Notice.create({
      title: 'Hostel Curfew & Gate Timing Policy Update',
      content: 'All hostel residents are advised that evening gate closure will strictly be enforced at 10:00 PM. Grace entries will be logged for administrative review.',
      type: 'CURFEW',
      target_role: 'ALL',
      published_by: uDean._id
    });

    await Notice.create({
      title: 'Holiday Movement Guidelines: Holi Festival',
      content: 'Students applying for Home Leave for the upcoming festival can submit flexible duration requests. Approvals will be processed by respective block wardens.',
      type: 'HOLIDAY',
      target_role: 'STUDENT',
      published_by: uWarden._id
    });

    // 12. System Settings
    await Promise.all([
      SystemSetting.create({ key: 'curfew_time', value: '22:00', description: 'Campus evening curfew cutoff' }),
      SystemSetting.create({ key: 'grace_period_minutes', value: 15, description: 'Post-expiry entry grace duration' }),
      SystemSetting.create({ key: 'reminder_window_minutes', value: 10, description: 'Return reminder alert minutes before expiry' })
    ]);

    console.log('[Seed] Database successfully populated with realistic demo accounts:');
    console.log('   Student:        student@demo.com | Student@123 | ID: COER253028008');
    console.log('   Warden:         warden@demo.com  | Warden@123  | ID: WRD-101');
    console.log('   Dean:           dean@demo.com    | Dean@123    | ID: DEN-201');
    console.log('   Admin:          admin@demo.com   | Admin@123   | ID: ADM-001');
    console.log('   Security Guard: guard@demo.com   | Guard@123   | ID: GRD-301');
  } catch (err) {
    console.error('[Seed] Seeding error:', err);
  }
};

module.exports = seedDatabase;
