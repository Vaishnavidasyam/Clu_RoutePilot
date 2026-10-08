import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAuth } from '../context/AuthContext';

export const Layout: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const location = useLocation();
  const { user } = useAuth();

  // Automatically close mobile sidebar on navigation
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsMobileSidebarOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  // Auth Guard: Unauthenticated users are redirected to login
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // If the user is on the Field Portal (/portal) or role is EXECUTIVE, provide a clean, dedicated view
  const isFieldPortal = location.pathname.startsWith('/portal') || user?.role === 'EXECUTIVE';

  if (isFieldPortal) {
    return (
      <div className="min-h-screen bg-[#F5F8FA] w-full flex flex-col text-ink font-sans selection:bg-orange/20 selection:text-orange">
        <Outlet />
      </div>
    );
  }

  // Access Guard: If Field Executive attempts to navigate directly to manager or admin pages
  if (user?.role === 'EXECUTIVE' && !location.pathname.startsWith('/portal')) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-ink font-sans">
        <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-2xl space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto font-bold text-xl">
            ✕
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Access Restricted</h2>
            <p className="text-xs text-slate-500 mt-1">
              Field Executives do not have access to the Operations Manager portal.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/portal'}
            className="w-full py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow transition cursor-pointer"
          >
            Go to My Mobile Workspace
          </button>
        </div>
      </div>
    );
  }

  // Access Guard: If non-admin attempts to access /admin
  if (location.pathname.startsWith('/admin') && user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 text-ink font-sans">
        <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto font-bold text-xl">
            !
          </div>
          <div>
            <h2 className="text-lg font-bold text-navy">Admin Access Required</h2>
            <p className="text-xs text-slate-500 mt-1">
              You must be a System Administrator to access the Admin Console.
            </p>
          </div>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="w-full py-2.5 rounded-xl bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow transition cursor-pointer"
          >
            Return to Operations Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F6F8FA] text-ink overflow-hidden font-sans">
      {/* Mobile Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-[#0c2233]/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      {/* Unified Enterprise Sidebar */}
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
        mobileOpen={isMobileSidebarOpen}
        onCloseMobile={closeMobileSidebar}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar onToggleSidebar={toggleSidebar} />

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 md:p-6 lg:p-8 bg-[#F6F8FA] custom-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

