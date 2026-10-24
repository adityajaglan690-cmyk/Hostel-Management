import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Activity, 
  Check, 
  X, 
  Edit3, 
  Send,
  Bell,
  Search,
  FileSpreadsheet
} from 'lucide-react';

export default function WardenPortal({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [outsideStudents, setOutsideStudents] = useState([]);
  const [graceAndLateList, setGraceAndLateList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination for student directory
  const [studentPage, setStudentPage] = useState(1);
  const [studentTotalPages, setStudentTotalPages] = useState(1);
  const [studentTotal, setStudentTotal] = useState(0);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOutpassId, setSelectedOutpassId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Parent Edit Modal State
  const [parentModalOpen, setParentModalOpen] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState('');
  const [parentForm, setParentForm] = useState({
    name: '',
    relationship: 'Father',
    phone: '',
    email: '',
    address: '',
    reason: ''
  });

  // Notice Modal State
  const [noticeModalOpen, setNoticeModalOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({
    title: '',
    content: '',
    type: 'HOSTEL'
  });

  useEffect(() => {
    fetchMetrics();
    fetchPendingRequests();
    fetchOutsideStudents();
    fetchGraceAndLate();
    fetchStudents(studentPage, searchQuery);
  }, [studentPage]);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/admin/reports/overview');
      if (res.data.success) {
        setMetrics(res.data.metrics);
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

  const fetchOutsideStudents = async () => {
    try {
      const res = await api.get('/outpasses/outside-students');
      if (res.data.success) {
        setOutsideStudents(res.data.data);
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

  const fetchStudents = async (page = 1, search = '') => {
    try {
      const res = await api.get(`/admin/students?page=${page}&limit=10&search=${search}`);
      if (res.data.success) {
        setStudentsList(res.data.data);
        setStudentPage(res.data.pagination.page);
        setStudentTotalPages(res.data.pagination.pages);
        setStudentTotal(res.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApprove = async (outpassId) => {
    try {
      const res = await api.put(`/outpasses/${outpassId}/approve`, {
        comment: `Approved by Warden ${user.name}`
      });
      if (res.data.success) {
        alert('Outpass request approved and QR authorization activated.');
        fetchPendingRequests();
        fetchMetrics();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Approval failed.');
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/outpasses/${selectedOutpassId}/reject`, {
        rejection_reason: rejectionReason
      });
      if (res.data.success) {
        alert('Outpass rejected and student notified.');
        setRejectModalOpen(false);
        setRejectionReason('');
        fetchPendingRequests();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Rejection failed.');
    }
  };

  const handleParentUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!parentForm.reason) {
      alert('Administrative audit reason is mandatory to update parent details.');
      return;
    }

    try {
      const res = await api.put(`/admin/parents/${selectedParentId}`, parentForm);
      if (res.data.success) {
        alert('Parent details updated and audit log recorded.');
        setParentModalOpen(false);
        fetchStudents(studentPage, searchQuery);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const handleCreateNotice = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/notices', {
        ...noticeForm,
        target_role: 'STUDENT',
        target_hostel: 'Ramanujan Bhawan'
      });
      if (res.data.success) {
        alert('Hostel notice published.');
        setNoticeModalOpen(false);
        setNoticeForm({ title: '', content: '', type: 'HOSTEL' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Notice creation failed.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Assigned Students"
          value={metrics?.totalStudents || 0}
          icon={Users}
          color="blue"
          description="Ramanujan Bhawan Residents"
        />
        <StatCard
          title="Currently Outside"
          value={metrics?.outsideStudents || 0}
          icon={Activity}
          color="amber"
          description="Active Pass Holders"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingRequests.length}
          icon={CheckSquare}
          color="purple"
          description="Awaiting Warden Action"
        />
        <StatCard
          title="Late / Overdue"
          value={metrics?.lateReturns || 0}
          icon={AlertTriangle}
          color="rose"
          description="Past 15-min Grace Period"
        />
      </div>

      {/* SUB-VIEW 1: Dashboard Overview */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Notice Publisher Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Publish Hostel Notice</h4>
                <p className="text-[11px] text-slate-500">Post curfew updates, holiday instructions or announcements</p>
              </div>
            </div>
            <button
              onClick={() => setNoticeModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors text-center"
            >
              Create Notice
            </button>
          </div>

          {/* Pending Approvals Table Preview */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Urgent Pending Approvals</h3>
                <p className="text-[11px] text-slate-500">Student leave applications requiring immediate Warden review</p>
              </div>
              <button
                onClick={() => setActiveTab('approvals')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700 self-end sm:self-auto"
              >
                View All ({pendingRequests.length})
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[600px]">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3 whitespace-nowrap">Student</th>
                    <th className="px-5 py-3 whitespace-nowrap">Type</th>
                    <th className="px-5 py-3 whitespace-nowrap">Destination & Reason</th>
                    <th className="px-5 py-3 whitespace-nowrap">Requested Window</th>
                    <th className="px-5 py-3 text-right whitespace-nowrap">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pendingRequests.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        No pending requests in your hostel queue.
                      </td>
                    </tr>
                  ) : (
                    pendingRequests.slice(0, 5).map((p) => (
                      <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{p.student_id?.name}</span>
                          <span className="text-[11px] font-mono text-slate-500">{p.student_id?.student_id} ({p.student_id?.hostel})</span>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">
                            {p.type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="font-semibold text-slate-800 block">{p.destination}</span>
                          <span className="text-[11px] text-slate-500 line-clamp-1">{p.reason}</span>
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] whitespace-nowrap">
                          <div>{new Date(p.requested_start_time).toLocaleDateString()}</div>
                          <div className="text-slate-500">
                            {new Date(p.requested_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(p.requested_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => handleApprove(p._id)}
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedOutpassId(p._id);
                              setRejectModalOpen(true);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Full Pending Approvals Queue */}
      {activeTab === 'approvals' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Outpass & Leave Approval Queue</h3>
              <p className="text-xs text-slate-500 mt-0.5">Authorize or reject student movements for your assigned hostel block</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Student</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Leave Type</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Destination & Address</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Departure & Return</th>
                  <th className="px-5 py-3.5">Reason</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingRequests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      No pending leave applications.
                    </td>
                  </tr>
                ) : (
                  pendingRequests.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{p.student_id?.name}</span>
                        <span className="text-[11px] font-mono text-slate-500">{p.student_id?.student_id}</span>
                        <span className="text-[10px] text-slate-400 block">Rm {p.student_id?.room}, Blk {p.student_id?.block}</span>
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`font-semibold px-2.5 py-0.5 rounded-full text-[10px] ${
                          p.type === 'EMERGENCY_LEAVE' ? 'bg-rose-100 text-rose-800' : p.type === 'HOME_LEAVE' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-slate-800 block">{p.destination}</span>
                        {p.home_address && <span className="text-[11px] text-slate-500 line-clamp-1">{p.home_address}</span>}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap">
                        <div>{new Date(p.requested_start_time).toLocaleString()}</div>
                        <div className="text-slate-500 mt-0.5">{new Date(p.requested_end_time).toLocaleString()}</div>
                        <span className="text-[10px] text-purple-700 font-bold">Duration: {Math.round(p.approved_duration_minutes / 60)}h</span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs">{p.reason}</td>
                      <td className="px-5 py-3.5 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleApprove(p._id)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedOutpassId(p._id);
                            setRejectModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-colors"
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

      {/* SUB-VIEW 3: Grace & Late Monitoring */}
      {activeTab === 'grace-late' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Grace Period & Overdue Return Monitoring</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks students currently in the 15-minute grace entry window or marked LATE past grace
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[600px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Student</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Hostel & Room</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Approved Expiry</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Movement State</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Monitoring Status</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Overdue Delay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {graceAndLateList.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400">
                      All active pass holders returned safely on time. No overdue cases.
                    </td>
                  </tr>
                ) : (
                  graceAndLateList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-slate-900 block">{item.student?.name}</span>
                        <span className="font-mono text-slate-500 text-[11px]">{item.student?.student_id}</span>
                      </td>
                      <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                        {item.student?.hostel} - Rm {item.student?.room}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-[11px] whitespace-nowrap">
                        {new Date(item.outpass?.expires_at).toLocaleTimeString()}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <StatusBadge status={item.student?.movement_status} />
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.isLate ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                        }`}>
                          {item.isLate ? 'OVERDUE / LATE' : '15-MIN GRACE ENTRY'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                        {item.lateMinutes > 0 ? `+${item.lateMinutes} mins` : 'Within Grace'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Hostel Students Directory & Parent Details Management */}
      {activeTab === 'hostel-students' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Hostel Resident Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">Search students, view movement status, and update verified parent contacts</p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchStudents(1, e.target.value);
                }}
                placeholder="Search name, ID, or room..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 whitespace-nowrap">Student Details</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Hostel & Room</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Course</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Current Status</th>
                  <th className="px-5 py-3.5 whitespace-nowrap">Parent Contact</th>
                  <th className="px-5 py-3.5 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {studentsList.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{s.student_id}</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium whitespace-nowrap">
                      {s.hostel}, Blk {s.block}, Rm {s.room}
                    </td>
                    <td className="px-5 py-3.5 whitespace-nowrap">{s.course}</td>
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <StatusBadge status={s.movement_status} />
                    </td>
                    <td className="px-5 py-3.5 text-[11px] whitespace-nowrap">
                      {s.parent_id ? (
                        <div>
                          <span className="font-semibold text-slate-800">{s.parent_id.name} ({s.parent_id.relationship})</span>
                          <span className="font-mono text-slate-500 block">{s.parent_id.phone}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">Not assigned</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      {s.parent_id && (
                        <button
                          onClick={() => {
                            setSelectedParentId(s.parent_id._id);
                            setParentForm({
                              name: s.parent_id.name,
                              relationship: s.parent_id.relationship,
                              phone: s.parent_id.phone,
                              email: s.parent_id.email,
                              address: s.parent_id.address,
                              reason: ''
                            });
                            setParentModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold transition-colors"
                        >
                          Edit Parent Info
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={studentPage}
            pages={studentTotalPages}
            total={studentTotal}
            limit={10}
            onPageChange={setStudentPage}
          />
        </div>
      )}

      {/* Modal: Rejection Reason */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Outpass Request"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Rejection Reason</label>
            <textarea
              required
              rows="3"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="State the regulatory reason (e.g. pending disciplinary check, exams scheduled)"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Update Parent Details (With Mandatory Audit Reason) */}
      <Modal
        isOpen={parentModalOpen}
        onClose={() => setParentModalOpen(false)}
        title="Update Parent Details (Audited Administrative Action)"
      >
        <form onSubmit={handleParentUpdateSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Parent Name</label>
            <input
              type="text"
              required
              value={parentForm.name}
              onChange={(e) => setParentForm({ ...parentForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
              <input
                type="tel"
                required
                value={parentForm.phone}
                onChange={(e) => setParentForm({ ...parentForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={parentForm.email}
                onChange={(e) => setParentForm({ ...parentForm, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Residential Address</label>
            <textarea
              rows="2"
              required
              value={parentForm.address}
              onChange={(e) => setParentForm({ ...parentForm, address: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-rose-700 mb-1">
              Administrative Reason for Change (Mandatory Audit Log) *
            </label>
            <input
              type="text"
              required
              value={parentForm.reason}
              onChange={(e) => setParentForm({ ...parentForm, reason: e.target.value })}
              placeholder="e.g. Verified parent affidavit submitted to hostel office"
              className="w-full px-3 py-2 text-xs rounded-xl border border-rose-300 bg-rose-50/40 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setParentModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
            >
              Save & Log Audit
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Publish Notice */}
      <Modal
        isOpen={noticeModalOpen}
        onClose={() => setNoticeModalOpen(false)}
        title="Publish Official Hostel Notice"
      >
        <form onSubmit={handleCreateNotice} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notice Title</label>
            <input
              type="text"
              required
              value={noticeForm.title}
              onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
              placeholder="e.g. Evening Gate Closure & Curfew Reminder"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Notice Content</label>
            <textarea
              rows="3"
              required
              value={noticeForm.content}
              onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
              placeholder="Enter full notice announcement details"
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
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-xs"
            >
              Publish Notice
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
