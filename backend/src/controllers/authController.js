const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const SecurityEvent = require('../models/SecurityEvent');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { ROLES, USER_STATUS, MAX_LOGIN_ATTEMPTS, LOCK_TIME_MINUTES } = require('../config/constants');
const { logAudit } = require('../services/auditService');

class AuthController {
  /**
   * Universal Login with strict Role Cross-Check & Brute-Force Protection
   */
  static async login(req, res) {
    try {
      const { college_id, password, role } = req.body;

      if (!college_id || !password || !role) {
        return res.status(400).json({
          success: false,
          message: 'College/Employee ID, password, and portal role are required.'
        });
      }

      const cleanCollegeId = college_id.trim().toUpperCase();
      const cleanRole = role.trim().toUpperCase();

      // 1. Verify role is one of the valid 5 roles
      if (!Object.values(ROLES).includes(cleanRole)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid login role specified.'
        });
      }

      // 2. Lookup User
      const user = await User.findOne({ college_id: cleanCollegeId });
      if (!user) {
        // Generic error to prevent user enumeration
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or role mismatch. Please check your credentials.'
        });
      }

      // 3. Check Account Lock Status
      if (user.isLocked()) {
        const remainingMinutes = Math.ceil((user.locked_until - Date.now()) / (1000 * 60));
        return res.status(403).json({
          success: false,
          message: `Account is temporarily locked due to consecutive failed attempts. Try again in ${remainingMinutes} minute(s).`
        });
      }

      if (user.status === USER_STATUS.INACTIVE || user.status === USER_STATUS.SUSPENDED) {
        return res.status(403).json({
          success: false,
          message: `Your account is ${user.status.toLowerCase()}. Please contact system administration.`
        });
      }

      // 4. Verify Password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        user.failed_login_attempts += 1;

        if (user.failed_login_attempts >= MAX_LOGIN_ATTEMPTS) {
          user.locked_until = new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000);
          await user.save();

          await SecurityEvent.create({
            event_type: 'ACCOUNT_LOCKED',
            severity: 'HIGH',
            description: `Account ${cleanCollegeId} locked due to ${MAX_LOGIN_ATTEMPTS} failed attempts.`,
            user_id: user._id,
            college_id: cleanCollegeId,
            ip_address: req.ip
          });

          return res.status(403).json({
            success: false,
            message: `Account has been locked for ${LOCK_TIME_MINUTES} minutes due to excessive failed attempts.`
          });
        }

        await user.save();
        await SecurityEvent.create({
          event_type: 'FAILED_LOGIN_ATTEMPT',
          severity: 'LOW',
          description: `Failed login attempt for ${cleanCollegeId}`,
          user_id: user._id,
          college_id: cleanCollegeId,
          ip_address: req.ip
        });

        return res.status(401).json({
          success: false,
          message: 'Invalid credentials or role mismatch. Please check your credentials.'
        });
      }

      // 5. CRITICAL: Strict Role Cross-Check
      // The selected portal role MUST match the actual database role
      if (user.role !== cleanRole) {
        await SecurityEvent.create({
          event_type: 'WRONG_ROLE_LOGIN_ATTEMPT',
          severity: 'HIGH',
          description: `User ${user.college_id} (Actual Role: ${user.role}) attempted login on ${cleanRole} portal.`,
          user_id: user._id,
          college_id: cleanCollegeId,
          ip_address: req.ip,
          metadata: { actualRole: user.role, attemptedRole: cleanRole }
        });

        return res.status(403).json({
          success: false,
          message: `Access Denied: Your account (${user.role}) is not authorized to access the ${cleanRole} portal.`
        });
      }

      // 6. Reset failed attempts & update last login
      user.failed_login_attempts = 0;
      user.locked_until = null;
      user.last_login_at = new Date();
      await user.save();

      // 7. Generate JWT Token
      const token = jwt.sign(
        {
          userId: user._id,
          collegeId: user.college_id,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // 8. Fetch student profile if Student
      let studentProfile = null;
      if (user.role === ROLES.STUDENT) {
        studentProfile = await Student.findOne({ user_id: user._id }).populate('parent_id');
      }

      // Log successful login
      await logAudit({
        actor: user,
        action: 'LOGIN',
        entity_type: 'User',
        entity_id: user._id,
        reason: 'Successful user authentication',
        req
      });

      return res.status(200).json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          college_id: user.college_id,
          name: user.name,
          email: user.official_email,
          phone: user.phone,
          role: user.role,
          last_login_at: user.last_login_at
        },
        student: studentProfile
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during login'
      });
    }
  }

  /**
   * Public Student Registration
   * Never accepts an arbitrary role - always forces STUDENT.
   * Mandates Parent Details.
   */
  static async registerStudent(req, res) {
    try {
      const {
        student_id,
        name,
        official_email,
        phone,
        password,
        course,
        department,
        hostel,
        block,
        floor,
        room,
        academic_year,
        semester,
        // Parent fields (Mandatory)
        parent_name,
        parent_relationship,
        parent_phone,
        parent_email,
        parent_address
      } = req.body;

      // Validate required student fields
      if (!student_id || !name || !official_email || !phone || !password || !course || !department || !hostel || !room) {
        return res.status(400).json({
          success: false,
          message: 'All student details (Student ID, Name, Email, Phone, Password, Course, Department, Hostel, Room) are required.'
        });
      }

      // Validate mandatory parent fields
      if (!parent_name || !parent_relationship || !parent_phone || !parent_address) {
        return res.status(400).json({
          success: false,
          message: 'Parent contact information is mandatory (Parent Name, Relationship, Phone, Address).'
        });
      }

      const cleanStudentId = student_id.trim().toUpperCase();
      const cleanEmail = official_email.trim().toLowerCase();

      // Check duplicates
      const existingUser = await User.findOne({
        $or: [{ college_id: cleanStudentId }, { official_email: cleanEmail }]
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'A student account with this Student ID or Official Email already exists.'
        });
      }

      // 1. Create User with STRICT role = STUDENT
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await User.create({
        college_id: cleanStudentId,
        name: name.trim(),
        official_email: cleanEmail,
        phone: phone.trim(),
        password_hash: passwordHash,
        role: ROLES.STUDENT, // Strictly STUDENT
        status: USER_STATUS.ACTIVE
      });

      // 2. Generate Permanent QR Identity
      const permanentQrId = `QR-STU-${cleanStudentId}`;

      // 3. Create Student Document
      const student = await Student.create({
        user_id: user._id,
        student_id: cleanStudentId,
        name: name.trim(),
        course: course.trim(),
        department: department.trim(),
        hostel: hostel.trim(),
        block: (block || 'A').trim(),
        floor: Number(floor || 1),
        room: room.trim(),
        academic_year: (academic_year || '2025-2026').trim(),
        semester: Number(semester || 1),
        permanent_qr_id: permanentQrId,
        status: 'ACTIVE'
      });

      // 4. Create Parent Document (student_editable: false)
      const parent = await Parent.create({
        student_id: student._id,
        name: parent_name.trim(),
        relationship: parent_relationship.trim(),
        phone: parent_phone.trim(),
        email: (parent_email || cleanEmail).trim().toLowerCase(),
        address: parent_address.trim(),
        verified: true,
        student_editable: false
      });

      // Link parent to student
      student.parent_id = parent._id;
      await student.save();

      // 5. Generate Token
      const token = jwt.sign(
        {
          userId: user._id,
          collegeId: user.college_id,
          role: user.role
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(201).json({
        success: true,
        message: 'Student account and permanent QR identity created successfully.',
        token,
        user: {
          id: user._id,
          college_id: user.college_id,
          name: user.name,
          email: user.official_email,
          role: user.role
        },
        student: {
          ...student.toObject(),
          parent_id: parent
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error during student registration.'
      });
    }
  }

  static async registerStaff(req, res) {
    try {
      const { college_id, name, official_email, phone, password, role } = req.body;
      if (!college_id || !name || !official_email || !phone || !password || !role) {
        return res.status(400).json({ success: false, message: 'Employee ID, name, official email, phone, password, and role are required.' });
      }

      const cleanRole = role.trim().toUpperCase();
      const allowedRoles = [ROLES.WARDEN, ROLES.DEAN, ROLES.ADMIN, ROLES.SECURITY_GUARD];
      if (!allowedRoles.includes(cleanRole)) {
        return res.status(400).json({ success: false, message: 'Only Warden, Dean, Admin, and Security Guard accounts can use this registration.' });
      }

      const cleanCollegeId = college_id.trim().toUpperCase();
      const cleanEmail = official_email.trim().toLowerCase();
      const existingUser = await User.findOne({ $or: [{ college_id: cleanCollegeId }, { official_email: cleanEmail }] });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'An account with this employee ID or official email already exists.' });
      }

      const user = await User.create({
        college_id: cleanCollegeId,
        name: name.trim(),
        official_email: cleanEmail,
        phone: phone.trim(),
        password_hash: await bcrypt.hash(password, 10),
        role: cleanRole,
        status: USER_STATUS.ACTIVE
      });

      return res.status(201).json({
        success: true,
        message: `${cleanRole} account created successfully. You can now sign in.`,
        user: { id: user._id, college_id: user.college_id, name: user.name, email: user.official_email, role: user.role }
      });
    } catch (error) {
      console.error('Staff registration error:', error);
      return res.status(500).json({ success: false, message: 'Internal server error during account registration.' });
    }
  }

  /**
   * Get Current Authenticated Profile
   */
  static async getProfile(req, res) {
    try {
      const user = req.user;
      let student = null;
      let parent = null;

      if (user.role === ROLES.STUDENT) {
        student = await Student.findOne({ user_id: user._id }).populate('parent_id');
        if (student && student.parent_id) {
          parent = student.parent_id;
        }
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          college_id: user.college_id,
          name: user.name,
          email: user.official_email,
          phone: user.phone,
          role: user.role,
          last_login_at: user.last_login_at
        },
        student,
        parent
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch user profile'
      });
    }
  }
}

module.exports = AuthController;
