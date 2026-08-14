import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithAuth('/attendance/summary')
      .then(setSummary)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8">Loading analytics...</div>;
  if (!summary) return <div className="p-8">Failed to load analytics</div>;

  const pieData = [
    { name: 'Present', value: summary.overall.present, color: '#22c55e' },
    { name: 'Absent', value: summary.overall.total - summary.overall.present, color: '#ef4444' }
  ];

  const barData = summary.subjects.map((sub: any) => ({
    name: sub.subject.code,
    Present: sub.present,
    Absent: sub.total - sub.present,
    Percentage: sub.percentage.toFixed(1),
    color: sub.subject.color || '#9baba5'
  }));

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 h-[calc(100vh-64px)] overflow-y-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500 mt-1">Visualize your attendance history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Overall Pie Chart */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center">
          <h2 className="text-xl font-bold text-gray-900 w-full mb-4">Overall Attendance</h2>
          {summary.overall.total > 0 ? (
            <div className="w-full h-64 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Classes`, 'Count']} />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none mb-6">
                <span className="text-3xl font-bold text-gray-900">{summary.overall.percentage.toFixed(1)}%</span>
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No attendance data yet</div>
          )}
        </div>

        {/* Subject Bar Chart */}
        <div className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance by Subject</h2>
          {barData.length > 0 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend />
                  <Bar dataKey="Present" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} maxBarSize={50} />
                  <Bar dataKey="Absent" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No subject data yet</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
