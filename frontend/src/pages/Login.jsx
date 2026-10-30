import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  GraduationCap, 
  ShieldCheck, 
  Award, 
  Settings, 
  Camera, 
  AlertCircle, 
  ArrowRight
} from 'lucide-react';

export default function Login({ onRegisterClick }) {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState('STUDENT');
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState('request');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');

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

  const requestPasswordReset = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    try {
      const res = await api.post('/auth/student/forgot-password', { college_id: collegeId });
      setForgotMessage(`${res.data.message} OTP sent to ${res.data.phone}.`);
      setForgotStep('reset');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Unable to request password reset.');
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotMessage('');
    try {
      const res = await api.post('/auth/student/reset-password', {
        college_id: collegeId,
        otp: forgotOtp,
        new_password: newPassword
      });
      setForgotMessage(res.data.message);
      setForgotStep('request');
      setForgotOtp('');
      setNewPassword('');
    } catch (err) {
      setForgotError(err.response?.data?.message || 'Unable to reset password.');
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/campus-building.png')"
      }}
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-white items-center justify-center shadow-xl mb-3 p-1">
          <img src="/coer-logo.png" alt="COER University logo" className="h-full w-full object-contain rounded-full" />
        </div>
        <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg px-2">
          Hostel Outpass Portal
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-white drop-shadow-md px-2">
          Official College & Resident Gate Movement Management System
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-0">
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-10 shadow-2xl rounded-2xl sm:rounded-3xl border border-slate-100">
          {/* Role Tabs */}
          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Select Official Portal
            </label>
            <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {roles.map((r) => {
                const Icon = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => handleRoleChange(r.id)}
                    className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border text-xs font-semibold transition-all min-w-0 ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50 text-brand-700 shadow-xs ring-2 ring-brand-600/20'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1.5 shrink-0 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] sm:text-[11px] text-center leading-tight truncate w-full">{r.label}</span>
                  </button>
                );
              })}
            </div>
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
                placeholder={selectedRole === 'STUDENT' ? 'Enter Student ID / Roll No.' : 'Enter Official Employee ID'}
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
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(true);
                  setForgotStep('request');
                  setForgotError('');
                  setForgotMessage('');
                }}
                className="mt-3 font-bold text-brand-600 hover:text-brand-700 hover:underline text-xs"
              >
                Forgot Password?
              </button>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center text-xs text-white">
          Strict Role-Based Access Control enforced. Cross-portal logins will be rejected and logged to audit security.
          <div className="mt-1">Design and Developed by ADITYA JAGLAN</div>
        </div>

        {forgotOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Student Password Reset</h3>
                  <p className="mt-1 text-xs text-slate-500">OTP verification is available only for student accounts.</p>
                </div>
                <button type="button" onClick={() => setForgotOpen(false)} className="text-xl text-slate-400 hover:text-slate-700" aria-label="Close">×</button>
              </div>
              {forgotError && <p className="mt-4 rounded-lg bg-rose-50 p-3 text-xs text-rose-700">{forgotError}</p>}
              {forgotMessage && <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700">{forgotMessage}</p>}
              {forgotStep === 'request' ? (
                <form onSubmit={requestPasswordReset} className="mt-5 space-y-4">
                  <label className="block text-xs font-bold text-slate-700">
                    College Student ID / Roll No.
                    <input value={collegeId} onChange={(e) => setCollegeId(e.target.value)} required className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs uppercase font-mono" placeholder="Enter your COER ID" />
                  </label>
                  <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white hover:bg-brand-700">Send OTP</button>
                </form>
              ) : (
                <form onSubmit={resetPassword} className="mt-5 space-y-4">
                  <label className="block text-xs font-bold text-slate-700">
                    OTP
                    <input value={forgotOtp} onChange={(e) => setForgotOtp(e.target.value)} required inputMode="numeric" maxLength="6" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-mono" placeholder="Enter 6-digit OTP" />
                  </label>
                  <label className="block text-xs font-bold text-slate-700">
                    New Password
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength="8" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-xs" placeholder="At least 8 characters" />
                  </label>
                  <button type="submit" className="w-full rounded-xl bg-brand-600 py-3 text-xs font-bold text-white hover:bg-brand-700">Reset Password</button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
