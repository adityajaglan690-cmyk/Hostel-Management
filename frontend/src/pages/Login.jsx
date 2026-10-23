import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  GraduationCap, 
  ShieldCheck, 
  Award, 
  Settings, 
  Camera, 
  AlertCircle, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

const DEMO_CREDENTIALS = {
  STUDENT: {
    id: 'COER253028008',
    pass: 'Student@123',
    desc: 'Aditya Sharma (MCA Resident)'
  },
  WARDEN: {
    id: 'WRD-101',
    pass: 'Warden@123',
    desc: 'Dr. Rajesh Kumar (Ramanujan Bhawan)'
  },
  DEAN: {
    id: 'DEN-201',
    pass: 'Dean@123',
    desc: 'Prof. Meenakshi Verma (Student Welfare)'
  },
  ADMIN: {
    id: 'ADM-001',
    pass: 'Admin@123',
    desc: 'Vikram Malhotra (System Administrator)'
  },
  SECURITY_GUARD: {
    id: 'GRD-301',
    pass: 'Guard@123',
    desc: 'Surender Singh (Main Gate Security Post)'
  }
};

export default function Login({ onRegisterClick, onStaffRegisterClick }) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [collegeId, setCollegeId] = useState(DEMO_CREDENTIALS.STUDENT.id);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.STUDENT.pass);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roles = [
    { id: 'STUDENT', label: 'Student', icon: GraduationCap, color: 'blue' },
    { id: 'WARDEN', label: 'Warden', icon: ShieldCheck, color: 'purple' },
    { id: 'DEAN', label: 'Dean', icon: Award, color: 'amber' },
    { id: 'ADMIN', label: 'Admin', icon: Settings, color: 'rose' },
    { id: 'SECURITY_GUARD', label: 'Security Guard', icon: Camera, color: 'emerald' },
  ];

  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setError('');
    // Auto-populate demo credentials for seamless evaluation
    setCollegeId(DEMO_CREDENTIALS[roleId].id);
    setPassword(DEMO_CREDENTIALS[roleId].pass);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await login(collegeId, password, selectedRole);
      if (!res.success) {
        setError(res.message || 'Authentication failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server connection error.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed flex flex-col justify-center py-12 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/campus-building.png')"
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-20 w-20 rounded-full bg-white items-center justify-center shadow-xl mb-3 p-1">
          <img src="/coer-logo.png" alt="COER University logo" className="h-full w-full object-contain rounded-full" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
          Hostel Outpass Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-white drop-shadow-md">
          Official College & Resident Gate Movement Management System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-2xl rounded-3xl sm:px-10 border border-slate-100">
          {/* Role Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Official Portal
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs ring-2 ring-brand-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span className="text-[11px] text-center leading-tight">{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* One-Click Quick Demo Credentials Chip */}
          <div className="mb-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-xs text-slate-600">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Demo:</strong> {DEMO_CREDENTIALS[selectedRole].desc}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setCollegeId(DEMO_CREDENTIALS[selectedRole].id);
                setPassword(DEMO_CREDENTIALS[selectedRole].pass);
              }}
              className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 underline"
            >
              Fill Demo
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {selectedRole === 'STUDENT' ? 'College Student ID / Roll No.' : 'Official Employee ID'}
              </label>
              <input
                type="text"
                required
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                placeholder={selectedRole === 'STUDENT' ? 'e.g. COER253028008' : 'e.g. WRD-101'}
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Authenticating with Server...' : `Sign in as ${roles.find(r => r.id === selectedRole)?.label}`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Public Signup for Students only */}
          {selectedRole === 'STUDENT' && (
            <div className="mt-6 text-center pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                New college resident?{' '}
                <button
                  type="button"
                  onClick={onRegisterClick}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Register Student Account & Permanent QR
                </button>
              </p>
            </div>
          )}
          {selectedRole !== 'STUDENT' && (
            <div className="mt-6 text-center pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                New official account?{' '}
                <button
                  type="button"
                  onClick={() => onStaffRegisterClick(selectedRole)}
                  className="font-bold text-brand-600 hover:text-brand-700 hover:underline"
                >
                  Create {roles.find((role) => role.id === selectedRole)?.label} Account
                </button>
              </p>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-slate-400">
          Strict Role-Based Access Control enforced. Cross-portal logins will be rejected and logged to audit security.
        </div>
      </div>
    </div>
  );
}
