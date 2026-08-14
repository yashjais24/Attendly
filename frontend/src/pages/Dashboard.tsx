import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface AttendanceSummary {
  overall: {
    present: number;
    total: number;
    percentage: number;
    required: number;
    intelligence: { canSkip: number; requiredToRecover: number; status: string; };
  };
  subjects: {
    subject: { id: string; name: string; code: string; color: string; };
    present: number;
    total: number;
    required: number;
    percentage: number;
    intelligence: { canSkip: number; requiredToRecover: number; status: string; };
  }[];
}

interface TodayClass {
  timetableSlotId: string;
  subject: { id: string; name: string; code: string; color: string; };
  startTime: string;
  endTime: string;
  lectureNumber: number;
  room?: string;
  attendanceId: string | null;
  status: string;
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboard = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const [summaryData, classesData] = await Promise.all([
        fetchWithAuth('/api/attendance/summary'),
        fetchWithAuth(`/api/attendance?date=${todayStr}`)
      ]);
      setSummary(summaryData);
      setTodayClasses(classesData);
    } catch (err) {
      console.error('Failed to load dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleMarkAttendance = async (slot: TodayClass, status: 'PRESENT' | 'ABSENT') => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await fetchWithAuth('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          timetableSlotId: slot.timetableSlotId,
          subjectId: slot.subject.id,
          date: todayStr,
          status
        })
      });
      loadDashboard();
    } catch (err) {
      console.error(err);
      alert('Failed to mark attendance');
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Good Morning!</h1>
        <p className="text-gray-500 mt-1">Here is your attendance overview for today.</p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-primary/10 p-6 rounded-2xl border border-primary/20">
          <h2 className="text-primary-dark font-semibold mb-2">Overall Attendance</h2>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-900">{summary?.overall.percentage.toFixed(1)}%</span>
            <span className="text-gray-600 font-medium">/ {summary?.overall.required}% req</span>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {summary?.overall.present} of {summary?.overall.total} classes attended
          </div>
        </div>
        
        {/* Intelligence / Warnings */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
          {summary?.overall.intelligence.status === 'WARNING' ? (
            <div className="flex items-start gap-3 text-amber-600">
              <AlertTriangle className="mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold">Action Required</h3>
                <p className="text-sm mt-1">You are below your required attendance. Attend the next <b>{summary?.overall.intelligence.requiredToRecover}</b> classes to recover.</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-primary">
              <CheckCircle className="mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold">You're on track!</h3>
                <p className="text-sm mt-1">You can safely skip <b>{summary?.overall.intelligence.canSkip}</b> more classes and stay above your required {summary?.overall.required}%.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Classes */}
        <div className="col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Today's Classes</h2>
          {todayClasses.length === 0 ? (
            <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Clock className="mx-auto h-10 w-10 text-gray-400 mb-2" />
              <p className="text-gray-500">No classes scheduled for today.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayClasses.map(cls => (
                <div key={cls.timetableSlotId} className="bg-surface p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center text-white" style={{ backgroundColor: cls.subject.color || '#9baba5' }}>
                      <span className="text-sm font-bold">{cls.subject.code}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{cls.subject.name}</h3>
                      <p className="text-sm text-gray-500">{cls.startTime} - {cls.endTime} • Lec {cls.lectureNumber} {cls.room && `• ${cls.room}`}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleMarkAttendance(cls, 'PRESENT')}
                      className={`px-4 py-2 flex items-center gap-2 rounded-lg font-medium transition-colors ${
                        cls.status === 'PRESENT' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600'
                      }`}
                    >
                      <CheckCircle size={18} />
                      Present
                    </button>
                    <button
                      onClick={() => handleMarkAttendance(cls, 'ABSENT')}
                      className={`px-4 py-2 flex items-center gap-2 rounded-lg font-medium transition-colors ${
                        cls.status === 'ABSENT' 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                      }`}
                    >
                      <XCircle size={18} />
                      Absent
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subject Insights */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Subject Overview</h2>
          <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {summary?.subjects.length === 0 ? (
              <div className="p-6 text-center text-gray-500 text-sm">No attendance records yet.</div>
            ) : (
              summary?.subjects.map(sub => (
                <div key={sub.subject.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{sub.subject.code}</div>
                    <div className="text-xs text-gray-500">{sub.present} / {sub.total} classes</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold ${sub.intelligence.status === 'WARNING' ? 'text-red-500' : 'text-green-600'}`}>
                      {sub.percentage.toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">Req: {sub.required}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;