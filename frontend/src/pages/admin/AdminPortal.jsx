import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import Pagination from '../../components/Pagination';
import { 
  Users, 
  UserPlus, 
  Camera, 
  FileSpreadsheet, 
  History, 
  ShieldAlert, 
  Settings, 
  RefreshCw, 
  QrCode, 
  CheckCircle, 
  XCircle, 
  Search, 
  Download, 
  Upload, 
  Key, 
  Lock,
  Plus
} from 'lucide-react';

export default function AdminPortal({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState(null);

  // Student directory state
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  // Staff users state
  const [staffUsers, setStaffUsers] = useState([]);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    college_id: '',
    name: '',
    official_email: '',
    phone: '',
    password: '',
    role: 'WARDEN'
  });

  // Gates & Scanners state
  const [gates, setGates] = useState([]);
  const [scanners, setScanners] = useState([]);
  const [createGateModal, setCreateGateModal] = useState(false);
  const [gateForm, setGateForm] = useState({ gate_code: '', gate_name: '', location: '' });
  const [createScannerModal, setCreateScannerModal] = useState(false);
  const [scannerForm, setScannerForm] = useState({ scanner_code: '', scanner_name: '', gate_id: '' });
  const [generatedKey, setGeneratedKey] = useState(null);

  // Audit Logs & Security Events
  const [auditLogs, setAuditLogs] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);

  // Bulk Import state
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [importResult, setImportResult] = useState(null);
  const [importing, setImporting] = useState(false);

  // System Settings state
  const [settings, setSettings] = useState([]);

  useEffect(() => {
    fetchOverview();
    fetchStudents(page, search);
    fetchStaffUsers();
    fetchGatesAndScanners();
    fetchAuditsAndSecurity();
    fetchSettings();
  }, [page]);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/admin/reports/overview');
      if (res.data.success) setMetrics(res.data.metrics);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async (p = 1, query = '') => {
    try {
      const res = await api.get(`/admin/students?page=${p}&limit=10&search=${query}`);
      if (res.data.success) {
        setStudents(res.data.data);
        setPage(res.data.pagination.page);
        setTotalPages(res.data.pagination.pages);
        setTotalStudents(res.data.pagination.total);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      if (res.data.success) setStaffUsers(res.data.users);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGatesAndScanners = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        api.get('/gate/list'),
        api.get('/gate/scanners')
      ]);
      if (gRes.data.success) setGates(gRes.data.gates);
      if (sRes.data.success) setScanners(sRes.data.scanners);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditsAndSecurity = async () => {
    try {
      const [aRes, sRes] = await Promise.all([
        api.get('/admin/audit-logs?limit=15'),
        api.get('/admin/security-events?limit=15')
      ]);
      if (aRes.data.success) setAuditLogs(aRes.data.data);
      if (sRes.data.success) setSecurityEvents(sRes.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/system-settings');
      if (res.data.success) setSettings(res.data.settings);
    } catch (err) {
      console.error(err);
    }
  };

  // Staff creation
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/users', newUserForm);
      if (res.data.success) {
        alert(`${newUserForm.role} provisioned successfully.`);
        setCreateUserModal(false);
        setNewUserForm({ college_id: '', name: '', official_email: '', phone: '', password: '', role: 'WARDEN' });
        fetchStaffUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleToggleUserStatus = async (userId) => {
    const reason = prompt('Administrative reason for toggling user account status:');
    if (!reason) return;

    try {
      const res = await api.put(`/admin/users/${userId}/status`, { reason });
      if (res.data.success) {
        alert(res.data.message);
        fetchStaffUsers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  // QR Revoke & Regenerate
  const handleRevokeQR = async (studentId) => {
    const reason = prompt('Reason for revoking student permanent QR identity:');
    if (!reason) return;

    try {
      const res = await api.post(`/admin/qr/${studentId}/revoke`, { reason });
      if (res.data.success) {
        alert(res.data.message);
        fetchStudents(page, search);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Revoke failed.');
    }
  };

  const handleRegenerateQR = async (studentId) => {
    if (!window.confirm('Regenerate permanent QR identity? The old QR code will be permanently invalidated.')) return;

    try {
      const res = await api.post(`/admin/qr/${studentId}/regenerate`, { reason: 'Administrative QR regeneration' });
      if (res.data.success) {
        alert(`New Permanent QR Identity: ${res.data.permanent_qr_id}`);
        fetchStudents(page, search);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Regeneration failed.');
    }
  };

  // Gate & Scanner actions
  const handleCreateGate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/gates', gateForm);
      if (res.data.success) {
        alert('Gate created.');
        setCreateGateModal(false);
        setGateForm({ gate_code: '', gate_name: '', location: '' });
        fetchGatesAndScanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gate creation failed.');
    }
  };

  const handleToggleGate = async (gateId, currentStatus) => {
    const nextStatus = currentStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await api.put(`/admin/gates/${gateId}/status`, { status: nextStatus, reason: 'Toggled by Admin' });
      if (res.data.success) {
        fetchGatesAndScanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Gate update failed.');
    }
  };

  const handleRegisterScanner = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/scanners', scannerForm);
      if (res.data.success) {
        setGeneratedKey(res.data.apiKey);
        fetchGatesAndScanners();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Scanner registration failed.');
    }
  };

  const handleRotateKey = async (scannerId) => {
    if (!window.confirm('Rotate scanner credentials? Old API key will stop functioning.')) return;
    try {
      const res = await api.post(`/admin/scanners/${scannerId}/rotate-credentials`, { reason: 'Key rotation by Admin' });
      if (res.data.success) {
        alert(`New Scanner API Key: ${res.data.apiKey}\nSave this key securely.`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Key rotation failed.');
    }
  };

  // Bulk CSV Import
  const handleBulkImport = async () => {
    if (!bulkCsvText.trim()) {
      alert('Please paste CSV data or load sample.');
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      // Parse CSV text to object array
      const lines = bulkCsvText.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const vals = line.split(',').map(v => v.trim());
        const rowObj = {};
        headers.forEach((h, idx) => {
          rowObj[h] = vals[idx] || '';
        });
        rows.push(rowObj);
      }

      const res = await api.post('/admin/students/import', { students_data: rows });
      if (res.data.success) {
        setImportResult(res.data.result);
        fetchStudents(1, '');
        fetchOverview();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk import failed.');
    } finally {
      setImporting(false);
    }
  };

  const loadSampleCSV = () => {
    const sample = `student_id,name,official_email,phone,course,department,hostel,block,floor,room,academic_year,semester,password,parent_name,parent_relationship,parent_phone,parent_email,parent_address
COER253028020,Siddharth Joshi,siddharth@demo.com,+91 9876511111,MCA,Computer Science,Ramanujan Bhawan,A,2,210,2025-2026,4,Student@123,Harish Joshi,Father,+91 9876522222,harish@demo.com,Haridwar Bypass
COER253028021,Neha Agarwal,neha@demo.com,+91 9876511112,B.Tech CSE,Computer Science,Gargi Bhawan,B,3,308,2025-2026,4,Student@123,Manoj Agarwal,Father,+91 9876522223,manoj@demo.com,Rajpur Road Dehradun`;
    setBulkCsvText(sample);
  };

  return (
    <div className="space-y-6">
      {/* Top Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Students"
          value={metrics?.totalStudents || 0}
          icon={Users}
          color="blue"
          description="Server-Side Indexed (5,000+)"
        />
        <StatCard
          title="Provisioned Staff"
          value={staffUsers.length}
          icon={UserPlus}
          color="purple"
          description="Wardens, Deans, Guards"
        />
        <StatCard
          title="Registered Gates"
          value={gates.length}
          icon={Camera}
          color="emerald"
          description={`${scanners.length} Automated Scanners`}
        />
        <StatCard
          title="Security Incidents"
          value={securityEvents.length}
          icon={ShieldAlert}
          color="rose"
          description="Threats & Flags Logged"
        />
      </div>

      {/* SUB-VIEW 1: Student Directory with QR Management */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Master Student Directory</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Scalable server-side pagination, permanent QR identity control, and status toggling
              </p>
            </div>

            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  fetchStudents(1, e.target.value);
                }}
                placeholder="Search by ID, name, QR key..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Student Details</th>
                  <th className="px-5 py-3.5">Hostel & Room</th>
                  <th className="px-5 py-3.5">Permanent QR Identity</th>
                  <th className="px-5 py-3.5">Movement</th>
                  <th className="px-5 py-3.5">QR Status</th>
                  <th className="px-5 py-3.5 text-right">QR Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {students.map((s) => (
                  <tr key={s._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 block">{s.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{s.student_id}</span>
                      <span className="text-[10px] text-slate-400 block">{s.course}</span>
                    </td>
                    <td className="px-5 py-3.5 font-medium">
                      {s.hostel} - Rm {s.room} (Blk {s.block})
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[11px] text-brand-700 font-semibold">
                      {s.permanent_qr_id}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={s.movement_status} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.qr_status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {s.qr_status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right space-x-1.5">
                      {s.qr_status === 'ACTIVE' ? (
                        <button
                          onClick={() => handleRevokeQR(s._id)}
                          className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 text-[11px] font-semibold"
                        >
                          Revoke QR
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRegenerateQR(s._id)}
                          className="px-2 py-1 rounded-lg text-emerald-600 hover:bg-emerald-50 border border-emerald-200 text-[11px] font-semibold"
                        >
                          Reactivate QR
                        </button>
                      )}
                      <button
                        onClick={() => handleRegenerateQR(s._id)}
                        className="px-2 py-1 rounded-lg text-brand-600 hover:bg-brand-50 border border-brand-200 text-[11px] font-semibold"
                      >
                        Regenerate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pages={totalPages}
            total={totalStudents}
            limit={10}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* SUB-VIEW 2: Staff User Provisioning */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Authorized Staff User Management</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provision Wardens, Deans, Security Guards, and Administrators. Last active Admin is strictly protected.
              </p>
            </div>

            <button
              onClick={() => setCreateUserModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-xs transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision Staff User</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Name & Official ID</th>
                  <th className="px-5 py-3.5">Official Email</th>
                  <th className="px-5 py-3.5">Phone</th>
                  <th className="px-5 py-3.5">Database Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {staffUsers.map((u) => (
                  <tr key={u._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-slate-900 block">{u.name}</span>
                      <span className="font-mono text-slate-500 text-[11px]">{u.college_id}</span>
                    </td>
                    <td className="px-5 py-3.5">{u.official_email}</td>
                    <td className="px-5 py-3.5 font-mono">{u.phone}</td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u._id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-semibold"
                      >
                        {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: Gates & Scanners */}
      {activeTab === 'gates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gates Management */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Gate Management</h3>
                <p className="text-[11px] text-slate-500">Physical campus checkpoints and operational states</p>
              </div>
              <button
                onClick={() => setCreateGateModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Gate</span>
              </button>
            </div>

            <div className="space-y-3">
              {gates.map((g) => (
                <div key={g._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">{g.gate_code}</span>
                      <span className="font-semibold text-slate-800 text-xs">{g.gate_name}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">{g.location}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      g.status === 'OPEN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {g.status}
                    </span>
                    <button
                      onClick={() => handleToggleGate(g._id, g.status)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-white text-slate-700"
                    >
                      {g.status === 'OPEN' ? 'Close Gate' : 'Open Gate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scanners Management */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6">
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-slate-100">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Fixed Gate Scanners</h3>
                <p className="text-[11px] text-slate-500">Hardware devices authenticated with hashed API credentials</p>
              </div>
              <button
                onClick={() => setCreateScannerModal(true)}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Scanner</span>
              </button>
            </div>

            <div className="space-y-3">
              {scanners.map((s) => (
                <div key={s._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">{s.scanner_code}</span>
                      <span className="text-xs font-semibold text-slate-800">{s.scanner_name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Gate: {s.gate_id?.gate_code} • Last seen: {new Date(s.last_seen_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      {s.status}
                    </span>
                    <button
                      onClick={() => handleRotateKey(s._id)}
                      className="px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 hover:bg-white text-slate-700"
                    >
                      Rotate Key
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Bulk CSV Import */}
      {activeTab === 'bulk-import' && (
        <div className="max-w-3xl bg-white rounded-3xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-5">
          <div>
            <h3 className="font-bold text-slate-800 text-base flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-brand-600" />
              <span>Bulk Student CSV Import</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Safely batch ingest student and parent records. Generates permanent QR identities and rejects duplicates.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={loadSampleCSV}
              className="text-xs font-bold text-brand-600 hover:text-brand-700 underline"
            >
              Load Sample Student CSV Template
            </button>
          </div>

          <textarea
            rows="8"
            value={bulkCsvText}
            onChange={(e) => setBulkCsvText(e.target.value)}
            placeholder="student_id,name,official_email,phone,course,department,hostel,block,floor,room,academic_year,semester,password,parent_name,parent_relationship,parent_phone,parent_email,parent_address"
            className="w-full p-4 text-xs font-mono rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-slate-50/50"
          />

          <div className="flex justify-end">
            <button
              onClick={handleBulkImport}
              disabled={importing}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>{importing ? 'Processing Batch Rows...' : 'Execute Bulk Import'}</span>
            </button>
          </div>

          {importResult && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <h4 className="font-bold text-slate-800">Bulk Import Results</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded-xl border">Total: <strong>{importResult.total}</strong></div>
                <div className="bg-emerald-50 text-emerald-800 p-2 rounded-xl border border-emerald-200">
                  Imported: <strong>{importResult.successCount}</strong>
                </div>
                <div className="bg-rose-50 text-rose-800 p-2 rounded-xl border border-rose-200">
                  Failed: <strong>{importResult.failedCount}</strong>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="mt-2 text-rose-700 bg-rose-50 p-3 rounded-xl max-h-32 overflow-y-auto">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-[11px]">• Row {err.row}: {err.error}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 5: Audit Trail & Security Events */}
      {activeTab === 'audit-logs' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-500 mt-0.5">Immutable record of approvals, rejections, parent modifications, and overrides</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Actor</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Audit Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {auditLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-900 block">{log.actor_name}</span>
                      <span className="text-[10px] text-slate-400">{log.actor_role}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-brand-700">{log.action}</td>
                    <td className="px-5 py-3 font-mono text-[11px]">{log.entity_type}</td>
                    <td className="px-5 py-3 text-slate-600 max-w-sm">{log.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 6: Security Events */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-base">Real-Time Security Events Monitor</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tracks wrong-role logins, fake scanner attempts, invalid QR scans, and replay attempts
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Event Type</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {securityEvents.map((e) => (
                  <tr key={e._id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {new Date(e.createdAt).toLocaleTimeString()}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-800">{e.event_type}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        e.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {e.severity}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{e.description}</td>
                    <td className="px-5 py-3 font-mono text-slate-400">{e.ip_address || '127.0.0.1'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Provision Staff User */}
      <Modal
        isOpen={createUserModal}
        onClose={() => setCreateUserModal(false)}
        title="Provision Official Staff Account"
      >
        <form onSubmit={handleCreateUser} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Official Employee ID</label>
            <input
              type="text"
              required
              value={newUserForm.college_id}
              onChange={(e) => setNewUserForm({ ...newUserForm, college_id: e.target.value })}
              placeholder="e.g. WRD-102, GRD-302"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 uppercase font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={newUserForm.name}
              onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                required
                value={newUserForm.official_email}
                onChange={(e) => setNewUserForm({ ...newUserForm, official_email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone</label>
              <input
                type="tel"
                required
                value={newUserForm.phone}
                onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Role</label>
              <select
                value={newUserForm.role}
                onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
              >
                <option value="WARDEN">WARDEN</option>
                <option value="DEAN">DEAN</option>
                <option value="SECURITY_GUARD">SECURITY_GUARD</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Initial Password</label>
              <input
                type="password"
                required
                value={newUserForm.password}
                onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setCreateUserModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 shadow-xs"
            >
              Create Account
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Create Gate */}
      <Modal
        isOpen={createGateModal}
        onClose={() => setCreateGateModal(false)}
        title="Add Campus Gate"
      >
        <form onSubmit={handleCreateGate} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Gate Code</label>
            <input
              type="text"
              required
              value={gateForm.gate_code}
              onChange={(e) => setGateForm({ ...gateForm, gate_code: e.target.value })}
              placeholder="e.g. GATE-004"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono uppercase"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Gate Name</label>
            <input
              type="text"
              required
              value={gateForm.gate_name}
              onChange={(e) => setGateForm({ ...gateForm, gate_name: e.target.value })}
              placeholder="e.g. East Gate"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
            <input
              type="text"
              required
              value={gateForm.location}
              onChange={(e) => setGateForm({ ...gateForm, location: e.target.value })}
              placeholder="e.g. East Boundary Road"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
            />
          </div>
          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setCreateGateModal(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600"
            >
              Save Gate
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Register Scanner */}
      <Modal
        isOpen={createScannerModal}
        onClose={() => {
          setCreateScannerModal(false);
          setGeneratedKey(null);
        }}
        title="Register Fixed Gate Scanner"
      >
        {generatedKey ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <p className="font-bold">Scanner registered successfully!</p>
              <p className="mt-1">Save this device API key securely. It will NOT be shown again:</p>
              <code className="block mt-2 p-2 bg-white rounded-lg border font-mono font-bold text-slate-900 break-all select-all">
                {generatedKey}
              </code>
            </div>
            <button
              onClick={() => {
                setCreateScannerModal(false);
                setGeneratedKey(null);
              }}
              className="w-full py-2 rounded-xl bg-brand-600 text-white text-xs font-bold"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegisterScanner} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scanner Code</label>
              <input
                type="text"
                required
                value={scannerForm.scanner_code}
                onChange={(e) => setScannerForm({ ...scannerForm, scanner_code: e.target.value })}
                placeholder="e.g. SCANNER-003"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scanner Name</label>
              <input
                type="text"
                required
                value={scannerForm.scanner_name}
                onChange={(e) => setScannerForm({ ...scannerForm, scanner_name: e.target.value })}
                placeholder="e.g. East Gate Turnstile Scanner"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Gate</label>
              <select
                required
                value={scannerForm.gate_id}
                onChange={(e) => setScannerForm({ ...scannerForm, gate_id: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-semibold"
              >
                <option value="">Select Gate checkpoint</option>
                {gates.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.gate_code} - {g.gate_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCreateScannerModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-brand-600"
              >
                Generate Device Credentials
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
