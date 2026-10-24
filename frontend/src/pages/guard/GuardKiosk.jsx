import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { 
  Camera, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  User, 
  RefreshCw,
  Zap,
  Building2,
  Sliders,
  History
} from 'lucide-react';

export default function GuardKiosk() {
  const { user } = useAuth();
  const { liveScans } = useSocket();
  const [gates, setGates] = useState([]);
  const [selectedGate, setSelectedGate] = useState('');
  const [scanners, setScanners] = useState([]);
  const [selectedScanner, setSelectedScanner] = useState('');

  const [manualQR, setManualQR] = useState('QR-STU-COER253028008');
  const [processing, setProcessing] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [gateLogs, setGateLogs] = useState([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerContainerRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    fetchGatesAndScanners();
  }, []);

  useEffect(() => {
    if (selectedGate) {
      fetchGateLogs(selectedGate);
    }
  }, [selectedGate]);

  const fetchGatesAndScanners = async () => {
    try {
      const [gRes, sRes] = await Promise.all([
        api.get('/gate/list'),
        api.get('/gate/scanners')
      ]);

      if (gRes.data.success && gRes.data.gates.length > 0) {
        setGates(gRes.data.gates);
        setSelectedGate(gRes.data.gates[0].gate_code);
      }

      if (sRes.data.success && sRes.data.scanners.length > 0) {
        setScanners(sRes.data.scanners);
        setSelectedScanner(sRes.data.scanners[0].scanner_code);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGateLogs = async (gateCode) => {
    try {
      const gateObj = gates.find(g => g.gate_code === gateCode);
      const url = gateObj ? `/gate/logs?gate_id=${gateObj._id}&limit=12` : '/gate/logs?limit=12';
      const res = await api.get(url);
      if (res.data.success) {
        setGateLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleScanSubmit = async (qrString) => {
    const code = qrString || manualQR;
    if (!code) return;

    setProcessing(true);
    try {
      const res = await api.post(
        '/gate/scan',
        {
          qr_data: code,
          gate_code: selectedGate,
          scanner_code: selectedScanner,
          idempotency_key: `IDEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`
        },
        {
          headers: {
            'x-gate-code': selectedGate,
            'x-scanner-code': selectedScanner
          }
        }
      );

      setLastScanResult(res.data);
      fetchGateLogs(selectedGate);
    } catch (err) {
      setLastScanResult({
        success: false,
        result: 'DENIED',
        rejection_reason: err.response?.data?.message || 'Scanner communication error.',
        serverTime: new Date()
      });
    } finally {
      setProcessing(false);
    }
  };

  const toggleCamera = async () => {
    if (isCameraActive) {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
          html5QrCodeRef.current = null;
        } catch (e) {
          console.error(e);
        }
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qrCodeScanner = new Html5Qrcode('qr-reader-container');
        html5QrCodeRef.current = qrCodeScanner;

        await qrCodeScanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            handleScanSubmit(decodedText);
          },
          (errorMessage) => {
            // Scanning in progress
          }
        );
      } catch (err) {
        console.error('Camera init error:', err);
        setIsCameraActive(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Gate Kiosk Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="h-12 w-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
            <Camera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900">Security Guard Movement Kiosk</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                POST ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Officer: {user?.name} ({user?.college_id}) • Server Authoritative Time
            </p>
          </div>
        </div>

        {/* Gate & Scanner Pickers */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedGate}
              onChange={(e) => setSelectedGate(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full"
            >
              {gates.map((g) => (
                <option key={g._id} value={g.gate_code}>
                  {g.gate_code}: {g.gate_name} ({g.status})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 w-full sm:w-auto">
            <Sliders className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedScanner}
              onChange={(e) => setSelectedScanner(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none w-full"
            >
              {scanners.map((s) => (
                <option key={s._id} value={s.scanner_code}>
                  {s.scanner_code} ({s.status})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive QR Scanner & Camera (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b pb-4 mb-4 border-slate-100 gap-2">
              <h3 className="font-bold text-sm text-slate-800 flex items-center space-x-2">
                <Camera className="w-4 h-4 text-brand-600" />
                <span>Camera & Barcode Gun Scanner</span>
              </h3>

              <button
                onClick={toggleCamera}
                className={`w-full sm:w-auto text-center px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  isCameraActive
                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                    : 'bg-brand-50 text-brand-700 border border-brand-200 hover:bg-brand-100'
                }`}
              >
                {isCameraActive ? 'Stop Camera' : 'Start Camera Scanner'}
              </button>
            </div>

            {/* Video Container */}
            <div 
              id="qr-reader-container" 
              className={`rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 aspect-square flex items-center justify-center text-slate-500 text-xs ${
                isCameraActive ? 'block' : 'hidden'
              }`}
            />

            {!isCameraActive && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50">
                <Camera className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">Camera scanner is in standby mode</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Use manual input below or click "Start Camera Scanner"</p>
              </div>
            )}

            {/* Manual QR / Barcode String Input */}
            <div className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Manual Permanent QR Input / Barcode Scanner
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={manualQR}
                  onChange={(e) => setManualQR(e.target.value)}
                  placeholder="e.g. QR-STU-COER253028008"
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-brand-500 focus:outline-none uppercase"
                />
                <button
                  onClick={() => handleScanSubmit(manualQR)}
                  disabled={processing}
                  className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md shadow-brand-500/20 disabled:opacity-50 transition-all flex items-center space-x-1.5"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{processing ? 'Verifying...' : 'Scan'}</span>
                </button>
              </div>

              {/* Quick One-Click Demo QR Codes */}
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                  Quick Test Demo Students:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setManualQR('QR-STU-COER253028008');
                      handleScanSubmit('QR-STU-COER253028008');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-medium transition-colors"
                  >
                    Aditya (Active Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualQR('QR-STU-COER253028009');
                      handleScanSubmit('QR-STU-COER253028009');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-mono font-medium transition-colors"
                  >
                    Priya (Pending Pass)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setManualQR('QR-INVALID-TEST-999');
                      handleScanSubmit('QR-INVALID-TEST-999');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-mono font-medium transition-colors"
                  >
                    Fake QR (Will Deny)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Instant Verification Card & Operational Log (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Big Instant Verification Card */}
          <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-8 border shadow-md transition-all ${
            !lastScanResult
              ? 'bg-white border-slate-200'
              : lastScanResult.result === 'ALLOWED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20'
          }`}>
            <div className="border-b pb-4 mb-4 flex items-center justify-between border-slate-200/60">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Gate Authorization Decision
              </span>
              {lastScanResult && (
                <span className="text-xs font-mono text-slate-400">
                  {new Date(lastScanResult.serverTime).toLocaleTimeString()}
                </span>
              )}
            </div>

            {!lastScanResult ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <h4 className="font-bold text-slate-700 text-sm">Scanner Ready at {selectedGate}</h4>
                <p className="text-xs text-slate-500 mt-1">Scan student permanent QR code to view instant authorization decision.</p>
              </div>
            ) : (
              <div>
                {/* Decision Banner */}
                <div className={`flex items-center space-x-3 p-3.5 sm:p-4 rounded-2xl mb-6 ${
                  lastScanResult.result === 'ALLOWED'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                }`}>
                  {lastScanResult.result === 'ALLOWED' ? (
                    <CheckCircle2 className="w-8 h-8 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 shrink-0" />
                  )}
                  <div>
                    <div className="text-lg min-[360px]:text-xl sm:text-2xl font-black tracking-tight">
                      {lastScanResult.result === 'ALLOWED'
                        ? `${lastScanResult.eventType} PERMITTED`
                        : 'MOVEMENT DENIED'}
                    </div>
                    <p className="text-xs font-medium text-white/90">
                      {lastScanResult.result === 'ALLOWED'
                        ? `Movement Transition: ${lastScanResult.movementTransition} ${lastScanResult.isGraceEntry ? '(Grace Entry Used)' : ''}`
                        : lastScanResult.rejection_reason}
                    </p>
                  </div>
                </div>

                {/* Sanitized Operational Data (Strictly NO parent details!) */}
                {lastScanResult.student ? (
                  <div className="grid grid-cols-1 min-[420px]:grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-white/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/70">
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">Student Name</span>
                      <span className="font-bold text-slate-900 text-sm">{lastScanResult.student.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">College Roll No</span>
                      <span className="font-mono font-bold text-slate-900">{lastScanResult.student.student_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">Hostel & Room</span>
                      <span className="font-bold text-slate-900">{lastScanResult.student.hostel} - Rm {lastScanResult.student.room}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">Course</span>
                      <span className="text-slate-700">{lastScanResult.student.course}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">Current State</span>
                      <StatusBadge status={lastScanResult.student.movement_status} />
                    </div>
                    <div>
                      <span className="text-slate-400 uppercase font-bold text-[10px] block">Gate Scanned</span>
                      <span className="font-mono font-bold text-slate-800">{selectedGate}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-700 bg-rose-100/60 p-3 rounded-xl">
                    Unknown or unregistered QR code identity. Student cannot be verified.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Gate Scan Logs Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-slate-500" />
                <h4 className="font-bold text-xs text-slate-800">Recent Gate {selectedGate} Activity</h4>
              </div>
              <button
                onClick={() => fetchGateLogs(selectedGate)}
                className="text-xs text-brand-600 hover:text-brand-700 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[420px]">
                <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 whitespace-nowrap">Time</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Student</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Event</th>
                    <th className="px-4 py-2.5 whitespace-nowrap">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {gateLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-slate-400 text-xs">
                        No recent scans at this gate.
                      </td>
                    </tr>
                  ) : (
                    gateLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-50/70">
                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.scanned_at).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className="font-bold text-slate-900 block">{log.student_id?.name || 'Unregistered'}</span>
                          <span className="font-mono text-[10px] text-slate-400">{log.student_id?.student_id || '-'}</span>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-[11px] whitespace-nowrap">
                          {log.event_type}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.result === 'ALLOWED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {log.result}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
