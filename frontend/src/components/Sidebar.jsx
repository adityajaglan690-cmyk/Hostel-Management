import React from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  QrCode, 
  Clock, 
  Users, 
  CheckSquare, 
  ShieldAlert, 
  Settings, 
  Camera, 
  FileSpreadsheet, 
  Bell, 
  Calendar, 
  Activity, 
  Home, 
  UserCheck, 
  AlertOctagon,
  History,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ activeTab, setActiveTab, isOpen, onClose }) {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const getNavItems = () => {
    switch (role) {
      case 'STUDENT':
        return [
          { id: 'dashboard', label: 'Dashboard & Timer', icon: LayoutDashboard },
          { id: 'apply-outpass', label: 'Apply Outpass', icon: FileText },
          { id: 'apply-home', label: 'Home Leave', icon: Home },
          { id: 'apply-emergency', label: 'Emergency Leave', icon: AlertOctagon },
          { id: 'my-passes', label: 'My Outpass History', icon: History },
          { id: 'permanent-qr', label: 'Permanent QR ID', icon: QrCode },
          { id: 'parent-details', label: 'Parent Details', icon: Users },
          { id: 'notices', label: 'Hostel Notices', icon: Bell },
        ];

      case 'WARDEN':
        return [
          { id: 'dashboard', label: 'Hostel Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'Pending Approvals', icon: CheckSquare },
          { id: 'active-leaves', label: 'Active Movements', icon: Activity },
          { id: 'grace-late', label: 'Grace & Late Monitor', icon: Clock },
          { id: 'hostel-students', label: 'Hostel Students', icon: Users },
          { id: 'notices', label: 'Notice Manager', icon: Bell },
          { id: 'reports', label: 'Hostel Reports', icon: FileSpreadsheet },
        ];

      case 'DEAN':
        return [
          { id: 'dashboard', label: 'Campus Overview', icon: LayoutDashboard },
          { id: 'approvals', label: 'All Leave Approvals', icon: CheckSquare },
          { id: 'grace-late', label: 'Overdue & Late Violations', icon: ShieldAlert },
          { id: 'notices', label: 'Campus Announcements', icon: Bell },
          { id: 'reports', label: 'Hostel Reports', icon: FileSpreadsheet },
        ];

      case 'ADMIN':
        return [
          { id: 'dashboard', label: 'System Overview', icon: LayoutDashboard },
          { id: 'students', label: 'Student Directory', icon: Users },
          { id: 'users', label: 'Staff Provisioning', icon: UserCheck },
          { id: 'gates', label: 'Gates & Scanners', icon: Camera },
          { id: 'bulk-import', label: 'Bulk CSV Import', icon: FileSpreadsheet },
          { id: 'audit-logs', label: 'Audit Trail', icon: History },
          { id: 'security', label: 'Security Events', icon: ShieldAlert },
          { id: 'settings', label: 'System Settings', icon: Settings },
          { id: 'reports', label: 'Audit Reports', icon: FileSpreadsheet },
        ];

      case 'SECURITY_GUARD':
        return [
          { id: 'scanner', label: 'Gate Scanner Kiosk', icon: Camera },
          { id: 'logs', label: 'Gate Scan Logs', icon: History },
          { id: 'outside-list', label: 'Current Outside', icon: Activity },
          { id: 'incidents', label: 'Log Incident', icon: AlertOctagon },
        ];

      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar / Mobile Drawer */}
      <aside 
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 lg:z-auto w-72 sm:w-80 lg:w-64 bg-white border-r border-slate-200 min-h-screen lg:min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${isOpen ? 'flex' : 'hidden lg:flex'}`}
      >
        <div className="space-y-1">
          <div className="flex items-center justify-between px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <span>{role.replace('_', ' ')} PORTAL</span>
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-14rem)] lg:max-h-none pr-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    if (onClose) onClose();
                  }}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-brand-600' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 px-3">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
            <p className="text-[11px] font-semibold text-slate-700">Authoritative Server Status</p>
            <div className="flex items-center space-x-1.5 mt-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[10px] font-medium text-emerald-600">Database & APIs Synced</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
