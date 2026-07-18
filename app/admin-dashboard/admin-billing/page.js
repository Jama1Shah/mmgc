"use client";

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import {
  Menu,
  TrendingUp,
  BanknoteCheck,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';

export default function AdminBillingPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [labTests, setLabTests] = useState([]);
  const [wards, setWards] = useState([]);
  
  // Modals & Action States
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Custom Matching UI Modals States
  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: '' });
  const [customConfirm, setCustomConfirm] = useState({ isOpen: false, message: '', onConfirm: null });

  // Handle Enter/Esc keyboard control for Alert Modal
  useEffect(() => {
    if (!customAlert.isOpen) return;
    const handleAlertKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        setCustomAlert({ isOpen: false, message: '' });
      }
    };
    window.addEventListener('keydown', handleAlertKeyDown);
    return () => window.removeEventListener('keydown', handleAlertKeyDown);
  }, [customAlert.isOpen]);

  // Handle Enter/Esc keyboard control for Confirm Modal
  useEffect(() => {
    if (!customConfirm.isOpen) return;
    const handleConfirmKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (customConfirm.onConfirm) customConfirm.onConfirm();
        setCustomConfirm({ isOpen: false, message: '', onConfirm: null });
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setCustomConfirm({ isOpen: false, message: '', onConfirm: null });
      }
    };
    window.addEventListener('keydown', handleConfirmKeyDown);
    return () => window.removeEventListener('keydown', handleConfirmKeyDown);
  }, [customConfirm.isOpen, customConfirm.onConfirm]);

  // Fetch all invoices from the database
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Fetch appointments for reference ID matching
      try {
        const apptRes = await fetch('/api/appointments');
        if (apptRes.ok) {
          const apptData = await apptRes.json();
          setAppointments(Array.isArray(apptData) ? apptData : []);
        }
      } catch (apptErr) {
        console.error("Admin Fetch Appointments Error:", apptErr);
      }

      // Fetch lab tests for matching calculation alignment
      try {
        const labRes = await fetch('/api/lab-tests');
        if (labRes.ok) {
          const labData = await labRes.json();
          setLabTests(Array.isArray(labData) ? labData : []);
        }
      } catch (labErr) {
        console.error("Admin Fetch Lab Tests Error:", labErr);
      }

      // Fetch wards for matching calculation alignment
      try {
        const wardRes = await fetch('/api/wards');
        if (wardRes.ok) {
          const wardData = await wardRes.json();
          setWards(Array.isArray(wardData) ? wardData : []);
        }
      } catch (wardErr) {
        console.error("Admin Fetch Wards Error:", wardErr);
      }

      const res = await fetch('/api/billing');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Deduplication matching criterion from internal DB _id to structural appointmentId
          const uniqueInvoices = data.filter((inv, index, self) => 
            self.findIndex(i => i.appointmentId === inv.appointmentId) === index
          );
          setInvoices(uniqueInvoices);
        } else {
          setInvoices([]);
        }
      }
    } catch (err) {
      console.error("Admin Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  // Automatically sync and validate invoices to align correctly with billing staff dashboard counts
  useEffect(() => {
    if (appointments.length === 0 || labTests.length === 0) return;

    async function syncAndValidateInvoices() {
      const completedAppts = appointments.filter(appt => appt.status === 'Bill Pending' || appt.status === 'Completed');
      
      for (const appt of completedAppts) {
        const existingInvoice = invoices.find(inv => inv.appointmentId === appt._id);
        
        if (!existingInvoice) {
          // Bill calculation is now omitted here and handled strictly by the backend API route
          const newInvoiceData = {
            appointmentId: appt._id,
            patientId: appt.patientId,
            patientName: appt.patientName,
            status: 'Unpaid',
            date: new Date()
          };

          try {
            const res = await fetch('/api/billing', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newInvoiceData)
            });
            
            if (res.ok) {
              const createdInvoice = await res.json();
              setInvoices(prev => {
                if (prev.some(inv => inv._id === createdInvoice._id || inv.appointmentId === createdInvoice.appointmentId)) {
                  return prev;
                }
                return [...prev, createdInvoice];
              });
            }
          } catch (err) {
            console.error("Auto-save failed:", err);
          }
        }
      }
    }

    syncAndValidateInvoices();
    // 🛡️ REFIXTURE: Track the complete object arrays directly to prevent stale closure cycles during runtime mutations
  }, [appointments, invoices, labTests, wards]);

  // Handle Status Update (PUT)
  const handleUpdateStatus = async (invoiceId, newStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch('/api/billing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId, status: newStatus })
      });

      if (res.ok) {
        const updatedDoc = await res.json();
        // Update local state smoothly
        setInvoices(prev => prev.map(inv => inv._id === invoiceId ? { ...inv, status: newStatus } : inv));
        
        // Synchronize corresponding appointment status within local UI state instantly
        setAppointments(prev => prev.map(appt => 
          appt._id === updatedDoc.appointmentId
            ? { ...appt, status: newStatus === 'Paid' ? 'Completed' : 'Bill Pending', billPaid: newStatus === 'Paid' }
            : appt
        ));

        if (selectedInvoice && selectedInvoice._id === invoiceId) {
          setSelectedInvoice(prev => ({ ...prev, status: newStatus }));
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Permanent Database Deletion (DELETE)
  const handleDeleteInvoice = async (invoiceId) => {
    try {
      const res = await fetch('/api/billing', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invoiceId })
      });

      if (res.ok) {
        // Remove from UI state instantly
        setInvoices(prev => prev.filter(inv => inv._id !== invoiceId));
        setDeleteConfirmId(null);
        setSelectedInvoice(null);
      } else {
        setCustomAlert({ isOpen: true, message: "Failed to delete record from database." });
      }
    } catch (err) {
      console.error("Database deletion error:", err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper to generate the exact same reference ID format as the billing staff side
  const getInvoiceRefId = (inv) => {
    if (!inv) return "N/A";
    if (inv.invoiceId) return inv.invoiceId;
    const matchedAppt = appointments.find(a => 
      a._id?.toString() === inv.appointmentId?.toString()
    );
    return matchedAppt?.invoiceId || (matchedAppt?._id ? `INV-${matchedAppt._id.toString().slice(-4).toUpperCase()}` : `INV-${inv.appointmentId?.toString().slice(-4).toUpperCase() || '5502'}`);
  };

  // Calculations for Metrics Dashboard
  const totalRevenueValue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  const pendingAmountValue = invoices
    .filter(inv => inv.status !== 'Paid')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  // Filtered dataset based on search inputs
  const filteredInvoices = invoices.filter(inv => {
    const refId = getInvoiceRefId(inv);
    const matchesSearch = 
      (inv.patientName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.appointmentId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv._id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      refId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statusStyles = {
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Unpaid: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <title>Billing - MMGC</title>
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 w-full flex flex-col">
        {/* Header Setup */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10 py-6 sticky top-0 z-40 flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Admin Financial Control</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Full access database records management and financial monitoring.</p>
              </div>
            </div>
            <button 
              onClick={fetchInvoices} 
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors flex items-center gap-2 text-xs font-bold"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Sync DB
            </button>
          </div>
        </header>

        {/* Overview Content Grid */}
        <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px] mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Collected Revenue" val={`PKR ${totalRevenueValue.toLocaleString()}`} icon={<TrendingUp className="text-emerald-500" />} border="border-emerald-500" />
            <StatCard label="Outstanding Receivables" val={`PKR ${pendingAmountValue.toLocaleString()}`} icon={<BanknoteCheck className="text-amber-500" />} border="border-amber-500" />
            <StatCard label="Total Database Records" val={`${invoices.length} Invoices`} icon={<AlertTriangle className="text-blue-500" />} border="border-blue-500" />
          </div>

          {/* Filtering and Search Controls bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search Patient, ID, or Appt..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#357DF9] text-slate-700 font-medium"
              />
            </div>

            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto self-start sm:self-center pb-2 sm:pb-0">
              {['All', 'Paid', 'Unpaid'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                    statusFilter === status 
                      ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Master Invoices Ledger Table View */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">System Invoice Ledger</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-black">
                  <tr>
                    <th className="px-6 py-4">Database Ref ID / Date</th>
                    <th className="px-6 py-4">Patient Profile</th>
                    <th className="px-6 py-4">Total Charge</th>
                    <th className="px-6 py-4">Payment Status</th>
                    <th className="px-6 py-4 text-center">Administrative Management Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 font-bold text-slate-400 text-sm">Querying MongoDB documents...</td>
                    </tr>
                  ) : filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-10 font-bold text-slate-400 text-sm">No ledger database data matched filters.</td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv) => (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-800 select-all">{getInvoiceRefId(inv)}</p>
                          <p className="text-[10px] font-medium text-slate-400 mt-0.5">{formatDate(inv.date)}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-700 group-hover:text-[#357DF9] transition-colors">
                          {inv.patientName || "Unknown Patient"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 font-bold">
                          PKR {(inv.totalAmount || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusStyles[inv.status] || statusStyles.Unpaid}`}>
                            {inv.status || 'Unpaid'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-2 text-slate-500 hover:text-[#357DF9] hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit & View details"
                            >
                              <Edit3 size={15} />
                            </button>
                            
                            {deleteConfirmId === inv._id ? (
                              <div className="flex items-center gap-1.5 animate-fadeIn">
                                <button 
                                  onClick={() => handleDeleteInvoice(inv._id)}
                                  className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-black uppercase tracking-wider hover:bg-red-700"
                                >
                                  Confirm Destroy
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(inv._id)}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete permanently from database"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Admin Modification / View Details Drawer Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Document Database Record</span>
                <h3 className="font-black text-slate-800 text-sm select-all">{getInvoiceRefId(selectedInvoice)}</h3>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Patient Full Profile</p>
                <p className="font-bold text-slate-800 text-base">{selectedInvoice.patientName || "Unknown Patient"}</p>
                <p className="text-slate-400 text-xs font-semibold mt-0.5">Patient ID: {selectedInvoice.patientId || 'N/A'}</p>
              </div>

              <div className="py-3 border-y border-slate-100 space-y-2">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Invoice Cost Lineitems</p>
                {selectedInvoice.items && selectedInvoice.items.length > 0 ? (
                  selectedInvoice.items.map((item, index) => (
                    <div key={index} className="flex justify-between text-xs font-semibold text-slate-600">
                      <span>{item.description}</span>
                      <span className="text-slate-800">PKR {item.cost?.toLocaleString()}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>Standard Managed Services Total</span>
                    <span className="text-slate-800">PKR {selectedInvoice.totalAmount?.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="flex justify-between pt-2 border-t border-dashed border-slate-200 text-sm font-black text-slate-800">
                  <span>Grand Aggregated Total</span>
                  <span className="text-[#357DF9]">PKR {selectedInvoice.totalAmount?.toLocaleString()}</span>
                </div>
              </div>

              {/* Status Update Quick Adjustment Panel */}
              <div className="space-y-2">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Modify Payment Status</p>
                <div className="grid grid-cols-2 gap-2">
                  {['Paid', 'Unpaid'].map((status) => (
                    <button
                      key={status}
                      disabled={isUpdating}
                      onClick={() => handleUpdateStatus(selectedInvoice._id, status)}
                      className={`py-2 px-3 rounded-xl text-xs font-black uppercase transition-all tracking-wide border text-center ${
                        selectedInvoice.status === status
                          ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Panel Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <button
                onClick={() => {
                  setCustomConfirm({
                    isOpen: true,
                    message: "Confirm action: This destroys this record permanently from the database.",
                    onConfirm: () => handleDeleteInvoice(selectedInvoice._id)
                  });
                }}
                className="px-4 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={13} /> Delete Document
              </button>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="flex-1 bg-white text-slate-600 border border-slate-200 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Done / Exit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom UI Matching Alert Modal */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-amber-500">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-slate-800 text-sm">System Alert</h3>
            </div>
            <p className="text-slate-600 text-xs font-medium">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert({ isOpen: false, message: '' })}
              className="w-full bg-slate-800 text-white py-2 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
            >
              Dismiss (Enter)
            </button>
          </div>
        </div>
      )}

      {/* Custom UI Matching Confirm Modal */}
      {customConfirm.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-xl border border-slate-100 p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-500">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-slate-800 text-sm">Confirm Permanent Action</h3>
            </div>
            <p className="text-slate-600 text-xs font-medium">{customConfirm.message}</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setCustomConfirm({ isOpen: false, message: '', onConfirm: null })}
                className="flex-1 bg-white text-slate-600 border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                Cancel (Esc)
              </button>
              <button
                onClick={() => {
                  if (customConfirm.onConfirm) customConfirm.onConfirm();
                  setCustomConfirm({ isOpen: false, message: '', onConfirm: null });
                }}
                className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
              >
                Confirm (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const StatCard = ({ label, val, icon, border }) => (
  <div className={`bg-white p-6 rounded-2xl border-l-4 ${border} shadow-sm border border-slate-200 flex justify-between items-start`}>
    <div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-800 mt-2 tracking-tight">{val}</p>
    </div>
    <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
  </div>
);