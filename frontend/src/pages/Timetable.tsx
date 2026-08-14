import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import { Plus, Trash2, X, SplitSquareHorizontal } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  color?: string;
}

interface TimetableSlot {
  id: string;
  subjectId: string;
  dayOfWeek: number; // 0-6
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  lectureNumber: number;
  room?: string;
  subject: Subject;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const Timetable: React.FC = () => {
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<TimetableSlot | null>(null);

  const [formData, setFormData] = useState({
    subjectId: '',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    lectureNumber: 1,
    room: ''
  });

  const loadData = async () => {
    try {
      const [slotsData, subjectsData] = await Promise.all([
        fetchWithAuth('/api/timetable'),
        fetchWithAuth('/api/subjects')
      ]);

      setSlots(slotsData);
      setSubjects(subjectsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenModal = (slot?: TimetableSlot) => {
    if (slot) {
      setEditingSlot(slot);

      setFormData({
        subjectId: slot.subjectId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        lectureNumber: slot.lectureNumber,
        room: slot.room || ''
      });
    } else {
      setEditingSlot(null);

      setFormData({
        subjectId: subjects.length > 0 ? subjects[0].id : '',
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '10:00',
        lectureNumber: 1,
        room: ''
      });
    }

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subjectId) {
      alert("Please select a subject or create one first!");
      return;
    }

    try {
      if (editingSlot) {
        await fetchWithAuth(`/api/timetable/${editingSlot.id}`, {
          method: 'PATCH',
          body: JSON.stringify(formData)
        });
      } else {
        await fetchWithAuth('/api/timetable', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to save slot');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      await fetchWithAuth(`/api/timetable/${id}`, {
        method: 'DELETE'
      });

      loadData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete slot');
    }
  };

  const handleSplit = async (slot: TimetableSlot) => {
    // If it's a 2 hour block (e.g. 09:00 to 11:00), we can split it to 09:00-10:00 and 10:00-11:00.
    // This requires calculating time math. For simplicity, let's just show an alert explaining this is a placeholder
    // for Phase 4. Real time math will parse "HH:mm".

    const startHour = parseInt(slot.startTime.split(':')[0]);
    const endHour = parseInt(slot.endTime.split(':')[0]);

    if (endHour - startHour < 2) {
      alert("This slot is already 1 hour or less and cannot be split automatically.");
      return;
    }

    const midHour = startHour + Math.floor((endHour - startHour) / 2);
    const midTime = `${midHour.toString().padStart(2, '0')}:00`;

    const slot1 = {
      ...slot,
      endTime: midTime
    };

    const slot2 = {
      ...slot,
      startTime: midTime,
      lectureNumber: slot.lectureNumber + 1
    };

    try {
      // Create new slots
      await fetchWithAuth('/api/timetable', {
        method: 'POST',
        body: JSON.stringify([
          {
            subjectId: slot1.subjectId,
            dayOfWeek: slot1.dayOfWeek,
            startTime: slot1.startTime,
            endTime: slot1.endTime,
            lectureNumber: slot1.lectureNumber,
            room: slot1.room
          },
          {
            subjectId: slot2.subjectId,
            dayOfWeek: slot2.dayOfWeek,
            startTime: slot2.startTime,
            endTime: slot2.endTime,
            lectureNumber: slot2.lectureNumber,
            room: slot2.room
          }
        ])
      });

      // Delete old slot
      await fetchWithAuth(`/api/timetable/${slot.id}`, {
        method: 'DELETE'
      });

      loadData();
    } catch (err) {
      alert("Failed to split slot");
    }
  };

  if (loading) {
    return <div className="p-8">Loading timetable...</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Weekly Timetable
          </h1>

          <p className="text-gray-500 mt-1">
            Manage your recurring weekly schedule.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={20} />
          Add Class
        </button>
      </div>

      {/* Grid view */}
      <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-6 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50/50">
          {DAYS.map(day => (
            <div
              key={day}
              className="py-4 text-center font-semibold text-gray-700"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-6 divide-x divide-gray-100 min-h-[60vh] bg-white">
          {[1, 2, 3, 4, 5, 6].map(dayIdx => {
            const daySlots = slots.filter(
              s => s.dayOfWeek === dayIdx
            );

            return (
              <div
                key={dayIdx}
                className="p-3 flex flex-col gap-3 relative"
              >
                {daySlots.map(slot => (
                  <div
                    key={slot.id}
                    className="p-3 rounded-xl shadow-sm border transition-all hover:shadow-md group relative cursor-pointer"
                    style={{
                      borderColor: slot.subject?.color
                        ? `${slot.subject.color}40`
                        : '#e5e7eb',

                      backgroundColor: slot.subject?.color
                        ? `${slot.subject.color}15`
                        : '#f9fafb',
                    }}
                    onClick={() => handleOpenModal(slot)}
                  >
                    <div className="font-bold text-gray-900 leading-tight mb-1">
                      {slot.subject?.code}
                    </div>

                    <div className="text-xs text-gray-600 font-medium mb-1">
                      {slot.startTime} - {slot.endTime}
                    </div>

                    <div className="text-xs text-gray-500">
                      Lec {slot.lectureNumber}{' '}
                      {slot.room && `• ${slot.room}`}
                    </div>

                    {/* Hover actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 p-1 rounded-md shadow-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSplit(slot);
                        }}
                        className="text-gray-500 hover:text-blue-600 p-1"
                        title="Split Block"
                      >
                        <SplitSquareHorizontal size={14} />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(slot.id);
                        }}
                        className="text-gray-500 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">
                {editingSlot ? 'Edit Class' : 'Add Class'}
              </h2>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>

                <select
                  required
                  value={formData.subjectId}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      subjectId: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  <option value="" disabled>
                    Select a subject
                  </option>

                  {subjects.map(sub => (
                    <option
                      key={sub.id}
                      value={sub.id}
                    >
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Day *
                </label>

                <select
                  required
                  value={formData.dayOfWeek}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      dayOfWeek: parseInt(e.target.value)
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                >
                  {DAYS.map((day, idx) => (
                    <option
                      key={idx}
                      value={idx + 1}
                    >
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time *
                  </label>

                  <input
                    type="time"
                    required
                    value={formData.startTime}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        startTime: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time *
                  </label>

                  <input
                    type="time"
                    required
                    value={formData.endTime}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        endTime: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lecture Number
                  </label>

                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.lectureNumber}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        lectureNumber: parseInt(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Room (Optional)
                  </label>

                  <input
                    type="text"
                    value={formData.room}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        room: e.target.value
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  Save Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timetable;