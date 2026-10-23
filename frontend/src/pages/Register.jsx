import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  GraduationCap, 
  Users, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  QrCode
} from 'lucide-react';

export default function Register({ onBackToLogin }) {
  const { registerStudent } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [formData, setFormData] = useState({
    // Student details
    name: '',
    student_id: '',
    official_email: '',
    phone: '',
    course: 'MCA',
    department: 'Computer Science & Applications',
    hostel: 'Ramanujan Bhawan',
    block: 'A',
    floor: 3,
    room: '305',
    academic_year: '2025-2026',
    semester: 4,
    password: '',
    confirmPassword: '',

    // Parent details (Mandatory)
    parent_name: '',
    parent_relationship: 'Father',
    parent_phone: '',
    parent_email: '',
    parent_address: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (!formData.parent_name || !formData.parent_phone || !formData.parent_address) {
      setError('Parent contact information is mandatory.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await registerStudent(formData);
      if (res.success) {
        setSuccessMsg('Student registration successful! Permanent QR identity generated.');
      } else {
        setError(res.message || 'Registration failed.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error during registration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed py-12 px-4 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/campus-building.png')"
      }}
    >
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBackToLogin}
          className="flex items-center space-x-2 text-slate-300 hover:text-white mb-6 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Portal Login</span>
        </button>

        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-10 border border-slate-100">
          <div className="text-center border-b pb-6 mb-6 border-slate-100">
            <div className="inline-flex h-16 w-16 rounded-full bg-white border border-slate-100 items-center justify-center mb-2 p-1 shadow-sm">
              <img src="/coer-logo.png" alt="COER University logo" className="h-full w-full object-contain rounded-full" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Hostel Resident Registration
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Create your official student record and activate your permanent QR identity
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Student Academic & Room Details */}
            <div>
              <div className="flex items-center space-x-2 text-brand-700 font-bold text-sm mb-3">
                <GraduationCap className="w-4 h-4" />
                <span>1. Student Identity & Hostel Allocation</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Aditya Sharma"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Student ID / Roll No.</label>
                  <input
                    type="text"
                    name="student_id"
                    required
                    value={formData.student_id}
                    onChange={handleChange}
                    placeholder="e.g. COER253028008"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">College Email</label>
                  <input
                    type="email"
                    name="official_email"
                    required
                    value={formData.official_email}
                    onChange={handleChange}
                    placeholder="aditya@coer.ac.in"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Course</label>
                  <input
                    type="text"
                    name="course"
                    required
                    value={formData.course}
                    onChange={handleChange}
                    placeholder="MCA"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Computer Science & Applications"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hostel Name</label>
                  <select
                    name="hostel"
                    value={formData.hostel}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="Ramanujan Bhawan">Ramanujan Bhawan (Boys)</option>
                    <option value="Aryabhata Bhawan">Aryabhata Bhawan (Boys)</option>
                    <option value="Gargi Bhawan">Gargi Bhawan (Girls)</option>
                    <option value="Sarojini Bhawan">Sarojini Bhawan (Girls)</option>
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Block</label>
                    <input
                      type="text"
                      name="block"
                      value={formData.block}
                      onChange={handleChange}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Floor</label>
                    <input
                      type="number"
                      name="floor"
                      value={formData.floor}
                      onChange={handleChange}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Room</label>
                    <input
                      type="text"
                      name="room"
                      required
                      value={formData.room}
                      onChange={handleChange}
                      className="w-full px-2 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    name="academic_year"
                    value={formData.academic_year}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                  <input
                    type="number"
                    name="semester"
                    value={formData.semester}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Mandatory Parent Details */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center space-x-2 text-brand-700 font-bold text-sm mb-1">
                <Users className="w-4 h-4" />
                <span>2. Parent / Guardian Details (Mandatory)</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">
                Used strictly for notification alerts upon outpass approvals, gate movement, and overdue returns.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Name</label>
                  <input
                    type="text"
                    name="parent_name"
                    required
                    value={formData.parent_name}
                    onChange={handleChange}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Relationship</label>
                  <select
                    name="parent_relationship"
                    value={formData.parent_relationship}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Guardian">Guardian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Mobile (For SMS/Alerts)</label>
                  <input
                    type="tel"
                    name="parent_phone"
                    required
                    value={formData.parent_phone}
                    onChange={handleChange}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parent Email</label>
                  <input
                    type="email"
                    name="parent_email"
                    value={formData.parent_email}
                    onChange={handleChange}
                    placeholder="parent@example.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Permanent Home Address</label>
                  <textarea
                    name="parent_address"
                    required
                    rows="2"
                    value={formData.parent_address}
                    onChange={handleChange}
                    placeholder="Complete residential address with City, State, and PIN code"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Password */}
            <div className="pt-4 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Account Password</label>
                  <input
                    type="password"
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <QrCode className="w-4 h-4" />
              <span>{submitting ? 'Generating Identity & Registering...' : 'Register Student & Generate Permanent QR'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
