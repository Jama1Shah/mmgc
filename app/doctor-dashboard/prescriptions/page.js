"use client"
import React, { useState, useEffect, useRef } from 'react';
import { CirclePlus, PillBottle, FileText, Menu, Trash2, Edit3, X, Check, Bed, Plus, TestTube, ExternalLink } from 'lucide-react';
import DoctorSidebar from '@/components/DoctorSidebar';

const DOSAGE_TIMINGS = ['Stat', 'OD', 'BDS', 'TDS', 'QID'];

const Prescriptions = () => {
  // --- UI Layout States ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCustomWardModal, setShowCustomWardModal] = useState(false);

  // --- Core Identity and Dataset States ---
  const [doctor, setDoctor] = useState({ name: "", email: "" });
  const [eligibleAppointments, setEligibleAppointments] = useState([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState([]);
  const [wards, setWards] = useState([]);
  
  // --- Dynamic Inventory Catalogs ---
  const [medicinesList, setMedicinesList] = useState([]);
  const [labsCatalog, setLabsCatalog] = useState([]);

  // --- Form & Interactive Mutation States ---
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [prescriptionDetails, setPrescriptionDetails] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDetails, setEditDetails] = useState("");

  // --- ADMISSION FUNCTIONALITY STATES ---
  const [needsAdmission, setNeedsAdmission] = useState(false);
  const [selectedWard, setSelectedWard] = useState("");

  // --- Custom Inventory Injection Modals ---
  const [showCustomMedicineModal, setShowCustomMedicineModal] = useState(false);
  const [showCustomLabModal, setShowCustomLabModal] = useState(false);
  
  // --- Custom System Alert Modal State ---
  const [customAlert, setCustomAlert] = useState({
    isOpen: false,
    message: '',
    isConfirm: false,
    onConfirm: null
  });
  
  const [newWardName, setNewWardName] = useState("");
  const [newWardSpecialty, setNewWardSpecialty] = useState("");
  const [newMedicineName, setNewMedicineName] = useState("");
  const [newLabTestName, setNewLabTestName] = useState("");

  // --- Dynamic Form Additive Arrays ---
  const [chosenMedicine, setChosenMedicine] = useState("");
  const [chosenTiming, setChosenTiming] = useState("");
  const [assignedMedicines, setAssignedMedicines] = useState([]);
  
  const [chosenLabTest, setChosenLabTest] = useState("");
  const [assignedLabs, setAssignedLabs] = useState([]);

  const dropdownRef = useRef(null);

  // --- Custom Notification Helper ---
  const showAlert = (message) => {
    setCustomAlert({
      isOpen: true,
      message,
      isConfirm: false,
      onConfirm: null
    });
  };

  // --- Close Custom Dropdown Overlay on Outside Mousedown ---
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // --- Synchronized Fetch System + Auto-Fill Hook Trigger ---
  useEffect(() => {
    const dataGatheringEngine = async () => {
      try {
        setLoading(true);
        const userEmail = sessionStorage.getItem('userEmail');
        if (!userEmail) return;

        // Concurrent streaming extraction from backend inventories
        try {
          const [wardRes, medRes, labRes] = await Promise.all([
            fetch('/api/wards'),
            fetch('/api/medicines'),
            fetch('/api/lab-tests')
          ]);

          if (wardRes.ok) setWards(await wardRes.json());
          if (medRes.ok) setMedicinesList(await medRes.json());
          if (labRes.ok) {
            const labData = await labRes.json();
            setLabsCatalog(labData.map(t => ({ _id: t._id, testName: t.description })));
          }
        } catch (inventoryErr) {
          console.error("Failed fetching database options stream:", inventoryErr);
        }

        // Fetch User Identity Info
        const userRes = await fetch(`/api/users?email=${encodeURIComponent(userEmail)}`);
        if (!userRes.ok) throw new Error("Failed to pull active session identity credentials");
        const userData = await userRes.json();

        if (userData) {
          const currentDoctorName = userData.name;
          setDoctor({ name: currentDoctorName, email: userEmail });

          // Gather Scheduled Appointments matched precisely against DailySchedule rules
          let appointmentsDataset = [];
          try {
            const apptRes = await fetch(`/api/appointments?doctorName=${encodeURIComponent(currentDoctorName)}`);
            if (apptRes.ok) {
              const rawData = await apptRes.json();
              appointmentsDataset = rawData.filter(item => 
                ["Accepted for Checkup", "Accepted", "In-Progress", "Completed", "Admitted"].includes(item.status) && !item.deletedByDoctor
              );
            }
          } catch (err) {
            console.warn("API appointments stream fallback mapping:", err);
          }

          // Merge Local Storage values to simulate exact DailySchedule consolidation ecosystem 
          const savedHistory = localStorage.getItem(`history_${userEmail}`);
          let localHistoryArray = savedHistory ? JSON.parse(savedHistory) : [];
          const localAccepted = localHistoryArray.filter(item =>
            ["Accepted for Checkup", "Accepted", "In-Progress", "Completed"].includes(item.status) && !item.deletedByDoctor
          );

          let consolidatedSchedule = [...appointmentsDataset, ...localAccepted].filter(
            (item, index, self) => item._id && self.findIndex(t => t._id === item._id) === index
          );

          // Fetch Previously Issued Prescriptions from DB
          const RxResponse = await fetch(`/api/prescriptions?doctorName=${encodeURIComponent(currentDoctorName)}`);
          let issuedRxList = [];
          if (RxResponse.ok) {
            issuedRxList = await RxResponse.json();
            setRecentPrescriptions(issuedRxList);
          }

          // Filter criteria setup: Exclude patients who have already been processed with an issued Rx
          const completedAppointmentIds = new Set(issuedRxList.map(rx => rx.appointmentId?._id || rx.appointmentId));
          const outstandingAppointments = consolidatedSchedule.filter(appt => !completedAppointmentIds.has(appt._id));

          setEligibleAppointments(outstandingAppointments);

          // Autofill Logic from URL Query Parameters
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            const targetApptId = params.get('appointmentId');
            
            if (targetApptId) {
              const matchedApt = outstandingAppointments.find(appt => appt._id === targetApptId);
              if (matchedApt) {
                setSelectedAppointment(matchedApt);
              } else if (params.get('patientName')) {
                setSelectedAppointment({
                  _id: targetApptId,
                  patientName: params.get('patientName'),
                  patientEmail: params.get('patientEmail') || '',
                  date: params.get('appointmentDate') || '',
                  time: params.get('appointmentTime') || '',
                  reason: 'Transferred Appointment Consultation'
                });
              }
            }
          }
        }
      } catch (error) {
        console.error("Data ingestion processing cycle termination failure:", error);
      } finally {
        setLoading(false);
      }
    };

    dataGatheringEngine();
  }, []);

  // --- Intercept Enter Keypress for Active Modals ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Enter') {
        if (customAlert.isOpen) {
          e.preventDefault();
          if (customAlert.isConfirm && customAlert.onConfirm) {
            customAlert.onConfirm();
          }
          setCustomAlert(prev => ({ ...prev, isOpen: false }));
        } else if (showCustomWardModal) {
          e.preventDefault();
          handleAddCustomWard();
        } else if (showCustomMedicineModal) {
          e.preventDefault();
          handleAddCustomMedicine();
        } else if (showCustomLabModal) {
          e.preventDefault();
          handleAddCustomLabTest();
        }
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [customAlert, showCustomWardModal, showCustomMedicineModal, showCustomLabModal, newWardName, newWardSpecialty, newMedicineName, newLabTestName]);

  const getCleanPatientName = (apt) => {
    if (!apt) return "Anonymous Patient";
    if (apt.patientName && apt.patientName !== "Patient Profile" && apt.patientName.trim() !== "") {
      return apt.patientName;
    }
    if (apt.patientEmail) {
      const prefix = apt.patientEmail.split('@')[0];
      return prefix.charAt(0).toUpperCase() + prefix.slice(1);
    }
    return "Anonymous Patient";
  };

  // --- Filter Dropdown Array using Search Inputs and Status Filter ---
  const filteredOptions = eligibleAppointments.filter(appt => {
    const isAcceptedStatus = appt.status === "Accepted for Checkup";
    const matchName = getCleanPatientName(appt).toLowerCase().includes(searchQuery.toLowerCase());
    const matchReason = (appt.reason || "").toLowerCase().includes(searchQuery.toLowerCase());
    return isAcceptedStatus && (matchName || matchReason);
  });

  // --- Dynamic Ward Submission Handler & Database Sync ---
  const handleAddCustomWard = async () => {
    if (!newWardName.trim() || !newWardSpecialty.trim()) {
      showAlert("Please provide both a clear ward identification name and targeted specialty category.");
      return;
    }
    try {
      const response = await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWardName, specialty: newWardSpecialty })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        setWards(prev => [...prev, resData.data].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedWard(resData.data.name);
        setNewWardName("");
        setNewWardSpecialty("");
        setShowCustomWardModal(false);
        showAlert("Custom clinical ward saved dynamically to systems inventory!");
      } else {
        showAlert(resData.error || "Could not register ward data endpoints safely.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Dynamic Medicine Submission Handler & Database Sync ---
  const handleAddCustomMedicine = async () => {
    if (!newMedicineName.trim()) {
      showAlert("Please enter a medicine name.");
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
        showAlert("New drug compound recorded into database schema successfully!");
      } else {
        showAlert(resData.error || "Persistence runtime failure mapping drug data.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // --- Dynamic Lab Submission Handler & Database Sync ---
  const handleAddCustomLabTest = async () => {
    if (!newLabTestName.trim()) {
      showAlert("Please enter a diagnostic test profile name.");
      return;
    }
    try {
      const response = await fetch('/api/lab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLabTestName })
      });
      const resData = await response.json();
      if (response.ok && resData.success) {
        const formattedData = { _id: resData.data._id, testName: resData.data.name };
        setLabsCatalog(prev => [...prev, formattedData].sort((a, b) => a.testName.localeCompare(b.testName)));
        setChosenLabTest(formattedData.testName);
        setNewLabTestName("");
        setShowCustomLabModal(false);
        showAlert("Diagnostic test catalog item registered successfully!");
      } else {
        showAlert(resData.error || "Laboratory schema registry operational exception.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addMedicineRow = () => {
    if (!chosenMedicine || !chosenTiming) {
      showAlert("Select drug name and dosage frequency timing interval.");
      return;
    }
    setAssignedMedicines(prev => [...prev, { name: chosenMedicine, timing: chosenTiming }]);
    setChosenMedicine("");
    setChosenTiming("");
  };

  const addLabRow = () => {
    if (!chosenLabTest) return;
    if (assignedLabs.includes(chosenLabTest)) {
      showAlert("This test entry row is already staged.");
      return;
    }
    setAssignedLabs(prev => [...prev, chosenLabTest]);
    setChosenLabTest("");
  };

  // --- Create/Issue Prescription Engine ---
  const handleIssuePrescription = async () => {
    if (!selectedAppointment) {
      showAlert("Please select a valid patient and scheduled slot from the list dropdown container.");
      return;
    }
    if (!prescriptionDetails.trim() && assignedMedicines.length === 0) {
      showAlert("Please specify prescription tracking parameters or add dynamic medicines.");
      return;
    }
    if (needsAdmission && !selectedWard) {
      showAlert("Please designate an inpatient specialty ward mapping zone.");
      return;
    }

    const todayString = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    let dynamicMedsString = assignedMedicines.map(m => `${m.name} - [Time: ${m.timing}]`).join('\n');
    let compiledFinalPrescription = prescriptionDetails;
    if (dynamicMedsString) {
      compiledFinalPrescription = compiledFinalPrescription 
        ? `${compiledFinalPrescription}\n\nStaged Medications:\n${dynamicMedsString}`
        : `Staged Medications:\n${dynamicMedsString}`;
    }

    const bodyPayload = {
      appointmentId: selectedAppointment._id,
      patientName: getCleanPatientName(selectedAppointment),
      patientEmail: selectedAppointment.patientEmail,
      doctorName: doctor.name,
      medicationDetails: compiledFinalPrescription,
      dateIssued: todayString,
      appointmentDate: selectedAppointment.date,
      appointmentTime: selectedAppointment.time,
      
      labPrescription: assignedLabs.join(', ') || null,
      labStatus: assignedLabs.length > 0 ? 'Pending' : 'None',
      labNotes: assignedLabs.length > 0 ? "Inpatient sample extraction requested by attending practitioner." : null,

      admissionRequired: needsAdmission,
      admissionDetails: needsAdmission ? {
        wardName: selectedWard,
        admittedAt: new Date().toISOString()
      } : null
    };

    try {
      const response = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      if (!response.ok) throw new Error("Could not create new remote record");
      const savedResult = await response.json();

      if (savedResult.success) {
        const targetStatus = needsAdmission ? 'Admitted' : 'Completed';
        
        try {
          await fetch('/api/appointments', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              id: selectedAppointment._id, 
              status: targetStatus,
              ward: needsAdmission ? selectedWard : null,
              wardName: needsAdmission ? selectedWard : null,
              assignedWard: needsAdmission ? selectedWard : null,
              admissionDetails: needsAdmission ? {
                wardName: selectedWard,
                admittedAt: new Date().toISOString()
              } : null
            })
          });
        } catch (apiErr) {
          console.warn(apiErr);
        }

        if (doctor.email) {
          const savedHistory = localStorage.getItem(`history_${doctor.email}`);
          if (savedHistory) {
            const localHistoryArray = JSON.parse(savedHistory);
            const updatedHistoryArray = localHistoryArray.map(item => 
              item._id === selectedAppointment._id ? { 
                ...item, 
                status: targetStatus,
                ward: needsAdmission ? selectedWard : null,
                wardName: needsAdmission ? selectedWard : null,
                assignedWard: needsAdmission ? selectedWard : null,
                admissionDetails: needsAdmission ? {
                  wardName: selectedWard,
                  admittedAt: new Date().toISOString()
                } : null
              } : item
            );
            localStorage.setItem(`history_${doctor.email}`, JSON.stringify(updatedHistoryArray));
          }
        }

        setRecentPrescriptions(prev => [savedResult.data || bodyPayload, ...prev]);
        setEligibleAppointments(prev => prev.filter(item => item._id !== selectedAppointment._id));
        
        setSelectedAppointment(null);
        setSearchQuery("");
        setPrescriptionDetails("");
        setNeedsAdmission(false);
        setSelectedWard("");
        setAssignedMedicines([]);
        setAssignedLabs([]);
        
        if (typeof window !== 'undefined' && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        showAlert(needsAdmission ? "Patient chart transmitted to Ward Nursing Queue successfully!" : "Prescription issued successfully!");
      }
    } catch (err) {
      console.error(err);
      showAlert("Failed to finalize clinical order entry pipelines.");
    }
  };

  const handleDeleteRx = (id) => {
    setCustomAlert({
      isOpen: true,
      message: "Are you sure you want to delete this prescription history item?",
      isConfirm: true,
      onConfirm: () => executeDeleteRx(id)
    });
  };

  const executeDeleteRx = async (id) => {
    try {
      const response = await fetch(`/api/prescriptions?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (response.ok) {
        setRecentPrescriptions(prev => {
          const updatedRxList = prev.filter(rx => rx._id !== id);
          const reSyncOutstanding = async () => {
            if (doctor.name) {
              const apptRes = await fetch(`/api/appointments?doctorName=${encodeURIComponent(doctor.name)}`);
              if (apptRes.ok) {
                const rawData = await apptRes.json();
                const consolidatedSchedule = rawData.filter(item => 
                  ["Accepted for Checkup", "Accepted", "In-Progress", "Completed", "Admitted"].includes(item.status) && !item.deletedByDoctor
                );
                const completedAppointmentIds = new Set(updatedRxList.map(rx => rx.appointmentId?._id || rx.appointmentId));
                setEligibleAppointments(consolidatedSchedule.filter(appt => !completedAppointmentIds.has(appt._id)));
              }
            }
          };
          reSyncOutstanding();
          return updatedRxList;
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = (rx) => {
    setEditingId(rx._id);
    setEditDetails(rx.medicationDetails);
  };

  const handleUpdateRx = async (id) => {
    if (!editDetails.trim()) return;
    try {
      const response = await fetch('/api/prescriptions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, medicationDetails: editDetails })
      });
      if (response.ok) {
        setRecentPrescriptions(prev => prev.map(item => item._id === id ? { ...item, medicationDetails: editDetails } : item));
        setEditingId(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
      
                        <title>Prescriptions - MMGC</title>
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center sticky top-0 z-40 shadow-sm">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 mr-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <PillBottle className="text-white" size={18} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight text-sm">MMGC Prescriptions</span>
          </div>
        </header>

        <div className="p-6 lg:p-12 max-w-6xl mx-auto">
          <div className="mb-10">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Prescription & Admission</h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">
              Create medical prescriptions and allocate clinical beds for: <span className="font-semibold text-blue-600">{loading ? "Synchronizing..." : `Dr. ${doctor.name}`}</span>
            </p>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            <div className="xl:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm h-fit">
              <h2 className="font-bold text-slate-800 mb-6 flex items-center">
                <CirclePlus size={20} className="mr-2 text-blue-600"/> 
                Clinical Action Console
              </h2>
              <div className="space-y-5">
                
                {/* Search Selection Input */}
                <div className="relative" ref={dropdownRef}>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Patient Name</label>
                  {selectedAppointment ? (
                    <div className="w-full p-4 bg-blue-50/50 border border-blue-200 rounded-xl flex items-center justify-between">
                      <div>
                        <p className="font-bold text-slate-800 text-sm">{getCleanPatientName(selectedAppointment)}</p>
                        <p className="text-[11px] text-blue-600 font-semibold mt-0.5 uppercase tracking-wider">
                          Slot Time: {selectedAppointment.date} ∙ {selectedAppointment.time}
                        </p>
                      </div>
                      <button onClick={() => { setSelectedAppointment(null); setSearchQuery(""); }} className="p-1.5 hover:bg-blue-100/70 text-blue-600 rounded-lg transition-colors">
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                        onFocus={() => setShowDropdown(true)}
                        placeholder="Search Accepted Patient Name, Date, or Reason..." 
                        className="w-full p-4 bg-slate-50 border border-transparent focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm transition-all outline-none" 
                      />
                      {showDropdown && (
                        <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                          {filteredOptions.length > 0 ? (
                            filteredOptions.map((appt) => (
                              <div
                                key={appt._id}
                                onClick={() => { setSelectedAppointment(appt); setShowDropdown(false); }}
                                className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 text-left transition-colors"
                              >
                                <p className="font-bold text-slate-800 text-sm">{getCleanPatientName(appt)}</p>
                                <div className="flex items-center justify-between mt-0.5">
                                  <span className="text-[11px] text-slate-400 font-medium">Reason: {appt.reason || "General Consultation"}</span>
                                  <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                                    {appt.date} ({appt.time})
                                  </span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="px-4 py-3 text-xs italic text-slate-400 text-center">
                              No matching accepted patients found in your daily active pool.
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Main Textarea Prescription Details */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Prescription Details</label>
                  <textarea 
                    value={prescriptionDetails}
                    onChange={(e) => setPrescriptionDetails(e.target.value)}
                    placeholder="Enter overall diagnostic findings, special parameters or historical case notes here..." 
                    className="w-full h-32 p-4 bg-slate-50 border border-transparent focus:border-blue-100 focus:bg-white focus:ring-4 focus:ring-blue-500/5 rounded-xl text-sm resize-none transition-all outline-none"
                  ></textarea>
                </div>

                {/* Admission Module */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="flex items-center space-x-3 bg-slate-50 p-4 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-all select-none">
                    <input 
                      type="checkbox" 
                      checked={needsAdmission}
                      onChange={(e) => setNeedsAdmission(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition-all"
                    />
                    <div className="flex items-center space-x-2">
                      <Bed size={18} className={needsAdmission ? "text-blue-600" : "text-slate-400"} />
                      <span className="text-sm font-bold text-slate-700">Requires Hospital Admission</span>
                    </div>
                  </label>

                  {needsAdmission && (
                    <div className="mt-4 p-5 bg-slate-50/50 border border-slate-200/80 rounded-xl space-y-5 animate-fadeIn">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-wider">Inpatient Clinical Directive System</p>
                      
                      {/* Specialty Ward Allocation */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5 px-0.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Specialty Ward Allocation</label>
                        </div>
                        <select
                          value={selectedWard}
                          onChange={(e) => setSelectedWard(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:border-blue-300 transition-all"
                        >
                          <option value="">Select Ward Dropdown...</option>
                          {wards.map(ward => (
                            <option key={ward._id} value={ward.name}>{ward.name} ({ward.specialty})</option>
                          ))}
                        </select>
                      </div>

                      {/* Inpatient Medication Assigner */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <PillBottle size={13} className="text-emerald-600"/> Inpatient Medication Assigner
                          </span>
                          <button type="button" onClick={() => setShowCustomMedicineModal(true)} className="text-[10px] text-emerald-600 font-bold flex items-center hover:underline gap-0.5">
                            <Plus size={11}/> Register Formula
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div className="md:col-span-2">
                            <select value={chosenMedicine} onChange={(e) => setChosenMedicine(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none">
                              <option value="">Select Medicine...</option>
                              {medicinesList.map(m => <option key={m._id} value={m.name}>{m.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <select value={chosenTiming} onChange={(e) => setChosenTiming(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none">
                              <option value="">Timing Intervals...</option>
                              {DOSAGE_TIMINGS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                        </div>
                        <button type="button" onClick={addMedicineRow} className="w-full py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs rounded-lg hover:bg-emerald-100 transition-colors">
                          Include Medicine Item in Chart List
                        </button>

                        {assignedMedicines.length > 0 && (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap gap-1.5 mt-1">
                            {assignedMedicines.map((med, idx) => (
                              <span key={idx} className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                {med.name} ({med.timing})
                                <X size={12} className="cursor-pointer text-emerald-400 hover:text-emerald-600" onClick={() => setAssignedMedicines(prev => prev.filter((_, i) => i !== idx))} />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Nursing Diagnostic Lab Requests Panel */}
                      <div className="pt-2 border-t border-slate-200/60 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                            <TestTube size={13} className="text-purple-600"/> Lab Panel Sample Requester
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <select value={chosenLabTest} onChange={(e) => setChosenLabTest(e.target.value)} className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs outline-none">
                            <option value="">Select Lab Diagnosis Test Profile...</option>
                            {labsCatalog.map(lab => <option key={lab._id} value={lab.testName}>{lab.testName}</option>)}
                          </select>
                          <button type="button" onClick={addLabRow} className="px-4 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 transition-colors">
                            Request
                          </button>
                        </div>

                        {assignedLabs.length > 0 && (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex flex-wrap gap-1.5 mt-1">
                            {assignedLabs.map((lab, idx) => (
                              <span key={idx} className="text-[10px] bg-purple-50 text-purple-700 border border-purple-100 px-2 py-0.5 rounded flex items-center gap-1 font-bold">
                                🧪 {lab}
                                <X size={12} className="cursor-pointer text-purple-400 hover:text-purple-600" onClick={() => setAssignedLabs(prev => prev.filter(item => item !== lab))} />
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                <button 
                  onClick={handleIssuePrescription}
                  className="w-full py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                >
                  <FileText size={18}/> {needsAdmission ? "Transmit Charts & Log to Ward Queue" : "Issue Prescription"}
                </button>
              </div>
            </div>

            {/* Right Column History Stack Panel */}
            <div className="space-y-4">
              <h3 className="font-bold text-slate-500 text-[10px] uppercase tracking-widest px-2">Recently Issued</h3>
              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {recentPrescriptions.length > 0 ? (
                  recentPrescriptions.map((p) => {
                    // --- SAFE INTEGRATION EXTRACTION ENGINE FOR POPULATED / DIRECT OBJECT METRICS ---
                    const targetLabNotes = p.labNotes || p.appointmentId?.labNotes;
                    const targetLabFileUrl = p.labFileUrl || p.appointmentId?.labFileUrl;
                    const targetLabPrescription = p.labPrescription || p.appointmentId?.labPrescription;
                    const targetLabStatus = p.labStatus || p.appointmentId?.labStatus;

                    let textLogsArray = [];
                    let attachmentUrlsArray = [];
                    
                    if (targetLabNotes && String(targetLabNotes).trim().startsWith('[')) { 
                      try { textLogsArray = JSON.parse(targetLabNotes); } catch(e){} 
                    }
                    if (targetLabFileUrl && String(targetLabFileUrl).trim().startsWith('[')) { 
                      try { attachmentUrlsArray = JSON.parse(targetLabFileUrl); } catch(e){} 
                    }

                    const displayMatrix = targetLabPrescription || targetLabNotes || targetLabFileUrl || (targetLabStatus && targetLabStatus !== '___');

                    return (
                      <div key={p._id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between group hover:border-blue-300 hover:shadow-md transition-all gap-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-4 min-w-0 flex-1">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all shrink-0">
                              <PillBottle size={20}/>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-800 truncate">{p.patientName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Issued: {p.dateIssued}</p>
                              {p.admissionRequired && (
                                <span className="inline-block mt-1 text-[9px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                                  Ward Admission Active
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1 shrink-0 ml-2">
                            <button onClick={() => startEditing(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit Medication Details">
                              <Edit3 size={15} />
                            </button>
                            <button onClick={() => handleDeleteRx(p._id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete Record">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-left text-xs text-slate-600 font-medium leading-relaxed">
                          {editingId === p._id ? (
                            <div className="space-y-2">
                              <textarea value={editDetails} onChange={(e) => setEditDetails(e.target.value)} className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none resize-none h-20" />
                              <div className="flex items-center justify-end space-x-2">
                                <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-200 rounded"><X size={14} /></button>
                                <button onClick={() => handleUpdateRx(p._id)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-100"><Check size={14} /></button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="whitespace-pre-wrap">{p.medicationDetails}</p>
                              {p.admissionRequired && p.admissionDetails && (
                                <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 font-bold space-y-0.5 bg-white/50 p-2 rounded-lg">
                                  <p>🏥 Location Sector: <span className="text-blue-700">{p.admissionDetails.wardName || p.admissionDetails.ward}</span></p>
                                </div>
                              )}

                              {/* Dynamic Diagnostic Laboratory Panels Matrix */}
                              {displayMatrix && (
                                <div className="bg-white border border-slate-200 rounded-2xl p-4 mt-3 space-y-3 text-left w-full">
                                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                    <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
                                      <FileText size={14} className="text-blue-600" /> Diagnostic Results Matrix
                                    </span>
                                  </div>

                                  {targetLabPrescription && (
                                    <div className="text-xs text-slate-600">
                                      <span className="font-bold text-slate-800">Test Ordered:</span> <span className="text-purple-700 font-semibold">{targetLabPrescription}</span>
                                    </div>
                                  )}

                                  {/* Lab Notes Nested / Array Field Matrix Map */}
                                  {textLogsArray.length > 0 ? (
                                    <div className="space-y-1.5">
                                      {textLogsArray.map((t, idx) => (
                                        <div key={idx} className="text-xs text-slate-600">
                                          <span className="font-bold text-slate-800">{t.testName || "Notes"}:</span> "{t.notes || 'No notes configuration provided'}"
                                        </div>
                                      ))}
                                    </div>
                                  ) : targetLabNotes && (
                                    <div className="text-xs text-slate-600">
                                      <span className="font-bold text-slate-800">Lab Notes:</span> <span className="italic">"{targetLabNotes}"</span>
                                    </div>
                                  )}

                                  {/* Lab File Attachment Matrix Map */}
                                  {attachmentUrlsArray.length > 0 ? (
                                    <div className="pt-2 border-t border-slate-100 flex flex-col space-y-1">
                                      {attachmentUrlsArray.map((fileObj, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-slate-50 border rounded-lg p-1.5 px-2.5">
                                          <span className="font-semibold text-slate-500 truncate max-w-[65%]">{fileObj.testName || "Result File"}</span>
                                          <div className="flex gap-1.5">
                                            {fileObj.urls && Array.isArray(fileObj.urls) ? (
                                              fileObj.urls.map((url, uIdx) => (
                                                <a key={uIdx} href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                                  Doc {uIdx + 1} <ExternalLink size={10} />
                                                </a>
                                              ))
                                            ) : (
                                              <a href={fileObj.url || fileObj} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-0.5 font-bold">
                                                View File <ExternalLink size={10} />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : targetLabFileUrl && (
                                    <div className="pt-2 border-t border-slate-100">
                                      <a href={targetLabFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold">
                                        View Diagnostic Attachment Report <ExternalLink size={12} />
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 px-4">
                    <FileText size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-xs text-slate-400 italic">No historical action tracking records found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* --- MODAL 1: ADD CUSTOM HOSPITAL WARD --- */}
      {showCustomWardModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">Create Custom Hospital Ward</h3>
              <button onClick={() => { setShowCustomWardModal(false); setNewWardName(""); setNewWardSpecialty(""); }} className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Ward Name Label</label>
                <input type="text" value={newWardName} onChange={(e) => setNewWardName(e.target.value)} placeholder="e.g., Ward A, Emergency ICU" className="w-full p-3.5 bg-slate-50 rounded-xl text-xs font-medium outline-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 ml-1">Clinical Specialty Sector</label>
                <input type="text" value={newWardSpecialty} onChange={(e) => setNewWardSpecialty(e.target.value)} placeholder="e.g., General Medicine, Pediatrics" className="w-full p-3.5 bg-slate-50 rounded-xl text-xs font-medium outline-none" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCustomWardModal(false); setNewWardName(""); setNewWardSpecialty(""); }} className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200">Cancel</button>
              <button type="button" onClick={handleAddCustomWard} className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl text-xs hover:bg-blue-700">Save Ward to DB</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: DIRECT ADD CUSTOM MEDICINE FORMULA --- */}
      {showCustomMedicineModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-left">
            <h3 className="text-md font-extrabold text-slate-900 mb-4">Register New Medicine Formula</h3>
            <div className="mb-4">
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Compound Description Title</label>
              <input type="text" value={newMedicineName} onChange={(e) => setNewMedicineName(e.target.value)} placeholder="e.g., Cap Amoxicillin 500mg" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-medium outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowCustomMedicineModal(false); setNewMedicineName(""); }} className="flex-1 py-2.5 bg-slate-100 text-xs font-bold rounded-xl">Cancel</button>
              <button type="button" onClick={handleAddCustomMedicine} className="flex-1 py-2.5 bg-emerald-600 text-white font-black text-xs rounded-xl hover:bg-emerald-700">Commit to DB</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: DIRECT ADD CUSTOM DIAGNOSTIC TEST PROFILE --- */}
      {showCustomLabModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl text-left">
            <h3 className="text-md font-extrabold text-slate-900 mb-4">Register Diagnostic Panel Test</h3>
            <div className="mb-4">
              <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1.5">Lab Test Label Title</label>
              <input type="text" value={newLabTestName} onChange={(e) => setNewLabTestName(e.target.value)} placeholder="e.g., Serum Electrolytes Panel" className="w-full p-3 bg-slate-50 rounded-xl text-xs font-medium outline-none" />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowCustomLabModal(false); setNewLabTestName(""); }} className="flex-1 py-2.5 bg-slate-100 text-xs font-bold rounded-xl">Cancel</button>
              <button type="button" onClick={handleAddCustomLabTest} className="flex-1 py-2.5 bg-purple-600 text-white font-black text-xs rounded-xl hover:bg-purple-700">Save System Catalog</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 4: SYSTEM CUSTOM ALERT / CONFIRMATION MATRIX --- */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl border border-slate-100 text-left">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                {customAlert.isConfirm ? "Action Confirmation" : "Clinical Notification"}
              </h3>
              <button 
                onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))} 
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <p className="text-xs font-medium text-slate-600 mb-8 leading-relaxed whitespace-pre-line">
              {customAlert.message}
            </p>

            <div className="flex gap-3">
              {customAlert.isConfirm ? (
                <>
                  <button 
                    type="button" 
                    onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))} 
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (customAlert.onConfirm) customAlert.onConfirm();
                      setCustomAlert(prev => ({ ...prev, isOpen: false }));
                    }} 
                    className={`flex-1 py-3 text-white font-black text-xs rounded-xl transition-colors ${
                      customAlert.message.toLowerCase().includes("delete") 
                        ? "bg-rose-600 hover:bg-rose-700" 
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {customAlert.message.toLowerCase().includes("delete") ? "Confirm Delete" : "Confirm Action"}
                  </button>
                </>
              ) : (
                <button 
                  type="button" 
                  onClick={() => setCustomAlert(prev => ({ ...prev, isOpen: false }))} 
                  className="w-full py-3 bg-blue-600 text-white font-black text-xs rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Acknowledge
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Prescriptions;