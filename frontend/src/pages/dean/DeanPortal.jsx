import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { 
  Building2, 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  Activity, 
  Check, 
  X, 
  FileSpreadsheet, 
  Download,
  Bell,
  ShieldCheck
} from 'lucide-react';

export default function DeanPortal({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [hostelStats, setHostelStats] = useState([]);
  const [leaveTypeStats, setLeaveTypeStats] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [graceAndLateList, setGraceAndLateList] = useState([]);

  // Notice modal
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    type: 'GENERAL'
  });

  useEffect(() => {
    fetchOverview();
    fetchPendingRequests();
    fetchGraceAndLate();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/reports/overview');
      if (res.data.success) {
        setMetrics(res.data.metrics);
        setHostelStats(res.data.hostelStats || []);
        setLeaveTypeStats(res.data.leaveTypeStats || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const res = await api.get('/outpasses/pending');
      if (res.data.success) {
        setPendingRequests(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGraceAndLate = async () => {
    try {
      const res = await api.get('/outpasses/grace-late');
      if (res.data.success) {
        setGraceAndLateList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (outpassId) => {
    try {
      const res = await api.put(`/outpasses/${outpassId}/approve`, {
        comment: `Approved by Dean ${user.name}`
      });
      if (res.data.success) {
        alert('Outpass approved by Dean Office.');
        fetchPendingRequests();
        fetchOverview();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed.');
    }
  };

  const handleReject = async (outpassId) => {
    const reason = prompt('Enter official rejection reason:');
    if (!reason) return;

    try {
      const res = await api.put(`/outpasses/${outpassId}/reject`, {
        rejection_reason: reason
      });
      if (res.data.success) {
        alert('Outpass rejected.');
        fetchPendingRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed.');
    }
  };

  const handleExportCSV = async () => {
    try {
      window.open('/api/admin/reports/export', '_blank');
    } catch (e) {
      alert('Export failed.');
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/notices', {
        ...noticeForm,
        target_role: 'ALL',
        target_hostel: 'ALL'
      });
      if (res.data.success) {
        alert('Campus notice published.');
        setNoticeModalOpen(false);
        setNoticeForm({ title: '', content: '', type: 'GENERAL' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Notice creation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Dean Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Campus Residents"
          value={metrics?.totalStudents || 0}
          icon={Users}
          color="blue"
          description="All Active Hostel Students"
        />
        <StatCard
          title="Currently Outside"
          value={metrics?.outsideStudents || 0}
          icon={Activity}
          color="amber"
          description="Out on Approved Passes"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingRequests.length}
          icon={CheckSquare}
          color="purple"
          description="Awaiting Authority Action"
        />
        <StatCard
          title="Overdue / Late"
          value={metrics?.lateReturns || 0}
          icon={AlertTriangle}
          color="rose"
          description="Disciplinary Violations"
        />
      </div>

      {/* SUB-VIEW 1: Dashboard Overview & Hostel Breakdown */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Dean of Student Welfare Administration</h3>
              <p className="text-xs text-slate-500">Institute-wide movement monitoring, curfew compliance, and reports</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setNoticeModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Publish Campus Notice
              </button>
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Export Outpass Records (CSV)</span>
              </button>
            </div>
          </div>

          {/* Hostel Occupancy & Movement Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h4 className="font-bold text-slate-800 text-sm">Hostel-wise Movement Distribution</h4>
              <p className="text-xs text-slate-500">Live tally of students inside vs outside for each residence bhawan</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Hostel Bhawan</th>
                    <th className="px-5 py-3">Total Residents</th>
                    <th className="px-5 py-3">Inside Hostel</th>
                    <th className="px-5 py-3">Currently Outside</th>
                    <th className="px-5 py-3">Outside Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {hostelStats.map((h) => {
                    const ratio = h.total > 0 ? Math.round((h.outside / h.total) * 100) : 0;
                    return (
                      <tr key={h._id} className="hover:bg-slate-50/70">
                        <td className="px-5 py-3 font-bold text-slate-900">{h._id}</td>
                        <td className="px-5 py-3 font-mono font-semibold">{h.total}</td>
                        <td className="px-5 py-3 font-mono text-emerald-600 font-bold">{h.inside}</td>
                        <td className="px-5 py-3 font-mono text-amber-600 font-bold">{h.outside}</td>
                        <td className="px-5 py-3">
                          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-brand-500 h-2 rounded-full"
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">{ratio}% outside</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Approvals Queue */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Campus Outpass & Leave Approval Queue</h3>
            <p className="text-xs text-slate-500">Institute-wide review for Home Leave, Emergency, and Escalated passes</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Leave Type</th>
                  <th className="px-5 py-3.5">Hostel & Room</th>
                  <th className="px-5 py-3.5">Destination & Reason</th>
                  <th className="px-5 py-3.5">Requested Timing</th>
                  <th className="px-5 py-3.5 text-right">Dean Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No pending requests requiring Dean action.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-900 block">{p.student_id?.name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{p.student_id?.student_id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">{p.student_id?.hostel} - Rm {p.student_id?.room}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 block">{p.destination}</span>
                        <span className="text-[11px] text-slate-500">{p.reason}</span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        <div>{new Date(p.requested_start_time).toLocaleDateString()}</div>
                        <div className="text-slate-500">{new Date(p.requested_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(p.requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleApprove(p._id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(p._id)}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Grace & Late Returns */}
      {activeTab === 'grace-late' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Campus Late Returns & Curfew Violations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Comprehensive list of overdue students who exceeded the 15-minute grace period</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Student</th>
                  <th className="px-5 py-3.5">Hostel & Room</th>
                  <th className="px-5 py-3.5">Expiry Deadline</th>
                  <th className="px-5 py-3.5">Movement Status</th>
                  <th className="px-5 py-3.5">Delay Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {graceAndLateList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-12 text-center text-slate-400">
                      No overdue or late violations logged across campus.
                    </td>
                  </tr>
                ) : (
                  graceAndLateList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5 font-bold text-slate-900">
                        {item.student?.name} ({item.student?.student_id})
                      </td>
                      <td className="px-5 py-3.5">{item.student?.hostel} - Rm {item.student?.room}</td>
                      <td className="px-5 py-3.5 font-mono text-[11px]">
                        {new Date(item.outpass?.expires_at).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={item.student?.movement_status} />
                      </td>
                      <td className="px-5 py-3.5 font-mono font-bold text-rose-600">
                        {item.lateMinutes > 0 ? `+${item.lateMinutes} mins Overdue` : 'Within Grace'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Publish Campus Notice */}
      <Modal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        title="Publish Campus-Wide Notice (Dean Office)"
      >
        <form onSubmit={handleCreateNotice} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              placeholder="e.g. Special Holiday Outpass Advisory"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Announcement Content</label>
            <textarea
              rows="3"
              required
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              placeholder="Details of the campus policy or announcement"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setNoticeModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
            >
              Publish Campus-Wide
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
