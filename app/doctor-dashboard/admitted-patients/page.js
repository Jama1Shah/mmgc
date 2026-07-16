'use client';
import React, { useState, useEffect } from 'react';
import { 
  Menu, Bed, Heart, Pill, TestTube, FileText, 
  LogOut, ShieldAlert, CheckCircle2, RefreshCw, Activity, Search, ExternalLink, Plus, PillBottle, AlertCircle, X
} from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';

const DOSAGE_TIMINGS = ['Stat', 'OD', 'BDS', 'TDS', 'QID'];

export default function DoctorAdmittedDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [admittedPatients, setAdmittedPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Form States (Adoption of Prescriptions Page Logic)
  const [medicinesList, setMedicinesList] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);
  
  const [chosenMedicine, setChosenMedicine] = useState("");
  const [chosenTiming, setChosenTiming] = useState("");
  const [chosenLabTest, setChosenLabTest] = useState("");

  // Custom Inventory Injection Modals
  const [showCustomMedicineModal, setShowCustomMedicineModal] = useState(false);
  const [newMedicineName, setNewMedicineName] = useState("");

  // --- CUSTOM DIALOG & MODAL STATE ---
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    isSuccess: true
  });

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Final discharge take-home prescription staging modal
  const [dischargeRxModal, setDischargeRxModal] = useState({
    isOpen: false,
    notes: '',
    medicine: '',
    timing: '',
    list: []
  });

  // Handle Enter and Escape key presses for active modals
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          setAlertModal(prev => ({ ...prev, isOpen: false }));
        }
      } else if (confirmModal.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (confirmModal.onConfirm) confirmModal.onConfirm();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      } else if (showCustomMedicineModal) {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddCustomMedicine();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setShowCustomMedicineModal(false);
          setNewMedicineName("");
        }
      } else if (dischargeRxModal.isOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setDischargeRxModal({ isOpen: false, notes: '', medicine: '', timing: '', list: [] });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [alertModal, confirmModal, showCustomMedicineModal, newMedicineName, dischargeRxModal]);

  const calculateAdmissionDays = (admittedAt) => {
    if (!admittedAt) return 0;
    const ad = new Date(admittedAt);
    ad.setHours(0, 0, 0, 0);
    const cd = new Date();
    cd.setHours(0, 0, 0, 0);
    return Math.max(0, Math.floor((cd - ad) / (1000 * 60 * 60 * 24)));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const userEmail = sessionStorage.getItem('userEmail') || "doctor@mmgc.com";
      
      const [userRes, medRes, labRes] = await Promise.all([
        fetch(`/api/users?email=${encodeURIComponent(userEmail)}`),
        fetch('/api/medicines'),
        fetch('/api/lab-tests')
      ]);

      if (medRes.ok) setMedicinesList(await medRes.json());
      if (labRes.ok) {
        const labData = await labRes.json();
        setLabsCatalog(labData.map(t => ({ _id: t._id, testName: t.description })));
      }

      let docName = "Staff Doctor";
      let doctorId = "";

      if (userRes.ok) {
        const userData = await userRes.json();
        docName = userData.name;
        doctorId = userData._id; 
        setDoctorName(docName);
      }

      const apptRes = await fetch(`/api/appointments?doctorName=${encodeURIComponent(docName)}&doctorId=${doctorId}`);
      if (apptRes.ok) {
        const appointmentsData = await apptRes.json();
        
        const rxRes = await fetch(`/api/prescriptions?doctorName=${encodeURIComponent(docName)}&doctorId=${doctorId}`);
        let prescriptionsList = [];
        if (rxRes.ok) {
          prescriptionsList = await rxRes.json();
        }

        const admittedAppointments = appointmentsData.filter(appt => 
          appt.status === 'Admitted' || appt.status === 'Lab Completed'
        );

        const compiledRecords = admittedAppointments.map(appt => {
          const linkedRx = prescriptionsList.find(rx => {
            const rxApptId = rx.appointmentId?._id || rx.appointmentId || rx.id;
            const targetApptId = appt._id || appt.id;
            return String(rxApptId) === String(targetApptId);
          });

          const admissionDetails = linkedRx?.admissionDetails || appt.admissionDetails || { wardName: 'General Bedward' };
          const admissionDays = calculateAdmissionDays(admissionDetails.admittedAt);

          return {
            _id: linkedRx ? (linkedRx._id || linkedRx.id) : appt._id, 
            appointmentId: appt._id,
            patientName: appt.patientName || "Unknown Patient",
            patientEmail: appt.patientEmail || "No Email Provided",
            doctorName: appt.doctorName || docName,
            medicationDetails: linkedRx?.medicationDetails || "",
            labPrescription: linkedRx?.labPrescription || appt.labReason || "",
            labStatus: linkedRx?.labStatus || appt.labStatus || "Pending",
            labNotes: linkedRx?.labNotes || appt.labNotes || "",
            labFileUrl: linkedRx?.labFileUrl || appt.labFileUrl || "",
            updatedAt: linkedRx?.updatedAt || appt.updatedAt,
            vitals: linkedRx?.vitals || appt.vitals || { hr: '80', temp: '98.6', spo2: '98', bp: '120/80' },
            admissionDetails: admissionDetails,
            admissionDays: admissionDays,
            admissionRequired: linkedRx ? linkedRx.admissionRequired : (appt.status === 'Admitted')
          };
        }).filter(record => record.admissionRequired === true);

        setAdmittedPatients(compiledRecords);
        
        if (compiledRecords.length > 0) {
          const urlParams = new URLSearchParams(window.location.search);
          const targetAppointmentId = urlParams.get('id');

          if (targetAppointmentId) {
            const URLMatchedPatient = compiledRecords.find(p => String(p.appointmentId) === String(targetAppointmentId));
            if (URLMatchedPatient) {
              setSelectedPatient(URLMatchedPatient);
              setLoading(false);
              return;
            }
          }

          setSelectedPatient(prev => {
            if (!prev) return compiledRecords[0];
            const match = compiledRecords.find(p => String(p.appointmentId) === String(prev.appointmentId));
            return match || compiledRecords[0];
          });
        } else {
          setSelectedPatient(null);
        }
      }
    } catch (err) {
      console.error("Failed loading admitting workspace streams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrescribeMedicine = async () => {
    if (!chosenMedicine || !chosenTiming) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "Select drug name and dosage frequency timing interval.",
        isSuccess: false
      });
      return;
    }
    
    const newEntry = `${chosenMedicine} - [Time: ${chosenTiming}]`;
    const updatedNotes = selectedPatient.medicationDetails 
      ? `${selectedPatient.medicationDetails}\n${newEntry}`
      : `Staged Medications:\n${newEntry}`;

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPatient._id, medicationDetails: updatedNotes, medStatus: 'Pending' })
      });
      if (res.ok) {
        setSelectedPatient(prev => ({ ...prev, medicationDetails: updatedNotes, medStatus: 'Pending' }));
        setAdmittedPatients(prev => prev.map(p => p._id === selectedPatient._id ? { ...p, medicationDetails: updatedNotes, medStatus: 'Pending' } : p));
        setChosenMedicine("");
        setChosenTiming("");
        setAlertModal({
          isOpen: true,
          title: "Prescription Updated",
          message: "Prescription chart configuration appended successfully.",
          isSuccess: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCancelMedicine = async (lineIndex) => {
    const lines = selectedPatient.medicationDetails.split('\n');
    let targetLine = lines[lineIndex];
    
    if (targetLine.toLowerCase().includes('[cancelled]')) {
      targetLine = targetLine.replace(/\s*\[CANCELLED\]/gi, '');
    } else {
      targetLine = `${targetLine} [CANCELLED]`;
    }
    
    lines[lineIndex] = targetLine;
    const updatedNotes = lines.join('\n');

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedPatient._id, medicationDetails: updatedNotes })
      });
      if (res.ok) {
        setSelectedPatient(prev => ({ ...prev, medicationDetails: updatedNotes }));
        setAdmittedPatients(prev => prev.map(p => p._id === selectedPatient._id ? { ...p, medicationDetails: updatedNotes } : p));
      }
    } catch (err) {
      console.error("Failed toggling dynamic clinical medicine row adjustment:", err);
    }
  };

  const handleAddCustomMedicine = async () => {
    if (!newMedicineName.trim()) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "Please enter a medicine name.",
        isSuccess: false
      });
      return;
    }
    try {
      const response = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMedicineName })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setMedicinesList(prev => [...prev, resData.data].sort((a, b) => a.name.localeCompare(b.name)));
        setChosenMedicine(resData.data.name);
        setNewMedicineName("");
        setShowCustomMedicineModal(false);
        setAlertModal({
          isOpen: true,
          title: "Formula Registered",
          message: "New drug compound recorded into database schema successfully!",
          isSuccess: true
        });
      } else {
        setAlertModal({
          isOpen: true,
          title: "Registry Failure",
          message: resData.error || "Persistence runtime failure mapping drug data.",
          isSuccess: false
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignLab = async () => {
    if (!chosenLabTest) return;

    let textLogsArray = [];
    let attachmentUrlsArray = [];
    try { if(selectedPatient.labNotes?.startsWith('[')) textLogsArray = JSON.parse(selectedPatient.labNotes); } catch(e){}
    try { if(selectedPatient.labFileUrl?.startsWith('[')) attachmentUrlsArray = JSON.parse(selectedPatient.labFileUrl); } catch(e){}
    
    const completedTestNames = [
      ...textLogsArray.map(t => t.testName?.trim()),
      ...attachmentUrlsArray.map(f => f.testName?.trim())
    ].filter(Boolean);

    const allLabs = selectedPatient.labPrescription 
      ? selectedPatient.labPrescription.split(',').map(s => s.trim()).filter(Boolean) 
      : [];

    const completedCopy = [...completedTestNames];
    const pendingLabs = [];
    allLabs.forEach(lab => {
      const matchIdx = completedCopy.indexOf(lab);
      if (matchIdx > -1) {
        completedCopy.splice(matchIdx, 1);
      } else {
        pendingLabs.push(lab);
      }
    });

    const todayStr = new Date().toLocaleDateString();
    const isAlreadyAssignedToday = allLabs.some(lab => {
      const lp = lab.trim();
      return lp === `${chosenLabTest} (${todayStr})` || (lp === chosenLabTest && new Date(selectedPatient.updatedAt).toLocaleDateString() === todayStr);
    });

    if (isAlreadyAssignedToday) {
      setAlertModal({
        isOpen: true,
        title: "Duplicate Request",
        message: "A single test can not be assigned more than once a day.",
        isSuccess: false
      });
      return;
    }

    const newLabEntry = `${chosenLabTest} (${todayStr})`;
    const updatedLabs = selectedPatient.labPrescription 
      ? `${selectedPatient.labPrescription}, ${newLabEntry}`
      : newLabEntry;

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedPatient._id, 
          labPrescription: updatedLabs, 
          labStatus: 'To Collect' 
        })
      });
      if (res.ok) {
        if (selectedPatient.appointmentId) {
          await fetch('/api/appointments/lab-orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: selectedPatient.appointmentId, 
              labStatus: 'To Collect' 
            })
          });
        }
        
        setSelectedPatient(prev => ({ 
          ...prev, 
          labPrescription: updatedLabs, 
          labStatus: 'To Collect' 
        }));
        setAdmittedPatients(prev => prev.map(p => 
          p._id === selectedPatient._id 
            ? { ...p, labPrescription: updatedLabs, labStatus: 'To Collect' } 
            : p
        ));
        setChosenLabTest("");
        setAlertModal({
          isOpen: true,
          title: "Lab Test Assigned",
          message: "New lab test added to the collection queue.",
          isSuccess: true
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDischargePatient = () => {
    // Open the take-home prescription staging modal first, instead of jumping straight to the confirmation dialog
    setDischargeRxModal({ isOpen: true, notes: '', medicine: '', timing: '', list: [] });
  };

  const handleAddDischargeMedicine = () => {
    if (!dischargeRxModal.medicine || !dischargeRxModal.timing) {
      setAlertModal({
        isOpen: true,
        title: "Validation Error",
        message: "Select drug name and dosage frequency timing interval.",
        isSuccess: false
      });
      return;
    }

    const newEntry = `${dischargeRxModal.medicine} - [Time: ${dischargeRxModal.timing}]`;
    setDischargeRxModal(prev => ({ ...prev, list: [...prev.list, newEntry], medicine: '', timing: '' }));
  };

  const handleRemoveDischargeMedicine = (entryIdx) => {
    setDischargeRxModal(prev => ({ ...prev, list: prev.list.filter((_, idx) => idx !== entryIdx) }));
  };

  // Combines manually typed prescription notes with any dropdown-staged medicines,
  // mirroring the exact "Staged Medications:" compilation pattern used on the Prescriptions page
  const compileDischargeMedication = () => {
    const dynamicMedsString = dischargeRxModal.list.join('\n');
    let compiled = dischargeRxModal.notes.trim();
    if (dynamicMedsString) {
      compiled = compiled
        ? `${compiled}\n\nStaged Medications:\n${dynamicMedsString}`
        : `Staged Medications:\n${dynamicMedsString}`;
    }
    return compiled;
  };

  const proceedToDischargeConfirmation = () => {
    const compiledPreview = compileDischargeMedication();
    setDischargeRxModal(prev => ({ ...prev, isOpen: false }));
    setConfirmModal({
      isOpen: true,
      title: "Confirm Patient Discharge",
      message: compiledPreview
        ? `Are you certain you wish to sign off authorization forms for discharging ${selectedPatient.patientName}? A final discharge prescription will be issued to the patient.`
        : `Are you certain you wish to sign off authorization forms for discharging ${selectedPatient.patientName}? No final discharge prescription will be issued.`,
      onConfirm: executeDischarge
    });
  };

  const executeDischarge = async () => {
    try {
      const dischargeMedication = compileDischargeMedication();

      const res = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: selectedPatient._id, 
          admissionRequired: false, 
          dischargeMedication, 
          dischargedAt: new Date().toISOString() 
        })
      });

      if (res.ok) {
        if (selectedPatient.appointmentId) {
          await fetch('/api/appointments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: selectedPatient.appointmentId, status: 'Completed' })
          });
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        setDischargeRxModal({ isOpen: false, notes: '', medicine: '', timing: '', list: [] });
        setAlertModal({
          isOpen: true,
          title: "Patient Discharged",
          message: dischargeMedication
            ? "Patient clinically discharged. Final discharge prescription transmitted to the patient portal."
            : "Patient clinically discharged from ward queue tracking layout.",
          isSuccess: true
        });
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredInpatients = admittedPatients.filter(p => 
    p.patientName && p.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <main className="flex-1 flex flex-col overflow-hidden">
        
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center space-x-3">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu size={22} /></button>
            <div className="bg-blue-600 p-2 rounded-xl text-white"><Bed size={22} /></div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-800">Inpatient Admitted Registry</h1>
              <p className="text-xs text-slate-400 font-semibold">Attending: Dr. {doctorName}</p>
            </div>
          </div>
          <button onClick={loadData} className="p-2.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 flex items-center gap-2 text-xs font-bold">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Sync Wards
          </button>
        </header>

        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-3">
            <Activity className="text-blue-600 animate-pulse" size={40} />
            <p className="text-sm font-bold text-slate-400">Loading Admitted Database Logs...</p>
          </div>
        ) : (
          <div className="flex-1 flex overflow-hidden">
            
            <div className="w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                  <input 
                    type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search allocated beds..."
                    className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-transparent rounded-xl focus:bg-white focus:border-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                {filteredInpatients.map((patient) => {
                  const isSelected = selectedPatient && selectedPatient.appointmentId === patient.appointmentId;
                  return (
                    <div key={patient.appointmentId} onClick={() => setSelectedPatient(patient)} className={`p-4 text-left cursor-pointer transition-all ${isSelected ? 'bg-blue-50/60 border-l-4 border-blue-600' : 'hover:bg-slate-50/70'}`}>
                      <h3 className="font-bold text-slate-800 text-sm">{patient.patientName}</h3>
                      <p className="text-[11px] font-bold text-blue-600 mt-0.5 uppercase">{patient.admissionDetails?.wardName || 'General Bedward'} • Day {patient.admissionDays}</p>
                      <div className="grid grid-cols-4 gap-1 bg-slate-50 p-2 rounded-xl text-[10px] font-bold text-center text-slate-700 mt-2">
                        <div>HR: {patient.vitals?.hr || '--'}</div>
                        <div>T: {patient.vitals?.temp || '--'}°</div>
                        <div>O₂: {patient.vitals?.spo2 || '--'}%</div>
                        <div>BP: {patient.vitals?.bp?.split('/')[0] || '--'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedPatient ? (
              <div className="flex-1 bg-slate-50 overflow-y-auto p-6 space-y-6 text-left">
                
                <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
                  <div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md font-black uppercase">Active Ward Admission File • Day {selectedPatient.admissionDays}</span>
                    <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-2">{selectedPatient.patientName}</h2>
                    <p className="text-xs text-slate-400 font-medium">Linked Email Profile: {selectedPatient.patientEmail}</p>
                  </div>
                  <button onClick={handleDischargePatient} className="px-5 py-3 bg-rose-600 text-white font-black text-xs rounded-xl hover:bg-rose-700 flex items-center gap-1.5 shadow-md shadow-rose-100"><LogOut size={14} /> Finalize Ward Discharge & Transmit Clearance</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: "Heart Rate", val: `${selectedPatient.vitals?.hr || '--'} bpm`, alert: parseInt(selectedPatient.vitals?.hr) > 100 },
                    { label: "Body Temp", val: `${selectedPatient.vitals?.temp || '--'} °F`, alert: parseFloat(selectedPatient.vitals?.temp) > 100 },
                    { label: "Pulse Oximetry", val: `${selectedPatient.vitals?.spo2 || '--'} %`, alert: parseInt(selectedPatient.vitals?.spo2) < 95 },
                    { label: "Blood Pressure", val: selectedPatient.vitals?.bp || '--', alert: false }
                  ].map((vit, idx) => (
                    <div key={idx} className={`p-4 rounded-2xl border bg-white ${vit.alert ? 'border-rose-200 bg-rose-50/20' : 'border-slate-200'}`}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{vit.label}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <p className={`text-base font-black ${vit.alert ? 'text-rose-600' : 'text-slate-800'}`}>{vit.val}</p>
                        {vit.alert && <ShieldAlert size={16} className="text-rose-500 animate-bounce" />}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  
                  {/* --- Inpatient Medication Assigner --- */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col space-y-4 shadow-sm">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><PillBottle size={16} className="text-emerald-600" /> Inpatient Medication Assigner</h3>
                      <button type="button" onClick={() => setShowCustomMedicineModal(true)} className="text-[11px] text-emerald-600 font-bold flex items-center hover:underline gap-0.5">
                        <Plus size={12}/> Register Formula
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <select value={chosenMedicine} onChange={(e) => setChosenMedicine(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none">
                            <option value="">Select Medicine...</option>
                            {medicinesList.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                        </select>
                        <select value={chosenTiming} onChange={(e) => setChosenTiming(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none">
                            <option value="">Timing...</option>
                            {DOSAGE_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <button onClick={handlePrescribeMedicine} className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors">Include Medicine Item in Chart List</button>
                    
                    {/* Toggleable Medicines Deployment Interface Layout Block */}
                    <div className="w-full flex-1 min-h-[150px] bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs font-mono text-slate-700 overflow-y-auto space-y-1">
                      {selectedPatient.medicationDetails ? (
                        selectedPatient.medicationDetails.split('\n').map((line, idx) => {
                          if (!line.trim()) return null;
                          const lowerLine = line.toLowerCase();
                          const isMed = lowerLine.includes('stat') || lowerLine.includes('qid') || lowerLine.includes('tds') || lowerLine.includes('bd') || lowerLine.includes('od');
                          const isCancelled = lowerLine.includes('cancelled');

                          return (
                            <div key={idx} className="flex items-center justify-between p-1 rounded hover:bg-slate-100/80 transition-colors">
                              <span className={`truncate flex-1 ${isCancelled ? 'line-through text-slate-400 font-medium' : 'text-slate-700 font-bold'}`}>
                                {line}
                              </span>
                              {isMed && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleCancelMedicine(idx)}
                                  className={`ml-2 px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider transition-colors ${
                                    isCancelled 
                                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                                      : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                                  }`}
                                >
                                  {isCancelled ? 'Restore' : 'Cancel'}
                                </button>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-slate-400 italic">No active inpatient medication charts configured.</p>
                      )}
                    </div>
                  </div>

                  {/* --- Lab Panel Sample Requester --- */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col space-y-4 shadow-sm">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b pb-3"><TestTube size={16} className="text-purple-600" /> Lab Panel Sample Requester</h3>
                    <div className="flex gap-2">
                      <select value={chosenLabTest} onChange={(e) => setChosenLabTest(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none">
                        <option value="">Select Lab Diagnosis Test Profile...</option>
                        {labsCatalog.map(lab => <option key={lab._id} value={lab.testName}>{lab.testName}</option>)}
                      </select>
                      <button onClick={handleAssignLab} className="px-4 bg-purple-600 text-white font-bold text-xs rounded-xl hover:bg-purple-700">Request</button>
                    </div>
                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl border text-xs space-y-4">
                      
                      {/* DYNAMIC PENDING REQUESTS COMPUTATION */}
                      {(() => {
                        let textLogsArray = [];
                        let attachmentUrlsArray = [];
                        try { if(selectedPatient.labNotes?.startsWith('[')) textLogsArray = JSON.parse(selectedPatient.labNotes); } catch(e){}
                        try { if(selectedPatient.labFileUrl?.startsWith('[')) attachmentUrlsArray = JSON.parse(selectedPatient.labFileUrl); } catch(e){}
                        
                        const completedTestNames = [
                          ...textLogsArray.map(t => t.testName?.trim()),
                          ...attachmentUrlsArray.map(f => f.testName?.trim())
                        ].filter(Boolean);

                        const allLabs = selectedPatient.labPrescription 
                          ? selectedPatient.labPrescription.split(',').map(s => s.trim()).filter(Boolean) 
                          : [];

                        const completedCopy = [...completedTestNames];
                        const pendingLabs = [];
                        allLabs.forEach(lab => {
                          const matchIdx = completedCopy.indexOf(lab);
                          if (matchIdx > -1) {
                            completedCopy.splice(matchIdx, 1);
                          } else {
                            pendingLabs.push(lab);
                          }
                        });

                        return (
                          <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Pending Lab Requests</p>
                            <p className="font-bold text-slate-800">{pendingLabs.join(', ') || 'No Active Lab Orders Listed.'}</p>
                          </div>
                        );
                      })()}

                      <div className="bg-white p-3 rounded-xl border flex justify-between items-center">
                        <div>
                          <p className="text-[9px] font-bold uppercase text-slate-400">Queue Processing Status</p>
                          <p className="text-xs font-black text-slate-700 mt-0.5">{selectedPatient.labStatus}</p>
                        </div>
                        <span className={`text-[10px] font-black uppercase px-2 py-1 rounded ${selectedPatient.labStatus === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {selectedPatient.labStatus === 'Completed' ? 'Results Ready' : 'In Progress'}
                        </span>
                      </div>

                      {/* RENDER DYNAMIC COMPLETED LAB WORKFLOW BLOCK */}
                      {(selectedPatient.labNotes || selectedPatient.labFileUrl) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-2 space-y-3 text-left w-full">
                          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1"><FileText size={14} className="text-blue-600" /> Diagnostic Results Matrix</span>
                            {selectedPatient.updatedAt && (
                              <span className="text-[10px] font-mono text-slate-400 font-bold">
                                Released: {new Date(selectedPatient.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          
                          {(() => {
                            let textLogsArray = [];
                            let attachmentUrlsArray = [];
                            try { if(selectedPatient.labNotes?.startsWith('[')) textLogsArray = JSON.parse(selectedPatient.labNotes); } catch(e){}
                            try { if(selectedPatient.labFileUrl?.startsWith('[')) attachmentUrlsArray = JSON.parse(selectedPatient.labFileUrl); } catch(e){}
                            
                            return (
                              <>
                                {textLogsArray.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {textLogsArray.map((t, idx) => (
                                      <div key={idx} className="text-xs text-slate-600">
                                        <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                                      </div>
                                    ))}
                                  </div>
                                ) : selectedPatient.labNotes && <p className="text-xs text-slate-600 italic">"{selectedPatient.labNotes}"</p>}

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
                                ) : selectedPatient.labFileUrl && (
                                  <a href={selectedPatient.labFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold pt-2">
                                    View Diagnostic Attachment Report <ExternalLink size={12} />
                                  </a>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8">
                <FileText size={44} className="text-slate-200 mb-2" />
                <p className="text-sm font-bold">Select an admitted inpatient profile row card item representation to configure medical management desks.</p>
              </div>
            )}
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

      {/* --- CUSTOM ACTION CONFIRMATION MODAL --- */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-sm w-full p-6 shadow-xl text-center transform scale-100 transition-all">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-amber-50 rounded-full text-amber-600 border border-amber-100">
                <AlertCircle size={32} />
              </div>
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-1.5 tracking-tight">{confirmModal.title}</h3>
            <p className="text-xs font-medium text-slate-500 mb-6 leading-relaxed px-2">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-colors shadow-sm"
              >
                Confirm Discharge
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold tracking-wide transition-colors border border-slate-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ISSUE FINAL DISCHARGE PRESCRIPTION --- */}
      {dischargeRxModal.isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-lg w-full p-6 shadow-xl text-left transform scale-100 transition-all">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="text-md font-extrabold text-slate-900 flex items-center gap-2">
                  <LogOut size={18} className="text-rose-600" /> Issue Final Discharge Prescription
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-1.5 leading-relaxed">
                  Optionally add take-home medications for {selectedPatient?.patientName}. These appear to the patient separately from their inpatient chart under "View Summary".
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDischargeRxModal({ isOpen: false, notes: '', medicine: '', timing: '', list: [] })}
                className="p-1 text-slate-300 hover:text-slate-600 transition-colors shrink-0"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Manually Typed Prescription Notes</label>
              <textarea
                value={dischargeRxModal.notes}
                onChange={(e) => setDischargeRxModal(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Type free-form discharge instructions, dosages, or care notes here, just like on the Prescriptions page..."
                className="w-full h-24 p-3.5 bg-slate-50 border border-transparent focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm resize-none transition-all outline-none"
              ></textarea>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <PillBottle size={13} className="text-emerald-600" /> Dropdown Medication Assigner
              </span>
            </div>

            <div className="flex gap-2 mt-2">
              <select
                value={dischargeRxModal.medicine}
                onChange={(e) => setDischargeRxModal(prev => ({ ...prev, medicine: e.target.value }))}
                className="flex-1 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="">Select Medicine...</option>
                {medicinesList.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
              </select>
              <select
                value={dischargeRxModal.timing}
                onChange={(e) => setDischargeRxModal(prev => ({ ...prev, timing: e.target.value }))}
                className="w-28 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none"
              >
                <option value="">Timing...</option>
                {DOSAGE_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button
                type="button"
                onClick={handleAddDischargeMedicine}
                className="px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus size={14} /> Add
              </button>
            </div>

            <div className="mt-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Staged Medication Items</label>
              <div className="min-h-[100px] max-h-[220px] overflow-y-auto bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-1.5">
                {dischargeRxModal.list.length > 0 ? (
                  dischargeRxModal.list.map((entry, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 font-mono">
                      <span className="truncate">{entry}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDischargeMedicine(idx)}
                        className="ml-2 text-rose-500 hover:text-rose-700 font-black text-[10px] uppercase tracking-wider shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic font-medium text-slate-400 p-2">No dropdown medication items staged. Any typed notes above will still be issued.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDischargeRxModal({ isOpen: false, notes: '', medicine: '', timing: '', list: [] })}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl text-xs font-bold tracking-wide transition-colors border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedToDischargeConfirmation}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl text-xs font-bold tracking-wide transition-colors shadow-sm"
              >
                {(dischargeRxModal.notes.trim() || dischargeRxModal.list.length > 0) ? 'Proceed to Discharge' : 'Skip & Discharge'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL: DIRECT ADD CUSTOM MEDICINE FORMULA --- */}
      {showCustomMedicineModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all">
          <div className="bg-white border border-slate-200 rounded-[28px] max-w-sm w-full p-6 shadow-xl text-left transform scale-100 transition-all">
            <h3 className="text-md font-extrabold text-slate-900 mb-4">Register New Medicine Formula</h3>
            <div className="mb-4">
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Compound Description Title</label>
              <input type="text" value={newMedicineName} onChange={(e) => setNewMedicineName(e.target.value)} placeholder="e.g., Cap Amoxicillin 500mg" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-500" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowCustomMedicineModal(false); setNewMedicineName(""); }} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2.5 text-xs font-bold rounded-xl border border-slate-200 transition-colors">Cancel</button>
              <button type="button" onClick={handleAddCustomMedicine} className="flex-1 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">Commit to DB</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}