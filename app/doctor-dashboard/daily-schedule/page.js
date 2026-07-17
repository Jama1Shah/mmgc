'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, Menu, Calendar as CalendarIcon, MoreVertical, Activity, Trash2, FileText, FlaskConical, Stethoscope } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DoctorSidebar from '@/components/DoctorSidebar';

const DailySchedule = () => {
  const router = useRouter();

  // --- UI Layout States ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState(null); // Track which row menu dropdown is visible

  // --- Core Application States ---
  const [doctor, setDoctor] = useState({ name: "", email: "" });
  const [appointments, setAppointments] = useState([]);

  // Ref container for the whole appointments list area to capture outside clicks safely
  const scheduleContainerRef = useRef(null);

  // --- Close Dropdown on Outside Click (Container-based approach) ---
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (scheduleContainerRef.current && !scheduleContainerRef.current.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // --- Fetch and Synchronize Resilient Ecosystem Data ---
  useEffect(() => {
    const fetchScheduleData = async () => {
      try {
        setLoading(true);
        const userEmail = sessionStorage.getItem('userEmail');

        if (!userEmail) {
          console.error("No user email found in workspace session.");
          return;
        }

        const userRes = await fetch(`/api/users?email=${encodeURIComponent(userEmail)}`);
        if (!userRes.ok) throw new Error("Failed to fetch user profile");
        const userData = await userRes.json();

        if (userData) {
          setDoctor({ name: userData.name, email: userEmail });

          let liveAcceptedAppointments = [];
          let apiCallSuccessful = false;

          try {
            const queueRes = await fetch(`/api/appointments?doctorName=${encodeURIComponent(userData.name)}`);
            if (queueRes.ok) {
              const queueData = await queueRes.json();
              
              // Note: Prescribed items are filtered out of Daily Schedule so they migrate directly to Log History
              // STRICT REQUIREMENT MATCHING: Only include "Accepted for Checkup"
              liveAcceptedAppointments = queueData.filter(item => 
                ["Accepted for Checkup"].includes(item.status) && !item.deletedByDoctor && item.status !== "Discharged"
              );
              apiCallSuccessful = true;
            }
          } catch (apiErr) {
            console.warn("Live API collection dropped. Proceeding to secondary local cache system:", apiErr);
          }

          const savedHistory = localStorage.getItem(`history_${userEmail}`);
          let localHistoryArray = savedHistory ? JSON.parse(savedHistory) : [];
          
          if (apiCallSuccessful) {
            const liveIds = new Set(liveAcceptedAppointments.map(item => item._id));
            
            localHistoryArray = localHistoryArray.filter(item => {
              if (["Accepted for Checkup"].includes(item.status)) {
                return liveIds.has(item._id);
              }
              return true;
            });

            localStorage.setItem(`history_${userEmail}`, JSON.stringify(localHistoryArray));
          }

          // STRICT REQUIREMENT MATCHING: Only include "Accepted for Checkup"
          const localAcceptedAppointments = localHistoryArray.filter(item =>
            ["Accepted for Checkup"].includes(item.status) && !item.deletedByDoctor && item.status !== "Discharged"
          );

          const rawSchedule = [...liveAcceptedAppointments, ...localAcceptedAppointments].filter(
            (item, index, self) => item._id && self.findIndex(t => t._id === item._id) === index
          );

          // 🔄 Expanded Projection Engine: Project global Morning and Evening slots for everyday if patients are admitted
          const consolidatedSchedule = [];
          const admittedPatients = rawSchedule.filter(item => item.status === "Admitted");
          const standardAppointments = rawSchedule.filter(item => item.status !== "Admitted");

          // Push standard clinic appointments first
          standardAppointments.forEach(item => {
            consolidatedSchedule.push({
              ...item,
              originalId: item._id
            });
          });

          // Inject generic Ward Round checkup cards twice a day if any patient is currently admitted
          if (admittedPatients.length > 0) {
            const todayStr = new Date().toLocaleDateString('en-CA'); // Safe YYYY-MM-DD local format
            const uniqueDates = new Set(standardAppointments.map(item => item.date).filter(Boolean));
            uniqueDates.add(todayStr); // Ensure the current active day is evaluated

            uniqueDates.forEach(dateKey => {
              const isMorningDone = localStorage.getItem(`checkup_ward_round_${dateKey}_morning`) === 'true';
              const isEveningDone = localStorage.getItem(`checkup_ward_round_${dateKey}_evening`) === 'true';

              if (!isMorningDone) {
                consolidatedSchedule.push({
                  _id: `ward_round_${dateKey}_morning`,
                  originalId: `ward_round_${dateKey}_morning`,
                  patientName: "Ward Round Checkup",
                  date: dateKey,
                  time: "09:00",
                  status: "Admitted",
                  shiftType: "morning",
                  shiftLabel: "Morning Rounds Checkup",
                  reason: "Inpatient Ward Rounds View"
                });
              }
              if (!isEveningDone) {
                consolidatedSchedule.push({
                  _id: `ward_round_${dateKey}_evening`,
                  originalId: `ward_round_${dateKey}_evening`,
                  patientName: "Ward Round Checkup",
                  date: dateKey,
                  time: "17:00",
                  status: "Admitted",
                  shiftType: "evening",
                  shiftLabel: "Evening Shift Handover Checkup",
                  reason: "Inpatient Ward Rounds View"
                });
              }
            });
          }

          // Sort by Date first, then by Time (Nearest to Farthest)
          consolidatedSchedule.sort((a, b) => {
            const dateCompare = (a.date || "").localeCompare(b.date || "");
            if (dateCompare !== 0) return dateCompare;
            return (a.time || "").localeCompare(b.time || "");
          });

          setAppointments(consolidatedSchedule);
        }
      } catch (err) {
        console.error("Schedule integration architecture failure:", err);
      } finally {
        loading && setLoading(false);
      }
    };

    fetchScheduleData();
  }, []);

  // --- Unified Delete Action Engine ---
  const handleDelete = async (appointmentId) => {
    if (!window.confirm("Are you sure you want to remove this appointment from your daily schedule?")) {
      return;
    }

    // Resolve original entity identifier keys mapping to preserve database records integrity
    const target = appointments.find(app => app._id === appointmentId);
    const resolvedId = target?.originalId || appointmentId;

    try {
      // Optimistically clean up local UI screen state
      setAppointments(prev => prev.filter(app => app.originalId !== resolvedId && app._id !== appointmentId));
      setActiveMenuId(null);

      // soft-delete endpoint mutation strategy: preserves patient dashboard history access rules
      const response = await fetch(`/api/appointments?id=${encodeURIComponent(resolvedId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletedByDoctor: true })
      });

      if (!response.ok) {
        console.warn("API soft-deletion flag failed. Relying strictly on backup storage routing.");
        await fetch(`/api/appointments?id=${encodeURIComponent(resolvedId)}`, { method: 'DELETE' });
      }

      if (doctor.email) {
        const savedHistory = localStorage.getItem(`history_${doctor.email}`);
        if (savedHistory) {
          const localHistoryArray = JSON.parse(savedHistory);
          const updatedHistoryArray = localHistoryArray.map(item => 
            item._id === resolvedId ? { ...item, deletedByDoctor: true } : item
          );
          localStorage.setItem(`history_${doctor.email}`, JSON.stringify(updatedHistoryArray));
        }
      }
    } catch (err) {
      console.error("Failed to complete appointment deletion routine:", err);
    }
  };

  // --- Navigate to Prescription Page with Context ---
  const handleIssuePrescription = (app) => {
    setActiveMenuId(null);
    const patientName = getCleanPatientName(app);
    
    const queryParams = new URLSearchParams({
      appointmentId: app.originalId || app._id,
      patientName: patientName,
      patientEmail: app.patientEmail || '',
      appointmentDate: app.date || '',
      appointmentTime: app.time || ''
    });

    router.push(`/doctor-dashboard/prescriptions?${queryParams.toString()}`);
  };

  // --- Navigate to Assign Lab Test Page with Context ---
  const handleAssignLabTest = (app) => {
    setActiveMenuId(null);
    const patientName = getCleanPatientName(app);

    const queryParams = new URLSearchParams({
      id: app.originalId || app._id,
      name: patientName,
      email: app.patientEmail || '',
      date: app.date || '',
      time: app.time || ''
    });

    router.push(`/doctor-dashboard/assign-lab-test?${queryParams.toString()}`);
  };

  // 🏥 Navigate to Specialized Admitted Management System Workspace View
  const handleAdmittedCheckup = (app) => {
    setActiveMenuId(null);
    
    if (app._id.startsWith('ward_round_')) {
      // Clear visibility specifically for this global checklist item shift
      localStorage.setItem(`checkup_${app._id}`, 'true');
    } else {
      const dateKey = app.date || "Unscheduled";
      const baseId = app.originalId || app._id;
      localStorage.setItem(`checkup_${baseId}_${dateKey}_${app.shiftType}`, 'true');
    }

    // Immediately reflect visual layout clean up locally 
    setAppointments(prev => prev.filter(item => item._id !== app._id));

    // Redirect explicitly to the admitted route cleanly with no parameter dependencies
    router.push('/admitted-patients');
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

  // Dynamic chronological grouping calculation helper
  const getGroupedAppointments = () => {
    const groups = [];
    appointments.forEach((app) => {
      const dateKey = app.date || "Unscheduled";
      const existingGroup = groups.find(g => g.date === dateKey);
      
      if (existingGroup) {
        existingGroup.items.push(app);
      } else {
        groups.push({ date: dateKey, items: [app] });
      }
    });
    return groups;
  };

  // --- Client Side Expiration Utility Checker ---
  const checkIsExpiredByOneHour = (dateStr, timeStr) => {
    if (!dateStr || !timeStr) return false;
    try {
      const now = new Date();
      const thresholdDate = now.toISOString().split('T')[0];
      const thresholdTime = new Date(now.getTime() - 60 * 60 * 1000).toTimeString().split(' ')[0].substring(0, 5);

      if (dateStr < thresholdDate) return true;
      if (dateStr === thresholdDate && timeStr < thresholdTime) return true;
      
      return false;
    } catch (e) {
      return false;
    }
  };

  const groupedAppointments = getGroupedAppointments();

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center sticky top-0 z-40 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 mr-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <CalendarIcon className="text-white" size={18} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">MMGC Schedule</span>
          </div>
        </header>

        <div className="p-6 lg:p-12 max-w-5xl mx-auto">
          {/* Header Section */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Daily Schedule</h1>
              <p className="text-slate-500 mt-1 text-sm md:text-base">
                Operational Practitioner: <span className="font-semibold text-blue-600">{loading ? "Synchronizing..." : `Dr. ${doctor.name}`}</span>
              </p>
            </div>
          </div>

          {/* Appointments List Container */}
          <div ref={scheduleContainerRef}>
            {loading ? (
              <div className="p-12 flex flex-col items-center justify-center text-slate-400 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <Activity size={48} className="mb-4 opacity-20 animate-pulse text-blue-600" />
                <p className="text-sm italic">Assembling historical and live clinical datasets...</p>
              </div>
            ) : groupedAppointments.length > 0 ? (
              <div className="space-y-10">
                {groupedAppointments.map((group, groupIndex) => (
                  <div key={group.date} className="space-y-4">
                    {groupIndex > 0 && (
                      <hr className="border-slate-200/80 my-8" />
                    )}
                    
                    {/* Day Group Header Badge Line */}
                    <div className="flex items-center space-x-4 pb-2">
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-200/60 px-3 py-1 rounded-md">
                        {group.date}
                      </span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    {/* Render matching day sub-items */}
                    <div className="space-y-4">
                      {group.items.map((app) => {
                        // 1. Determine base status name logic
                        let baseStatus = app.status === "Accepted for Checkup" ? "Upcoming" : app.status;
                        
                        // 2. Overwrite state dynamically to "Waiting..." only for uncompleted slots out by 1+ hours
                        const isOverdue = checkIsExpiredByOneHour(app.date, app.time);
                        if (isOverdue && ["Upcoming", "Accepted", "Pending", "Scheduled", "Waiting..."].includes(baseStatus)) {
                          baseStatus = "Waiting...";
                        }

                        const displayStatus = baseStatus;
                        const isMenuOpen = activeMenuId === app._id;
                        const isAdmittedPatient = app.status === "Admitted";

                        return (
                          <div 
                            key={app._id} 
                            className={`bg-white p-4 md:p-6 rounded-2xl border flex flex-col md:flex-row items-start md:items-center justify-between shadow-sm hover:shadow-md transition-all group gap-4 ${
                              isAdmittedPatient ? 'border-indigo-100 bg-gradient-to-r from-indigo-50/20 to-transparent' : 'border-slate-200'
                            }`}
                          >
                            <title>Daily Schedule - MMGC</title>
                            <div className="flex items-center space-x-4 md:space-x-6 w-full md:w-auto">
                              {/* Time Badge */}
                              <div className={`p-3 rounded-xl border flex flex-col items-center min-w-[95px] transition-colors ${
                                isAdmittedPatient 
                                  ? 'bg-indigo-50/60 border-indigo-100/80' 
                                  : 'bg-slate-50 border-slate-100 group-hover:bg-blue-50 group-hover:border-blue-100'
                              }`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</span>
                                <span className={`text-sm font-black whitespace-nowrap ${isAdmittedPatient ? 'text-indigo-600' : 'text-blue-600'}`}>{app.time}</span>
                              </div>
                              
                              {/* Patient Info */}
                              <div className="flex-1">
                                <h3 className="font-bold text-slate-800 text-lg leading-snug">{getCleanPatientName(app)}</h3>
                                <div className="flex items-center text-xs md:text-sm text-slate-500 font-medium mt-0.5">
                                  <Clock size={14} className="mr-1.5 opacity-70" />
                                  {isAdmittedPatient ? (app.shiftLabel || "Inpatient Ward Rounds") : (app.reason || "General Consultation")}
                                </div>
                              </div>
                            </div>

                            {/* Status & Actions Container */}
                            <div className="flex items-center justify-between w-full md:w-auto md:space-x-4 border-t md:border-t-0 pt-3 md:pt-0 relative">
                              <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isAdmittedPatient
                                  ? 'bg-indigo-600 text-white border border-indigo-700'
                                  : displayStatus === 'Completed' || displayStatus === 'Prescribed'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                                  : displayStatus === 'In-Progress'
                                  ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                  : displayStatus === 'Waiting...'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse' // Custom styling alert badge
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {displayStatus}
                              </span>
                              
                              {/* Dropdown Action Controls */}
                              <div className="relative">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuId(isMenuOpen ? null : app._id);
                                  }}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isMenuOpen ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  <MoreVertical size={18} />
                                </button>

                                {/* Dropdown Box overlay menu */}
                                {isMenuOpen && (
                                  <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                                    {isAdmittedPatient ? (
                                      /* Restricted actions view displaying ONLY checking rounds redirection link */
                                      <button
                                        onClick={() => handleAdmittedCheckup(app)}
                                        className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-bold flex items-center gap-2 transition-colors"
                                      >
                                        <Stethoscope size={16} />
                                        Ward Round Checkup
                                      </button>
                                    ) : (
                                      <>
                                        <button
                                          onClick={() => handleIssuePrescription(app)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 font-semibold flex items-center gap-2 transition-colors border-b border-slate-100"
                                        >
                                          <FileText size={16} />
                                          Issue Prescription
                                        </button>
                                        <button
                                          onClick={() => handleAssignLabTest(app)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50 font-semibold flex items-center gap-2 transition-colors border-b border-slate-100"
                                        >
                                          <FlaskConical size={16} />
                                          Lab Test
                                        </button>
                                        <button
                                          onClick={() => handleDelete(app._id)}
                                          className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 font-semibold flex items-center gap-2 transition-colors"
                                        >
                                          <Trash2 size={16} />
                                          Delete Schedule
                                        </button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
                 <CalendarIcon size={48} className="mx-auto text-slate-200 mb-4" />
                 <p className="text-slate-500 font-medium">No active appointments found in your dashboard logs matrix.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DailySchedule;