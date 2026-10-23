const User = require('../models/User');
const Student = require('../models/Student');
const Parent = require('../models/Parent');
const bcrypt = require('bcryptjs');
const { ROLES, USER_STATUS } = require('../config/constants');
const { logAudit } = require('./auditService');

class ImportExportService {
  /**
   * Process and validate bulk student records from CSV rows
   * Safe batch insertion with row-level validation and duplicate avoidance
   */
  static async processBulkStudentImport(rows, adminUser, req = null) {
    const results = {
      total: rows.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
      importedStudents: []
    };

    const BATCH_SIZE = 50;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      for (let j = 0; j < batch.length; j++) {
        const rowNum = i + j + 1;
        const row = batch[j];

        try {
          // 1. Mandatory Field Validation
          const collegeId = (row.student_id || row.college_id || '').trim().toUpperCase();
          const name = (row.name || '').trim();
          const email = (row.email || row.official_email || '').trim().toLowerCase();
          const phone = (row.phone || '').trim();
          const course = (row.course || '').trim();
          const department = (row.department || '').trim();
          const hostel = (row.hostel || '').trim();
          const block = (row.block || 'A').trim();
          const floor = Number(row.floor || 1);
          const room = (row.room || '101').trim();
          const academicYear = (row.academic_year || '2025-2026').trim();
          const semester = Number(row.semester || 1);
          const password = (row.password || 'Student@123').trim();

          // Parent details (Mandatory)
          const parentName = (row.parent_name || '').trim();
          const parentRelationship = (row.parent_relationship || 'Father').trim();
          const parentPhone = (row.parent_phone || '').trim();
          const parentEmail = (row.parent_email || email).trim().toLowerCase();
          const parentAddress = (row.parent_address || `${hostel}, Campus`).trim();

          if (!collegeId || !name || !email || !phone || !course || !department || !hostel) {
            results.failedCount++;
            results.errors.push({
              row: rowNum,
              collegeId,
              error: 'Missing required student fields (student_id, name, email, phone, course, department, hostel)'
            });
            continue;
          }

          if (!parentName || !parentPhone) {
            results.failedCount++;
            results.errors.push({
              row: rowNum,
              collegeId,
              error: 'Missing required parent details (parent_name, parent_phone are mandatory)'
            });
            continue;
          }

          // 2. Duplicate Detection
          const existingUser = await User.findOne({
            $or: [{ college_id: collegeId }, { official_email: email }]
          });

          if (existingUser) {
            results.failedCount++;
            results.errors.push({
              row: rowNum,
              collegeId,
              error: `Student ID ${collegeId} or Email ${email} already registered in system`
            });
            continue;
          }

          // 3. Create User Account (Role is STRICTLY forced to STUDENT - no role injection possible)
          const passwordHash = await bcrypt.hash(password, 10);
          const user = await User.create({
            college_id: collegeId,
            name,
            official_email: email,
            phone,
            password_hash: passwordHash,
            role: ROLES.STUDENT, // Strictly STUDENT
            status: USER_STATUS.ACTIVE
          });

          // 4. Generate Permanent QR Identity
          const permanentQrId = `QR-STU-${collegeId}`;

          // 5. Create Student Record
          const student = await Student.create({
            user_id: user._id,
            student_id: collegeId,
            name,
            course,
            department,
            hostel,
            block,
            floor,
            room,
            academic_year: academicYear,
            semester,
            permanent_qr_id: permanentQrId,
            status: 'ACTIVE'
          });

          // 6. Create Parent Record (student_editable: false)
          const parent = await Parent.create({
            student_id: student._id,
            name: parentName,
            relationship: parentRelationship,
            phone: parentPhone,
            email: parentEmail,
            address: parentAddress,
            verified: true,
            student_editable: false
          });

          // Link parent to student
          student.parent_id = parent._id;
          await student.save();

          results.successCount++;
          results.importedStudents.push({
            collegeId,
            name,
            hostel,
            permanentQrId
          });
        } catch (rowErr) {
          results.failedCount++;
          results.errors.push({
            row: rowNum,
            error: rowErr.message
          });
        }
      }
    }

    // Audit log the bulk import operation
    await logAudit({
      actor: adminUser,
      action: 'BULK_IMPORT_STUDENTS',
      entity_type: 'Student',
      entity_id: 'BULK',
      new_value: {
        totalRows: results.total,
        successCount: results.successCount,
        failedCount: results.failedCount
      },
      reason: `Bulk import executed. ${results.successCount} created, ${results.failedCount} failed.`,
      req
    });

    return results;
  }
}

module.exports = ImportExportService;
