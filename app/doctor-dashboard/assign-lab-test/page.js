'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Menu, Plus } from 'lucide-react';
import Navbar from '@/components/Navbar';
import DoctorSidebar from '@/components/DoctorSidebar';

function LabTestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const appointmentId = searchParams.get('id');
  const patientEmail = searchParams.get('email') || '';
  const patientName = searchParams.get('name') || 'Patient';

  const [submitting, setSubmitting] = useState(false);
  const [selectedTests, setSelectedTests] = useState([]);
  
  // Initialize with an empty array so no hardcoded tests remain on the front end
  const [availableTests, setAvailableTests] = useState([]);

  const [customTest, setCustomTest] = useState('');

  // UI Match Custom Modal State
  const [modal, setModal] = useState({ isOpen: false, message: '', onClose: null });

  const showAlert = (message, onClose = null) => {
    setModal({ isOpen: true, message, onClose });
  };

  // Fetch the latest updated list from the database as soon as the portal opens
  useEffect(() => {
    async function fetchDatabaseTests() {
      try {
        const response = await fetch('/api/lab-tests');
        if (response.ok) {
          const data = await response.json();
          // Extract the simple string name from the object layout returned by the backend
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

  // Handle Enter key press to dismiss the matching UI design modal when open
  useEffect(() => {
    if (!modal.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const closeAction = modal.onClose;
        setModal({ isOpen: false, message: '', onClose: null });
        if (closeAction) closeAction();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [modal.isOpen, modal.onClose]);

  const handleToggleTest = (testName) => {
    setSelectedTests(prev => 
      prev.includes(testName) 
        ? prev.filter(t => t !== testName) 
        : [...prev, testName]
    );
  };

  // Add custom test handler that updates both UI AND the permanent database
  const handleAddCustomTest = async (e) => {
    e.preventDefault(); 
    const trimmed = customTest.trim();
    
    if (!trimmed) return;

    // Check UI instantly to minimize network strain on immediate re-clicks
    const testExists = availableTests.some(t => t.toLowerCase() === trimmed.toLowerCase());

    if (!testExists) {
      // 1. Optimistically update UI framework sorted A to Z
      setAvailableTests(prev => [...prev, trimmed].sort((a, b) => a.localeCompare(b)));

      // 2. Fire and forget request to store this option permanently in your database
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

    // Automatically check the item off for the active submission session
    if (!selectedTests.includes(trimmed)) {
      setSelectedTests(prev => [...prev, trimmed]);
    }

    setCustomTest('');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (selectedTests.length === 0) {
      showAlert("Please select at least one laboratory test to request.");
      return;
    }

    setSubmitting(true);

    // Sort selected items cleanly for unified visualization histories
    const sortedSelectedTests = [...selectedTests].sort((a, b) => a.localeCompare(b));

    try {
      const response = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: appointmentId,
          status: 'Lab Test Ordered',
          reason: `Requested Labs: ${sortedSelectedTests.join(', ')}.`
        })
      });

      if (response.ok) {
        showAlert("Laboratory request successfully finalized and recorded.", () => {
          router.push('/doctor-dashboard');
        });
      } else {
        const errorData = await response.json();
        showAlert(errorData.error || "Failed submission error.");
      }
    } catch (err) {
      console.error(err);
      showAlert("Network connectivity or system level execution failure.");
    } finally {
      setSubmitting(false);
    }
  };

  // Keep display arrays explicitly configured alphabetically case-insensitive
  const sortedTestsToShow = [...availableTests].sort((a, b) => a.localeCompare(b));

  return (
    <div className="max-w-2xl w-full mx-auto bg-white border border-gray-100 rounded-2xl p-8 shadow-sm relative">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-xl font-bold text-gray-900">Lab Request Details</h2>
        <p className="text-sm text-gray-500 mt-1">Assigning diagnostics for: <strong className="text-gray-700">{patientName}</strong> ({patientEmail})</p>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">Select Laboratory Panels</label>
          
          <div className="flex flex-col border border-gray-100 rounded-xl overflow-hidden bg-gray-50/50">
            {sortedTestsToShow.map((test, index) => {
              const isChecked = selectedTests.includes(test);
              return (
                <React.Fragment key={test}>
                  <div 
                    onClick={() => handleToggleTest(test)}
                    className={`flex items-center p-3.5 cursor-pointer select-none transition-all ${
                      isChecked 
                        ? 'bg-blue-50/70 text-[#357DF9] font-medium' 
                        : 'hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}} 
                      className="h-4 w-4 text-[#357DF9] border-gray-300 rounded pointer-events-none mr-3 focus:ring-0"
                    />
                    <span className="text-sm">{test}</span>
                  </div>
                  {index < sortedTestsToShow.length - 1 && <hr className="border-gray-100 m-0" />}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 bg-[#357DF9] text-white font-semibold py-3 rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all disabled:bg-blue-400 disabled:cursor-not-allowed text-sm text-center"
          >
            {submitting ? "Processing Request..." : "Authorize Lab Tests"}
          </button>
          <button
            type="button"
            onClick={() => router.push('/doctor-dashboard')}
            className="px-5 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-200 active:scale-[0.99] transition-all text-sm"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Styled UI Notification Modal Overlay */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm transition-all duration-200">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 max-w-sm w-full shadow-xl transform transition-all scale-100">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-50 text-[#357DF9] mb-4">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2">Notice</h3>
              <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">{modal.message}</p>
              <button
                type="button"
                onClick={() => {
                  const closeAction = modal.onClose;
                  setModal({ isOpen: false, message: '', onClose: null });
                  if (closeAction) closeAction();
                }}
                className="w-full bg-[#357DF9] text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 active:scale-[0.99] transition-all text-sm text-center shadow-sm"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssignLabTestPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-slate-900 overflow-hidden">
      <title>Assign Lab Test - MMGC</title>
      <DoctorSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Navbar />
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center sticky top-0 z-40 shadow-sm">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 mr-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>
          <span className="font-bold text-slate-800 tracking-tight text-sm">Navigation</span>
        </header>

        <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 font-['DM_Sans',sans-serif]">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Lab Assignment Portal</h1>
          </div>
          <Suspense fallback={<div className="text-center py-12 text-gray-500 font-medium">Initializing Request context window...</div>}>
            <LabTestForm />
          </Suspense>
        </main>
      </div>
    </div>
  );
}