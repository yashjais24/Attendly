import React, { useState, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { fetchWithAuth } from '../services/api';
import {
  X,
  CheckCircle,
  XCircle,
  CalendarDays,
  Clock,
} from 'lucide-react';

interface CalendarEvent {
  date: string;
  timetableSlotId: string;
  subject: {
    id: string;
    name: string;
    code: string;
    color: string;
  };
  startTime: string;
  endTime: string;
  lectureNumber: number;
  room?: string;
  attendanceId: string | null;
  status: string;
}

const CalendarPage: React.FC = () => {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] =
    useState<CalendarEvent | null>(null);

  // Selected date summary
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const calendarRef = useRef<FullCalendar>(null);

  // =========================
  // FETCH CALENDAR EVENTS
  // =========================
  const fetchEvents = async (fetchInfo: any) => {
    try {
      const start = fetchInfo.startStr.split('T')[0];
      const end = fetchInfo.endStr.split('T')[0];

      const data = await fetchWithAuth(
        `/api/attendance/range?start=${start}&end=${end}`
      );

      const calendarEvents = data.map((item: CalendarEvent) => {
        let color = item.subject.color || '#9baba5';

        if (item.status === 'PRESENT') {
          color = '#22c55e';
        }

        if (item.status === 'ABSENT') {
          color = '#ef4444';
        }

        return {
          id: `${item.timetableSlotId}-${item.date}`,
          title: `${item.subject.code} (${item.status})`,
          start: `${item.date}T${item.startTime}`,
          end: `${item.date}T${item.endTime}`,
          backgroundColor: color,
          borderColor: color,
          extendedProps: item,
        };
      });

      setEvents(calendarEvents);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // CLICK ON CLASS
  // =========================
  const handleEventClick = (info: any) => {
    setSelectedClass(
      info.event.extendedProps as CalendarEvent
    );
  };

  // =========================
  // CLICK ON DATE
  // =========================
  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
  };

  // =========================
  // MARK ATTENDANCE
  // =========================
  const handleMarkAttendance = async (
    status: 'PRESENT' | 'ABSENT' | 'PENDING'
  ) => {
    if (!selectedClass) return;

    try {
      await fetchWithAuth('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({
          timetableSlotId: selectedClass.timetableSlotId,
          subjectId: selectedClass.subject.id,
          date: selectedClass.date,
          status,
        }),
      });

      setSelectedClass(null);

      const calendarApi =
        calendarRef.current?.getApi();

      if (calendarApi) {
        const currentView = calendarApi.view;

        await fetchEvents({
          startStr:
            currentView.activeStart.toISOString(),
          endStr:
            currentView.activeEnd.toISOString(),
        });
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update attendance');
    }
  };

  // =========================
  // SELECTED DATE EVENTS
  // =========================
  const selectedDateEvents = selectedDate
    ? events
        .filter(
          (event) =>
            event.start?.split('T')[0] === selectedDate
        )
        .sort((a, b) =>
          a.start.localeCompare(b.start)
        )
    : [];

  // =========================
  // FORMAT DATE
  // =========================
  const formatSelectedDate = (date: string) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-[calc(100vh-64px)] flex flex-col">

      {/* HEADER */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Attendance Calendar
        </h1>

        <p className="text-gray-500 mt-1">
          View history and mark past or upcoming classes.
        </p>
      </div>

      {/* CALENDAR */}
      <div className="flex-1 bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

        <style>{`
          .fc .fc-toolbar-title {
            font-size: 1.25rem;
            font-weight: bold;
          }

          .fc-event {
            cursor: pointer;
            border-radius: 4px;
            padding: 2px 4px;
            font-size: 0.75rem;
            border: none;
          }

          .fc-daygrid-day {
            cursor: pointer;
          }

          .fc-daygrid-day.fc-day-today {
            background-color: #f3f4f6 !important;
          }
        `}</style>

        <FullCalendar
          ref={calendarRef}
          plugins={[
            dayGridPlugin,
            interactionPlugin,
          ]}
          initialView="dayGridMonth"
          events={events}
          datesSet={fetchEvents}
          eventClick={handleEventClick}
          dateClick={handleDateClick}
          height="100%"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,dayGridWeek',
          }}
        />
      </div>

      {/* =================================================
          DATE SUMMARY MODAL
          ================================================= */}
      {selectedDate && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedDate(null)}
        >
          <div
            className="bg-surface w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >

            {/* HEADER */}
            <div className="flex justify-between items-center p-6 border-b border-gray-100">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <CalendarDays size={21} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-gray-900">
                    {formatSelectedDate(selectedDate)}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {selectedDateEvents.length}{' '}
                    {selectedDateEvents.length === 1
                      ? 'class'
                      : 'classes'}{' '}
                    scheduled
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="p-6">

              {selectedDateEvents.length === 0 ? (
                <div className="py-10 text-center">
                  <CalendarDays
                    className="mx-auto text-gray-300 mb-3"
                    size={42}
                  />

                  <h3 className="font-semibold text-gray-700">
                    No classes scheduled
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    Nothing is scheduled for this date.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">

                  {selectedDateEvents.map(
                    (event) => {
                      const item =
                        event.extendedProps as CalendarEvent;

                      return (
                        <button
                          key={event.id}
                          onClick={() => {
                            setSelectedDate(null);
                            setSelectedClass(item);
                          }}
                          className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-gray-50/60"
                        >

                          <div className="flex items-center justify-between gap-4">

                            {/* SUBJECT */}
                            <div className="flex items-center gap-3 min-w-0">

                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0"
                                style={{
                                  backgroundColor:
                                    item.subject.color ||
                                    '#9baba5',
                                }}
                              >
                                {item.subject.code
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 truncate">
                                  {item.subject.name}
                                </h3>

                                <p className="text-sm text-gray-500">
                                  {item.subject.code}
                                  {' • '}
                                  Lec {item.lectureNumber}
                                </p>
                              </div>
                            </div>

                            {/* STATUS */}
                            <div className="shrink-0">
                              {item.status ===
                              'PRESENT' ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1.5 rounded-full">
                                  <CheckCircle size={14} />
                                  Present
                                </span>
                              ) : item.status ===
                                'ABSENT' ? (
                                <span className="flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2.5 py-1.5 rounded-full">
                                  <XCircle size={14} />
                                  Absent
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1.5 rounded-full">
                                  Pending
                                </span>
                              )}
                            </div>
                          </div>

                          {/* TIME */}
                          <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                            <Clock size={15} />

                            {item.startTime} -{' '}
                            {item.endTime}

                            {item.room && (
                              <>
                                <span>•</span>
                                <span>
                                  Room {item.room}
                                </span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}

                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="px-6 pb-6">
              <button
                onClick={() => setSelectedDate(null)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =================================================
          INDIVIDUAL CLASS MODAL
          ================================================= */}
      {selectedClass && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">

          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden">

            <div className="flex justify-between items-center p-6 border-b border-gray-100">

              <h2 className="text-xl font-bold">
                Class Details
              </h2>

              <button
                onClick={() => setSelectedClass(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>

            </div>

            <div className="p-6 space-y-4">

              <div>
                <h3 className="font-bold text-lg text-gray-900">
                  {selectedClass.subject.name}{' '}
                  ({selectedClass.subject.code})
                </h3>

                <p className="text-gray-500">
                  {selectedClass.date} •{' '}
                  {selectedClass.startTime} -{' '}
                  {selectedClass.endTime}
                </p>

                <p className="text-gray-500 text-sm">
                  Lec {selectedClass.lectureNumber}

                  {selectedClass.room &&
                    ` • Room: ${selectedClass.room}`}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100">

                <p className="mb-3 text-sm font-medium text-gray-700">
                  Update Status:
                </p>

                <div className="flex flex-col gap-2">

                  <button
                    onClick={() =>
                      handleMarkAttendance('PRESENT')
                    }
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status ===
                      'PRESENT'
                        ? 'bg-green-100 text-green-700 border-2 border-green-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 border-2 border-transparent'
                    }`}
                  >
                    <CheckCircle size={20} />
                    Mark Present
                  </button>

                  <button
                    onClick={() =>
                      handleMarkAttendance('ABSENT')
                    }
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status ===
                      'ABSENT'
                        ? 'bg-red-100 text-red-700 border-2 border-red-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 border-2 border-transparent'
                    }`}
                  >
                    <XCircle size={20} />
                    Mark Absent
                  </button>

                  <button
                    onClick={() =>
                      handleMarkAttendance('PENDING')
                    }
                    className={`px-4 py-3 flex items-center justify-center gap-2 rounded-xl font-medium transition-colors ${
                      selectedClass.status ===
                      'PENDING'
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