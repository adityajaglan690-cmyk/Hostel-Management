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
  FileSpreadsheet,
  Download
} from 'lucide-react';

const reportHostels = [
  { name: 'Ramanujan Bhawan', type: 'Boys', color: 'blue' },
  { name: 'Aryabhata Bhawan', type: 'Boys', color: 'indigo' },
  { name: 'Gargi Bhawan', type: 'Girls', color: 'purple' },
  { name: 'Maitreyi Bhawan', type: 'Girls', color: 'pink' }
];

const indianNames = [
  'Aarav Sharma', 'Vivaan Singh', 'Aditya Joshi', 'Arjun Mehta', 'Rohan Verma',
  'Kabir Gupta', 'Ishaan Kapoor', 'Vihaan Malhotra', 'Ananya Patel', 'Aditi Agarwal',
  'Riya Nair', 'Saanvi Iyer', 'Meera Menon', 'Diya Reddy', 'Kavya Rao',
  'Neha Bansal', 'Priya Mishra', 'Pooja Das', 'Nandini Shah', 'Shreya Kulkarni',
  'Rahul Kumar', 'Karan Thakur', 'Yash Tiwari', 'Manav Sethi', 'Devansh Jain',
  'Siddharth Joshi', 'Harsh Vardhan', 'Mohit Rawat', 'Nikhil Yadav', 'Ankit Dubey',
  'Simran Kaur', 'Ishita Roy', 'Tanvi Chawla', 'Muskan Saini', 'Pallavi Joshi',
  'Sneha Rathi', 'Kriti Sharma', 'Ritika Sen', 'Ira Banerjee', 'Anushka Bose',
  'Vikram Negi', 'Abhishek Rawat', 'Saurabh Goyal', 'Deepak Rana', 'Aman Arora',
  'Naveen Bhatia', 'Gaurav Saxena', 'Varun Khanna', 'Rishabh Anand', 'Akash Pandey'
];

const createRoomInventory = (hostelIndex) => Array.from({ length: 100 }, (_, index) => {
  const roomNumber = 101 + index;
  const bedCapacity = index % 3 === 0 ? 4 : 2;
  const occupiedBeds = index % 10 === 0 ? 0 : index % 7 === 0 ? 1 : bedCapacity;
  return {
    room: `${Math.floor(roomNumber / 100)}-${String(roomNumber).slice(-2)}`,
    category: index % 2 === 0 ? 'AC' : 'Non-AC',
    bedCapacity,
    occupiedBeds,
    students: occupiedBeds === 0
      ? []
      : Array.from({ length: occupiedBeds }, (_, bedIndex) => indianNames[(hostelIndex * 50 + index + bedIndex) % indianNames.length])
  };
});

