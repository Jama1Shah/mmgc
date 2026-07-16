'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DoctorSidebar from '@/components/DoctorSidebar';
import Link from 'next/link';
import { Loader2, ArrowLeft, Clipboard, ShieldAlert, FileText, Download, Calendar, User, FileEdit, ExternalLink, Plus } from 'lucide-react';

const LabAnalyticsContent = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const appointmentId = searchParams.get('id');

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // States for issuing additional lab tests (Synchronized checklist matrix matching setup layout)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isPrescriptionWarningOpen, setIsPrescriptionWarningOpen] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  const [customTest, setCustomTest] = useState('');
  const [availableTests, setAvailableTests] = useState([
    "Basic Metabolic Panel (BMP)",
    "Complete Blood Count (CBC)",
    "Hemoglobin A1C",
    "Lipid Panel (Cholesterol)",
    "Liver Function Test (LFT)",
    "Thyroid Panel (TSH)",
    "Urinalysis",
    "Vitamin D, 25-Hydroxy"
  ]);

  // Custom alert modal state
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: 'Notification',
    message: ''
  });

  const showAlert = (message, title = 'Notification') => {
    setAlertModal({ isOpen: true, title, message });
  };

  // Keyboard Event Hook: Custom Alert Modal (Enter or Escape to dismiss)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setAlertModal({ isOpen: false, title: 'Notification', message: '' });
        }
      }
    };

    if (alertModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [alertModal.isOpen]);

  // Keyboard Event Hook: Order Modal (Enter to dispatch, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isOrderModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsOrderModalOpen(false);
          setSelectedTests([]);
          setCustomTest('');
        } else if (e.key === 'Enter') {
          if (selectedTests.length > 0 && !orderLoading) {
            e.preventDefault();
            e.stopPropagation();
            handleOrderNewTest();
          }
        }
      }
    };

    if (isOrderModalOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOrderModalOpen, selectedTests, orderLoading]);

  // Keyboard Event Hook: Warning Modal (Enter to proceed, Escape to cancel)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isPrescriptionWarningOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsPrescriptionWarningOpen(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          setIsPrescriptionWarningOpen(false);
          router.push(`/prescriptions?${prescriptionQueryParams.toString()}`);
        }
      }
    };

    if (isPrescriptionWarningOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isPrescriptionWarningOpen, record, selectedTests]);

  // Load appointment/report data context
  useEffect(() => {
    if (!appointmentId) {
      setError("No appointment transaction identifier found inside parameters.");
      setLoading(false);
      return;
    }

    const loadLabMetrics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/appointments?id=${appointmentId}`);
        if (!response.ok) {
          throw new Error("Target record not found or server endpoint tracking unreachable.");
        }
        const data = await response.json();
        setRecord(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadLabMetrics();
  }, [appointmentId]);

  // Fetch baseline options dynamically from database repository
  useEffect(() => {
    async function fetchDatabaseTests() {
      try {
        const response = await fetch('/api/lab-tests');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            const extractedNames = data.map(item => item.description || item.name);
            setAvailableTests(extractedNames);
          }
        }
      } catch (err) {
        console.error("Could not load custom baseline tests from database:", err);
      }
    }
    fetchDatabaseTests();
  }, []);

  const parseClinicalIntent = (reasonStr = '') => {
    const labsMatch = reasonStr.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);

    let extractedTest = labsMatch ? labsMatch[1].trim() : "";
    extractedTest = extractedTest.replace(/[.,\s]+$/, "");

    return {
      testNames: extractedTest || "Standard Diagnostic Panels"
    };
  };

  const handleToggleTest = (testName) => {
    setSelectedTests(prev =>
      prev.includes(testName)
        ? prev.filter(t => t !== testName)
        : [...prev, testName]
    );
  };

  const handleAddCustomTest = async (e) => {
    if (e) e.preventDefault();
    const trimmed = customTest.trim();

    if (!trimmed) return;

    const testExists = availableTests.some(t => t.toLowerCase() === trimmed.toLowerCase());

    if (!testExists) {
      // Optimistically insert sorted into UI panel
      setAvailableTests(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));

      try {
        await fetch('/api/lab-tests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed })
        });
      } catch (err) {
        console.error("Database connection dropped saving item:", err);
      }
    }

    if (!selectedTests.includes(trimmed)) {
      setSelectedTests(prev => [...prev, trimmed]);
    }

    setCustomTest('');
  };

  const handleOrderNewTest = async () => {
    if (selectedTests.length === 0) return;
    try {
      setOrderLoading(true);
      const currentIntent = parseClinicalIntent(record.reason);
      const existingTests = currentIntent.testNames;

      const sortedSelectedTests = [...selectedTests].sort((a, b) => a.localeCompare(b));
      const jointNewTests = sortedSelectedTests.join(', ');

      const updatedTests = existingTests && existingTests !== "Standard Diagnostic Panels"
        ? `${existingTests}, ${jointNewTests}`
        : jointNewTests;

      const updatedReason = `Requested Labs: ${updatedTests}`;

      const response = await fetch(`/api/appointments`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: record._id,
          labStatus: 'Pending',
          reason: updatedReason,
          labPrescription: updatedTests
        })
      });

      if (!response.ok) {
        throw new Error("Failed to dispatch additional lab test request.");
      }

      // Refresh layout metrics cleanly
      const refreshedResponse = await fetch(`/api/appointments?id=${record._id}`);
      if (refreshedResponse.ok) {
        const data = await refreshedResponse.json();
        setRecord(data);
      }

      setIsOrderModalOpen(false);
      setSelectedTests([]);
      setCustomTest('');
    } catch (err) {
      showAlert(err.message, "Order Failed");
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 gap-2">
        <Loader2 className="animate-spin text-[#357DF9]" size={32} />
        <p className="text-sm font-semibold text-slate-500">Compiling analytical lab charts...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <ShieldAlert className="text-red-500 mb-2 animate-bounce" size={48} />
        <h4 className="text-lg font-bold text-slate-800">Analytical Context Error</h4>
        <p className="text-sm text-slate-500 max-w-sm mt-1">{error || "Requested data could not be pulled."}</p>
        <button onClick={() => router.back()} className="mt-4 px-4 py-2 text-xs font-bold text-white bg-[#357DF9] rounded-xl hover:bg-blue-600 transition-colors">
          Go Back
        </button>
      </div>
    );
  }

  const { testNames } = parseClinicalIntent(record.reason);

  // --- Dynamic Prescription Route Query Builder Engine ---
  const prescriptionQueryParams = new URLSearchParams({
    appointmentId: record._id || '',
    patientName: record.patientName || '',
    patientEmail: record.patientEmail || '',
    appointmentDate: record.date || '',
    appointmentTime: record.time || '',
    labTestName: testNames
  });

  let textLogsArray = [];
  let attachmentUrlsArray = [];

  if (record.labNotes && record.labNotes.startsWith('[')) {
    try { textLogsArray = JSON.parse(record.labNotes); } catch (e) { }
  }
  if (record.labFileUrl && record.labFileUrl.startsWith('[')) {
    try { attachmentUrlsArray = JSON.parse(record.labFileUrl); } catch (e) { }
  }

  const sortedTestsToShow = [...availableTests].sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden relative">
     <title>Lab Analytics - MMGC</title>
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto p-6 lg:p-10 max-w-5xl mx-auto w-full">
        <div className="mb-8 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsOrderModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all border border-transparent hover:scale-[1.02]"
            >
              <Plus size={14} /> Order Another Lab Test
            </button>

            <button
              onClick={() => {
                if (record?.labStatus !== 'Completed') {
                  setIsPrescriptionWarningOpen(true);
                } else {
                  router.push(`/prescriptions?${prescriptionQueryParams.toString()}`);
                }
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all border border-transparent hover:scale-[1.02]"
            >
              <FileEdit size={14} /> Write Prescription
            </button>

            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-2 rounded-xl">
              Lab Diagnostic Verified
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 lg:p-8 space-y-8">
          {/* Section 1: Header Info */}
          <div className="border-b border-slate-100 pb-6 flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Laboratory Analytics Report</h2>
              <p className="text-xs text-slate-400 mt-1">Order Ref Tracker ID: {record._id}</p>
            </div>
            <div className="text-sm font-semibold text-slate-700 bg-slate-50 border px-4 py-2.5 rounded-xl flex items-center gap-2 self-start sm:self-auto">
              <Calendar size={16} className="text-[#357DF9]" />
              <span>Released: {new Date(record.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Section 2: Cards grid breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
              <div className="p-2.5 bg-blue-50 border text-[#357DF9] rounded-lg h-fit"><User size={18} /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Patient Identification</span>
                <h4 className="text-base font-bold text-slate-800 mt-0.5">{record.patientName || "Unknown Patient"}</h4>
                <p className="text-xs text-slate-500 mt-0.5">{record.patientEmail}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex gap-3">
              <div className="p-2.5 bg-purple-50 border text-purple-600 rounded-lg h-fit"><Clipboard size={18} /></div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Requested Panel Grouping</span>
                <h4 className="text-sm font-bold text-slate-800 mt-1">{testNames}</h4>
              </div>
            </div>
          </div>

          {/* Section 3: Diagnostic Findings Box */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <FileText className="text-[#357DF9]" size={16} /> Technical Lab Observations & Text Findings
            </h3>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 min-h-[120px] text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {textLogsArray.length > 0 ? (
                <div className="space-y-2">
                  {textLogsArray.map((t, idx) => (
                    <div key={idx} className="text-xs text-slate-600 border-b border-slate-200/60 pb-1.5 last:border-none last:pb-0">
                      <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                    </div>
                  ))}
                </div>
              ) : record.labNotes ? (
                record.labNotes
              ) : (
                "No text commentary logged by lab-technician diagnostics staff."
              )}
            </div>
          </div>

          {/* Section 4: File attachment view download layer */}
          {((record.labFileUrl && !record.labFileUrl.startsWith('[')) || attachmentUrlsArray.length > 0) && (
            <div className="border-t border-slate-100 pt-6 space-y-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500"><FileText size={24} /></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">Attached Digital Report asset</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Scanned evaluation chart copy (.pdf/.png)</p>
                </div>
              </div>

              {attachmentUrlsArray.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {attachmentUrlsArray.map((fileObj, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 border border-slate-200 rounded-xl p-3 px-4">
                      <span className="font-bold text-slate-700 truncate max-w-[60%]">{fileObj.testName}</span>
                      <div className="flex gap-2">
                        {fileObj.urls.map((url, uIdx) => (
                          <a
                            key={uIdx}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-[#357DF9] hover:bg-blue-600 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm transition-colors"
                          >
                            Doc {uIdx + 1} <ExternalLink size={11} />
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                record.labFileUrl && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="text-xs text-slate-500 italic truncate max-w-md">
                      File Path: {record.labFileUrl}
                    </div>
                    <a
                      href={record.labFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#357DF9] hover:bg-blue-600 text-white font-bold text-xs px-5 py-3 rounded-xl shadow-sm transition-colors"
                    >
                      <Download size={14} /> Download/View Asset File
                    </a>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </main>

      {/* --- RE-ARCHITECTED ADVANCED LABORATORY SELECTION SYSTEM MODAL LAYER --- */}
      {isOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left flex flex-col max-h-[90vh]">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Order New Laboratory Test</h3>
              <p className="text-xs text-slate-500 mt-1">This registers an additional separate clinical diagnostic panel directly into the lab monitoring view queue.</p>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Laboratory Panels</label>

              {/* Scrollable list frame */}
              <div className="overflow-y-auto flex-1 flex flex-col border border-slate-100 rounded-xl bg-slate-50/50 max-h-56">
                {sortedTestsToShow.map((test, index) => {
                  const isChecked = selectedTests.includes(test);
                  return (
                    <React.Fragment key={test}>
                      <div
                        onClick={() => handleToggleTest(test)}
                        className={`flex items-center p-3 cursor-pointer select-none transition-all ${isChecked
                            ? 'bg-blue-50/70 text-[#357DF9] font-medium'
                            : 'hover:bg-slate-100 text-slate-700'
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="h-4 w-4 text-[#357DF9] border-slate-300 rounded pointer-events-none mr-3 focus:ring-0"
                        />
                        <span className="text-xs">{test}</span>
                      </div>
                      {index < sortedTestsToShow.length - 1 && <hr className="border-slate-100 m-0" />}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setIsOrderModalOpen(false);
                  setSelectedTests([]);
                  setCustomTest('');
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={orderLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                autoFocus
                onClick={handleOrderNewTest}
                disabled={orderLoading || selectedTests.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
              >
                {orderLoading && <Loader2 className="animate-spin" size={12} />}
                Dispatch Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- PENDING LAB TEST ENFORCEMENT WARNING MODAL LAYER --- */}
      {isPrescriptionWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-left flex flex-col">
            <div className="flex items-center gap-2 text-amber-500">
              <ShieldAlert size={20} />
              <h3 className="text-base font-bold text-slate-900">Pending Lab Tests Detected</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              An additional laboratory diagnostic test has been assigned to this patient context but is currently incomplete. Writing a prescription right now will bypass the pending test metrics. Do you want to proceed anyway?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPrescriptionWarningOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel & Wait
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setIsPrescriptionWarningOpen(false);
                  router.push(`/prescriptions?${prescriptionQueryParams.toString()}`);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Proceed to Prescription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCHING CUSTOM ALERT MODAL */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#357DF9] flex items-center justify-center mx-auto shadow-lg shadow-blue-50">
                <ShieldAlert className="text-[#357DF9]" size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{alertModal.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{alertModal.message}</p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setAlertModal({ isOpen: false, title: 'Notification', message: '' })}
              className="w-full bg-[#357DF9] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default function LabAnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-slate-50 gap-2">
        <Loader2 className="animate-spin text-[#357DF9]" size={32} />
        <p className="text-sm font-semibold text-slate-500">Loading page layout...</p>
      </div>
    }>
      <LabAnalyticsContent />
    </Suspense>
  );
}