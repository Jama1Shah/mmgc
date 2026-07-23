"use client";

import React, { useState, useEffect } from 'react';
import BillingStaffSidebar from '@/components/BillingStaffSidebar';
import { 
  Menu, 
  CreditCard, 
  Calendar, 
  Bell, 
  Search 
} from 'lucide-react';

export default function PendingInvoicesPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [wards, setWards] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Modal Alert State
  const [customAlert, setCustomAlert] = useState({ isOpen: false, message: '' });

  // Handle Enter Key press to dismiss modal when open
  useEffect(() => {
    if (!customAlert.isOpen) return;
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        setCustomAlert({ isOpen: false, message: '' });
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [customAlert.isOpen]);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await fetch('/api/appointments');
        if (res.ok) {
          const data = await res.json();
          setAppointments(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch appointments:", err);
      }
    }
    async function fetchLabTests() {
      try {
        const res = await fetch('/api/lab-tests');
        if (res.ok) {
          const data = await res.json();
          setLabTests(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch lab tests:", err);
      }
    }
    async function fetchInvoices() {
      try {
        const res = await fetch('/api/billing');
        if (res.ok) {
          const data = await res.json();
          setInvoices(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      }
    }
    async function fetchWards() {
      try {
        const res = await fetch('/api/wards');
        if (res.ok) {
          const data = await res.json();
          setWards(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch wards:", err);
      }
    }
    fetchAppointments();
    fetchLabTests();
    fetchInvoices();
    fetchWards();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const calculateAppointmentAmount = (appt) => {
    if (appt.amount) return Number(appt.amount);
    if (appt.fee) return Number(appt.fee);

    let total = 1500;

    let testNames = [];
    if (appt.labTestName) {
      testNames = appt.labTestName.split(',').map(s => s.trim()).filter(Boolean);
    } else if (appt.labReason) {
      testNames = appt.labReason.split(',').map(s => s.trim()).filter(Boolean);
    } else if (appt.labPrescription) {
      testNames = appt.labPrescription.split(',').map(s => s.trim()).filter(Boolean);
    } else if (appt.reason && appt.reason.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i)) {
      const labsMatch = appt.reason.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);
      if (labsMatch && labsMatch[1].trim()) {
        testNames = labsMatch[1].trim().split(',').map(s => s.trim().replace(/[.,\s]+$/, "")).filter(Boolean);
      }
    } else if (Array.isArray(appt.labTests)) {
      testNames = appt.labTests.map(t => t.name || t.testName || t.description || (typeof t === 'string' ? t : ''));
    }

    testNames.forEach(name => {
      if (!name) return;
      const matchedTest = labTests.find(t => 
        (t.name && t.name.toLowerCase() === name.toLowerCase()) ||
        (t.description && t.description.toLowerCase() === name.toLowerCase()) ||
        name.toLowerCase().includes(t.name?.toLowerCase() || "___") ||
        name.toLowerCase().includes(t.description?.toLowerCase() || "___")
      );
      const baseCost = matchedTest ? (matchedTest.baseCost || matchedTest.cost) : 1000;
      total += Math.round(baseCost);
    });

    const hasAdmissionDays = Number(appt.admissionDetails?.admissionDays || appt.admissionDays) > 0;
    const requiresAdmission = appt.status === 'Admitted' || appt.admissionRequired || hasAdmissionDays;
    if (requiresAdmission) {
      const activeDays = Number(appt.admissionDetails?.admissionDays || appt.admissionDays) || 1;
      const wardName = appt.admissionDetails?.wardName || appt.wardName;
      const matchedWard = wards.find(w => w.name?.toLowerCase() === wardName?.toLowerCase());
      const admissionFee = matchedWard ? (matchedWard.admissionFee || 0) : 0;
      const overnightFee = matchedWard ? (matchedWard.overnightFee || 0) : 2500;
      
      total += admissionFee + (overnightFee * activeDays);
    }

    return total;
  };

  const handleProcessPayment = async (apptId) => {
    const todayStr = new Date().toISOString();
    const appt = appointments?.find(a => a._id === apptId) || { _id: apptId, patientName: "Patient" };

    try {
      const res = await fetch(`/api/appointments?id=${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: apptId,
          billPaid: true,
          status: 'Completed',
          paymentStatus: 'Paid', 
          paymentMethod: 'Cash',
          paymentDate: todayStr
        })
      });

      if (res.ok) {
        const invoicePayload = {
          appointmentId: appt._id,
          patientName: appt.patientName,
          ...(appt.patientId ? { patientId: appt.patientId } : {}),
          status: "Paid",
          method: "Cash"
        };

        const existingInvoice = invoices.find(inv => 
          inv.appointmentId === appt._id || 
          inv.appointmentId?._id === appt._id ||
          (appt.invoiceId && (inv._id === appt.invoiceId || inv.id === appt.invoiceId))
        );

        let invoiceRes;
        if (existingInvoice) {
          invoiceRes = await fetch(`/api/billing/${existingInvoice._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: "Paid", 
              method: "Cash"
            })
          });

          if (!invoiceRes.ok) {
            invoiceRes = await fetch('/api/billing', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                id: existingInvoice._id,
                appointmentId: appt._id,
                status: "Paid", 
                method: "Cash"
              })
            });
          }
        }

        if (!invoiceRes || !invoiceRes.ok) {
          invoiceRes = await fetch('/api/billing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoicePayload)
          });
        }

        if (invoiceRes.ok) {
          const savedInvoice = await invoiceRes.json();
          setInvoices(prev => {
            const filtered = prev.filter(inv => inv._id !== savedInvoice._id);
            return [savedInvoice, ...filtered];
          });
        }

        setAppointments(prev => prev.map(a => 
          a._id === apptId ? { ...a, status: 'Completed', billPaid: true, paymentStatus: 'Paid', paymentMethod: 'Cash', paymentDate: todayStr } : a
        ));
        setCustomAlert({ isOpen: true, message: "Cash Payment processed successfully!" });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setCustomAlert({ isOpen: true, message: `Failed to update backend: ${errorData.message || res.statusText || 'Unknown Error'}` });
      }
    } catch (err) {
      console.error("Error processing payment:", err);
      setCustomAlert({ isOpen: true, message: `Error connection failed: ${err.message || err}` });
    }
  };

  const handleSendReminder = (inv) => {
    try {
      const existing = JSON.parse(localStorage.getItem('patient_notifications') || '[]');
      const newNotif = {
        id: `NOTIF-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        patientName: inv.patient,
        invoiceId: inv.id,
        amount: inv.amount,
        message: `Outstanding Payment Alert: Bill ${inv.id} totaling ${inv.amount} requires your attention. Please settle at the nearest billing counter.`,
        timestamp: new Date().toISOString(),
        unread: true
      };
      existing.unshift(newNotif);
      localStorage.setItem('patient_notifications', JSON.stringify(existing));
      setCustomAlert({ isOpen: true, message: `Reminder sent to ${inv.patient} for invoice ${inv.id}` });
    } catch (err) {
      console.error("Failed to store notification:", err);
    }
  };

  const handleSendAllReminders = () => {
    if (pendingInvoices.length === 0) {
      setCustomAlert({ isOpen: true, message: "No pending invoices found to send reminders." });
      return;
    }
    try {
      const existing = JSON.parse(localStorage.getItem('patient_notifications') || '[]');
      const newNotifs = pendingInvoices.map((inv, idx) => ({
        id: `NOTIF-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        patientName: inv.patient,
        invoiceId: inv.id,
        amount: inv.amount,
        message: `Outstanding Payment Alert: Bill ${inv.id} totaling ${inv.amount} requires your attention. Please settle at the nearest billing counter.`,
        timestamp: new Date().toISOString(),
        unread: true
      }));
      localStorage.setItem('patient_notifications', JSON.stringify([...newNotifs, ...existing]));
      setCustomAlert({ isOpen: true, message: `Broadcast reminders sent successfully for ${pendingInvoices.length} outstanding invoices!` });
    } catch (err) {
      console.error("Failed to broadcast notifications:", err);
    }
  };

  const completedAppointments = appointments.filter(appt => appt.status === 'Bill Pending' || appt.status === 'Completed');

  const pendingInvoices = completedAppointments
    .filter(appt => {
      const dbInvoice = invoices.find(inv => inv.appointmentId === appt._id || inv.appointmentId?._id === appt._id);
      if (!dbInvoice) return false; 
      return dbInvoice.status !== 'Paid';
    })
    .map((appt) => {
      const dbInvoice = invoices.find(inv => inv.appointmentId === appt._id || inv.appointmentId?._id === appt._id);
      const totalCost = dbInvoice ? (dbInvoice.totalAmount || 0) : 0;
      return {
        id: appt.invoiceId || `INV-${appt._id?.toString().slice(-4).toUpperCase() || '5502'}`,
        patient: appt.patientName || appt.patient || "Unknown Patient",
        amount: `PKR ${totalCost.toLocaleString()}`,
        dueDate: formatDate(appt.dueDate || appt.date),
        _originalAppt: appt
      };
    })
    .filter((inv) => {
      return inv.patient.toLowerCase().includes(searchQuery.toLowerCase()) || 
             inv.id.toLowerCase().includes(searchQuery.toLowerCase());
    });

  return (
    <div className="flex min-h-screen bg-slate-50">
      <title>Pending Bills - MMGC</title>
      <BillingStaffSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 w-full flex flex-col">
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10 py-6 top-0 z-40 flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
              >
                <Menu size={20} />
              </button>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Pending Invoices</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage outstanding patient balances.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search invoice or patient..." 
                  className="pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px] mx-auto w-full space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800">Unpaid Bills ({pendingInvoices.length})</h3>
            
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="md:hidden relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  maxLength={30}
                  placeholder="Search invoice or patient..." 
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSendAllReminders}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold text-white bg-[#357DF9] rounded-lg hover:bg-blue-600 transition-all shadow-md shadow-blue-100 flex items-center justify-center gap-2"
              >
                <Bell size={14} /> Send Reminders
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {pendingInvoices.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No outstanding bills found matching query criteria.</p>
            ) : (
              pendingInvoices.map((inv) => (
                <div key={inv.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inv.id}</span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{inv.patient}</h3>
                  <div className="flex items-center text-sm text-slate-500 gap-4 mb-4">
                    <span className="flex items-center gap-1"><CreditCard size={14} /> {inv.amount}</span>
                    <span className="flex items-center gap-1"><Calendar size={14} /> {inv.dueDate}</span>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-50">
                    <button 
                      onClick={() => handleProcessPayment(inv._originalAppt._id)}
                      className="flex-1 bg-[#357DF9] text-white py-2 rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                    >
                      Process Cash Payment
                    </button>
                    <button 
                      onClick={() => handleSendReminder(inv)}
                      className="flex-1 bg-slate-50 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Send Reminder
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-widest font-black">
                  <tr>
                    <th className="px-8 py-4">Invoice ID</th>
                    <th className="px-8 py-4">Patient Name</th>
                    <th className="px-8 py-4">Amount Due</th>
                    <th className="px-8 py-4 ">{`Due Date`}</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingInvoices.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-8 py-10 text-center text-slate-400 text-sm font-semibold">
                        No matching outstanding invoices found.
                      </td>
                    </tr>
                  ) : (
                    pendingInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5 text-sm font-bold text-slate-700">{inv.id}</td>
                        <td className="px-8 py-5 text-sm text-slate-600 font-bold group-hover:text-[#357DF9] transition-colors">{inv.patient}</td>
                        <td className="px-8 py-5 text-sm text-slate-500 font-black tracking-tight">{inv.amount}</td>
                        <td className="px-8 py-5 text-sm text-slate-400">{inv.dueDate}</td>
                        <td className="px-8 py-5">
                          <div className="flex justify-end gap-6">
                            <button 
                              onClick={() => handleProcessPayment(inv._originalAppt._id)}
                              className="text-[#357DF9] font-black text-xs uppercase hover:underline"
                            >
                              Process Cash
                            </button>
                            <button 
                              onClick={() => handleSendReminder(inv)}
                              className="text-slate-400 font-black text-xs uppercase hover:text-slate-600 transition-colors"
                            >
                              Remind
                            </button>
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

      {/* Custom UI Matching Alert Modal */}
      {customAlert.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 transform transition-all scale-100 animate-in zoom-in-95 duration-150">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#357DF9]">
              <Bell size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Billing System Update</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line px-2">{customAlert.message}</p>
            <button
              onClick={() => setCustomAlert({ isOpen: false, message: '' })}
              className="w-full py-2.5 bg-[#357DF9] text-white rounded-xl text-sm font-bold hover:bg-blue-600 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-md shadow-blue-100"
            >
              OK (Press Enter)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}