const reportHostelData = reportHostels.map((hostel, hostelIndex) => {
  const rooms = createRoomInventory(hostelIndex);
  return {
    ...hostel,
    activeStudents: 50,
    rooms,
    occupiedRooms: rooms.filter((room) => room.occupiedBeds > 0).length,
    totalBeds: rooms.reduce((total, room) => total + room.bedCapacity, 0),
    occupiedBeds: rooms.reduce((total, room) => total + room.occupiedBeds, 0)
  };
});

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
  const [notices, setNotices] = useState([]);
  const [editingNoticeId, setEditingNoticeId] = useState(null);
  const [reportData, setReportData] = useState(() => (
    reportHostelData.map((hostel) => ({
      ...hostel,
      rooms: hostel.rooms.map((room) => ({ ...room, students: [...room.students] }))
    }))
  ));
  const [roomFilters, setRoomFilters] = useState(() => (
    reportHostels.reduce((filters, hostel) => ({
      ...filters,
      [hostel.name]: { category: 'ALL', bedCapacity: 'ALL' }
    }), {})
  ));

  useEffect(() => {
    fetchMetrics();
    fetchPendingRequests();
    fetchOutsideStudents();
    fetchGraceAndLate();
    fetchStudents(studentPage, searchQuery);
    fetchNotices();
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

  const fetchNotices = async () => {
    try {
      const res = await api.get('/notices');
      if (res.data.success) {
        setNotices(res.data.notices.filter((notice) => (
          String(notice.published_by?._id || notice.published_by) === String(user.id || user._id)
        )));
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
      const payload = {
        ...noticeForm,
        target_role: 'STUDENT',
        target_hostel: 'Ramanujan Bhawan'
      };
      const res = editingNoticeId
        ? await api.put(`/notices/${editingNoticeId}`, payload)
        : await api.post('/notices', payload);
      if (res.data.success) {
        alert(editingNoticeId ? 'Hostel notice updated.' : 'Hostel notice published.');
        setNotices((currentNotices) => editingNoticeId
          ? currentNotices.map((notice) => (
            notice._id === editingNoticeId ? res.data.notice : notice
          ))
          : [res.data.notice, ...currentNotices]);
        setNoticeModalOpen(false);
        setEditingNoticeId(null);
        setNoticeForm({ title: '', content: '', type: 'HOSTEL' });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Notice creation failed.');
    }
  };

  const openNoticeEditor = (notice = null) => {
    setEditingNoticeId(notice?._id || null);
    setNoticeForm(notice
      ? { title: notice.title, content: notice.content, type: notice.type }
      : { title: '', content: '', type: 'HOSTEL' });
    setNoticeModalOpen(true);
  };

  const updateRoomFilter = (hostelName, key, value) => {
    setRoomFilters((currentFilters) => ({
      ...currentFilters,
      [hostelName]: { ...currentFilters[hostelName], [key]: value }
    }));
  };

  const allocateBed = (hostelName, roomNumber) => {
    const studentName = window.prompt('Enter the student name to allocate this bed:');
    if (!studentName?.trim()) return;

    setReportData((currentData) => currentData.map((hostel) => {
      if (hostel.name !== hostelName) return hostel;
      const rooms = hostel.rooms.map((room) => {
        if (room.room !== roomNumber || room.occupiedBeds >= room.bedCapacity) return room;
        return { ...room, occupiedBeds: room.occupiedBeds + 1, students: [...room.students, studentName.trim()] };
      });
      return {
        ...hostel,
        rooms,
        activeStudents: hostel.activeStudents + 1,
        occupiedRooms: rooms.filter((room) => room.occupiedBeds > 0).length,
        occupiedBeds: rooms.reduce((total, room) => total + room.occupiedBeds, 0)
      };
    }));
  };

  const removeStudent = (hostelName, roomNumber, studentName, studentIndex) => {
    if (!window.confirm(`Remove ${studentName} from room ${roomNumber}?`)) return;

    setReportData((currentData) => currentData.map((hostel) => {
      if (hostel.name !== hostelName) return hostel;
      const rooms = hostel.rooms.map((room) => {
        if (room.room !== roomNumber) return room;
        return {
          ...room,
          occupiedBeds: Math.max(0, room.occupiedBeds - 1),
          students: room.students.filter((_, index) => index !== studentIndex)
        };
      });
      return {
        ...hostel,
        rooms,
        activeStudents: Math.max(0, hostel.activeStudents - 1),
        occupiedRooms: rooms.filter((room) => room.occupiedBeds > 0).length,
        occupiedBeds: rooms.reduce((total, room) => total + room.occupiedBeds, 0)
      };
    }));
  };

  const downloadMessTimetable = () => {
    const rows = [
      ['Meal', 'Time', 'Menu'],
      ['Breakfast', '7:30 AM - 9:00 AM', 'Paratha, curd, fruit and tea'],
      ['Lunch', '12:30 PM - 2:30 PM', 'Dal, rice, roti, seasonal vegetables'],
      ['Snacks', '5:00 PM - 6:00 PM', 'Tea, sprouts or evening snack'],
      ['Dinner', '7:30 PM - 9:30 PM', 'Roti, rice, dal and special dish']
    ];
    const escapePdfText = (value) => value.replace(/([\\()])/g, '\\$1');
    const textLines = [
      'Hostel Mess Timetable',
      'Weekly meal schedule for all boys and girls hostels',
      '',
      ...rows.map((row) => row.join('  |  '))
    ];
    const stream = [
      'BT',
      '/F1 14 Tf',
      '50 760 Td',
      ...textLines.flatMap((line, index) => [
        `(${escapePdfText(line)}) Tj`,
        index < textLines.length - 1 ? '0 -28 Td' : ''
      ]),
      'ET'
    ].filter(Boolean).join('\n');
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets[index + 1] = pdf.length;
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    const blob = new Blob([pdf], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hostel-mess-timetable.pdf';
    link.click();
    URL.revokeObjectURL(url);
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

      {/* SUB-VIEW 4: Notice Manager */}
      {activeTab === 'notices' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Publish Hostel Notice</h3>
                <p className="text-xs text-slate-500 mt-0.5">Post curfew updates, holiday instructions or announcements</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openNoticeEditor()}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
            >
              Create Notice
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {[
              {
                title: 'Holiday Notice',
                content: 'Students are requested to submit holiday leave applications in advance. Please follow the approved departure and return timings.',
                type: 'HOLIDAY',
                iconClass: 'bg-amber-50 text-amber-600'
              },
              {
                title: 'Mess Notice',
                content: 'The weekly mess menu and meal timings are displayed on the hostel notice board. Please carry your valid resident identity.',
                type: 'HOSTEL',
                iconClass: 'bg-emerald-50 text-emerald-600'
              },
              {
                title: 'Electricity Notice',
                content: 'Scheduled electrical maintenance may cause a temporary power interruption. Residents are requested to plan accordingly.',
                type: 'GENERAL',
                iconClass: 'bg-blue-50 text-blue-600'
              }
            ].map((notice) => (
              <div key={notice.title} className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className={`p-2 rounded-xl ${notice.iconClass}`}>
                    <Bell className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{notice.type}</span>
                </div>
                <h4 className="mt-4 font-bold text-slate-800 text-sm">{notice.title}</h4>
                <p className="mt-2 text-xs leading-5 text-slate-500">{notice.content}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-base">Published Notices</h3>
              <p className="text-xs text-slate-500 mt-0.5">Edit notices published from this Warden account</p>
            </div>
            {notices.length === 0 ? (
              <p className="p-5 text-xs text-slate-500">No notices published from this account yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {notices.map((notice) => (
                  <div key={notice._id} className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">{notice.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{notice.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNoticeEditor(notice)}
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-VIEW 5: Hostel Students Directory & Parent Details Management */}
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

      {/* SUB-VIEW 6: Hostel Audit Report */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-xl bg-brand-50 text-brand-600">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-base">Hostel Audit Report</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Active residents, room occupancy, facilities, mess schedule and hostel entry instructions
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportData.map((hostel) => (
              <div key={hostel.name} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{hostel.type} Hostel</p>
                <h4 className="font-bold text-slate-800 text-sm mt-1">{hostel.name}</h4>
                <p className="text-2xl font-bold text-brand-700 mt-3">{hostel.activeStudents}</p>
                <p className="text-[11px] text-slate-500">Active students</p>
                <div className="grid grid-cols-2 gap-2 mt-4 text-[11px]">
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block font-bold text-slate-800">{hostel.occupiedRooms}/100</span>
                    <span className="text-slate-500">Rooms occupied</span>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-2">
                    <span className="block font-bold text-slate-800">{hostel.occupiedBeds}/{hostel.totalBeds}</span>
                    <span className="text-slate-500">Beds occupied</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {reportData.map((hostel) => {
            const filter = roomFilters[hostel.name];
            const visibleRooms = hostel.rooms.filter((room) => (
              (filter.category === 'ALL' || room.category === filter.category) &&
              (filter.bedCapacity === 'ALL' || room.bedCapacity === Number(filter.bedCapacity))
            ));

            return (
            <div key={hostel.name} className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{hostel.name} Room Details</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    100 rooms • {hostel.occupiedRooms} occupied • {100 - hostel.occupiedRooms} rooms with available beds
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
                  {[
                    ['category', 'ALL', 'ALL'],
                    ['category', 'AC', 'AC'],
                    ['category', 'Non-AC', 'NON-AC'],
                    ['bedCapacity', '2', '2 BEDS'],
                    ['bedCapacity', '4', '4 BEDS']
                  ].map(([key, value, label]) => (
                    <button
                      type="button"
                      key={`${key}-${value}`}
                      onClick={() => updateRoomFilter(hostel.name, key, value)}
                      className={`px-2.5 py-1 rounded-full ${
                        filter[key] === value
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-left text-xs min-w-[720px]">
                  <thead className="sticky top-0 bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Room</th>
                      <th className="px-5 py-3">Facility</th>
                      <th className="px-5 py-3">Bed Type</th>
                      <th className="px-5 py-3">Occupancy</th>
                      <th className="px-5 py-3">Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {visibleRooms.map((room) => (
                      <tr key={room.room}>
                        <td className="px-5 py-3 font-mono font-bold text-slate-800">{room.room}</td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            room.category === 'AC' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {room.category}
                          </span>
                        </td>
                        <td className="px-5 py-3">{room.bedCapacity} beds</td>
                        <td className="px-5 py-3 font-semibold">
                          <span className={room.occupiedBeds === room.bedCapacity ? 'text-emerald-700' : 'text-amber-700'}>
                            {room.occupiedBeds}/{room.bedCapacity} occupied
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">
                          {room.students.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {room.students.map((student, studentIndex) => (
                                <span key={`${student}-${studentIndex}`} className="inline-flex items-center gap-1 rounded-lg bg-slate-50 border border-slate-200 px-2 py-1">
                                  <span>{student}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeStudent(hostel.name, room.room, student, studentIndex)}
                                    className="text-rose-600 hover:text-rose-800 font-bold"
                                    aria-label={`Remove ${student} from room ${room.room}`}
                                    title="Remove from bed"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : 'No beds occupied'}
                          {room.occupiedBeds < room.bedCapacity && (
                            <button
                              type="button"
                              onClick={() => allocateBed(hostel.name, room.room)}
                              className="ml-3 px-2 py-1 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 text-[10px] font-bold"
                            >
                              Allocate Bed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Hostel Mess Timetable</h3>
                  <p className="text-xs text-slate-500 mt-1">Weekly meal schedule for all four hostels</p>
                </div>
                <button
                  type="button"
                  onClick={downloadMessTimetable}
                  className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px]">
                    <tr><th className="px-5 py-3">Meal</th><th className="px-5 py-3">Time</th><th className="px-5 py-3">Menu</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr><td className="px-5 py-3 font-semibold">Breakfast</td><td className="px-5 py-3">7:30 AM - 9:00 AM</td><td className="px-5 py-3">Paratha, curd, fruit and tea</td></tr>
                    <tr><td className="px-5 py-3 font-semibold">Lunch</td><td className="px-5 py-3">12:30 PM - 2:30 PM</td><td className="px-5 py-3">Dal, rice, roti, seasonal vegetables</td></tr>
                    <tr><td className="px-5 py-3 font-semibold">Snacks</td><td className="px-5 py-3">5:00 PM - 6:00 PM</td><td className="px-5 py-3">Tea, sprouts or evening snack</td></tr>
                    <tr><td className="px-5 py-3 font-semibold">Dinner</td><td className="px-5 py-3">7:30 PM - 9:30 PM</td><td className="px-5 py-3">Roti, rice, dal and special dish</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-amber-50 rounded-3xl border border-amber-200 p-5 sm:p-6">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-900 text-base">Hostel Entry Notice</h3>
                  <p className="text-xs text-amber-800 mt-2 leading-5">
                    All students must enter the hostel before <strong>8:00 PM</strong>. Any late entry must be reported to the Warden and recorded at the hostel gate.
                  </p>
                  <p className="text-[11px] text-amber-700 mt-4 font-semibold">Applies to all boys and girls hostels.</p>
                </div>
              </div>
            </div>
          </div>
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
