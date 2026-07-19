"use client";

import React, { useState, useEffect } from 'react';
import PatientSidebar from '@/components/PatientSidebar';
import { Menu } from 'lucide-react';

const InvoicesPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [wards, setWards] = useState([]);
    const [appointments, setAppointments] = useState([]);
    
    // Patient Identity Context States
    const [userEmail, setUserEmail] = useState("");
    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
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
        fetchInvoices();
        fetchWards();
        fetchAppointments();
    }, []);

    // Retrieve active patient session email and profile data securely
    useEffect(() => {
        const email = sessionStorage.getItem('userEmail');
        if (email) {
            setUserEmail(email);
            async function fetchCurrentUser() {
                try {
                    const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setCurrentUser(data);
                    }
                } catch (err) {
                    console.error("Failed to fetch current user profile:", err);
                }
            }
            fetchCurrentUser();
        }
    }, []);

    // Filter invoices to match only the current patient context
    const filteredInvoices = invoices.filter(inv => {
        if (!userEmail) return false; // Prevent any layout flash showing other records before mount

        const matchingAppt = appointments.find(appt => 
            appt._id?.toString() === (inv.appointmentId?._id || inv.appointmentId)?.toString()
        );

        // 1. Match against the referenced appointment's patientEmail
        if (matchingAppt?.patientEmail && matchingAppt.patientEmail.toLowerCase() === userEmail.toLowerCase()) {
            return true;
        }

        // 2. Match against direct invoice patient ID
        const invPatientId = inv.patientId?._id || inv.patientId;
        if (currentUser && invPatientId && invPatientId.toString() === currentUser._id?.toString()) {
            return true;
        }

        // 3. Match against direct invoice email variables
        if (inv.patientEmail && inv.patientEmail.toLowerCase() === userEmail.toLowerCase()) {
            return true;
        }
        if (inv.email && inv.email.toLowerCase() === userEmail.toLowerCase()) {
            return true;
        }

        // 4. Match against nested populated appointment object parameters
        if (inv.appointmentId && typeof inv.appointmentId === 'object') {
            if (inv.appointmentId.patientEmail && inv.appointmentId.patientEmail.toLowerCase() === userEmail.toLowerCase()) {
                return true;
            }
            if (inv.appointmentId.email && inv.appointmentId.email.toLowerCase() === userEmail.toLowerCase()) {
                return true;
            }
        }

        // 5. Fallback check against matching names
        if (currentUser?.name && inv.patientName && inv.patientName.toLowerCase() === currentUser.name.toLowerCase()) {
            return true;
        }

        return false;
    });

    // Handle Enter and Escape key controls when the modal is active
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (selectedInvoice) {
                if (e.key === 'Enter' || e.key === 'Escape') {
                    e.preventDefault();
                    setSelectedInvoice(null);
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedInvoice]);

    const formatDate = (dateStr) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const totalOutstanding = filteredInvoices
        .filter(inv => inv.status !== 'Paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const totalPaid = filteredInvoices
        .filter(inv => inv.status === 'Paid')
        .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

    const paidInvoices = filteredInvoices.filter(inv => inv.status === 'Paid');
    const sortedPaidInvoices = [...paidInvoices].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastPayment = sortedPaidInvoices.length > 0 ? sortedPaidInvoices[0].totalAmount : 0;

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            
                        <title>Invoices - MMGC</title>
            {/* Sidebar Navigation */}
            <PatientSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Main Content - ml-64 removed */}
            <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
                <div className="max-w-5xl mx-auto">
                    
                    {/* Header with Mobile Toggle */}
                    <div className="mb-12 flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">Invoices & Billing</h1>
                            <p className="text-slate-500 text-base md:text-lg">Manage your payments and medical receipts.</p>
                        </div>
                    </div>

                    {/* Stats Grid - Now stackable on small screens */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Outstanding</p>
                            <p className="text-2xl md:text-3xl font-bold text-red-500">PKR {totalOutstanding.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Paid</p>
                            <p className="text-2xl md:text-3xl font-bold text-green-500">PKR {totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="bg-white border border-slate-200 p-6 rounded-[24px] shadow-sm sm:col-span-2 md:col-span-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Last Payment</p>
                            <p className="text-2xl md:text-3xl font-bold text-slate-900">PKR {lastPayment.toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Table Container - Scrollable on mobile */}
                    <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-6 text-sm font-semibold text-slate-600">Invoice ID</th>
                                        <th className="p-6 text-sm font-semibold text-slate-600">Service</th>
                                        <th className="p-6 text-sm font-semibold text-slate-600">Date</th>
                                        <th className="p-6 text-sm font-semibold text-slate-600">Amount</th>
                                        <th className="p-6 text-sm font-semibold text-slate-600">Status</th>
                                        <th className="p-6 text-sm font-semibold text-slate-600 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredInvoices.map((inv) => {
                                        const invId = inv.invoiceId || `INV-${(inv.appointmentId?._id || inv.appointmentId || inv._id)?.toString().slice(-4).toUpperCase() || '5501'}`;
                                        const serviceName = inv.items && inv.items.length > 0 ? inv.items[0].description : "Medical Services";
                                        const doctorName = inv.doctorName || "";
                                        const displayDate = formatDate(inv.date);
                                        const displayAmount = `PKR ${(inv.totalAmount || 0).toLocaleString()}`;
                                        const displayStatus = inv.status || "Pending";

                                        return (
                                            <tr key={inv._id || invId} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-6 text-sm font-bold text-slate-900">{invId}</td>
                                                <td className="p-6">
                                                    <div className="font-bold text-slate-900">{serviceName}</div>
                                                    <div className="text-xs text-slate-500">{doctorName}</div>
                                                </td>
                                                <td className="p-6 text-slate-600 text-sm font-medium">{displayDate}</td>
                                                <td className="p-6 text-slate-900 font-bold">{displayAmount}</td>
                                                <td className="p-6">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                        displayStatus === 'Paid' 
                                                        ? 'bg-green-50 text-green-600 border-green-100' 
                                                        : 'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {displayStatus}
                                                    </span>
                                                </td>
                                                <td className="p-6 text-right">
                                                    <button
                                                        onClick={() => setSelectedInvoice(inv)}
                                                        className="text-[#357DF9] font-bold text-xs uppercase hover:underline"
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* View Details Modal Windows */}
            {selectedInvoice && (() => {
                const dbInvoice = selectedInvoice;
                const matchingAppt = appointments.find(appt => 
                    appt._id?.toString() === (dbInvoice.appointmentId?._id || dbInvoice.appointmentId)?.toString()
                );

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

                const invId = dbInvoice.invoiceId || `INV-${(dbInvoice.appointmentId?._id || dbInvoice.appointmentId || dbInvoice._id)?.toString().slice(-4).toUpperCase() || '5501'}`;
                
                const statusStyles = {
                    Paid: "bg-emerald-50 text-emerald-700 border-emerald-100",
                    Pending: "bg-amber-50 text-amber-700 border-amber-100",
                };

                const doctorName = dbInvoice.doctorName || (dbInvoice.items?.find(item => item.description.includes("Consultation Fee"))?.description.replace("Consultation Fee - ", "")) || "Hospital Staff";

                return (
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Invoice Details</span>
                                    <h3 className="font-black text-slate-800 text-lg">{invId}</h3>
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
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Patient Information</p>
                                    <p className="font-bold text-slate-800 text-base">{dbInvoice.patientName || "Unknown Patient"}</p>
                                    <p className="text-slate-500 text-xs">{matchingAppt?.patientEmail || matchingAppt?.email || dbInvoice.patientEmail || dbInvoice.email || dbInvoice.appointmentId?.patientEmail || dbInvoice.appointmentId?.email || dbInvoice.patientId?.email || "No Email Provided"}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2 border-y border-slate-100">
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Doctor & Specialty</p>
                                        <p className="font-semibold text-slate-700 text-xs">{doctorName}</p>
                                        <p className="text-slate-500 text-[10px]">{dbInvoice.specialty || "General Medicine"}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Date & Time</p>
                                        <p className="font-semibold text-slate-700 text-xs">{formatDate(dbInvoice.date)}</p>
                                        <p className="text-slate-500 text-[10px]">{matchingAppt?.time || dbInvoice.time || dbInvoice.appointmentId?.time || "N/A"}</p>
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

                                    {(dbInvoice.status === 'Admitted' || dbInvoice.admissionRequired || Number(dbInvoice.admissionDetails?.admissionDays || dbInvoice.admissionDays) > 0) && (() => {
                                        const wardName = dbInvoice.admissionDetails?.wardName || dbInvoice.wardName || "N/A";
                                        const matchedWard = wards.find(w => w.name?.toLowerCase() === wardName.toLowerCase());
                                        const wAdmissionFee = matchedWard ? (matchedWard.admissionFee || 0) : 0;
                                        const wOvernightFee = matchedWard ? (matchedWard.overnightFee || 0) : 2500;
                                        return (
                                            <>
                                                <div className="flex justify-between text-xs text-slate-600 border-t border-slate-100 pt-1 mt-1">
                                                    <span>Total Admission Days</span>
                                                    <span className="font-bold text-slate-700">
                                                        {(dbInvoice.status === 'Admitted' || dbInvoice.admissionRequired || Number(dbInvoice.admissionDetails?.admissionDays || dbInvoice.admissionDays) > 0) ? (Number(dbInvoice.admissionDetails?.admissionDays || dbInvoice.admissionDays) || 1) : 0} Day(s)
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
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${statusStyles[dbInvoice.status] || statusStyles.Pending}`}>
                                        {dbInvoice.status || "Pending"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
                                <button
                                    onClick={() => setSelectedInvoice(null)}
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
};

export default InvoicesPage;