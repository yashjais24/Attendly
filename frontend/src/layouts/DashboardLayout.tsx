import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, Calendar, Clock, LogOut, Upload as UploadIcon, PieChart, Bell } from 'lucide-react';
import { fetchWithAuth } from '../services/api';

const DashboardLayout: React.FC = () => {
  const { signOut } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: Home },
    { name: 'Subjects', path: '/subjects', icon: BookOpen },
    { name: 'Timetable', path: '/timetable', icon: Clock },
    { name: 'Upload', path: '/upload', icon: UploadIcon },
    { name: 'Calendar', path: '/calendar', icon: Calendar },
    { name: 'Analytics', path: '/analytics', icon: PieChart },
  ];

  const [upcoming, setUpcoming] = React.useState<any[]>([]);
  const [showNotifications, setShowNotifications] = React.useState(false);

  React.useEffect(() => {
    fetchWithAuth('/reminders/upcoming')
      .then(setUpcoming)
      .catch(console.error);
    
    // Poll every 5 minutes
    const interval = setInterval(() => {
      fetchWithAuth('/reminders/upcoming')
        .then(setUpcoming)
        .catch(console.error);
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-surface border-r border-gray-100 flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Attendly<span className="text-primary">.</span>
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 text-gray-400 group-hover:text-red-500" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
