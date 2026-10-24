import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LiveTimer from '../../components/LiveTimer';
import QRViewer from '../../components/QRViewer';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { 
  Clock, 
  FileText, 
  Home, 
  AlertOctagon, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle,
  Send,
  Calendar,
  MapPin,
  FileCheck,
  XCircle,
  Plus
} from 'lucide-react';

export default function StudentPortal({ activeTab, setActiveTab }) {
  const { student, refreshProfile } = useAuth();
  const [activeOutpass, setActiveOutpass] = useState(null);
  const [outpasses, setOutpasses] = useState([]);
  const [parentDetails, setParentDetails] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination for outpass history
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal for Extension Request
  const [extensionModalOpen, setExtensionModalOpen] = useState(false);
  const [extensionOutpassId, setExtensionOutpassId] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [extensionNewTime, setExtensionNewTime] = useState('');

  // Form states for Leave Applications
  const [outpassForm, setOutpassForm] = useState({
    reason: 'Personal Work',
    destination: 'Roorkee Central',
    requested_start_time: '',
    requested_end_time: ''
  });

  const [homeLeaveForm, setHomeLeaveForm] = useState({
    reason: 'Family Vacation',
    destination: 'Home Town',
    home_address: '',
    requested_start_time: '',
    requested_end_time: ''
  });

  const [emergencyForm, setEmergencyForm] = useState({
    reason: 'Medical Emergency',
    destination: 'City Hospital',
    requested_start_time: '',
    requested_end_time: ''
  });

  useEffect(() => {
    fetchActiveOutpass();
    fetchOutpasses(page);
    fetchParentDetails();
    fetchNotices();
  }, [page]);

  const fetchActiveOutpass = async () => {
    try {
      const res = await api.get('/outpasses/active');
      if (res.data.success) {
        setActiveOutpass(res.data.activeOutpass);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOutpasses = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/outpasses/my?page=${p}&limit=8`);
      if (res.data.success) {
        setOutpasses(res.data.data);
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.pages);
        setTotalCount(res.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParentDetails = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success && res.data.student?.parent_id) {
        setParentDetails(res.data.student.parent_id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices');
      if (res.data.success) {
        setNotices(res.data.notices);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApplyOutpass = async (e, type, formState) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const payload = {
        type,
        ...formState
      };

      const res = await api.post('/outpasses', payload);
      if (res.data.success) {
        setSuccess(`Your ${type} request has been submitted successfully.`);
        fetchActiveOutpass();
        fetchOutpasses(1);
        setActiveTab('my-passes');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request.');
    }
  };

  const handleCancelOutpass = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this outpass request?')) return;
    try {
      const res = await api.post(`/outpasses/${id}/cancel`);
      if (res.data.success) {
        fetchActiveOutpass();
        fetchOutpasses(page);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Cancellation failed.');
    }
  };

  const handleRequestExtension = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/outpasses/${extensionOutpassId}/extension`, {
        reason: extensionReason,
        requested_new_end_time: extensionNewTime
      });

      if (res.data.success) {
        alert('Extension request submitted for approval.');
        setExtensionModalOpen(false);
        setExtensionReason('');
        setExtensionNewTime('');
        fetchActiveOutpass();
        fetchOutpasses(page);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Extension request failed.');
    }
  };

  // Helper for dynamic Home Leave duration preview
  const calculateHomeLeaveDuration = () => {
    if (!homeLeaveForm.requested_start_time || !homeLeaveForm.requested_end_time) return null;
    const start = new Date(homeLeaveForm.requested_start_time);
    const end = new Date(homeLeaveForm.requested_end_time);
    const diffHours = (end - start) / (1000 * 60 * 60);
    if (diffHours <= 0) return 'Invalid duration';
    const days = Math.floor(diffHours / 24);
    const hours = Math.round(diffHours % 24);
    return `${days} Days, ${hours} Hours (Flexible duration)`;
  };

  return (
    <div className="space-y-6">
      {/* Top Movement Status Banner */}
      <div className={`p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
        student?.movement_status === 'OUTSIDE'
          ? 'bg-amber-500/10 border-amber-300 text-amber-900'
          : 'bg-emerald-500/10 border-emerald-300 text-emerald-900'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${
            student?.movement_status === 'OUTSIDE' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {student?.movement_status === 'OUTSIDE' ? <AlertTriangle className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Hostel Presence</span>
              <StatusBadge status={student?.movement_status || 'INSIDE'} />
            </div>
            <p className="text-sm font-bold mt-0.5">
              {student?.movement_status === 'OUTSIDE'
                ? 'You are currently recorded as OUTSIDE campus. Gate entry scan required upon return.'
                : `You are safely recorded INSIDE hostel (${student?.hostel}, Room ${student?.room}).`}
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('permanent-qr')}
          className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 shadow-xs hover:bg-slate-50 transition-colors w-full sm:w-auto justify-center"
        >
          <span>View Permanent QR ID</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* SUB-VIEW 1: Dashboard & Live Timer */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Live Authoritative Timer */}
            <LiveTimer outpass={activeOutpass} movementStatus={student?.movement_status} />

            {/* Active Outpass Card */}
            {activeOutpass && (
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between border-b pb-3 mb-4 border-slate-100">
                  <div className="flex items-center space-x-2">
                    <FileCheck className="w-5 h-5 text-brand-600" />
                    <h3 className="font-bold text-sm text-slate-800">Approved Outpass Authorization</h3>
                  </div>
                  <StatusBadge status={activeOutpass.status} />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium block">Outpass Type</span>
                    <span className="font-bold text-slate-800">{activeOutpass.type}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Destination</span>
                    <span className="font-bold text-slate-800">{activeOutpass.destination}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Reason</span>
                    <span className="text-slate-700">{activeOutpass.reason}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium block">Approved Return</span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Date(activeOutpass.approved_end_time || activeOutpass.requested_end_time).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                  <button
                    onClick={() => {
                      setExtensionOutpassId(activeOutpass._id);
                      setExtensionModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition-colors"
                  >
                    Request Emergency Extension
                  </button>
                </div>
              </div>
            )}

            {/* Quick Action Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setActiveTab('apply-outpass')}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-brand-500 hover:shadow-md transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Day Outpass</h4>
                <p className="text-[11px] text-slate-500 mt-1">Short city or market leave with return today</p>
              </button>

              <button
                onClick={() => setActiveTab('apply-home')}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-purple-500 hover:shadow-md transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Home className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Home Leave</h4>
                <p className="text-[11px] text-slate-500 mt-1">Multi-day vacation, holidays or break</p>
              </button>

              <button
                onClick={() => setActiveTab('apply-emergency')}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-rose-500 hover:shadow-md transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-slate-800 text-xs">Emergency Leave</h4>
                <p className="text-[11px] text-slate-500 mt-1">Urgent medical or fast-track leave</p>
              </button>
            </div>
          </div>

          {/* Right Column: Permanent QR ID Card */}
          <div>
            <QRViewer student={student} />
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Apply Outpass (Day Pass) */}
      {activeTab === 'apply-outpass' && (
        <div className="max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xs">
          <div className="border-b pb-4 mb-6 border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <FileText className="w-5 h-5 text-brand-600" />
              <span>Apply for Standard Outpass</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Short duration pass for local city work, shopping, or library.
            </p>
          </div>

          <form onSubmit={(e) => handleApplyOutpass(e, 'OUTPASS', outpassForm)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
              <input
                type="text"
                required
                value={outpassForm.destination}
                onChange={(e) => setOutpassForm({ ...outpassForm, destination: e.target.value })}
                placeholder="e.g. Roorkee Market, Railway Station"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Outpass</label>
              <textarea
                required
                rows="2"
                value={outpassForm.reason}
                onChange={(e) => setOutpassForm({ ...outpassForm, reason: e.target.value })}
                placeholder="Explain the specific purpose of leave"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={outpassForm.requested_start_time}
                  onChange={(e) => setOutpassForm({ ...outpassForm, requested_start_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={outpassForm.requested_end_time}
                  onChange={(e) => setOutpassForm({ ...outpassForm, requested_end_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Outpass Application</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 3: Apply Home Leave (Flexible Duration) */}
      {activeTab === 'apply-home' && (
        <div className="max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-slate-200 shadow-xs">
          <div className="border-b pb-4 mb-6 border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <Home className="w-5 h-5 text-purple-600" />
              <span>Apply for Home Leave (Flexible Duration)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              There is NO fixed 10-day or 30-day limit. Duration is calculated automatically according to your selected dates.
            </p>
          </div>

          <form onSubmit={(e) => handleApplyOutpass(e, 'HOME_LEAVE', homeLeaveForm)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Destination City & State</label>
              <input
                type="text"
                required
                value={homeLeaveForm.destination}
                onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, destination: e.target.value })}
                placeholder="e.g. Dehradun, Uttarakhand"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Residential Home Address</label>
              <textarea
                required
                rows="2"
                value={homeLeaveForm.home_address}
                onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, home_address: e.target.value })}
                placeholder="Complete address where you will be residing during leave"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Home Leave</label>
              <input
                type="text"
                required
                value={homeLeaveForm.reason}
                onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, reason: e.target.value })}
                placeholder="e.g. Festival Vacation, Family Occasion"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={homeLeaveForm.requested_start_time}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, requested_start_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Return Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={homeLeaveForm.requested_end_time}
                  onChange={(e) => setHomeLeaveForm({ ...homeLeaveForm, requested_end_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Calculated Dynamic Duration Preview */}
            {calculateHomeLeaveDuration() && (
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-purple-900">
                <span className="font-bold">Calculated Duration:</span>
                <span className="font-mono font-extrabold">{calculateHomeLeaveDuration()}</span>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-500/20 transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Submit Home Leave Application</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 4: Apply Emergency Leave */}
      {activeTab === 'apply-emergency' && (
        <div className="max-w-2xl bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-rose-200 shadow-xs">
          <div className="border-b pb-4 mb-6 border-rose-100">
            <h3 className="font-bold text-rose-900 text-base flex items-center space-x-2">
              <AlertOctagon className="w-5 h-5 text-rose-600" />
              <span>Emergency / Medical Leave Application</span>
            </h3>
            <p className="text-xs text-rose-600/80 mt-1">
              Priority workflow for unexpected medical situations or urgent family emergencies.
            </p>
          </div>

          <form onSubmit={(e) => handleApplyOutpass(e, 'EMERGENCY_LEAVE', emergencyForm)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Emergency Nature & Reason</label>
              <textarea
                required
                rows="3"
                value={emergencyForm.reason}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, reason: e.target.value })}
                placeholder="Specify the urgent medical or emergency situation"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Hospital / Emergency Destination</label>
              <input
                type="text"
                required
                value={emergencyForm.destination}
                onChange={(e) => setEmergencyForm({ ...emergencyForm, destination: e.target.value })}
                placeholder="e.g. City Civil Hospital"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Departure Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={emergencyForm.requested_start_time}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, requested_start_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={emergencyForm.requested_end_time}
                  onChange={(e) => setEmergencyForm({ ...emergencyForm, requested_end_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-500/20 transition-all"
              >
                <AlertOctagon className="w-4 h-4" />
                <span>Submit Emergency Request</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-VIEW 5: My Outpass History Table */}
      {activeTab === 'my-passes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">My Outpass & Leave Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">Historical log of all pass requests and actual return times</p>
            </div>

            <button
              onClick={() => setActiveTab('apply-outpass')}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors w-full sm:w-auto justify-center"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Outpass</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[640px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Type & Reason</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Destination</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Approved Window</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Actual Return</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {outpasses.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-slate-400">
                      No outpass requests found.
                    </td>
                  </tr>
                ) : (
                  outpasses.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 min-w-[140px]">
                        <span className="font-bold text-slate-900 block">{o.type}</span>
                        <span className="text-[11px] text-slate-500 line-clamp-1">{o.reason}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium min-w-[120px]">{o.destination}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap">
                        <div>{new Date(o.approved_start_time || o.requested_start_time).toLocaleDateString()}</div>
                        <div className="text-slate-500">
                          {new Date(o.approved_start_time || o.requested_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(o.approved_end_time || o.requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap">
                        {o.actual_return ? (
                          <div>
                            <span className="font-bold">{new Date(o.actual_return).toLocaleTimeString()}</span>
                            <span className={`block text-[10px] ${o.return_status === 'LATE' ? 'text-rose-600 font-bold' : 'text-emerald-600'}`}>
                              {o.return_status === 'LATE' ? `Late (+${o.late_minutes}m)` : 'On Time'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        {['PENDING', 'APPROVED'].includes(o.status) && !o.first_exit_at && (
                          <button
                            onClick={() => handleCancelOutpass(o._id)}
                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                        )}

                        {['APPROVED', 'ACTIVE'].includes(o.status) && (
                          <button
                            onClick={() => {
                              setExtensionOutpassId(o._id);
                              setExtensionModalOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg text-amber-600 hover:bg-amber-50 border border-amber-200 text-[11px] font-semibold transition-colors"
                          >
                            Extend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pages={totalPages}
            total={totalCount}
            limit={8}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* SUB-VIEW 6: Permanent QR View */}
      {activeTab === 'permanent-qr' && (
        <div className="py-6">
          <QRViewer student={student} />
        </div>
      )}

      {/* SUB-VIEW 7: Parent Details (Read-only for student) */}
      {activeTab === 'parent-details' && (
        <div className="max-w-2xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <div className="border-b pb-4 mb-6 border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Verified Parent Information</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official contact records. Notifications and alerts are dispatched here.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              Read-Only
            </span>
          </div>

          {parentDetails ? (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Parent Name</span>
                  <span className="font-bold text-slate-800 text-sm">{parentDetails.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Relationship</span>
                  <span className="font-bold text-slate-800 text-sm">{parentDetails.relationship}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Mobile Phone</span>
                  <span className="font-mono font-bold text-slate-800">{parentDetails.phone}</span>
                </div>
                <div>
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Official Email</span>
                  <span className="font-bold text-slate-800">{parentDetails.email}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-400 uppercase font-bold text-[10px] block">Residential Address</span>
                  <span className="text-slate-700">{parentDetails.address}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                <strong>Policy Notice:</strong> Students cannot modify parent contact details directly. To update parent phone or address, submit a verified change request to your Hostel Warden or Dean.
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-6 text-center">Loading parent information...</div>
          )}
        </div>
      )}

      {/* SUB-VIEW 8: Notices */}
      {activeTab === 'notices' && (
        <div className="max-w-3xl bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs">
          <h3 className="font-bold text-slate-800 text-base mb-4">Official Hostel Notices & Announcements</h3>
          <div className="space-y-3">
            {notices.length === 0 ? (
              <div className="text-xs text-slate-400 py-8 text-center">No active notices.</div>
            ) : (
              notices.map((n) => (
                <div key={n._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-slate-800">{n.title}</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                      {n.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600">{n.content}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">
                    Published by: {n.published_by?.name || 'Hostel Administration'} • {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal: Request Emergency Extension */}
      <Modal
        isOpen={extensionModalOpen}
        onClose={() => setExtensionModalOpen(false)}
        title="Request Outpass Time Extension"
      >
        <form onSubmit={handleRequestExtension} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">New Requested Return Time</label>
            <input
              type="datetime-local"
              required
              value={extensionNewTime}
              onChange={(e) => setExtensionNewTime(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Extension</label>
            <textarea
              required
              rows="3"
              value={extensionReason}
              onChange={(e) => setExtensionReason(e.target.value)}
              placeholder="Explain the cause for delay (e.g. traffic delay, appointment extension)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setExtensionModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
            >
              Submit Extension
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
