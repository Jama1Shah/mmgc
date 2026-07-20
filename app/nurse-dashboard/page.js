'use client';
import React, { useState, useEffect } from 'react';
import NurseSidebar from '@/components/NurseSidebar';
import { Menu, CheckCircle2, Heart, Pill, FlaskConical, Truck, RefreshCw, Activity, ExternalLink, FileText, AlertCircle } from 'lucide-react';

export default function MasterNurseDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState([]);
  const [activeTab, setActiveTab] = useState('All Wards');

  // --- CUSTOM DIALOG & MODAL STATE ---
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    isSuccess: true
  });

  const [vitalsModal, setVitalsModal] = useState({
    isOpen: false,
    patientId: null,
    hr: '75',
    temp: '98.6',
    spo2: '98',
    bp: '120/80'
  });

  const calculateAdmissionDays = (admittedAt) => {
    if (!admittedAt) return 0;
    const ad = new Date(admittedAt);
    ad.setHours(0, 0, 0, 0);
    const cd = new Date();
    cd.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((cd - ad) / (1000 * 60 * 60 * 24)));
  };

  // Fetch dynamic queue from the backend database records repository instance layout
  const loadInpatients = async () => {
    try {
      setLoading(true);

      // Request prescriptions globally using your built-in 'admittedOnly' query flag
      const rxRes = await fetch('/api/prescriptions?admittedOnly=true');

      if (rxRes.ok) {
        const prescriptionsList = await rxRes.json();

        // Remap the prescription data back to the schema structure your UI panels expect
        const compiledRecords = prescriptionsList.map(rx => {
          // Robust defensive check to safely extract values even if appointmentId is unpopulated or null
          const apt = rx.appointmentId && typeof rx.appointmentId === 'object' ? rx.appointmentId : {};

          // 🕒 Dynamic Evaluation Matrix: Shift verification windows (08:00, 14:00, 20:00)
          let isCheckedThisShift = false;
          if (rx.vitalsChecked && rx.vitalsCheckedAt) {
            const now = new Date();
            const currentShiftStart = new Date(now);
            currentShiftStart.setMinutes(0, 0, 0, 0); // Clear sub-hour units

            const currentHour = now.getHours();
            if (currentHour >= 20) {
              currentShiftStart.setHours(20);
            } else if (currentHour >= 14) {
              currentShiftStart.setHours(14);
            } else if (currentHour >= 8) {
              currentShiftStart.setHours(8);
            } else {
              // Night Shift started at 20:00 the previous calendar day
              currentShiftStart.setDate(currentShiftStart.getDate() - 1);
              currentShiftStart.setHours(20);
            }

            // Verify if the entry was logged after the shift started
            isCheckedThisShift = new Date(rx.vitalsCheckedAt) >= currentShiftStart;
          }

          // Determine if pre-admission or current lab status indicates a finished cycle
          const isLabFinished = rx.labStatus === 'Completed' || rx.labStatus === 'Lab Completed' || apt.labStatus === 'Completed' || apt.labStatus === 'Lab Completed';
          
          const resolvedLabStatus = isLabFinished 
            ? 'Completed' 
            : ((rx.labStatus && rx.labStatus !== 'Pending' && rx.labStatus !== 'None') 
                ? rx.labStatus 
                : (apt.labStatus && apt.labStatus !== 'None' 
                    ? apt.labStatus 
                    : (rx.labStatus && rx.labStatus !== 'None' ? rx.labStatus : "Pending")));

          const resolvedLabPrescription = (rx.labPrescription && rx.labPrescription !== "No active lab orders listed." && rx.labPrescription !== "Diagnostic Panels Ordered")
            ? rx.labPrescription
            : (apt.labPrescription || rx.labPrescription || "No active lab orders listed.");

          return {
            _id: rx._id,
            appointmentId: apt._id || rx.appointmentId,
            patientName: rx.patientName,
            patientEmail: rx.patientEmail,
            doctorName: rx.doctorName || "Attending Physician",

            // Fallback strings to ensure your UI's text .trim() filters don't hide the panels
            medicationDetails: rx.medicationDetails || "No active inpatient medication charts configured.",
            
            // Core Fix: Safely fall back to rx properties if apt is empty
            labPrescription: resolvedLabPrescription,
            labStatus: resolvedLabStatus,
            labNotes: rx.labNotes || apt.labNotes || "",
            labFileUrl: rx.labFileUrl || apt.labFileUrl || "",
            testCompletedAt: apt.updatedAt || rx.updatedAt || null,

            vitals: rx.vitals || { hr: '80', temp: '98.6', spo2: '98', bp: '120/80' },
            vitalsChecked: isCheckedThisShift, // Overridden based on Shift verification step
            vitalsCheckedAt: rx.vitalsCheckedAt || null,
            medStatus: rx.medStatus || "Pending",
            admissionDays: (rx.admissionDetails?.admissionDays ?? apt.admissionDays ?? apt.admissionDetails?.admissionDays ?? calculateAdmissionDays(rx.admissionDetails?.admittedAt || apt.admissionDetails?.admittedAt)),

            // Dynamic Ward Allocation Normalization Engine
            ward: rx.admissionRequired ? (rx.admissionDetails?.ward || rx.admissionDetails?.wardName || "General Bedward") : "Outpatient / Lab"
          };
        });

        setPatients(compiledRecords);
      }
    } catch (err) {
      console.error("Failed synchronization pipeline operations on nurse station:", err);
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInpatients();
  }, []);

  const handleLogVitals = (id) => {
    setVitalsModal({
      isOpen: true,
      patientId: id,
      hr: '75',
      temp: '98.6',
      spo2: '98',
      bp: '120/80'
    });
  };

  const submitVitalsChart = async () => {
    const { patientId, hr, temp, spo2, bp } = vitalsModal;

    if (!hr || !temp || !spo2 || !bp) {
      setAlertModal({
        isOpen: true,
        title: "Validation Failure",
        message: "All parameters required for clinical charting validation steps.",
        isSuccess: false
      });
      return;
    }

    const freshVitals = { hr, temp, spo2, bp };

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: patientId, vitals: freshVitals })
      });
      if (res.ok) {
        setPatients(prev => prev.map(p => p._id === patientId ? { 
          ...p, 
          vitals: freshVitals, 
          vitalsChecked: true, 
          vitalsCheckedAt: new Date().toISOString() 
        } : p));
        setVitalsModal(prev => ({ ...prev, isOpen: false }));
        setAlertModal({
          isOpen: true,
          title: "Vitals Logged",
          message: "Vitals successfully committed to cloud medical history records chart.",
          isSuccess: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper function to extract medication frequencies and determine total slots with scheduled administration times
  const parseMedications = (medicationDetails) => {
    if (!medicationDetails || medicationDetails.startsWith("No active inpatient")) return [];
    
    return medicationDetails.split('\n')
      .filter(line => line.trim() !== '')
      .map((line, lineIdx) => {
        const lowerLine = line.toLowerCase();
        
        // Skip parsing line if it is a general prescription description or doesn't match timing slots
        if (lowerLine.includes('prescription:') || lowerLine.includes('staged medications:') || 
            (!lowerLine.includes('stat') && !lowerLine.includes('qid') && !lowerLine.includes('tds') && !lowerLine.includes('bd') && !lowerLine.includes('od'))) {
          return null;
        }

        let count = 1; // Fallback default to 1 slot
        let type = 'od';
        let times = ['08:00'];

        if (lowerLine.includes('stat')) { 
          count = 1; 
          type = 'stat'; 
          times = ['Immediate']; 
        } else if (lowerLine.includes('qid')) { 
          count = 4; 
          type = 'qid'; 
          times = ['08:00', '12:00', '16:00', '20:00']; 
        } else if (lowerLine.includes('tds')) { 
          count = 3; 
          type = 'tds'; 
          times = ['08:00', '14:00', '20:00']; 
        } else if (lowerLine.includes('bd')) { 
          count = 2; 
          type = 'bd'; 
          times = ['08:00', '20:00']; 
        } else if (lowerLine.includes('od')) { 
          count = 1; 
          type = 'od'; 
          times = ['08:00']; 
        }

        // Flag lines the doctor has toggled off via the [CANCELLED] marker so the ward board can grey them out
        const isCancelled = lowerLine.includes('[cancelled]') || lowerLine.includes('cancelled');
        
        return { line: line.trim(), lineIdx, count, type, times, isCancelled };
      })
      .filter(Boolean);
  };

  // Helper function to isolate and extract doctor prescription notes or staged headers
  const getDoctorPrescription = (medicationDetails) => {
    if (!medicationDetails || medicationDetails.startsWith("No active inpatient")) return "";
    
    return medicationDetails.split('\n')
      .filter(line => line.trim() !== '')
      .filter(line => {
        const lowerLine = line.toLowerCase();
        return lowerLine.includes('prescription:') || lowerLine.includes('staged medications:') || 
               (!lowerLine.includes('stat') && !lowerLine.includes('qid') && !lowerLine.includes('tds') && !lowerLine.includes('bd') && !lowerLine.includes('od'));
      })
      .map(line => line.trim())
      .join(' | ');
  };

  // Helper to safely unpack administration state maps from database strings
  const getAdminTrackerMap = (medStatusStr) => {
    try {
      return JSON.parse(medStatusStr);
    } catch (e) {
      if (medStatusStr === 'Completed') return { allCompleted: true };
      return {}; // empty fallback maps
    }
  };

  // Handle toggling administration checkmarks for individual dose slots (Locks once checked, auto-resets at 06:00 AM)
  const handleToggleMedSlot = async (id, currentMedStatus, slotKey) => {
    let currentMap = {};
    try {
      currentMap = JSON.parse(currentMedStatus);
    } catch (e) {
      if (currentMedStatus === 'Completed') currentMap = { allCompleted: true };
    }

    // Save explicit timestamp tracking metric into payload index instead of a generic boolean flag
    const updatedMap = {
      ...currentMap,
      [slotKey]: new Date().toISOString()
    };

    const payloadString = JSON.stringify(updatedMap);

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, medStatus: payloadString })
      });
      if (res.ok) {
        setPatients(prev => prev.map(p => p._id === id ? { ...p, medStatus: payloadString } : p));
      }
    } catch (err) {
      console.error("Failed medication tracking mutation operations:", err);
    }
  };

  const handleLabDispatch = async (id, currentStatus, appointmentId) => {
    const nextStatus = (!currentStatus || currentStatus === 'Pending' || currentStatus === 'To Collect') ? 'Pending Dispatch' : 'Dispatched';
    try {
      // Direct state patches route keeps both Appointment and Prescription matching status parameters synchronized 
      const res = await fetch('/api/appointments/lab-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, labStatus: nextStatus })
      });
      if (res.ok) {
        setPatients(prev => prev.map(p => p._id === id ? { ...p, labStatus: nextStatus } : p));
        setAlertModal({
          isOpen: true,
          title: "Specimen Status Dispatched",
          message: `Lab specimen status updated to: ${nextStatus}`,
          isSuccess: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Dynamic Multi-Ward Tab Filtering Engine
  const uniqueWards = ['All Wards', ...Array.from(new Set(patients.map(p => p.ward).filter(Boolean)))];
  const filteredPatients = activeTab === 'All Wards' ? patients : patients.filter(p => p.ward === activeTab);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      
                          <title>Dashboard - MMGC</title>
      <NurseSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 overflow-y-auto">

        <header className="bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-[100]">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-slate-50 rounded-lg border text-slate-600"><Menu size={20} /></button>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Ward Bed Patient Operations Board</h2>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">Active Synchronized Monitoring System Protocol</p>
            </div>
          </div>
          <button onClick={loadInpatients} className="p-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 tracking-wide shadow-sm hover:bg-blue-600 transition-colors">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Sync Desk Engine
          </button>
        </header>

        {/* Dynamic Specialty Ward Filtering Layout Bar */}
        {!loading && (
          <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-2 sticky top-[73px] z-40 flex gap-2 overflow-x-auto scrollbar-none shadow-sm">
            {uniqueWards.map((wardTab) => {
              const tabCount = wardTab === 'All Wards' ? patients.length : patients.filter(p => p.ward === wardTab).length;
              return (
                <button
                  key={wardTab}
                  onClick={() => setActiveTab(wardTab)}
                  className={`pb-2 pt-2 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 rounded-t-lg ${
                    activeTab === wardTab
                      ? 'border-blue-600 text-blue-600 font-black bg-blue-50/40'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                >
                  {wardTab}
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === wardTab ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                    {tabCount}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
            <Activity className="animate-pulse text-blue-600" size={32} />
            <p className="text-xs font-bold text-slate-400">Syncing with Attending Clinical Desks database record arrays...</p>
          </div>
        ) : (
          <div className="p-4 md:p-8 max-w-[1600px] mx-auto space-y-10 text-left">

            {/* Section 1: Vitals updates verification desk */}
            <section className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xl flex items-center"><Heart className="mr-2 text-rose-500 animate-pulse" size={22} /> 1. Ward Bed Operations: Shift Vitals Logging Tracker</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Urgent metrics logging verification requirements mapping metrics pipelines directly.</p>
                </div>
                <span className="text-xs font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-full uppercase">{filteredPatients.filter(p => !p.vitalsChecked).length} Action Pending</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {filteredPatients.map(p => (
                  <div key={p._id} className={`bg-white p-5 rounded-[28px] border transition-all ${!p.vitalsChecked ? 'border-rose-200 shadow-sm shadow-rose-50' : 'border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-bold text-slate-900">{p.patientName}</h4>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-wider">Doctor: {p.doctorName}</p>
                        <span className="mt-1 inline-block text-[9px] font-extrabold bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase tracking-tight">{p.ward} • Day {p.admissionDays}</span>
                      </div>
                      {p.vitalsChecked ? (
                        <span className="bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase px-2.5 py-1 rounded-lg flex items-center"><CheckCircle2 size={12} className="mr-1" /> Checked</span>
                      ) : (
                        <button onClick={() => handleLogVitals(p._id)} className="bg-rose-600 text-white text-[11px] font-black px-3 py-1.5 rounded-xl hover:bg-rose-700 shadow-sm">Log Vitals</button>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-3 rounded-2xl text-xs font-mono">
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">HR</p><p className="font-black text-slate-800">{p.vitals?.hr || '--'}</p></div>
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">Temp</p><p className="font-black text-slate-800">{p.vitals?.temp || '--'}°</p></div>
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">SpO2</p><p className="font-black text-slate-800">{p.vitals?.spo2 || '--'}%</p></div>
                      <div><p className="text-[9px] font-bold text-slate-400 uppercase">BP</p><p className="font-black text-slate-800">{p.vitals?.bp || '--'}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2 & 3: Mid-Shift Administration Grid Panels Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Left Column: Medications Deployment tracking matrix panel */}
              <section className="space-y-4">
                <h3 className="font-extrabold text-slate-900 text-xl flex items-center"><Pill className="mr-2 text-blue-600" size={22} /> 2. Active Formulary Treatment Round Distributions</h3>
                <div className="bg-white rounded-[32px] border divide-y overflow-hidden shadow-sm">

                  {filteredPatients.map(p => {
                    const parsedMeds = parseMedications(p.medicationDetails);
                    const tracker = getAdminTrackerMap(p.medStatus);
                    const docPresc = getDoctorPrescription(p.medicationDetails);

                    return (
                      <div key={p._id} className="p-6 flex flex-col space-y-4">
                        <div className="border-b border-slate-100 pb-2 flex justify-between items-center text-left">
                          <div>
                            <h4 className="font-black text-slate-800 text-sm tracking-tight">{p.patientName}</h4>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{p.ward} • Day {p.admissionDays}</p>
                            {docPresc && (
                              <p className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded-lg mt-1.5 border border-purple-100 text-left">
                                {docPresc}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">ID: {p._id.slice(-6)}</span>
                        </div>

                        {parsedMeds.length > 0 ? (
                          <div className="space-y-3.5">
                            {parsedMeds.map((med) => (
                              <div key={med.lineIdx} className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl border gap-3 transition-all ${med.isCancelled ? 'bg-rose-50/40 border-rose-100' : 'bg-slate-50/60 border-slate-100'}`}>
                                <div className="text-left max-w-full sm:max-w-[65%]">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider text-white ${med.isCancelled ? 'bg-slate-400' : 'bg-blue-600'}`}>
                                      {med.type}
                                    </span>
                                    {med.isCancelled && (
                                      <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-600 text-white rounded uppercase tracking-wider flex items-center gap-0.5">
                                        <AlertCircle size={10} /> Deleted by Doctor
                                      </span>
                                    )}
                                  </div>
                                  <p className={`text-xs font-bold font-mono leading-tight ${med.isCancelled ? 'line-through text-slate-400' : 'text-slate-700'}`}>{med.line}</p>
                                </div>

                                {/* Active Dose Interval Checkbox Slots Generation Matrix Map */}
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {Array.from({ length: med.count }).map((_, slotIdx) => {
                                    const slotKey = `${med.lineIdx}-${slotIdx}`;
                                    
                                    // 🕒 Dynamic Auto-Reset Engine Execution (Evaluates 2 hours prior to next day's 08:00 AM cycle -> 06:00 AM)
                                    const now = new Date();
                                    const lastResetAnchor = new Date(now);
                                    lastResetAnchor.setHours(6, 0, 0, 0);
                                    if (now < lastResetAnchor) {
                                      lastResetAnchor.setDate(lastResetAnchor.getDate() - 1);
                                    }

                                    const slotValue = tracker[slotKey];
                                    let isGiven = false;

                                    if (tracker.allCompleted) {
                                      isGiven = true;
                                    } else if (slotValue) {
                                      if (typeof slotValue === 'string') {
                                        // Valid if stamped AFTER the most recent 06:00 AM boundary pass
                                        isGiven = new Date(slotValue) >= lastResetAnchor;
                                      } else {
                                        isGiven = !!slotValue;
                                      }
                                    }

                                    const slotDisplayTime = med.times[slotIdx] || '08:00';

                                    // 🕒 Dynamic Validation Matrix: 3 hours before or 3 hours after window validation
                                    let isWithinWindow = true;
                                    if (slotDisplayTime !== 'Immediate') {
                                      const [slotHours, slotMinutes] = slotDisplayTime.split(':').map(Number);
                                      const slotTargetDate = new Date(now);
                                      slotTargetDate.setHours(slotHours, slotMinutes, 0, 0);

                                      const diffInMs = Math.abs(now.getTime() - slotTargetDate.getTime());
                                      const threeHoursInMs = 3 * 60 * 60 * 1000;
                                      isWithinWindow = diffInMs <= threeHoursInMs;
                                    }

                                    // Cancelled medicines can never be administered — slot stays locked regardless of window/given state
                                    if (med.isCancelled) {
                                      return (
                                        <span
                                          key={slotIdx}
                                          title="Medicine cancelled by doctor — dose slot disabled"
                                          className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide uppercase rounded-xl border bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed line-through"
                                        >
                                          <AlertCircle size={12} className="text-slate-300" />
                                          {slotDisplayTime}
                                        </span>
                                      );
                                    }

                                    return (
                                      <button
                                        key={slotIdx}
                                        onClick={() => {
                                          if (isGiven || !isWithinWindow) return; // Block manual unchecking configurations directly
                                          handleToggleMedSlot(p._id, p.medStatus, slotKey);
                                        }}
                                        disabled={isGiven || !isWithinWindow}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-extrabold tracking-wide uppercase rounded-xl border transition-all ${
                                          isGiven
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-50 cursor-not-allowed opacity-85'
                                            : !isWithinWindow
                                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:bg-slate-50'
                                        }`}
                                      >
                                        <CheckCircle2 size={12} className={isGiven ? 'text-emerald-600' : 'text-slate-300'} />
                                        {slotDisplayTime}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs italic font-medium text-slate-400 p-2 bg-slate-50 rounded-xl font-mono">
                            {p.medicationDetails}
                          </p>
                        )}
                      </div>
                    );
                  })}

                  {filteredPatients.length === 0 && (
                    <p className="text-xs font-bold text-slate-400 p-6 text-center">No active medication deployment orders pending transmission.</p>
                  )}

                </div>
              </section>

              {/* Right Column: Specimen Analysis Workflow processing pipeline matrix panel */}
              <section className="space-y-6">
                <h3 className="font-extrabold text-slate-900 text-xl flex items-center"><FlaskConical className="mr-2 text-indigo-600" size={22} /> 3. Laboratory Specimen Extractions & Queue Dispatch</h3>
                
                {/* 3A. Pending Collection / Initial Tests Panel */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pl-2">Pending Collection / Initial Tests</h4>
                  <div className="bg-white rounded-[24px] border divide-y overflow-hidden shadow-sm">
                    {filteredPatients.filter(p => {
                      if (!p.labPrescription || p.labPrescription === "No active lab orders listed." || p.labPrescription.trim() === "") return false;
                      if (p.labStatus && p.labStatus !== 'Pending' && p.labStatus !== 'To Collect') return false;
                      
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];
                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }
                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      const pendingLabs = allLabs.filter(lab => !completedTestNames.includes(lab));
                      return pendingLabs.length > 0;
                    }).map(p => {
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];

                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }

                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      const pendingLabs = allLabs.filter(lab => !completedTestNames.includes(lab));

                      return (
                        <div key={p._id} className="p-5 flex flex-col space-y-3">
                          <div className="flex items-center justify-between w-full">
                            <div className="text-left">
                              <h4 className="font-bold text-slate-800 text-sm">{p.patientName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{p.ward} • Day {p.admissionDays}</p>
                              <p className="text-xs text-purple-600 font-bold mt-0.5">🧬 {pendingLabs.join(', ')}</p>
                            </div>
                            <div>
                              <button onClick={() => handleLabDispatch(p._id, p.labStatus, p.appointmentId)} className="bg-slate-900 hover:bg-purple-600 text-white px-3 py-1.5 rounded-xl text-xs font-black transition-colors">Log Collection</button>
                            </div>
                          </div>

                          {(p.labNotes || p.labFileUrl) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-3 text-left w-full">
                              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1"><FileText size={14} className="text-blue-600" /> Diagnostic Results Matrix</span>
                                {p.testCompletedAt && (
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                                    Released: {new Date(p.testCompletedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {textLogsArray.length > 0 ? (
                                <div className="space-y-1.5">
                                  {textLogsArray.map((t, idx) => (
                                    <div key={idx} className="text-xs text-slate-600">
                                      <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                                    </div>
                                  ))}
                                </div>
                              ) : p.labNotes && (
                                <p className="text-xs text-slate-600 italic">"{p.labNotes}"</p>
                              )}

                              {attachmentUrlsArray.length > 0 ? (
                                <div className="pt-2 border-t border-slate-100 flex flex-col space-y-1">
                                  {attachmentUrlsArray.map((fileObj, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white border rounded-lg p-1.5 px-2.5">
                                      <span className="font-semibold text-slate-500 truncate max-w-[65%]">{fileObj.testName}</span>
                                      <div className="flex gap-1.5">
                                        {fileObj.urls.map((url, uIdx) => (
                                          <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                            Doc {uIdx + 1} <ExternalLink size={10} />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : p.labFileUrl && (
                                <div className="pt-2 border-t border-slate-100">
                                  <a href={p.labFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                    View Diagnostic Attachment Report <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredPatients.filter(p => {
                      if (!p.labPrescription || p.labPrescription === "No active lab orders listed." || p.labPrescription.trim() === "") return false;
                      if (p.labStatus && p.labStatus !== 'Pending' && p.labStatus !== 'To Collect') return false;
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];
                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }
                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      return allLabs.filter(lab => !completedTestNames.includes(lab)).length > 0;
                    }).length === 0 && (
                      <p className="text-xs font-bold text-slate-400 p-4 text-center">No tests pending collection.</p>
                    )}
                  </div>
                </div>

                {/* 3B. To Be Sent / Dispatched to Lab Panel */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pl-2">To Be Sent / Dispatched to Lab</h4>
                  <div className="bg-white rounded-[24px] border divide-y overflow-hidden shadow-sm">
                    {filteredPatients.filter(p => {
                      if (!p.labPrescription || p.labPrescription === "No active lab orders listed." || p.labPrescription.trim() === "") return false;
                      if (p.labStatus !== 'Pending Dispatch' && p.labStatus !== 'Dispatched' && p.labStatus !== 'In Progress') return false;
                      
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];
                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }
                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      const pendingLabs = allLabs.filter(lab => !completedTestNames.includes(lab));
                      return pendingLabs.length > 0;
                    }).map(p => {
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];

                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }

                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      const pendingLabs = allLabs.filter(lab => !completedTestNames.includes(lab));

                      return (
                        <div key={p._id} className="p-5 flex flex-col space-y-3">
                          <div className="flex items-center justify-between w-full">
                            <div className="text-left">
                              <h4 className="font-bold text-slate-800 text-sm">{p.patientName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{p.ward} • Day {p.admissionDays}</p>
                              <p className="text-xs text-purple-600 font-bold mt-0.5">🧬 {pendingLabs.join(', ')}</p>
                            </div>
                            <div>
                              {p.labStatus === 'Dispatched' ? (
                                <span className="text-[11px] font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-lg flex items-center">Sent to Lab</span>
                              ) : p.labStatus === 'In Progress' ? (
                                <span className="text-[11px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg flex items-center animate-pulse">Processing...</span>
                              ) : (
                                <button onClick={() => handleLabDispatch(p._id, p.labStatus, p.appointmentId)} className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-sm">Dispatch Specimen <Truck size={12} /></button>
                              )}
                            </div>
                          </div>

                          {(p.labNotes || p.labFileUrl) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-3 text-left w-full">
                              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1"><FileText size={14} className="text-blue-600" /> Diagnostic Results Matrix</span>
                                {p.testCompletedAt && (
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                                    Released: {new Date(p.testCompletedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {textLogsArray.length > 0 ? (
                                <div className="space-y-1.5">
                                  {textLogsArray.map((t, idx) => (
                                    <div key={idx} className="text-xs text-slate-600">
                                      <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                                    </div>
                                  ))}
                                </div>
                              ) : p.labNotes && (
                                <p className="text-xs text-slate-600 italic">"{p.labNotes}"</p>
                              )}

                              {attachmentUrlsArray.length > 0 ? (
                                <div className="pt-2 border-t border-slate-100 flex flex-col space-y-1">
                                  {attachmentUrlsArray.map((fileObj, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white border rounded-lg p-1.5 px-2.5">
                                      <span className="font-semibold text-slate-500 truncate max-w-[65%]">{fileObj.testName}</span>
                                      <div className="flex gap-1.5">
                                        {fileObj.urls.map((url, uIdx) => (
                                          <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                            Doc {uIdx + 1} <ExternalLink size={10} />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : p.labFileUrl && (
                                <div className="pt-2 border-t border-slate-100">
                                  <a href={p.labFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                    View Diagnostic Attachment Report <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }).filter(Boolean)}
                    {filteredPatients.filter(p => {
                      if (!p.labPrescription || p.labPrescription === "No active lab orders listed." || p.labPrescription.trim() === "") return false;
                      if (p.labStatus !== 'Pending Dispatch' && p.labStatus !== 'Dispatched' && p.labStatus !== 'In Progress') return false;
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];
                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }
                      const completedTestNames = [...textLogsArray.map(t => t.testName?.trim()), ...attachmentUrlsArray.map(f => f.testName?.trim())].filter(Boolean);
                      const allLabs = p.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
                      return allLabs.filter(lab => !completedTestNames.includes(lab)).length > 0;
                    }).length === 0 && (
                      <p className="text-xs font-bold text-slate-400 p-4 text-center">No samples ready for dispatch or processing.</p>
                    )}
                  </div>
                </div>

                {/* 3C. Completed Tests (Done) Panel */}
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider pl-2">Completed Tests (Done)</h4>
                  <div className="bg-white rounded-[24px] border divide-y overflow-hidden shadow-sm">
                    {filteredPatients.filter(p => p.labPrescription && p.labPrescription !== "No active lab orders listed." && p.labPrescription.trim() !== "" && (p.labStatus === 'Completed' || p.labStatus === 'Lab Completed')).map(p => {
                      let textLogsArray = [];
                      let attachmentUrlsArray = [];

                      if (p.labNotes && p.labNotes.startsWith('[')) { try { textLogsArray = JSON.parse(p.labNotes); } catch(e){} }
                      if (p.labFileUrl && p.labFileUrl.startsWith('[')) { try { attachmentUrlsArray = JSON.parse(p.labFileUrl); } catch(e){} }

                      return (
                        <div key={p._id} className="p-5 flex flex-col space-y-3">
                          <div className="flex items-center justify-between w-full">
                            <div className="text-left">
                              <h4 className="font-bold text-slate-800 text-sm">{p.patientName}</h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{p.ward} • Day {p.admissionDays}</p>
                              <p className="text-xs text-purple-600 font-bold mt-0.5">🧬 {p.labPrescription}</p>
                            </div>
                            <div>
                              <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg flex items-center"><CheckCircle2 size={12} className="mr-1" /> Released</span>
                            </div>
                          </div>

                          {(p.labNotes || p.labFileUrl) && (
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-3 text-left w-full">
                              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1"><FileText size={14} className="text-blue-600" /> Diagnostic Results Matrix</span>
                                {p.testCompletedAt && (
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">
                                    Released: {new Date(p.testCompletedAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {textLogsArray.length > 0 ? (
                                <div className="space-y-1.5">
                                  {textLogsArray.map((t, idx) => (
                                    <div key={idx} className="text-xs text-slate-600">
                                      <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                                    </div>
                                  ))}
                                </div>
                              ) : p.labNotes && (
                                <p className="text-xs text-slate-600 italic">"{p.labNotes}"</p>
                              )}

                              {attachmentUrlsArray.length > 0 ? (
                                <div className="pt-2 border-t border-slate-100 flex flex-col space-y-1">
                                  {attachmentUrlsArray.map((fileObj, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-[11px] bg-white border rounded-lg p-1.5 px-2.5">
                                      <span className="font-semibold text-slate-500 truncate max-w-[65%]">{fileObj.testName}</span>
                                      <div className="flex gap-1.5">
                                        {fileObj.urls.map((url, uIdx) => (
                                          <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                            Doc {uIdx + 1} <ExternalLink size={10} />
                                          </a>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : p.labFileUrl && (
                                <div className="pt-2 border-t border-slate-100">
                                  <a href={p.labFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                    View Diagnostic Attachment Report <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredPatients.filter(p => p.labPrescription && p.labPrescription !== "No active lab orders listed." && p.labPrescription.trim() !== "" && (p.labStatus === 'Completed' || p.labStatus === 'Lab Completed')).length === 0 && (
                      <p className="text-xs font-bold text-slate-400 p-4 text-center">No completed tests released on this shift.</p>
                    )}
                  </div>
                </div>

              </section>

            </div>
          </div>
        )}
      </main>

      {/* --- CUSTOM DESK ALERT NOTIFICATION MODAL --- */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-sm w-full p-6 shadow-xl text-center transform scale-100 transition-all">
            <div className="flex justify-center mb-4">
              {alertModal.isSuccess ? (
                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100">
                  <CheckCircle2 size={32} />
                </div>
              ) : (
                <div className="p-3 bg-rose-50 rounded-full text-rose-600 border border-rose-100">
                  <AlertCircle size={32} />
                </div>
              )}
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5 tracking-tight">{alertModal.title}</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed px-2">{alertModal.message}</p>
            <button
              type="button"
              onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-colors shadow-sm"
            >
              Understand
            </button>
          </div>
        </div>
      )}

      {/* --- CUSTOM CLINICAL CHARTING PROMPT DIALOG MODAL --- */}
      {vitalsModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all">
          <div className="bg-white border border-slate-200 rounded-[32px] max-w-md w-full p-6 md:p-8 shadow-xl text-left transform scale-100 transition-all">
            <div className="mb-4">
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Heart size={20} className="text-rose-500 animate-pulse" /> Chart Clinical Ward Bed Metrics
              </h3>
              <p className="text-xs text-slate-400 font-medium">Verify shift measurement validation data ranges prior to database injection.</p>
            </div>
            
            <div className="space-y-4 my-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-0.5">Heart Rate (bpm)</label>
                  <input 
                    type="text"
                    value={vitalsModal.hr}
                    onChange={(e) => setVitalsModal(prev => ({ ...prev, hr: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-0.5">Temperature (°F)</label>
                  <input 
                    type="text"
                    value={vitalsModal.temp}
                    onChange={(e) => setVitalsModal(prev => ({ ...prev, temp: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-0.5">Saturation SpO2 (%)</label>
                  <input 
                    type="text"
                    value={vitalsModal.spo2}
                    onChange={(e) => setVitalsModal(prev => ({ ...prev, spo2: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wide ml-0.5">Blood Pressure (mmHg)</label>
                  <input 
                    type="text"
                    value={vitalsModal.bp}
                    onChange={(e) => setVitalsModal(prev => ({ ...prev, bp: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={submitVitalsChart}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-bold transition-colors shadow-sm"
              >
                Commit Data Chart
              </button>
              <button
                type="button"
                onClick={() => setVitalsModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}