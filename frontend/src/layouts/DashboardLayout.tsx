import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home,
  BookOpen,
  Calendar,
  Clock,
  LogOut,
  Upload as UploadIcon,
  PieChart,
  Menu,
  X
} from 'lucide-react';

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Subjects', path: '/subjects', icon: BookOpen },
    { name: 'Timetable', path: '/timetable', icon: Clock },
    { name: 'Upload', path: '/upload', icon: UploadIcon },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
  ];

  return (
    <div className="flex h-screen bg-background">

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-surface border-r border-gray-100 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >

        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Attendly<span className="text-primary">.</span>
          </h1>

          {/* Close button - mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-900"
          >
            <X size={22} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-primary' : 'text-gray-400'
                  }`}
                />

                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="md:hidden fixed top-4 left-4 z-30 bg-surface p-2 rounded-lg shadow-sm border border-gray-200"
      >
        <Menu size={22} />
      </button>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

    </div>
  );
};

export default DashboardLayout;