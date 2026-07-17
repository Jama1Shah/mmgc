"use client";

import LabStaffSidebar from '@/components/LabStaffSidebar';
import React, { useState, useEffect, useRef } from 'react';
import { Menu, Loader2, Upload, FileText, CheckCircle, ExternalLink, Trash2, Archive, ListFilter, Files } from 'lucide-react'; 
import { BeakerIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

const LabStaffDashboard = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null); 
  
  // Dashboard view toggle: 'active' shows active orders, 'history' shows historical logs
  const [viewMode, setViewMode] = useState('active');

  // Multi-test structural states indexed by: [orderId]: { [testIndex]: value }
  const [labNotes, setLabNotes] = useState({});
  const [labFiles, setLabFiles] = useState({});

  const activeProcessingIdsRef = useRef(new Set());
  const isSyncingRef = useRef(false);
  // Tracks the timestamp of the latest initiated fetch to prevent async race conditions
  const latestFetchTimeRef = useRef(0);

  // State configuration for custom matching alerts and confirms
  const [modalConfig, setModalConfig] = useState(null);

  // Helper function to trigger elegant custom alert boxes
  const showAlert = (title, message) => {
    setModalConfig({
      type: 'alert',
      title,
      message,
      onConfirm: () => setModalConfig(null)
    });
  };

  // Keyboard shortcut listener for active modal control interception
  useEffect(() => {
    if (!modalConfig) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (modalConfig.onConfirm) modalConfig.onConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setModalConfig(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalConfig]);

  const statusStyles = {
    "Pending": "bg-amber-100 text-amber-700 border-amber-200",
    "To Collect": "bg-amber-100 text-amber-700 border-amber-200",
    "Pending Dispatch": "bg-indigo-100 text-indigo-700 border-indigo-200",
    "Dispatched": "bg-purple-100 text-purple-700 border-purple-200",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-200",
    "Completed": "bg-green-100 text-green-700 border-green-200",
    "Cancelled": "bg-red-100 text-red-700 border-red-200"
  };

  // Safely breaks a text field down into individual sub-test options
  const parseTestsList = (testStr) => {
    if (!testStr) return ["Diagnostic Panels Ordered"];
    return testStr.split(/,|\n/).map(t => t.trim()).filter(t => t.length > 0);
  };

  const fetchOrders = async (isSilent = false) => {
    if (isSyncingRef.current && isSilent) return;

    const currentFetchTime = Date.now();
    latestFetchTimeRef.current = currentFetchTime;

    try {
      if (!isSilent) setLoading(true);
      const response = await fetch(`/api/appointments/lab-orders?view=${viewMode}&t=${currentFetchTime}`, { 
        cache: 'no-store',
        headers: { 'Pragma': 'no-cache', 'Cache-Control': 'no-cache' }
      });
      
      if (response.ok) {
        const serverData = await response.json();
        
        // If a newer fetch request has already started, discard this older response entirely
        if (currentFetchTime < latestFetchTimeRef.current) return;
        
        setOrders(prevOrders => {
          return serverData.map(serverOrder => {
            if (activeProcessingIdsRef.current.has(serverOrder.id)) {
              return { ...serverOrder, labStatus: "In Progress" };
            }
            return serverOrder;
          });
        });
      }
    } catch (err) {
      console.error("Error loading lab orders:", err);
    } finally {
      if (currentFetchTime === latestFetchTimeRef.current && !isSilent) {
        setLoading(false);
      }
    }
  };

  // Re-fetch instantly whenever the user swaps dashboard tracking interfaces
  useEffect(() => {
    fetchOrders(false);
  }, [viewMode]);

  // Handle active status polling intervals safely
  useEffect(() => {
    const livePollingInterval = setInterval(() => {
      fetchOrders(true);
    }, 5000);

    return () => clearInterval(livePollingInterval);
  }, [viewMode]);

  const handleStartProcessing = async (appointmentId) => {
    isSyncingRef.current = true;
    setUpdatingId(appointmentId);
    activeProcessingIdsRef.current.add(appointmentId);

    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === appointmentId ? { ...order, labStatus: "In Progress" } : order
      )
    );

    try {
      const response = await fetch('/api/appointments/lab-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: appointmentId, labStatus: 'In Progress' })
      });

      if (!response.ok) {
        showAlert("Action Failed", "Failed to update status to In Progress.");
        activeProcessingIdsRef.current.delete(appointmentId);
        await fetchOrders(false); 
      }
    } catch (err) {
      console.error("Error updating order status:", err);
      activeProcessingIdsRef.current.delete(appointmentId);
      await fetchOrders(false); 
    } finally {
      isSyncingRef.current = false;
      setUpdatingId(null);
    }
  };

  const handleFinalizeTest = async (order) => {
    const appointmentId = order.id;
    const individualTests = parseTestsList(order.test);
    
    let completedTestNames = [];
    if (order.labNotes && order.labNotes.startsWith('[')) {
      try {
        const parsed = JSON.parse(order.labNotes);
        if (Array.isArray(parsed)) completedTestNames = parsed.map(t => t.testName?.trim()).filter(Boolean);
      } catch(e){}
    }

    const notesObject = labNotes[appointmentId] || {};
    const filesObject = labFiles[appointmentId] || {};

    // Validate that at least one finding text or file bundle exists across tests that are new
    let hasData = false;
    individualTests.forEach((testItem, index) => {
      const occurrencesBefore = individualTests.slice(0, index).filter(t => t.trim() === testItem.trim()).length;
      const totalCompletedOccurrences = completedTestNames.filter(name => name === testItem.trim()).length;
      const isItemAlreadyCompleted = occurrencesBefore < totalCompletedOccurrences;

      if (isItemAlreadyCompleted) return;
      if ((notesObject[index] && notesObject[index].trim()) || (filesObject[index] && filesObject[index].length > 0)) {
        hasData = true;
      }
    });

    const pendingTestsExist = individualTests.some((t, index) => {
      const occurrencesBefore = individualTests.slice(0, index).filter(x => x.trim() === t.trim()).length;
      const totalCompletedOccurrences = completedTestNames.filter(name => name === t.trim()).length;
      return occurrencesBefore >= totalCompletedOccurrences;
    });

    if (!hasData && pendingTestsExist) {
      showAlert("Missing Metrics", "Please provide text findings or upload report files for at least one test to finalize.");
      return;
    }

    isSyncingRef.current = true;
    setUpdatingId(appointmentId);

    try {
      const formData = new FormData();
      formData.append('id', appointmentId);

      // Determine if all tests are completely covered to flag the parent state as Completed
      let allTestsCompleted = true;
      individualTests.forEach((testName, index) => {
        const occurrencesBefore = individualTests.slice(0, index).filter(t => t.trim() === testName.trim()).length;
        const totalCompletedOccurrences = completedTestNames.filter(name => name === testName.trim()).length;
        const isAlreadyCompleted = occurrencesBefore < totalCompletedOccurrences;

        if (isAlreadyCompleted) return;

        const textNotes = notesObject[index] || "";
        const testFileGroup = filesObject[index] || [];
        const hasInput = textNotes.trim().length > 0 || testFileGroup.length > 0;

        if (!hasInput) {
          allTestsCompleted = false;
        }
      });

      const finalLabStatus = allTestsCompleted ? 'Completed' : 'In Progress';
      formData.append('labStatus', finalLabStatus);

      // Pack test metrics structural configuration blocks
      const structuredPayload = individualTests.map((testName, index) => {
        const textNotes = notesObject[index] || "";
        const testFileGroup = filesObject[index] || [];
        
        const occurrencesBefore = individualTests.slice(0, index).filter(t => t.trim() === testName.trim()).length;
        const totalCompletedOccurrences = completedTestNames.filter(name => name === testName.trim()).length;
        const committeesAlreadyMet = occurrencesBefore < totalCompletedOccurrences;

        const hasInput = textNotes.trim().length > 0 || testFileGroup.length > 0;

        if (!committeesAlreadyMet && hasInput) {
          Array.from(testFileGroup).forEach((file) => {
            formData.append(`files_test_${index}`, file);
          });
        }

        return {
          testName,
          notes: textNotes,
          fileCount: testFileGroup.length,
          isNew: !committeesAlreadyMet && hasInput
        };
      });

      formData.append('structuredTests', JSON.stringify(structuredPayload));

      const response = await fetch('/api/appointments/lab-orders', {
        method: 'PATCH',
        body: formData 
      });

      if (response.ok) {
        activeProcessingIdsRef.current.delete(appointmentId);
        setLabNotes(prev => { const copy = {...prev}; delete copy[appointmentId]; return copy; });
        setLabFiles(prev => { const copy = {...prev}; delete copy[appointmentId]; return copy; });
        await fetchOrders(false);
      } else {
        showAlert("Submission Error", "Failed to submit and complete laboratory record.");
        await fetchOrders(false);
      }
    } catch (err) {
      console.error("Error finalizing lab test metrics:", err);
      await fetchOrders(false);
    } finally {
      isSyncingRef.current = false;
      setUpdatingId(null);
    }
  };

  // Soft Delete from Active Dashboard pipeline view
  const handleDeleteFromActive = (appointmentId) => {
    setModalConfig({
      type: 'confirm',
      title: 'Dismiss Active Workspace Order',
      message: 'Are you sure you want to dismiss this order from your active dashboard workspace view? It will still be accessible in History records.',
      onConfirm: async () => {
        setModalConfig(null);
        try {
          const res = await fetch(`/api/appointments/lab-orders?id=${appointmentId}&action=dismissActive`, { method: 'DELETE' });
          if (res.ok) {
            setOrders(prev => prev.filter(o => o.id !== appointmentId));
          } else {
            showAlert("Action Failed", "Failed to drop record from active pipeline panel matrix.");
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Permanently clear item from Lab Logs History view
  const handleClearFromHistory = (appointmentId) => {
    setModalConfig({
      type: 'confirm',
      title: 'Permanently Delete Log Record',
      message: 'Are you sure you want to permanently delete this diagnostic report item from your history index log list? This action will not affect Patient or Doctor chart access.',
      onConfirm: async () => {
        setModalConfig(null);
        try {
          const res = await fetch(`/api/appointments/lab-orders?id=${appointmentId}&action=wipeHistory`, { method: 'DELETE' });
          if (res.ok) {
            setOrders(prev => prev.filter(o => o.id !== appointmentId));
          } else {
            showAlert("Action Failed", "Error encountered wiping record from analytical historical database.");
          }
        } catch (err) {
          console.error(err);
        }
      }
    });
  };

  // Client-side isolation filter: strip out 'Completed' items explicitly from the Active Queue view layout
  const displayedOrders = viewMode === 'active' 
    ? orders.filter(order => order.labStatus !== 'Completed')
    : orders;

  const pendingCount = displayedOrders.filter(o => o.labStatus === 'Pending' || o.labStatus === 'Dispatched' || o.labStatus === 'Pending Dispatch' || o.labStatus === 'To Collect').length;
  const inProgressCount = displayedOrders.filter(o => o.labStatus === 'In Progress').length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex">
      <LabStaffSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex items-center justify-between">
          <div className="flex items-center">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 mr-4 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-2xl font-bold text-gray-800">
              {viewMode === 'active' ? 'Lab Staff Dashboard' : 'Laboratory Diagnostic History Log Registry'}
            </h2>
          </div>

          {/* VIEW TOGGLE CONTROLLER SWITCH */}
          <div className="flex items-center bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            <button
              onClick={() => setViewMode('active')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'active' ? 'bg-white text-[#357DF9] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <ListFilter size={14} /> Active Queue
            </button>
            <button
              onClick={() => setViewMode('history')}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'history' ? 'bg-white text-[#357DF9] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Archive size={14} /> History Log Book
            </button>
          </div>
        </header>

        <div className="p-8">
          {viewMode === 'active' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <StatCard title="Pending Lab Orders" count={String(pendingCount).padStart(2, '0')} icon={ClockIcon} color="text-amber-500" />
              <StatCard title="Tests in Progress" count={String(inProgressCount).padStart(2, '0')} icon={BeakerIcon} color="text-[#357DF9]" />
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              {loading && orders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500 gap-2">
                  <Loader2 className="animate-spin text-[#357DF9]" size={32} />
                  <p className="text-sm font-medium">Fetching real-time diagnostic queue...</p>
                </div>
              ) : displayedOrders.length === 0 ? (
                <div className="text-center py-12 text-gray-500 text-sm font-medium">
                  {viewMode === 'active' 
                    ? "No laboratory orders currently in pipeline matching profile indicators."
                    : "No historical lab logs archived in registry."}
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Patient Name</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Test Requested</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase whitespace-nowrap">Status</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {displayedOrders.map((order) => {
                      const individualTests = parseTestsList(order.test);
                      return (
                        <React.Fragment key={order.id}>
                          <TableRow 
                            order={order} 
                            styles={statusStyles} 
                            viewMode={viewMode}
                            onStart={handleStartProcessing}
                            onDelete={handleDeleteFromActive}
                            onClearHistory={handleClearFromHistory}
                            isUpdating={updatingId === order.id} 
                            parseTestsList={parseTestsList}
                          />
                          {order.labStatus === "In Progress" && viewMode === 'active' && (
                            <tr>
                              <td colSpan={4} className="bg-[#F8FAFC] px-8 py-4 border-b border-gray-200">
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6 max-w-4xl mx-auto lg:ml-0">
                                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 border-b border-gray-100 pb-3">
                                    <FileText size={18} className="text-[#357DF9]" />
                                    <span>Log Laboratory Findings & Results ({individualTests.length} Assigned {individualTests.length > 1 ? 'Tests' : 'Test'})</span>
                                  </div>
                                  
                                  <div className="space-y-6 divide-y divide-gray-100">
                                    {(() => {
                                      let textLogsArray = [];
                                      if (order.labNotes && order.labNotes.startsWith('[')) {
                                        try {
                                          const parsed = JSON.parse(order.labNotes);
                                          if (Array.isArray(parsed)) {
                                            textLogsArray = parsed;
                                          }
                                        } catch(e){}
                                      }

                                      let visibleRenderCount = 0;

                                      return individualTests.map((testItem, index) => {
                                        const occurrencesBefore = individualTests.slice(0, index).filter(t => t.trim() === testItem.trim()).length;
                                        const totalCompletedOccurrences = textLogsArray.filter(t => t.testName?.trim() === testItem.trim()).length;
                                        const isAlreadyCompleted = occurrencesBefore < totalCompletedOccurrences;
                                        
                                        if (isAlreadyCompleted) return null;

                                        visibleRenderCount++;

                                        return (
                                          <div key={index} className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${visibleRenderCount > 1 ? 'pt-6 border-t border-gray-100' : ''}`}>
                                            <title>Dashboard - MMGC</title>
                                            <div className="md:col-span-2">
                                              <span className="text-xs font-bold px-2.5 py-1 rounded border uppercase tracking-wide bg-blue-50 text-[#357DF9] border-blue-100">
                                                Test #{index + 1}: {testItem}
                                              </span>
                                            </div>
                                            <>
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Diagnostic Report Findings / Text Notes</label>
                                                <textarea
                                                  rows={3}
                                                  value={(labNotes[order.id] && labNotes[order.id][index]) || ""}
                                                  onChange={(e) => {
                                                    const currentOrderNotes = labNotes[order.id] || {};
                                                    setLabNotes({
                                                      ...labNotes,
                                                      [order.id]: { ...currentOrderNotes, [index]: e.target.value }
                                                    });
                                                  }}
                                                  placeholder={`Type observation metrics or critical findings for ${testItem}...`}
                                                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-gray-300 transition-all resize-none font-sans"
                                                />
                                              </div>
                                              <div>
                                                <label className="block text-xs font-semibold text-gray-500 mb-1">Upload Report Attachments (Allows Multiple Files)</label>
                                                <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center relative bg-[#FAFAFA] hover:bg-gray-50 transition-colors h-[86px]">
                                                  <input 
                                                    type="file" 
                                                    multiple
                                                    accept="image/*,application/pdf"
                                                    onChange={(e) => {
                                                      const currentOrderFiles = labFiles[order.id] || {};
                                                      setLabFiles({
                                                        ...labFiles,
                                                        [order.id]: { ...currentOrderFiles, [index]: e.target.files }
                                                      });
                                                    }}
                                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                  />
                                                  <Upload size={20} className="text-gray-400 mb-1" />
                                                  <p className="text-xs text-gray-500 font-medium text-center px-2 truncate w-full">
                                                    {labFiles[order.id] && labFiles[order.id][index] && labFiles[order.id][index].length > 0 ? (
                                                      <span className="text-green-600 font-semibold flex items-center justify-center gap-1">
                                                        <Files size={14} /> {labFiles[order.id][index].length} file(s) selected
                                                      </span>
                                                    ) : "Drag & Drop or click to browse multiples"}
                                                  </p>
                                                </div>
                                                {labFiles[order.id] && labFiles[order.id][index] && labFiles[order.id][index].length > 0 && (
                                                  <div className="mt-1 flex flex-wrap gap-1 max-h-[40px] overflow-y-auto">
                                                    {Array.from(labFiles[order.id][index]).map((f, fi) => (
                                                      <span key={fi} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded truncate max-w-[140px]" title={f.name}>
                                                        {f.name}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>

                                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                                    <button
                                      onClick={() => handleFinalizeTest(order)}
                                      disabled={updatingId === order.id}
                                      className="bg-[#357DF9] hover:bg-blue-600 text-white font-semibold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                      {updatingId === order.id && <Loader2 size={14} className="animate-spin" />}
                                      Submit and Release All Results
                                    </button>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Styled Synchronous Interceptor Modal View matching layout design tokens */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-md w-full overflow-hidden transform scale-100 transition-all duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-2">{modalConfig.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{modalConfig.message}</p>
            </div>
            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-100">
              {modalConfig.type === 'confirm' && (
                <button
                  onClick={() => setModalConfig(null)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={() => modalConfig.onConfirm()}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors shadow-sm ${
                  modalConfig.title?.toLowerCase().includes('delete') || modalConfig.title?.toLowerCase().includes('dismiss') || modalConfig.title?.toLowerCase().includes('clear')
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#357DF9] hover:bg-blue-600'
                }`}
              >
                {modalConfig.type === 'confirm' ? 'Confirm Action' : 'Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, count, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
    <div className={`p-3 rounded-lg bg-gray-50 ${color}`}>
      <Icon className="h-8 w-8" />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{count}</p>
    </div>
  </div>
);

const TableRow = ({ order, styles, viewMode, onStart, onDelete, onClearHistory, isUpdating, parseTestsList }) => {
  let textLogsArray = [];
  let attachmentUrlsArray = [];
  
  if (order.labNotes && order.labNotes.startsWith('[')) {
    try {
      const parsed = JSON.parse(order.labNotes);
      if (Array.isArray(parsed)) textLogsArray = parsed;
    } catch(e){}
  }
  
  if (order.labFileUrl && order.labFileUrl.startsWith('[')) {
    try {
      const parsed = JSON.parse(order.labFileUrl);
      if (Array.isArray(parsed)) attachmentUrlsArray = parsed;
    } catch(e){}
  }

  // LOGIC: Filter to show only the current (not yet completed) tests
  const allTests = parseTestsList(order.test);
  const completedTestNames = textLogsArray.map(log => log.testName?.trim());
  const pendingTests = allTests.filter(test => !completedTestNames.includes(test.trim()));
  const displayTestName = pendingTests.length > 0 ? pendingTests.join(', ') : order.test;

  return (
    <tr className={`hover:bg-gray-50 transition-colors ${order.labStatus === "In Progress" && viewMode === 'active' ? 'bg-blue-50/40 font-medium border-l-4 border-l-[#357DF9]' : ''}`}>
      <td className="px-6 py-4 text-gray-900 whitespace-nowrap">
        <div className="font-semibold">{order.patientName}</div>
        <div className="text-xs text-gray-400 font-normal">order id: {order.id}</div>
      </td>
      <td className="px-6 py-4 text-gray-600 text-sm min-w-[250px] break-words whitespace-normal leading-relaxed">
        {displayTestName}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[order.labStatus] || "bg-gray-100 text-gray-700"}`}>
          {order.labStatus}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-3">
          {(order.labStatus === "Pending" || order.labStatus === "Dispatched" || order.labStatus === "Pending Dispatch" || order.labStatus === "To Collect") && viewMode === 'active' ? (
            <button 
              onClick={() => onStart(order.id)}
              disabled={isUpdating}
              className="font-bold text-sm text-[#357DF9] hover:text-blue-700 transition-colors flex items-center gap-1.5"
            >
              {isUpdating && <Loader2 size={14} className="animate-spin text-[#357DF9]" />}
              Process Sample
            </button>
          ) : order.labStatus === "In Progress" && viewMode === 'active' ? (
            <span className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-md animate-pulse">
              Awaiting Results...
            </span>
          ) : (
            <div className="flex flex-col gap-2 w-full text-left max-w-[320px]">
              <span className="text-xs font-bold text-green-600 flex items-center gap-1 self-end">
                <CheckCircle className="w-4 h-4 text-green-500" /> Released
              </span>
              
              {textLogsArray.map((t, idx) => {
                const matchingFilesObj = attachmentUrlsArray.find(f => f.testName?.trim() === t.testName?.trim());
                return (
                  <div key={idx} className="text-[11px] bg-gray-50 p-2.5 rounded-lg border border-gray-100 space-y-1 w-full text-left">
                    <div className="flex justify-between items-center font-bold text-gray-700 border-b border-gray-200/60 pb-1 mb-1">
                      <span className="truncate max-w-[70%]">{t.testName}</span>
                      <span className="text-[9px] font-mono text-gray-400 font-normal shrink-0">{order.date || 'Today'}</span>
                    </div>
                    <div className="text-gray-600 italic break-words whitespace-normal leading-normal">
                      "{t.notes || 'No findings configuration provided'}"
                    </div>
                    {matchingFilesObj && matchingFilesObj.urls && matchingFilesObj.urls.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1.5 border-t border-gray-100 mt-1.5">
                        {matchingFilesObj.urls.map((url, uIdx) => {
                          const isPdf = url.toLowerCase().endsWith('.pdf');
                          return (
                            <a 
                              key={uIdx}
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] text-[#357DF9] hover:underline flex items-center gap-0.5 bg-blue-50 px-1.5 py-0.5 rounded font-semibold"
                            >
                              {isPdf ? 'PDF' : 'Doc'} {uIdx + 1} <ExternalLink size={8} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {textLogsArray.length === 0 && order.labNotes && (
                <p className="text-xs text-gray-500 max-w-[200px] truncate italic font-normal" title={order.labNotes}>
                  "{order.labNotes}"
                </p>
              )}
              {attachmentUrlsArray.length === 0 && order.labFileUrl && !order.labFileUrl.startsWith('[') && (
                <a 
                  href={order.labFileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-[11px] text-gray-400 hover:text-[#357DF9] flex items-center gap-0.5 underline transition-colors font-medium self-end"
                >
                  {order.labFileUrl.toLowerCase().endsWith('.pdf') ? 'View PDF' : 'View File'} <ExternalLink size={10} />
                </a>
              )}
            </div>
          )}

          {viewMode === 'active' ? (
            (order.labStatus === 'Completed' || order.labStatus === 'Cancelled') && (
              <button
                onClick={() => onDelete(order.id)}
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                title="Dismiss from Workspace View"
              >
                <Trash2 size={16} />
              </button>
            )
          ) : (
            <button
              onClick={() => onClearHistory(order.id)}
              className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all flex items-center gap-1 text-xs font-semibold"
              title="Permanently clear from history index registry logs"
            >
              <Trash2 size={15} /> Clear Record
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default LabStaffDashboard;