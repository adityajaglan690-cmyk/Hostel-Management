import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { 
  Bell, 
  LogOut, 
  Clock, 
  ShieldCheck, 
  User as UserIcon, 
  AlertTriangle,
  CheckCircle2,
  X,
  Menu
} from 'lucide-react';

export default function Navbar({ onToggleMobileMenu, isMobileMenuOpen }) {
  const { user, student, logout } = useAuth();
  const { liveAlerts, unreadCount, clearUnread } = useSocket();
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'WARDEN':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DEAN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ADMIN':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'SECURITY_GUARD':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo & Institution Info */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Mobile Hamburger Button */}
            {user && user.role !== 'SECURITY_GUARD' && (
              <button
                type="button"
                onClick={onToggleMobileMenu}
                className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5 text-brand-600" /> : <Menu className="w-5 h-5" />}
              </button>
            )}

            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              <img src="/coer-logo.png" alt="COER University logo" className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight truncate">COER HOSTEL</span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium whitespace-nowrap">Outpass ERP</span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">Campus Gate & Resident Movement Platform</p>
            </div>
          </div>

          {/* Right Section: Time (IST), Role Badge, Notifications, User */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Live Authoritative Indian Standard Time */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
              <Clock className="w-3.5 h-3.5 text-brand-600 animate-pulse" />
              <span>
                {currentTime.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true })} IST
              </span>
            </div>

            {/* Notifications Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) clearUnread();
                }}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Overlay Panel */}
              {showNotifications && (
                <div className="fixed sm:absolute top-16 sm:top-auto left-3 right-3 sm:left-auto sm:right-0 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-brand-600" />
                      <span className="font-semibold text-sm text-slate-800">System Notifications</span>
                    </div>
                    <button 
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                    {liveAlerts.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No recent notifications
                      </div>
                    ) : (
                      liveAlerts.map((n, idx) => (
                        <div key={n._id || idx} className="p-3.5 hover:bg-slate-50 transition-colors">
                          <div className="flex items-start space-x-2.5">
                            {n.type?.includes('LATE') ? (
                              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                            ) : n.type?.includes('GRACE') ? (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                              <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                              <span className="text-[10px] text-slate-400 mt-1 block font-mono">
                                {n.sent_at ? new Date(n.sent_at).toLocaleTimeString() : 'Just now'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Role Badge */}
            {user && (
              <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border whitespace-nowrap ${getRoleBadgeColor(user.role)}`}>
                {user.role}
              </span>
            )}

            {/* User Profile Info */}
            <div className="flex items-center space-x-2 sm:space-x-3 border-l border-slate-200 pl-2 sm:pl-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[120px]">{user?.name || 'User'}</p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5 leading-none">
                  {user?.college_id}
                </p>
              </div>

              <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>

              {/* Logout button */}
              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
