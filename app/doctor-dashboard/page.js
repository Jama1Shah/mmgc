'use client';

import Link from 'next/link';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import DoctorSidebar from '@/components/DoctorSidebar';
import { Search, Activity, Clock, Menu, Trash2, Edit2, Check, X, FileBarChart2, ShieldAlert } from 'lucide-react';

const DoctorDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [doctor, setDoctor] = useState({ name: "", specialization: "", email: "" });
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Custom Confirmation Modal State
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const confirmButtonRef = useRef(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Quick Notes States
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Core Synchronization Engine with Live Polling
  useEffect(() => {
    const userEmail = sessionStorage.getItem('userEmail');
    if (!userEmail) {
      console.warn("No user email discovered in active workspace session.");
      setLoading(false);
      return;
    }

    // 🛡️ Stable reference to persist the resolved doctor name across interval loops
    let resolvedDoctorName = ""; 

    const fetchWorkspaceData = async (isSilent = false) => {
      try {
        if (!isSilent) setLoading(true);

        // STEP 1: Resolve User Profile ONCE. Do not re-fetch every 5 seconds.
        if (!resolvedDoctorName) {
          const userRes = await fetch(`/api/users?email=${encodeURIComponent(userEmail)}`);
          if (!userRes.ok) throw new Error("Failed to fetch user profile data mapping");
          const userData = await userRes.json();

          if (userData) {
            resolvedDoctorName = userData.name; // Commit to stable closure variable
            setDoctor({
              name: userData.name,
              specialization: userData.dept || "Specialist",
              email: userEmail
            });

            // Load local data structures once when profile resolves successfully
            const savedNotes = localStorage.getItem(`notes_${userEmail}`);
            setNotes(savedNotes ? JSON.parse(savedNotes) : []);
          }
        }

        // Safeguard: If user collection didn't resolve a valid profile name, cancel appointment fetch
        if (!resolvedDoctorName) {
          if (!isSilent) setLoading(false);
          return;
        }

        // STEP 2: Fetch Assigned System Queue Documents (Runs on initial load AND every poll)
        const queueRes = await fetch(`/api/appointments?doctorName=${encodeURIComponent(resolvedDoctorName)}`);
        if (!queueRes.ok) throw new Error("Failed to sync structural appointments table");
        const queueData = await queueRes.json();

        const activeQueue = [];
        const systemArchivedLogs = [];

        queueData.forEach(item => {
          const fallbackStatus = item.status || "Pending";
          const sanitizedItem = { ...item, status: fallbackStatus };

          // Filter out "Admitted", "Discharged", and "Bill Pending" statuses from showing up in active interactive row queues
          // ✅ FIX: Move item.admissionRequired out of the array search so it evaluates properly on its own truthy condition
          if (
            ["Rejected", "Withdrawn", "Completed", "Accepted for Checkup", "Archived", "Prescribed", "Admitted", "Discharged", "Bill Pending"].includes(fallbackStatus) || 
            item.admissionRequired === true || 
            item.admissionRequired === "true"
          ) {
            systemArchivedLogs.push(sanitizedItem);
          } else {
            activeQueue.push(sanitizedItem);
          }
        });
        
        setQueue(activeQueue);

        // STEP 3: Process Local Storage Disks with Unique Mapping
        const savedHistory = localStorage.getItem(`history_${userEmail}`);
        const localHistoryArray = savedHistory ? JSON.parse(savedHistory) : [];
        
        const deduplicatedMap = new Map();
        ([...systemArchivedLogs, ...localHistoryArray]).forEach(item => {
          if (item._id) deduplicatedMap.set(item._id, item);
        });
        
        setHistory(Array.from(deduplicatedMap.values()));
        
        // Successfully loaded everything
        setLoading(false);
      } catch (err) {
        console.error("Dashboard synchronization module failure:", err);
        if (!isSilent) setLoading(false);
      }
    };

    // Trigger initial synchronous loading lifecycle sequence
    fetchWorkspaceData(false);

    // 🔄 Setup Polling: Checks database for updates safely using the isolated string variable
    const pollInterval = setInterval(() => {
      fetchWorkspaceData(true); 
    }, 5000);

    return () => clearInterval(pollInterval);
  }, []);

  // Sync historical mutations to local storage references securely
  const saveToHistory = useCallback((updatedAppointment, currentDoctorEmail) => {
    if (!currentDoctorEmail) return;
    setHistory(prevHistory => {
      const filtered = prevHistory.filter(apt => apt._id !== updatedAppointment._id);
      const updatedHistory = [updatedAppointment, ...filtered];
      localStorage.setItem(`history_${currentDoctorEmail}`, JSON.stringify(updatedHistory));
      return updatedHistory;
    });
  }, []);

  // State mutation handler supporting network fallback recovery transitions
  const updateAppointmentStatus = async (id, newStatus) => {
    const appointmentToMove = queue.find(apt => apt._id === id);
    if (!appointmentToMove) return;

    const originalQueue = [...queue];
    const originalHistory = [...history];
    const updatedAppt = { ...appointmentToMove, status: newStatus };

    // Optimistically project UI view changes
    if (["Accepted for Checkup", "Rejected", "Cancelled", "Archived", "Prescribed", "Admitted", "Discharged", "Bill Pending"].includes(newStatus)) {
      setQueue(prevQueue => prevQueue.filter(apt => apt._id !== id));
      saveToHistory(updatedAppt, doctor.email);
    } else {
      setQueue(prevQueue => prevQueue.map(apt => apt._id === id ? updatedAppt : apt));
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }), 
      });

      if (!res.ok) throw new Error('Database pipeline refused functional mutations');
    } catch (error) {
      console.error("Transaction failed. Rolling back local UI states:", error);
      setQueue(originalQueue);
      setHistory(originalHistory);
      if (doctor.email) {
        localStorage.setItem(`history_${doctor.email}`, JSON.stringify(originalHistory));
      }
    }
  };

  const handleAcceptAppointment = (id) => updateAppointmentStatus(id, "Accepted for Checkup");
  const handleRejectAppointment = (id) => updateAppointmentStatus(id, "Rejected");
  const handleDeleteCancelledAppointment = (id) => updateAppointmentStatus(id, "Archived");

  const handleClearHistory = () => {
    if (!doctor.email || !doctor.name) return;
    setIsConfirmOpen(true);
  };

  const executeClearHistory = async () => {
    setIsConfirmOpen(false);
    try {
      const preservedHistory = history.filter(apt => apt.status === "Accepted for Checkup");
      setHistory(preservedHistory);
      localStorage.setItem(`history_${doctor.email}`, JSON.stringify(preservedHistory));

      await fetch(`/api/appointments?doctorName=${encodeURIComponent(doctor.name)}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Failed executing remote history cache clearance sequence:", err);
    }
  };

  // Keyboard control hook for when the custom confirm modal appears
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isConfirmOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          executeClearHistory();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsConfirmOpen(false);
        }
      }
    };

    if (isConfirmOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
      // Shift active control focus onto modal confirm action button
      if (confirmButtonRef.current) {
        confirmButtonRef.current.focus();
      }
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isConfirmOpen, history, doctor]);

  const saveNote = () => {
    if (!noteInput.trim() || !doctor.email) return;

    let updatedNotes;
    if (editingNoteId) {
      updatedNotes = notes.map(note =>
        note.id === editingNoteId ? { ...note, text: noteInput } : note
      );
      setEditingNoteId(null);
    } else {
      const newNote = {
        id: Date.now(),
        text: noteInput,
        date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      };
      updatedNotes = [newNote, ...notes];
    }

    setNotes(updatedNotes);
    localStorage.setItem(`notes_${doctor.email}`, JSON.stringify(updatedNotes));
    setNoteInput("");
  };

  const deleteNote = (id) => {
    if (!doctor.email) return;
    const updatedNotes = notes.filter(note => note.id !== id);
    setNotes(updatedNotes);
    localStorage.setItem(`notes_${doctor.email}`, JSON.stringify(updatedNotes));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      setNoteInput("");
    }
  };

  const startEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteInput(note.text);
  };

  const getCleanPatientName = (apt) => {
    if (apt.patientName && apt.patientName !== "Patient Profile" && apt.patientName.trim() !== "") {
      return apt.patientName;
    }
    if (apt.patientEmail) {
      const prefix = apt.patientEmail.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "Anonymous Patient";
  };

  // Filtered Queue logic
  const filteredQueue = queue.filter(apt => {
    const name = getCleanPatientName(apt).toLowerCase();
    const reason = (apt.reason || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return name.includes(query) || reason.includes(query);
  });

  // Calculate dynamic count of pending lab reports (Waiting on Lab)
  const pendingLabsCount = queue.filter(apt => 
    ['Lab Test Ordered', 'Processing Lab Test'].includes(apt.status)
  ).length;

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header Bar */}
        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-40 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 mr-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="relative flex-1 max-w-72 lg:max-w-96">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search workflow matrix..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all text-sm" 
            />
          </div>
          <div className="flex items-center space-x-3 border-l pl-4 border-slate-200">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-800 leading-none">
                {loading ? "Syncing..." : `Dr. ${doctor.name}`}
              </p>
              <p className="text-xs text-slate-500 mt-1">{doctor.specialization}</p>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {/* Action Row */}
          <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Clinical Overview</h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base">
                Operational Practitioner: <span className="font-semibold text-blue-600">{loading ? "..." : `Dr. ${doctor.name}`}</span>
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsHistoryOpen(true)}
                className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center shadow-sm"
              >
                <Clock size={16} className="mr-2" /> Logs Panel ({history.length})
              </button>
            </div>
          </div>

          {/* Core Analytics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <StatCard label="Total Metrics handled" value={loading ? "..." : history.length.toString()} trend="Lifetime" color="blue" />
            <StatCard label="Live Tracker Items" value={queue.length.toString()} trend="Active Data" color="indigo" />
            <StatCard label="Lab Reports Pending" value={loading ? "..." : String(pendingLabsCount).padStart(2, '0')} trend="Immediate action" color="amber" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Live Interactive Queue Table */}
            <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 text-lg">Patient Queue</h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 bg-red-50 border border-red-100 px-3 py-1.5 rounded-full animate-pulse">
                  Live Updates
                </span>
              </div>

              <div className="overflow-x-auto">
                {loading && queue.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                    <Activity size={48} className="mb-4 opacity-20 animate-pulse" />
                    <p className="text-sm italic">Workspace operational pipeline empty for Dr. {doctor.name}.</p>
                  </div>
                ) : filteredQueue.length > 0 ? (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-slate-400 text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <th className="px-6 py-4">Target Schedule</th>
                        <th className="px-6 py-4">Patient Profile</th>
                        <th className="px-6 py-4">Clinical Intent</th>
                        <th className="px-6 py-4">Status Flag</th>
                        <th className="px-6 py-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredQueue.map((apt) => {
                        const isCancelled = apt.status === "Cancelled";
                        const isRescheduled = apt.status === "Rescheduled";
                        
                        const isUnderLabReview = [
                          'Lab Test Ordered', 
                          'Processing Lab Test', 
                          'Lab Completed'
                        ].includes(apt.status);

                        return (
                          <tr 
                            key={apt._id} 
                            className={`transition-colors ${
                              isCancelled ? 'bg-red-50/30 hover:bg-red-50/50' : 
                              isRescheduled ? 'bg-amber-50/30 hover:bg-amber-50/50' : 
                              isUnderLabReview ? 'bg-purple-50/20 hover:bg-purple-50/40' :
                              'hover:bg-slate-50'
                            }`}
                          >
                            <td className="px-6 py-4">
                              <p className={`font-bold ${isCancelled ? 'text-red-500 line-through' : isRescheduled ? 'text-amber-600' : 'text-blue-600'}`}>
                                {apt.time}
                              </p>
                              <p className="text-[10px] text-slate-400">{apt.date}</p>
                            </td>
                            <td className="px-6 py-4 text-sm font-semibold text-slate-800">
                              {getCleanPatientName(apt)}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[150px]">
                              {apt.reason || "General Consultation"}
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                                isCancelled ? 'bg-red-100 text-red-700 border border-red-200' :
                                isRescheduled ? 'bg-amber-100 text-amber-800 border border-amber-200 font-extrabold tracking-wide' :
                                apt.status === 'Lab Test Ordered' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                                apt.status === 'Processing Lab Test' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                                apt.status === 'Lab Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold' :
                                'bg-blue-50 text-blue-600 border border-blue-100'
                              }`}>
                                {isRescheduled ? 'Waiting...' : apt.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center whitespace-nowrap">
                              {apt.status === 'Lab Completed' ? (
                                <Link 
                                  href={`/doctor-dashboard/lab-analytics?id=${apt._id}`}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
                                >
                                  <FileBarChart2 size={13} />
                                  View Analytics
                                </Link>
                              ) : isUnderLabReview ? (
                                <span className="text-[11px] text-slate-400 italic">Waiting on Lab...</span>
                              ) : !isCancelled ? (
                                <div className="inline-flex items-center space-x-2">
                                  <button
                                    onClick={() => handleAcceptAppointment(apt._id)}
                                    title="Accept for Checkup"
                                    className="p-1.5 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleRejectAppointment(apt._id)}
                                    title="Reject Entry"
                                    className="p-1.5 text-red-600 bg-red-50 border border-red-100 rounded-lg hover:bg-red-100 transition-colors"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleDeleteCancelledAppointment(apt._id)}
                                  title="Archive / Remove record"
                                  className="p-1.5 text-slate-500 bg-slate-100 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-slate-400">
                    <p className="text-sm italic">No matching results found in your queue.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Notes Panel Module */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[520px]">
              <h3 className="font-bold text-slate-800 text-lg mb-3">Quick Notes</h3>

              <div className="space-y-2 mb-4">
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Draft medical notes here..."
                  className="w-full h-24 p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:bg-white resize-none outline-none transition-all"
                />
                <button
                  onClick={saveNote}
                  disabled={!noteInput.trim()}
                  className={`w-full py-2 font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-1 ${
                    editingNoteId
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400'
                  }`}
                >
                  {editingNoteId ? "Update Note" : "Save Note"}
                </button>
                {editingNoteId && (
                  <button
                    onClick={() => { setEditingNoteId(null); setNoteInput(""); }}
                    className="w-full py-1.5 bg-slate-100 text-slate-500 font-medium rounded-xl text-xs hover:bg-slate-200 transition-all"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                {notes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center p-4">
                    <p className="text-xs text-slate-400 italic">No notes created for this current instance.</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 group relative hover:bg-slate-100/60 transition-all">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[10px] text-slate-400 font-medium">{note.date}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                          <button onClick={() => startEditNote(note)} className="p-1 text-slate-500 hover:text-blue-600 hover:bg-white rounded shadow-sm">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => deleteNote(note.id)} className="p-1 text-slate-500 hover:text-red-600 hover:bg-white rounded shadow-sm">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap break-words">{note.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* History Slideout View Engine */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col processing-slide-in">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Archived System Logs</h3>
                <p className="text-xs text-slate-400">Completely settled entries</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {history.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                  <Clock size={32} className="mb-2 opacity-30" />
                  <p className="text-sm italic">No completed history available.</p>
                </div>
              ) : (
                history.map((apt) => {
                  let displayStatus = apt.status;
                  if (apt.status === 'Accepted for Checkup') displayStatus = 'Accepted';
                  if (apt.status === 'Archived') displayStatus = 'Cancelled by Patient';

                  return (
                    <div key={apt._id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700">{getCleanPatientName(apt)}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ['Accepted', 'Accepted for Checkup', 'Prescribed', 'Admitted', 'Discharged'].includes(displayStatus) 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                            : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          {displayStatus}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        <p><span className="font-medium">Reason:</span> {apt.reason || "Routine Checkup"}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{apt.date} • {apt.time}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <button onClick={handleClearHistory} className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-bold rounded-xl transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={16} /> Wipe History Cache
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MATCHING CUSTOM CONFIRMATION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-2xl p-6 md:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto shadow-lg shadow-red-50">
                <ShieldAlert size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Clear Logs Panel</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Permanently clear non-scheduled local logs? (Accepted entries will remain in active monitor queues)
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="flex-1 py-3 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                ref={confirmButtonRef}
                onClick={executeClearHistory}
                className="flex-1 bg-red-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors shadow-md shadow-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value, trend, color }) => {
  const colorMap = {
    blue: "text-blue-600 bg-blue-50 border border-blue-100",
    indigo: "text-indigo-600 bg-indigo-50 border border-indigo-100",
    amber: "text-amber-600 bg-amber-50 border border-amber-100",
    emerald: "text-emerald-600 bg-emerald-50 border border-emerald-100",
  };
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className={`inline-flex p-2 rounded-lg mb-4 ${colorMap[color]}`}><Activity size={18} /></div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <h3 className="text-2xl md:text-3xl font-black text-slate-900">{value}</h3>
        <span className="text-[10px] font-bold text-blue-600 mb-1 bg-blue-50 px-2 py-0.5 rounded-full">{trend}</span>
      </div>
    </div>
  );
};

export default DoctorDashboard;