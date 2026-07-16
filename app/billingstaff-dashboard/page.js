"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import BillingStaffSidebar from '@/components/BillingStaffSidebar';
import {
  Menu,
  TrendingUp,
  BanknoteCheck,
  FileText,
  Wallet,
} from 'lucide-react';

export default function BillingOverviewPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [wards, setWards] = useState([]);

  // ✅ BILL CALCULATION REDIRECTED TO THE BACKEND
  function calculateAppointmentAmount(appt) {
    const dbInvoice = invoices.find(inv => inv.appointmentId === appt._id);
    return dbInvoice ? Number(dbInvoice.totalAmount) : 0;
  }

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
          if (Array.isArray(data)) {
            const uniqueInvoices = data.filter((inv, index, self) =>
              self.findIndex(i => i.appointmentId === inv.appointmentId) === index
            );
            setInvoices(uniqueInvoices);
          } else {
            setInvoices([]);
          }
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

  // Automatically save calculated dashboard invoices to the database if they don't exist
  useEffect(() => {
    if (appointments.length === 0 || labTests.length === 0) return;

    async function syncAndValidateInvoices() {
      const completedAppts = appointments.filter(appt => appt.status === 'Bill Pending' || appt.status === 'Completed' || appt.status === 'Paid' || appt.status === 'paid');

      for (const appt of completedAppts) {
        const existingInvoice = invoices.find(inv => inv.appointmentId === appt._id);

        if (!existingInvoice) {
          const newInvoiceData = {
            appointmentId: appt._id,
            patientId: appt.patientId,
            patientName: appt.patientName,
            items: [], // Left empty: Backend API handles full line-item calculations dynamically
            totalAmount: 0, // Left at 0: Backend API overwrites this with precise calculation
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
                if (prev.some(inv => inv.appointmentId === createdInvoice.appointmentId)) {
                  return prev;
                }
                return [...prev, createdInvoice];
              });
              console.log(`Invoice created for appointment ${appt._id}`);
            }
          } catch (err) {
            console.error("Auto-save failed:", err);
          }
        }
      }
    }

    syncAndValidateInvoices();
  }, [appointments.length, invoices.length, labTests, wards]);

  // Handle Enter and Escape key controls when the modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedAppt) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          setSelectedAppt(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedAppt]);

  const formatDate = (dateStr) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const completedAppointments = appointments.filter(appt => appt.status === 'Bill Pending' || appt.status === 'Completed' || appt.status === 'Paid' || appt.status === 'paid');

  const recentInvoices = completedAppointments
    .filter(appt => invoices.some(inv => inv.appointmentId === appt._id))
    .map((appt) => {
      const totalCost = calculateAppointmentAmount(appt);
      const dbInvoice = invoices.find(inv => inv.appointmentId === appt._id);
      return {
        id: dbInvoice?.invoiceId || appt.invoiceId || `INV-${appt._id?.toString().slice(-4).toUpperCase() || '5501'}`,
        patient: appt.patientName || appt.patient || "Unknown Patient",
        amount: `PKR ${totalCost.toLocaleString()}`,
        status: dbInvoice?.status || appt.paymentStatus || "Pending",
        date: formatDate(appt.date),
        _originalAppt: appt
      };
    });

  const pendingInvoices = completedAppointments
    .filter(appt => {
      const dbInvoice = invoices.find(inv => inv.appointmentId === appt._id);
      if (!dbInvoice) return false;
      return dbInvoice.status !== 'Paid' && dbInvoice.status !== 'paid';
    })
    .map((appt) => {
      const totalCost = calculateAppointmentAmount(appt);
      return {
        id: appt.invoiceId || `INV-${appt._id?.toString().slice(-4).toUpperCase() || '5502'}`,
        patient: appt.patientName || appt.patient || "Unknown Patient",
        amount: `PKR ${totalCost.toLocaleString()}`,
        dueDate: formatDate(appt.dueDate || appt.date),
        _originalAppt: appt
      };
    });

  const totalRevenueValue = invoices
    .filter(inv => inv.status === 'Paid' || inv.status === 'paid')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalRevenue = `PKR ${totalRevenueValue.toLocaleString()}`;

  const pendingInvoicesCountStr = `${pendingInvoices.length} Bill${pendingInvoices.length === 1 ? '' : 's'}`;

  const todayFormatted = formatDate(new Date().toISOString().split('T')[0]);
  const todayCollectionsValue = invoices
    .filter(inv => (inv.status === 'Paid' || inv.status === 'paid') && formatDate(inv.date) === todayFormatted)
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const todayCollections = `PKR ${todayCollectionsValue.toLocaleString()}`;

  const statusStyles = {
    Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Pending: "bg-amber-50 text-amber-700 border-amber-100",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
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
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">Billing Overview</h1>
                <p className="text-slate-500 text-xs sm:text-sm mt-1">Manage accounts and records.</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-10 max-w-[1400px] mx-auto w-full space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard label="Total Revenue" val={totalRevenue} icon={<TrendingUp className="text-emerald-500" />} border="border-emerald-500" />
            <StatCard label="Pending Invoices" val={pendingInvoicesCountStr} icon={<BanknoteCheck className="text-amber-500" />} border="border-amber-500" />
            <StatCard label="Today's Collections (Cash)" val={todayCollections} icon={<Wallet className="text-blue-500" />} border="border-blue-500" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {recentInvoices.map((inv) => (
              <div key={inv.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{inv.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${statusStyles[inv.status] || statusStyles.Pending}`}>
                    {inv.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{inv.patient}</h3>
                <div className="flex justify-between items-end mt-4">
                  <p className="text-lg font-black text-slate-700">{inv.amount}</p>
                  <button
                    onClick={() => {
                      const dbInv = invoices.find(i => i.appointmentId === inv._originalAppt._id);
                      setSelectedAppt({
                        ...inv._originalAppt,
                        paymentStatus: dbInv ? dbInv.status : inv._originalAppt.paymentStatus
                      });
                    }}
                    className="text-xs font-bold text-[#357DF9] flex items-center gap-1"
                  >
                    <FileText size={14} /> Details
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-lg">Recent Transactions</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-wider font-black">
                  <tr>
                    <th className="px-8 py-4">Invoice ID</th>
                    <th className="px-8 py-4">Patient</th>
                    <th className="px-8 py-4">Amount</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5 text-sm font-bold text-slate-700">{inv.id}</td>
                      <td className="px-8 py-5 text-sm text-slate-600 font-bold group-hover:text-[#357DF9] transition-colors">{inv.patient}</td>
                      <td className="px-8 py-5 text-sm text-slate-500 font-semibold">{inv.amount}</td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${statusStyles[inv.status] || statusStyles.Pending}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button
                          onClick={() => {
                            const dbInv = invoices.find(i => i.appointmentId === inv._originalAppt._id);
                            setSelectedAppt({
                              ...inv._originalAppt,
                              paymentStatus: dbInv ? dbInv.status : inv._originalAppt.paymentStatus
                            });
                          }}
                          className="text-[#357DF9] font-black text-xs uppercase hover:underline"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {selectedAppt && (() => {
        const dbInvoice = invoices.find(inv => inv.appointmentId === selectedAppt._id);

        const extractedLabTests = (() => {
          if (!dbInvoice || !dbInvoice.items) return [];
          return dbInvoice.items
            .filter(item => item.description.includes("Laboratory Diagnostics"))
            .map(item => ({
              name: item.description.replace("Laboratory Diagnostics - ", ""),
              cost: item.cost
            }));
        })();

        const breakdown = (() => {
          if (!dbInvoice || !dbInvoice.items) return { doctorFee: 0, labFee: 0, admissionFee: 0, total: 0 };

          const doctorFeeItem = dbInvoice.items.find(item =>
            item.description.includes("Consultation Fee") ||
            item.description.includes("Medical Services")
          );
          const doctorFee = doctorFeeItem ? doctorFeeItem.cost : 0;
          const labFee = extractedLabTests.reduce((sum, t) => sum + t.cost, 0);

          const admissionFeeItem = dbInvoice.items.find(item => item.description.includes("Ward Admission Charges"));
          const admissionFee = admissionFeeItem ? admissionFeeItem.cost : 0;

          return {
            doctorFee,
            labFee,
            admissionFee,
            total: dbInvoice.totalAmount || 0
          };
        })();

        const invId = selectedAppt.invoiceId || `INV-${selectedAppt._id?.toString().slice(-4).toUpperCase() || '5501'}`;

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Details</span>
                  <h3 className="font-black text-slate-800 text-lg">{invId}</h3>
                </div>
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="text-slate-400 hover:text-slate-600 bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Patient Information</p>
                  <p className="font-bold text-slate-800 text-base">{selectedAppt.patientName || "Unknown Patient"}</p>
                  <p className="text-slate-500 text-xs">{selectedAppt.patientEmail || "No Email Provided"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Doctor & Specialty</p>
                    <p className="font-semibold text-slate-700 text-xs">{selectedAppt.doctorName || "N/A"}</p>
                    <p className="text-slate-500 text-[10px]">{selectedAppt.specialty || "General Medicine"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Date & Time</p>
                    <p className="font-semibold text-slate-700 text-xs">{formatDate(selectedAppt.date)}</p>
                    <p className="text-slate-500 text-[10px]">{selectedAppt.time || "N/A"}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Cost Breakdown</p>

                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Consultation Fee</span>
                    <span className="font-medium">PKR {breakdown.doctorFee.toLocaleString()}</span>
                  </div>

                  {extractedLabTests.map((test, index) => (
                    <div key={index} className="flex justify-between text-xs text-slate-600 border-l-2 border-slate-200 pl-2 ml-1">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-700">{test.name}</span>
                      </div>
                      <span className="font-medium">PKR {test.cost.toLocaleString()}</span>
                    </div>
                  ))}

                  {(selectedAppt.status === 'Admitted' || selectedAppt.admissionRequired || Number(selectedAppt.admissionDetails?.admissionDays || selectedAppt.admissionDays) > 0) && (() => {
                    const wardName = selectedAppt.admissionDetails?.wardName || selectedAppt.wardName || "N/A";
                    const matchedWard = wards.find(w => w.name?.toLowerCase() === wardName.toLowerCase());
                    const wAdmissionFee = matchedWard ? (matchedWard.admissionFee || 0) : 0;
                    const wOvernightFee = matchedWard ? (matchedWard.overnightFee || 0) : 2500;
                    return (
                      <>

                        <div className="flex justify-between text-xs text-slate-600 border-t border-slate-100 pt-1 mt-1">
                          <span>Total Admission Days</span>
                          <span className="font-bold text-slate-700">
                            {(selectedAppt.status === 'Admitted' || selectedAppt.admissionRequired || Number(selectedAppt.admissionDetails?.admissionDays || selectedAppt.admissionDays) > 0) ? (Number(selectedAppt.admissionDetails?.admissionDays || selectedAppt.admissionDays) || 1) : 0} Day(s)
                          </span>
                        </div>

                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Ward Name</span>
                          <span className="font-medium text-slate-700">{wardName}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Ward Admission Fee</span>
                          <span className="font-medium text-slate-700">PKR {wAdmissionFee.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Ward Daily Fee</span>
                          <span className="font-medium text-slate-700">PKR {wOvernightFee.toLocaleString()} / day</span>
                        </div>
                      </>
                    );
                  })()}

                  {breakdown.admissionFee > 0 && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Total Ward Charges</span>
                      <span className="font-medium">PKR {breakdown.admissionFee.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between pt-3 border-t border-dashed border-slate-200 text-sm font-black text-slate-800">
                    <span>Total Bill</span>
                    <span className="text-[#357DF9]">PKR {breakdown.total.toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Payment Status</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusStyles[selectedAppt.paymentStatus] || statusStyles.Pending}`}>
                    {selectedAppt.paymentStatus || "Pending"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => setSelectedAppt(null)}
                  className="w-full bg-white text-slate-600 border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors"
                >
                  Close Window
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

const StatCard = ({ label, val, icon, border }) => (
  <div className={`bg-white p-6 rounded-2xl border-l-4 ${border} shadow-sm border border-slate-200 flex justify-between items-start`}>
    <div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-black text-slate-800 mt-2">{val}</p>
    </div>
    <div className="p-2 bg-slate-50 rounded-lg">{icon}</div>
  </div>
);