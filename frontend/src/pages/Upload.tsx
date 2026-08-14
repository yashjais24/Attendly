import React, { useState, useRef, useEffect } from 'react';
import { fetchWithAuth } from '../services/api';
import { Upload as UploadIcon, FileText, Image as ImageIcon, Loader2, Check} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ParsedSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  suggestedSubjectCode: string;
  lectureNumber: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedSlots, setParsedSlots] = useState<ParsedSlot[] | null>(null);
  const [rawText, setRawText] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // For verification UI: Map parsed slots to actual subjects
  // state structure: Array of { parsedSlot, selectedSubjectId, active: boolean }
  const [verifyingSlots, setVerifyingSlots] = useState<any[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWithAuth('/subjects').then(setSubjects).catch(console.error);
  }, []);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetchWithAuth('/api/upload', {
        method: 'POST',
        body: formData // fetchWithAuth won't set Content-Type if it's FormData, which is correct for multipart boundary
      });
      
      setRawText(response.rawText);
      setParsedSlots(response.parsedSlots);
      
      // Auto-match subjects based on suggested code
      const initialVerifying = response.parsedSlots.map((slot: ParsedSlot) => {
        let bestMatch = '';
        if (slot.suggestedSubjectCode) {
          const match = subjects.find(s => 
            s.code.toLowerCase().includes(slot.suggestedSubjectCode.toLowerCase()) || 
            slot.suggestedSubjectCode.toLowerCase().includes(s.code.toLowerCase())
          );
          if (match) bestMatch = match.id;
        }
        return {
          ...slot,
          selectedSubjectId: bestMatch,
          active: true
        };
      });
      setVerifyingSlots(initialVerifying);
      
    } catch (err: any) {
      console.error(err);
      alert(`Failed to process file: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTimetable = async () => {
    const slotsToSave = verifyingSlots
      .filter(s => s.active && s.selectedSubjectId)
      .map(s => ({
        subjectId: s.selectedSubjectId,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        lectureNumber: s.lectureNumber
      }));

    if (slotsToSave.length === 0) {
      alert("No valid slots selected with an assigned subject.");
      return;
    }

    try {
      await fetchWithAuth('/timetable', {
        method: 'POST',
        body: JSON.stringify(slotsToSave)
      });
      alert('Successfully added to timetable!');
      navigate('/timetable');
    } catch (err) {
      console.error(err);
      alert('Failed to save to timetable.');
    }
  };

  const updateSlot = (index: number, field: string, value: any) => {
    const newSlots = [...verifyingSlots];
    newSlots[index][field] = value;
    setVerifyingSlots(newSlots);
  };

  const toggleSlot = (index: number) => {
    const newSlots = [...verifyingSlots];
    newSlots[index].active = !newSlots[index].active;
    setVerifyingSlots(newSlots);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Upload Timetable</h1>
        <p className="text-gray-500 mt-1">Upload a PDF or Image (PNG/JPG) of your college timetable to auto-extract classes.</p>
      </div>

      {!parsedSlots && (
        <div 
          className="border-2 border-dashed border-gray-300 rounded-3xl bg-surface p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="application/pdf,image/png,image/jpeg"
            onChange={handleFileChange}
          />
          
          <div className="flex justify-center gap-4 mb-6 text-primary/60">
            <FileText size={48} />
            <ImageIcon size={48} />
          </div>
          
          {file ? (
            <div className="space-y-4">
              <p className="font-bold text-gray-900 text-lg">{file.name}</p>
              {loading && <p className="mt-4 text-sm text-gray-500 font-medium">Analyzing timetable with Gemini...</p>}
              <button 
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                disabled={loading}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <UploadIcon />}
                {loading ? 'Analyzing with OCR...' : 'Extract Timetable'}
              </button>
            </div>
          ) : (
            <div>
              <p className="font-medium text-gray-900 text-lg">Click to browse or drag and drop your file here</p>
              <p className="text-gray-500 mt-2 text-sm">Supports PDF, PNG, and JPG. Our deterministic parser will identify days and times.</p>
            </div>
          )}
        </div>
      )}

      {parsedSlots && (
        <div className="space-y-6">
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex justify-between items-center border border-blue-100">
            <div>
              <h3 className="font-bold">Extraction Complete</h3>
              <p className="text-sm opacity-90">Please verify the auto-detected slots. Uncheck any incorrect slots or fix their subjects.</p>
            </div>
            <button 
              onClick={handleSaveToTimetable}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Save to Timetable
            </button>
          </div>

          <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="p-4 font-semibold text-gray-600">Keep</th>
                  <th className="p-4 font-semibold text-gray-600">Day</th>
                  <th className="p-4 font-semibold text-gray-600">Time</th>
                  <th className="p-4 font-semibold text-gray-600">Extracted Text</th>
                  <th className="p-4 font-semibold text-gray-600 w-1/3">Assign Subject</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {verifyingSlots.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No classes were automatically detected. Try a clearer image or manual entry.
                    </td>
                  </tr>
                ) : verifyingSlots.map((slot, idx) => (
                  <tr key={idx} className={!slot.active ? 'opacity-50 bg-gray-50' : ''}>
                    <td className="p-4 text-center w-16">
                      <button 
                        onClick={() => toggleSlot(idx)}
                        className={`w-6 h-6 rounded-md flex items-center justify-center ${slot.active ? 'bg-primary text-white' : 'border-2 border-gray-300 text-transparent'}`}
                      >
                        <Check size={16} />
                      </button>
                    </td>
                    <td className="p-4 font-medium">{DAYS[slot.dayOfWeek]}</td>
                    <td className="p-4">{slot.startTime} - {slot.endTime}</td>
                    <td className="p-4 text-gray-500 font-mono text-sm max-w-[200px] truncate" title={slot.suggestedSubjectCode}>
                      {slot.suggestedSubjectCode || '—'}
                    </td>
                    <td className="p-4">
                      <select 
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 outline-none bg-white"
                        value={slot.selectedSubjectId}
                        onChange={e => updateSlot(idx, 'selectedSubjectId', e.target.value)}
                        disabled={!slot.active}
                      >
                        <option value="">-- Select Subject --</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                      </select>
                      {slot.active && !slot.selectedSubjectId && (
                        <p className="text-red-500 text-xs mt-1">Please select a subject</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <button 
              onClick={() => { setParsedSlots(null); setFile(null); }}
              className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              ← Try another file
            </button>
          </div>
          
          <details className="mt-8 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">
            <summary className="cursor-pointer font-medium mb-2">View Raw Extracted Text</summary>
            <pre className="whitespace-pre-wrap font-mono mt-2">{rawText}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default UploadPage;
