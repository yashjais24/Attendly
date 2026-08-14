import React, { useState, useRef, useEffect } from 'react';
import { fetchWithAuth } from '../services/api';
import {
  Upload as UploadIcon,
  FileText,
  Image as ImageIcon,
  Loader2,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ParsedSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  suggestedSubjectName: string;
  suggestedSubjectCode: string;
  lectureNumber: number;
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface VerifyingSlot extends ParsedSlot {
  subjectName: string;
  subjectCode: string;
  active: boolean;
}

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedSlots, setParsedSlots] =
    useState<ParsedSlot[] | null>(null);
  const [rawText, setRawText] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [verifyingSlots, setVerifyingSlots] =
    useState<VerifyingSlot[]>([]);
  const [saving, setSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // =========================
  // LOAD EXISTING SUBJECTS
  // =========================

  useEffect(() => {
    fetchWithAuth('/api/subjects')
      .then(setSubjects)
      .catch(console.error);
  }, []);

  // =========================
  // FILE DROP
  // =========================

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();

    if (
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  // =========================
  // FILE CHANGE
  // =========================

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (
      e.target.files &&
      e.target.files.length > 0
    ) {
      setFile(e.target.files[0]);
    }
  };

  // =========================
  // UPLOAD + GEMINI
  // =========================

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetchWithAuth(
        '/api/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      setRawText(response.rawText);
      setParsedSlots(response.parsedSlots);

      // Convert Gemini response into editable fields
      const initialVerifying: VerifyingSlot[] =
        response.parsedSlots.map(
          (slot: ParsedSlot) => {
            const suggestedName =
              slot.suggestedSubjectName || '';

            const suggestedCode =
              slot.suggestedSubjectCode || '';

            // Try to find existing subject
            const existingSubject =
              subjects.find((subject) => {
                const subjectName =
                  subject.name
                    .toLowerCase()
                    .trim();

                const subjectCode =
                  subject.code
                    .toLowerCase()
                    .trim();

                const detectedName =
                  suggestedName
                    .toLowerCase()
                    .trim();

                const detectedCode =
                  suggestedCode
                    .toLowerCase()
                    .trim();

                return (
                  subjectCode === detectedCode ||
                  subjectName === detectedName
                );
              });

            return {
              ...slot,

              // Existing subject found:
              // use database values.
              //
              // Otherwise:
              // use Gemini detected values.
              subjectName:
                existingSubject?.name ||
                suggestedName,

              subjectCode:
                existingSubject?.code ||
                suggestedCode,

              active: true,
            };
          }
        );

      setVerifyingSlots(initialVerifying);
    } catch (err: any) {
      console.error(err);

      alert(
        `Failed to process file: ${err.message}`
      );
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // UPDATE SUBJECT FIELD
  // =========================

  const updateSlot = (
    index: number,
    field:
      | 'subjectName'
      | 'subjectCode',
    value: string
  ) => {
    setVerifyingSlots((prev) =>
      prev.map((slot, i) =>
        i === index
          ? {
              ...slot,
              [field]: value,
            }
          : slot
      )
    );
  };

  // =========================
  // TOGGLE SLOT
  // =========================

  const toggleSlot = (index: number) => {
    setVerifyingSlots((prev) =>
      prev.map((slot, i) =>
        i === index
          ? {
              ...slot,
              active: !slot.active,
            }
          : slot
      )
    );
  };

  // =========================
  // NORMALIZE TEXT
  // =========================

  const normalize = (value: string) => {
    return value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
  };

  // =========================
  // FIND OR CREATE SUBJECT
  // =========================

  const findOrCreateSubject = async (
    name: string,
    code: string,
    currentSubjects: Subject[]
  ): Promise<Subject> => {
    const normalizedName = normalize(name);
    const normalizedCode = normalize(code);

    // First try exact course-code match
    let existing = currentSubjects.find(
      (subject) =>
        normalize(subject.code) ===
        normalizedCode
    );

    if (existing) {
      return existing;
    }

    // Then try exact name match
    existing = currentSubjects.find(
      (subject) =>
        normalize(subject.name) ===
        normalizedName
    );

    if (existing) {
      return existing;
    }

    // Create new subject
    const created = await fetchWithAuth(
      '/api/subjects',
      {
        method: 'POST',

        body: JSON.stringify({
          name: name.trim(),
          code: code.trim(),
          teacher: null,
          room: null,
          requiredAttendance: null,
          color: '#9baba5',
        }),
      }
    );

    return created;
  };

  // =========================
  // SAVE TIMETABLE
  // =========================

  const handleSaveToTimetable = async () => {
    const activeSlots =
      verifyingSlots.filter(
        (slot) => slot.active
      );

    if (activeSlots.length === 0) {
      alert('No classes selected.');
      return;
    }

    // Check missing subject information
    const invalidSlot =
      activeSlots.find(
        (slot) =>
          !slot.subjectName.trim() ||
          !slot.subjectCode.trim()
      );

    if (invalidSlot) {
      alert(
        'Please enter both Subject Name and Course Code for every selected class.'
      );

      return;
    }

    setSaving(true);

    try {
      // Local copy so newly created subjects
      // are reused during this upload.

      let currentSubjects = [
        ...subjects,
      ];

      const slotsToSave: {
        subjectId: string;
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        lectureNumber: number;
      }[] = [];

      // =========================
      // CREATE / FIND SUBJECTS
      // =========================

      for (const slot of activeSlots) {
        const subject =
          await findOrCreateSubject(
            slot.subjectName,
            slot.subjectCode,
            currentSubjects
          );

        // Add newly created subject
        // to local list

        if (
          !currentSubjects.some(
            (s) => s.id === subject.id
          )
        ) {
          currentSubjects.push(subject);
        }

        // =========================
        // PREPARE TIMETABLE SLOT
        // =========================

        slotsToSave.push({
          subjectId: subject.id,
          dayOfWeek: slot.dayOfWeek,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lectureNumber:
            slot.lectureNumber,
        });
      }

      // Update local subjects state

      setSubjects(currentSubjects);

      // =========================
      // SAVE TIMETABLE
      // =========================

      await fetchWithAuth(
        '/api/timetable',
        {
          method: 'POST',

          body: JSON.stringify(
            slotsToSave
          ),
        }
      );

      alert(
        'Successfully added timetable and subjects!'
      );

      navigate('/timetable');
    } catch (err: any) {
      console.error(
        'Failed to save timetable:',
        err
      );

      alert(
        err?.message ||
          'Failed to save timetable. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  // =========================
  // RESET
  // =========================

  const handleReset = () => {
    setParsedSlots(null);
    setFile(null);
    setRawText('');
    setVerifyingSlots([]);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">

      {/* HEADER */}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Upload Timetable
        </h1>

        <p className="text-gray-500 mt-1">
          Upload a PDF or Image (PNG/JPG) of your
          college timetable to auto-extract classes.
        </p>
      </div>

      {/* =========================
          UPLOAD AREA
      ========================= */}

      {!parsedSlots && (
        <div
          className="border-2 border-dashed border-gray-300 rounded-3xl bg-surface p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer"
          onDragOver={(e) =>
            e.preventDefault()
          }
          onDrop={handleFileDrop}
          onClick={() =>
            fileInputRef.current?.click()
          }
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

              <p className="font-bold text-gray-900 text-lg">
                {file.name}
              </p>

              {loading && (
                <p className="mt-4 text-sm text-gray-500 font-medium">
                  Analyzing timetable with Gemini...
                </p>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleUpload();
                }}
                disabled={loading}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <UploadIcon />
                )}

                {loading
                  ? 'Analyzing with Gemini...'
                  : 'Extract Timetable'}
              </button>
            </div>
          ) : (
            <div>

              <p className="font-medium text-gray-900 text-lg">
                Click to browse or drag and drop your file here
              </p>

              <p className="text-gray-500 mt-2 text-sm">
                Supports PDF, PNG, and JPG.
              </p>

            </div>
          )}
        </div>
      )}

      {/* =========================
          EXTRACTION RESULT
      ========================= */}

      {parsedSlots && (
        <div className="space-y-6">

          {/* TOP BAR */}

          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl flex justify-between items-center border border-blue-100 gap-4">

            <div>
              <h3 className="font-bold">
                Extraction Complete
              </h3>

              <p className="text-sm opacity-90">
                Check the detected subjects and
                correct anything Gemini got wrong
                before saving.
              </p>
            </div>

            <button
              onClick={
                handleSaveToTimetable
              }
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
            >

              {saving && (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              )}

              {saving
                ? 'Saving...'
                : 'Save Timetable'}

            </button>
          </div>

          {/* TABLE */}

          <div className="bg-surface rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            <div className="overflow-x-auto">

              <table className="w-full text-left border-collapse">

                <thead>

                  <tr className="bg-gray-50 border-b border-gray-100">

                    <th className="p-4 font-semibold text-gray-600">
                      Keep
                    </th>

                    <th className="p-4 font-semibold text-gray-600">
                      Day
                    </th>

                    <th className="p-4 font-semibold text-gray-600">
                      Time
                    </th>

                    <th className="p-4 font-semibold text-gray-600">
                      Subject Name
                    </th>

                    <th className="p-4 font-semibold text-gray-600">
                      Course Code
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y divide-gray-100">

                  {verifyingSlots.length === 0 ? (
                    <tr>

                      <td
                        colSpan={5}
                        className="p-8 text-center text-gray-500"
                      >
                        No classes were automatically
                        detected. Try a clearer image
                        or manual entry.
                      </td>

                    </tr>
                  ) : (
                    verifyingSlots.map(
                      (slot, idx) => (
                        <tr
                          key={idx}
                          className={
                            !slot.active
                              ? 'opacity-50 bg-gray-50'
                              : ''
                          }
                        >

                          {/* KEEP */}

                          <td className="p-4 text-center w-16">

                            <button
                              onClick={() =>
                                toggleSlot(idx)
                              }
                              className={`w-6 h-6 rounded-md flex items-center justify-center ${
                                slot.active
                                  ? 'bg-primary text-white'
                                  : 'border-2 border-gray-300 text-transparent'
                              }`}
                            >
                              <Check size={16} />
                            </button>

                          </td>

                          {/* DAY */}

                          <td className="p-4 font-medium whitespace-nowrap">
                            {DAYS[
                              slot.dayOfWeek
                            ]}
                          </td>

                          {/* TIME */}

                          <td className="p-4 whitespace-nowrap">
                            {slot.startTime} -{' '}
                            {slot.endTime}
                          </td>

                          {/* SUBJECT NAME */}

                          <td className="p-4 min-w-[260px]">

                            <input
                              type="text"
                              value={
                                slot.subjectName
                              }
                              disabled={
                                !slot.active
                              }
                              onChange={(e) =>
                                updateSlot(
                                  idx,
                                  'subjectName',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. Data Structures"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/40 outline-none disabled:bg-gray-100"
                            />

                            {slot.active &&
                              !slot.subjectName.trim() && (
                                <p className="text-red-500 text-xs mt-1">
                                  Subject name required
                                </p>
                              )}

                          </td>

                          {/* COURSE CODE */}

                          <td className="p-4 min-w-[180px]">

                            <input
                              type="text"
                              value={
                                slot.subjectCode
                              }
                              disabled={
                                !slot.active
                              }
                              onChange={(e) =>
                                updateSlot(
                                  idx,
                                  'subjectCode',
                                  e.target.value
                                )
                              }
                              placeholder="e.g. CS201"
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-primary/40 outline-none disabled:bg-gray-100"
                            />

                            {slot.active &&
                              !slot.subjectCode.trim() && (
                                <p className="text-red-500 text-xs mt-1">
                                  Course code required
                                </p>
                              )}

                          </td>

                        </tr>
                      )
                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

          {/* RESET */}

          <div className="mt-8">

            <button
              onClick={handleReset}
              className="text-gray-500 hover:text-gray-900 transition-colors text-sm font-medium"
            >
              ← Try another file
            </button>

          </div>

          {/* RAW TEXT */}

          <details className="mt-8 text-sm text-gray-500 bg-gray-50 p-4 rounded-xl border border-gray-100">

            <summary className="cursor-pointer font-medium mb-2">
              View Raw Extracted Text
            </summary>

            <pre className="whitespace-pre-wrap font-mono mt-2">
              {rawText}
            </pre>

          </details>

        </div>
      )}

    </div>
  );
};

export default UploadPage;