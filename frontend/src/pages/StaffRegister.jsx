import React, { useState } from 'react';
import { AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';

export default function StaffRegister({ role, onBackToLogin }) {
  const [form, setForm] = useState({ college_id: '', name: '', official_email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await api.post('/auth/register-staff', { ...form, role });
      setSuccess(response.data.message);
      setForm({ college_id: '', name: '', official_email: '', phone: '', password: '', confirmPassword: '' });
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Server error during account registration.');
    } finally {
      setSubmitting(false);
    }
  };

  const fields = [
    ['college_id', 'Official Employee ID', 'e.g. WRD-102', 'text'],
    ['name', 'Full Name', 'Your full name', 'text'],
    ['official_email', 'Official Email', 'name@college.edu', 'email'],
    ['phone', 'Phone Number', '+91 9876543210', 'tel']
  ];

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-fixed py-6 sm:py-12 px-3 sm:px-6 lg:px-8"
      style={{
        backgroundImage: "url('/campus-building.png')"
      }}
    >
      <div className="max-w-xl mx-auto">
        <button onClick={onBackToLogin} className="flex items-center space-x-2 text-slate-300 hover:text-white mb-4 sm:mb-6 text-xs font-semibold">
          <ArrowLeft className="w-4 h-4" /><span>Back to Portal Login</span>
        </button>
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-10">
          <div className="text-center border-b pb-6 mb-6 border-slate-100">
            <div className="inline-flex h-16 w-16 rounded-full bg-white border border-slate-100 items-center justify-center mb-2 p-1 shadow-sm">
              <img src="/coer-logo.png" alt="COER University logo" className="h-full w-full object-contain rounded-full" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Create {role.replace('_', ' ')} Account</h2>
            <p className="text-xs text-slate-500 mt-1">Use your official employee details to create a portal account.</p>
          </div>
          {error && <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700"><AlertCircle className="w-4 h-4 shrink-0" /><span>{error}</span></div>}
          {success && <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start space-x-2 text-xs text-emerald-700"><CheckCircle2 className="w-4 h-4 shrink-0" /><span>{success}</span></div>}
          <form onSubmit={submit} className="space-y-4">
            {fields.map(([name, label, placeholder, type]) => (
              <div key={name}>
                <label className="block text-xs font-bold text-slate-700 mb-1">{label}</label>
                <input type={type} name={name} required value={form[name]} onChange={update} placeholder={placeholder} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none" />
              </div>
            ))}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {['password', 'confirmPassword'].map((name) => (
                <div key={name}>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{name === 'password' ? 'Password' : 'Confirm Password'}</label>
                  <input type="password" name={name} required value={form[name]} onChange={update} className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none" />
                </div>
              ))}
            </div>
            <button type="submit" disabled={submitting} className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold disabled:opacity-50">
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
