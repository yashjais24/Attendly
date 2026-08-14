import React, { useEffect, useState } from 'react';
import { fetchWithAuth } from '../services/api';
import { Plus, Edit2, Trash2, X, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  teacher?: string;
  room?: string;
  requiredAttendance?: number;
  color?: string;
}

const Subjects: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    teacher: '',
    room: '',
    requiredAttendance: '',
    color: '#9baba5' // Default primary color
  });

  const loadSubjects = async () => {
    try {
      const data = await fetchWithAuth('/subjects');
      setSubjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleOpenModal = (subject?: Subject) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        code: subject.code,
        teacher: subject.teacher || '',
        room: subject.room || '',
        requiredAttendance: subject.requiredAttendance ? subject.requiredAttendance.toString() : '',
        color: subject.color || '#9baba5'
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: '', code: '', teacher: '', room: '', requiredAttendance: '', color: '#9baba5' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      requiredAttendance: formData.requiredAttendance ? parseFloat(formData.requiredAttendance) : null
    };

    try {
      if (editingSubject) {
        await fetchWithAuth(`/subjects/${editingSubject.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchWithAuth('/subjects', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setIsModalOpen(false);
      loadSubjects();
    } catch (err) {
      console.error(err);
      alert('Failed to save subject');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await fetchWithAuth(`/subjects/${id}`, { method: 'DELETE' });
      loadSubjects();
    } catch (err) {
      console.error(err);
      alert('Failed to delete subject');
    }
  };

  if (loading) return <div className="p-8">Loading subjects...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 mt-1">Manage your courses and attendance requirements.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
        >
          <Plus size={20} />
          Add Subject
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-surface p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: subject.color || '#9baba5' }}
                >
                  {subject.code.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{subject.name}</h3>
                  <p className="text-sm text-gray-500">{subject.code}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleOpenModal(subject)} className="text-gray-400 hover:text-primary transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(subject.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="mt-auto pt-4 border-t border-gray-50 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Teacher:</span>
                <span className="font-medium text-gray-900">{subject.teacher || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Room:</span>
                <span className="font-medium text-gray-900">{subject.room || '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Req. Attendance:</span>
                <span className="font-medium text-gray-900">
                  {subject.requiredAttendance ? `${subject.requiredAttendance}%` : 'Default'}
                </span>
              </div>
            </div>
          </div>
        ))}

        {subjects.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No subjects yet</h3>
            <p className="mt-1 text-gray-500">Get started by adding your first course.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-surface w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold">{editingSubject ? 'Edit Subject' : 'Add Subject'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="e.g. Data Structures"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course Code *</label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={e => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                  placeholder="e.g. CS201"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
                  <input
                    type="text"
                    value={formData.teacher}
                    onChange={e => setFormData({...formData, teacher: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    placeholder="e.g. Dr. Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                  <input
                    type="text"
                    value={formData.room}
                    onChange={e => setFormData({...formData, room: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    placeholder="e.g. A-101"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Required Att. (%)</label>
                  <input
                    type="number"
                    min="0" max="100"
                    value={formData.requiredAttendance}
                    onChange={e => setFormData({...formData, requiredAttendance: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary/50 outline-none"
                    placeholder="e.g. 75"
                  />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to use default</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    className="w-full h-10 px-1 py-1 border border-gray-200 rounded-lg cursor-pointer"
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
                  Save Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Subjects;
