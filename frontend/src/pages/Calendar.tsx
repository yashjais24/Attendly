import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchWithAuth } from '../services/api';
import { X, CheckCircle, XCircle } from 'lucide-react';

interface CalendarEvent {
  date: string;
  timetableSlotId: string;
  subject: { id: string; name: string; code: string; color: string; };
  startTime: string;
  endTime: string;
  lectureNumber: number;
  room?: string;
  attendanceId: string | null;
  status: string; // PENDING, PRESENT, ABSENT
}

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<CalendarEvent | null>(null);
  const calendarRef = useRef<FullCalendar>(null);

  const fetchEvents = async (fetchInfo: any) => {
    try {
      const start = fetchInfo.startStr.split('T')[0];
      const end = fetchInfo.endStr.split('T')[0];
      const data = await fetchWithAuth(`/attendance/range?start=${start}&end=${end}`);
      
      const calendarEvents = data.map((item: CalendarEvent) => {
        let color = item.subject.color || '#9baba5';
        if (item.status === 'PRESENT') color = '#22c55e'; // green-500
        if (item.status === 'ABSENT') color = '#ef4444'; // red-500

        return {
          id: `${item.timetableSlotId}-${item.date}`,
          title: `${item.subject.code} (${item.status})`,
          start: `${item.date}T${item.startTime}`,
          end: `${item.date}T${item.endTime}`,
          backgroundColor: color,
          borderColor: color,
          extendedProps: item
        };
      });
      setEvents(calendarEvents);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEventClick = (info: any) => {
    setSelectedClass(info.event.extendedProps as CalendarEvent);
  };

  const handleMarkAttendance = async (status: 'PRESENT' | 'ABSENT' | 'PENDING') => {
    if (!selectedClass) return;
    try {
      await fetchWithAuth('/attendance', {
        method: 'POST',
        body: JSON.stringify({
          timetableSlotId: selectedClass.timetableSlotId,
          subjectId: selectedClass.subject.id,
          date: selectedClass.date,
          status
        })
      });
      setSelectedClass(null);
      // Refresh calendar
      calendarRef.current?.getApi().refetchEvents();
    } catch (err) {
      console.error(err);
      alert('Failed to update attendance');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Calendar</h1>
        <p className="text-gray-500 mt-1">View history and mark past or upcoming classes.</p>
      </div>

      <div className="flex-1 bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <style>{`
          .fc .fc-toolbar-title { font-size: 1.25rem; font-weight: bold; }
          .fc-event { cursor: pointer; border-radius: 4px; padding: 2px 4px; font-size: 0.75rem; border: none; }
          .fc-daygrid-day.fc-day-today { background-color: #f3f4f6 !important; }
        `}</style>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          events={events}
          datesSet={fetchEvents}
          eventClick={handleEventClick}
          height="100%"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek'
          }}
        />
      </div>

      {/* Modal for marking attendance */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">Class Details</h2>
              <button onClick={() => setSelectedClass(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="font-bold text-lg text-gray-900">{selectedClass.subject.name} ({selectedClass.subject.code})</h3>
                <p className="text-gray-500">{selectedClass.date} • {selectedClass.startTime} - {selectedClass.endTime}</p>
                <p className="text-gray-500 text-sm">Lec {selectedClass.lectureNumber} {selectedClass.room && `• Room: ${selectedClass.room}`}</p>
              </div>
              
              <div className="pt-4 border-t border-gray-100">
                <p className="mb-3 text-sm font-medium text-gray-700">Update Status:</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleMarkAttendance('PRESENT')}
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status === 'PRESENT' 
                        ? 'bg-green-100 text-green-700 border-2 border-green-500' 
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 border-2 border-transparent'
                    }`}
                  >
                    <CheckCircle size={20} />
                    Mark Present
                  </button>
                  <button
                    onClick={() => handleMarkAttendance('ABSENT')}
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status === 'ABSENT' 
                        ? 'bg-red-100 text-red-700 border-2 border-red-500' 
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-transparent'
                    }`}
                  >
                    <XCircle size={20} />
                    Mark Absent
                  </button>
                  <button
                    onClick={() => handleMarkAttendance('PENDING')}
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status === 'PENDING' 
                        ? 'bg-gray-200 text-gray-800 border-2 border-gray-400' 
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border-2 border-transparent'
                    }`}
                  >
                    Clear / Pending
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
