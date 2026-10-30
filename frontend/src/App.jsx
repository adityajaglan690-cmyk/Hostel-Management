import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentPortal from './pages/student/StudentPortal';
import WardenPortal from './pages/warden/WardenPortal';
import DeanPortal from './pages/dean/DeanPortal';
import AdminPortal from './pages/admin/AdminPortal';
import GuardKiosk from './pages/guard/GuardKiosk';
import { Building2 } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center animate-bounce">
          <Building2 className="w-6 h-6" />
        </div>
        <p className="text-xs font-mono text-slate-400">Loading Hostel Outpass ERP System...</p>
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    return authView === 'login' ? (
      <Login
        onRegisterClick={() => {
          setAuthView('register');
        }}
      />
    ) : authView === 'register' ? (
      <Register onBackToLogin={() => setAuthView('login')} />
    ) : null;
  }

  // Authenticated Portal Rendering
  const renderPortal = () => {
    switch (user.role) {
      case 'STUDENT':
        return <StudentPortal activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'WARDEN':
        return <WardenPortal activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'DEAN':
        return <DeanPortal activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'ADMIN':
        return <AdminPortal activeTab={activeTab} setActiveTab={setActiveTab} />;
      case 'SECURITY_GUARD':
        return <GuardKiosk />;
      default:
        return (
          <div className="p-8 text-center text-slate-500 text-xs">
            Unknown portal role. Please re-authenticate.
          </div>
        );
    }
  };

  return (
    <SocketProvider>
      <div className="min-h-screen bg-slate-50/50 flex flex-col overflow-x-hidden">
        <Navbar 
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          isMobileMenuOpen={mobileMenuOpen}
        />
        <div className="flex-1 flex max-w-7xl w-full mx-auto relative">
          {user.role !== 'SECURITY_GUARD' && (
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setMobileMenuOpen(false);
              }}
              isOpen={mobileMenuOpen}
              onClose={() => setMobileMenuOpen(false)}
            />
          )}
          <main className="flex-1 p-3.5 sm:p-6 lg:p-8 overflow-y-auto min-w-0 w-full">
            {renderPortal()}
          </main>
        </div>
      </div>
    </SocketProvider>
  );
}
