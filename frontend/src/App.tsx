import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Timetable from './pages/Timetable';
import CalendarPage from './pages/Calendar';
import UploadPage from './pages/Upload';
import Analytics from './pages/Analytics';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/timetable" element={<Timetable />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
