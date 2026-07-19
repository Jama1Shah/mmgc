'use client'
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PatientSidebar from '@/components/PatientSidebar';
import { Menu, Activity, Heart, HeartPulse, ChevronRight, X, FileText, Beaker, Calendar, CircleGauge, Thermometer, ExternalLink, Bubbles, Bell, CreditCard, LogOut } from 'lucide-react';

function HealthCard({ label, title, sub, icon, titleColor = "text-slate-900" }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start hover:shadow-md transition-shadow">
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{label}</p>
                <h3 className={`text-xl font-black mt-2 ${titleColor}`}>{title}</h3>
                <p className="text-slate-500 text-xs font-bold mt-1">{sub}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                {icon}
            </div>
        </div>
    );
}

function PatientNotificationBell({ patientName }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const syncNotifications = () => {
        try {
            const saved = localStorage.getItem('patient_notifications');
            if (saved) {
                const allNotifs = JSON.parse(saved);
                const filtered = allNotifs.filter(n => n.patientName === patientName);
                setNotifications(filtered);
            }
        } catch (err) {
            console.error("Failed to read notification buffers:", err);
        }
    };

    useEffect(() => {
        syncNotifications();
        window.addEventListener('storage', syncNotifications);
        window.addEventListener('focus', syncNotifications);
        
        const pollInterval = setInterval(syncNotifications, 2500);

        return () => {
            window.removeEventListener('storage', syncNotifications);
            window.removeEventListener('focus', syncNotifications);
            clearInterval(pollInterval);
        };
    }, [patientName]);

    const unreadCount = notifications.filter(n => n.unread).length;

    const handleMarkAsRead = (id) => {
        try {
            const saved = localStorage.getItem('patient_notifications');
            if (saved) {
                const allNotifs = JSON.parse(saved);
                const updated = allNotifs.map(n => n.id === id ? { ...n, unread: false } : n);
                localStorage.setItem('patient_notifications', JSON.stringify(updated));
                setNotifications(updated.filter(n => n.patientName === patientName));
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const handleClearAll = () => {
        try {
            const saved = localStorage.getItem('patient_notifications');
            if (saved) {
                const allNotifs = JSON.parse(saved);
                const updated = allNotifs.filter(n => n.patientName !== patientName);
                localStorage.setItem('patient_notifications', JSON.stringify(updated));
                setNotifications([]);
            }
        } catch (err) {
            console.error("Failed to clear notifications:", err);
        }
    };

    return (
        <div className="relative z-50">
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all focus:outline-none"
            >
                <Bell size={20} className={unreadCount > 0 ? "animate-pulse text-[#357DF9]" : ""} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden transform origin-top-right transition-all">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <div>
                            <h4 className="font-bold text-slate-800 text-sm">Notifications</h4>
                            <p className="text-slate-400 text-xs mt-0.5">{unreadCount} unread balance alerts</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {notifications.length > 0 && (
                                <button 
                                    onClick={handleClearAll} 
                                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold uppercase tracking-wider"
                                >
                                    Clear All
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className="divide-y divide-slate-50 max-h-[350px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-medium">
                                <Bell size={24} className="mx-auto mb-2 text-slate-300 stroke-1" />
                                No notification alerts found.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id} 
                                    onClick={() => {
                                        handleMarkAsRead(notif.id);
                                        setIsOpen(false);
                                        router.push('/patient-dashboard/invoices');
                                    }}
                                    className={`p-4 transition-colors cursor-pointer text-left relative ${notif.unread ? 'bg-blue-50/30 hover:bg-blue-50/50' : 'hover:bg-slate-50'}`}
                                >
                                    {notif.unread && (
                                        <span className="absolute left-2 top-5 w-1.5 h-1.5 bg-[#357DF9] rounded-full"></span>
                                    )}
                                    <div className="pl-2">
                                        <div className="flex justify-between items-start gap-2 mb-1">
                                            <span className="text-[9px] font-black tracking-wide text-[#357DF9] uppercase bg-blue-50 px-2 py-0.5 rounded">
                                                Billing Alert
                                            </span>
                                            <span className="text-[10px] text-slate-400">
                                                {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-slate-800 mb-0.5">{notif.patientName}</p>
                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">{notif.message}</p>
                                        <div className="mt-2 flex items-center text-[10px] font-bold text-slate-700">
                                            <CreditCard size={12} className="mr-1 text-slate-400" /> Total Cost: {notif.amount}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function PatientDashboard() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [selectedVisit, setSelectedVisit] = useState(null); 
    const [upcomingAppt, setUpcomingAppt] = useState(null);
    const [allVisits, setAllVisits] = useState([]); 
    const [loadingVisits, setLoadingVisits] = useState(true);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        document.title = "Dashboard - MMGC";
    }, []);
    
    const extractClinicalIntent = useCallback((reasonStr = '') => {
        const labsMatch = reasonStr.match(/Requested Labs:\s*([\s\S]*?)(?=(?:\.?\s*Urgency:)|$)/i);
        const urgencyMatch = reasonStr.match(/Urgency:\s*(\w+)/i);

        let extractedTest = labsMatch ? labsMatch[1].trim() : "";
        extractedTest = extractedTest.replace(/[.,\s]+$/, ""); 
        
        return {
            testNames: extractedTest || null,
            urgency: urgencyMatch ? urgencyMatch[1].trim() : "Routine"
        };
    }, []);

    const fetchPrescriptions = useCallback(async (patientEmail) => {
        try {
            setLoadingVisits(true);
            const res = await fetch(`/api/prescriptions?patientEmail=${encodeURIComponent(patientEmail)}`);
            if (res.ok) {
                const data = await res.json();
                const formattedVisits = data.map((presc) => {
                    const attachedAppt = presc.appointmentId && typeof presc.appointmentId === 'object' ? presc.appointmentId : null;
                    const fallbackIntent = extractClinicalIntent(attachedAppt?.reason || '');
                    
                    return {
                        id: presc._id,
                        doc: presc.doctorName,
                        service: "Medical Checkup & Prescription", 
                        date: presc.appointmentDate || presc.dateIssued,
                        time: presc.appointmentTime || "N/A",
                        status: attachedAppt?.status || "Completed",
                        notes: presc.medicationDetails,
                        dischargeMedication: presc.dischargeMedication || null,
                        dischargedAt: presc.dischargedAt || null,
                        updatedAt: presc.updatedAt || attachedAppt?.updatedAt || null,
                        labPrescription: presc.labPrescription || attachedAppt?.labPrescription || presc.labTestName || attachedAppt?.labTestName || fallbackIntent.testNames || null,
                        labReason: presc.labReason || attachedAppt?.labReason || null,
                        labNotes: presc.labNotes || attachedAppt?.labNotes || null,
                        labFileUrl: presc.labFileUrl || attachedAppt?.labFileUrl || null,
                        labStatus: presc.labStatus || attachedAppt?.labStatus || "Pending",
                        urgency: fallbackIntent.urgency || "Routine",
                        vitals: presc.vitals || null,
                        vitalsChecked: presc.vitalsChecked || false
                    };
                });

                setAllVisits(formattedVisits.sort((a, b) => new Date(b.date + ' ' + (b.time === 'N/A' ? '00:00' : b.time)) - new Date(a.date + ' ' + (a.time === 'N/A' ? '00:00' : a.time))));
            }
        } catch (error) {
            console.error("Prescriptions fetch error:", error);
        } finally {
            setLoadingVisits(false);
        }
    }, [extractClinicalIntent]);

    const fetchAppointments = useCallback(async (email) => {
        try {
            const res = await fetch(`/api/appointments?patientEmail=${encodeURIComponent(email)}&includeCompletedLabs=true`);
            if (res.ok) {
                const data = await res.json();
                
                const upcoming = data.find(appt => 
                    ['Scheduled', 'Pending', 'Accepted for Checkup', 'Rescheduled'].includes(appt.status)
                );
                if (upcoming) {
                    setUpcomingAppt(upcoming);
                }
            }
        } catch (error) {
            console.error("Appointments fetch error:", error);
        }
    }, []);

    useEffect(() => {
        const email = sessionStorage.getItem('userEmail');
        if (!email) {
            console.error("No email found in storage");
            setLoadingVisits(false);
            return;
        }

        let componentActive = true;

        async function initializeDashboard() {
            try {
                await fetchAppointments(email);
                await fetchPrescriptions(email);

                const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
                if (res.ok && componentActive) {
                    const data = await res.json();
                    if (data?.name) {
                        setUserName(data.name);
                    }
                }
            } catch (error) {
                console.error("Database initialization error:", error);
            }
        }

        initializeDashboard();

        return () => {
            componentActive = false;
        };
    }, [fetchAppointments, fetchPrescriptions]);

    let textLogsArray = [];
    let attachmentUrlsArray = [];

    if (selectedVisit && selectedVisit.labNotes && String(selectedVisit.labNotes).startsWith('[')) {
        try { textLogsArray = JSON.parse(selectedVisit.labNotes); } catch(e){}
    }
    if (selectedVisit && selectedVisit.labFileUrl && String(selectedVisit.labFileUrl).startsWith('[')) {
        try { attachmentUrlsArray = JSON.parse(selectedVisit.labFileUrl); } catch(e){}
    }

    // Dynamic Clinical Vitals Engine Analysis Pipeline
    const latestVitalsVisit = allVisits.find(v => v.vitalsChecked && v.vitals);
    const currentVitals = latestVitalsVisit?.vitals || { hr: '--', temp: '--', spo2: '--', bp: '--' };
    const hasVitals = !!latestVitalsVisit;

    let healthStatus = { title: "Stable", sub: "Last update: 2h ago", color: "text-emerald-600" };
    let bpSub = "Normal Range";
    let hrSub = "Normal Range";
    let tempSub = "Normal Range";
    let spo2Sub = "Normal Range";

    if (!hasVitals) {
        healthStatus = { title: "Unknown", sub: "No clinical metrics logged yet", color: "text-slate-400" };
        bpSub = "No records";
        hrSub = "No records";
        tempSub = "No records";
        spo2Sub = "No records";
    } else {
        const hr = parseFloat(currentVitals.hr);
        const temp = parseFloat(currentVitals.temp);
        const spo2 = parseFloat(currentVitals.spo2);
        
        let bpSystolic = 120;
        let bpDiastolic = 80;
        if (currentVitals.bp && currentVitals.bp.includes('/')) {
            const parts = currentVitals.bp.split('/');
            bpSystolic = parseFloat(parts[0]);
            bpDiastolic = parseFloat(parts[1]);
        }

        let issues = [];
        let isCritical = false;

        if (!isNaN(hr)) {
            if (hr < 60) { issues.push("Low HR"); hrSub = "Bradycardia"; }
            else if (hr > 100) { issues.push("High HR"); hrSub = "Tachycardia"; }
            else { hrSub = "Normal Range"; }
        }
        if (!isNaN(temp)) {
            if (temp > 100.4) { issues.push("Fever"); tempSub = "High Temperature"; }
            else if (temp < 95) { issues.push("Hypothermia"); tempSub = "Low Temperature"; }
            else { tempSub = "Normal Range"; }
        }
        if (!isNaN(spo2)) {
            if (spo2 < 95) {
                issues.push("Low SpO2");
                spo2Sub = "Low Oxygen Saturation";
                if (spo2 < 90) isCritical = true;
            } else {
                spo2Sub = "Normal Range";
            }
        }
        if (!isNaN(bpSystolic) && !isNaN(bpDiastolic)) {
            if (bpSystolic > 140 || bpDiastolic > 90) { issues.push("High BP"); bpSub = "Hypertension"; }
            else if (bpSystolic < 90 || bpDiastolic < 60) { issues.push("Low BP"); bpSub = "Hypotension"; }
            else { bpSub = "Normal Range"; }
        }

        const dateObj = latestVitalsVisit.updatedAt ? new Date(latestVitalsVisit.updatedAt) : null;
        const updateStamp = dateObj ? `${dateObj.toLocaleDateString([], {month: 'short', day: 'numeric'})} @ ${dateObj.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}` : "Recent Shift";

        if (isCritical || issues.length >= 3) {
            healthStatus = { title: "Critical", sub: `Alert: ${issues.join(', ')} (${updateStamp})`, color: "text-rose-600" };
        } else if (issues.length > 0) {
            healthStatus = { title: "Needs Attention", sub: `Elevated: ${issues.join(', ')} (${updateStamp})`, color: "text-amber-600" };
        } else {
            healthStatus = { title: "Stable", sub: `All metrics normal (${updateStamp})`, color: "text-emerald-600" };
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 flex relative">
            <PatientSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 w-full flex flex-col">
                <header className="bg-white border-b border-slate-200 px-4 md:px-10 py-6 sticky top-0 z-40 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm hover:bg-slate-50"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Patient Dashboard</h1>
                            <p className="text-xs md:text-sm text-slate-500 font-medium">Welcome back, {userName || "Patient"}</p>
                        </div>
                    </div>
                    {/* Integrated Billing System Notification Core */}
                    <PatientNotificationBell patientName={userName} />
                </header>

                <div className="p-4 md:p-10 max-w-[1400px] mx-auto w-full space-y-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        <HealthCard 
                            label="Upcoming Appointment" 
                            title={upcomingAppt ? upcomingAppt.date : "No Upcoming"} 
                            sub={upcomingAppt ? `Dr. ${upcomingAppt.doctorName} • ${upcomingAppt.time}` : "Book an appointment"} 
                            icon={<Activity className="text-[#357DF9]" />} 
                        />
                        <HealthCard 
                            label="Health Status" 
                            title={healthStatus.title} 
                            sub={healthStatus.sub} 
                            icon={<Heart className={healthStatus.title === 'Critical' ? "text-rose-500 animate-pulse" : healthStatus.title === 'Needs Attention' ? "text-amber-500" : "text-emerald-500"} />} 
                            titleColor={healthStatus.color}
                        />
                        <HealthCard 
                            label="Blood Pressure" 
                            title={currentVitals.bp === '--' ? 'No Data' : `${currentVitals.bp} mmHg`} 
                            sub={bpSub} 
                            icon={<CircleGauge className="text-amber-500" />} 
                        />
                        <HealthCard 
                            label="Heart Rate" 
                            title={currentVitals.hr === '--' ? 'No Data' : `${currentVitals.hr} bpm`} 
                            sub={hrSub} 
                            icon={<HeartPulse className="text-rose-500" />} 
                        />
                        <HealthCard 
                            label="Body Temperature" 
                            title={currentVitals.temp === '--' ? 'No Data' : `${currentVitals.temp} °F`} 
                            sub={tempSub} 
                            icon={<Thermometer className="text-orange-500" />} 
                        />
                        <HealthCard 
                            label="Oxygen Saturation" 
                            title={currentVitals.spo2 === '--' ? 'No Data' : `${currentVitals.spo2}%`} 
                            sub={spo2Sub} 
                            icon={<Bubbles className="text-blue-500" />} 
                        />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 bg-white">
                            <h2 className="text-lg font-bold text-slate-800">Recent Medical Visits</h2>
                        </div>

                        <div className="overflow-y-auto max-h-[400px] custom-scrollbar">
                            {loadingVisits ? (
                                <div className="p-8 text-center text-sm text-slate-400 font-medium">Loading medical records...</div>
                            ) : allVisits.length === 0 ? (
                                <div className="p-8 text-center text-sm text-slate-400 font-medium">No prescription history found.</div>
                            ) : (
                                <>
                                    <div className="lg:hidden divide-y divide-slate-100">
                                        {allVisits.map((visit, index) => (
                                            <div key={visit.id || `mobile-visit-${index}`} className="p-5 hover:bg-slate-50 transition-colors">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-bold text-slate-900">Dr. {visit.doc}</p>
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                        {visit.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-500 mb-4">{visit.service}</p>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-xs font-bold text-slate-400">{visit.date} @ {visit.time}</p>
                                                    <button 
                                                        onClick={() => setSelectedVisit(visit)}
                                                        className="text-[#357DF9] text-xs font-bold flex items-center gap-1"
                                                    >
                                                        Details <ChevronRight size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="hidden lg:block">
                                        <table className="w-full text-left">
                                            <thead className="sticky top-0 bg-white z-10">
                                                <tr className="bg-slate-50/50 text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-100">
                                                    <th className="px-8 py-4">Specialist</th>
                                                    <th className="px-8 py-4">Service Provided</th>
                                                    <th className="px-8 py-4">Appointment Date & Time</th>
                                                    <th className="px-8 py-4">Status</th>
                                                    <th className="px-8 py-4 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
                                                {allVisits.map((visit, index) => (
                                                    <tr key={visit.id || `desktop-visit-${index}`} className="hover:bg-slate-50/50 transition-all group">
                                                        <td className="px-8 py-5 font-bold text-slate-800 group-hover:text-[#357DF9] transition-colors">Dr. {visit.doc}</td>
                                                        <td className="px-8 py-5 font-medium">{visit.service}</td>
                                                        <td className="px-8 py-5 text-slate-400 font-semibold">{visit.date} • {visit.time}</td>
                                                        <td className="px-8 py-5">
                                                            <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase border bg-emerald-50 text-emerald-700 border-emerald-100">
                                                                {visit.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-5 text-right">
                                                            <button 
                                                                onClick={() => setSelectedVisit(visit)}
                                                                className="text-[#357DF9] font-black text-xs uppercase hover:underline"
                                                            >
                                                                View Summary
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {selectedVisit && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Medical Summary</h3>
                                <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">Record ID: {selectedVisit.id}</p>
                            </div>
                            <button onClick={() => setSelectedVisit(null)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 space-y-6 max-h-[calc(100vh-260px)] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialist</p>
                                    <p className="text-sm font-bold text-slate-800">Dr. {selectedVisit.doc}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date & Time</p>
                                    <p className="text-sm font-bold text-slate-800">{selectedVisit.date} • {selectedVisit.time}</p></div>
                            </div>
                            
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Service Provided</p>
                                <p className="text-sm font-bold text-slate-800">{selectedVisit.service}</p>
                            </div>

                            <div className="w-full pt-2">
                                <div className="space-y-4 bg-blue-50/40 p-5 rounded-2xl border border-blue-100/70 flex flex-col justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-[#357DF9] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                            <FileText size={14} /> Rx Prescription Details
                                        </p>
                                        <div className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100 shadow-sm min-h-[120px]">
                                            {selectedVisit.notes || "No standard medications prescribed."}
                                        </div>
                                    </div>
                                    
                                    {selectedVisit.labPrescription && (
                                        <div className="mt-4 pt-4 border-t border-blue-100/60 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                        <Beaker size={12} className="text-amber-500" /> Prescribed Lab Work:
                                                    </p>
                                                    <span className="text-xs font-semibold text-slate-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-md inline-block">
                                                        {selectedVisit.labPrescription}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Lab Technician Findings:</p>
                                                <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-600 leading-relaxed max-h-[140px] overflow-y-auto custom-scrollbar">
                                                    {textLogsArray.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {textLogsArray.map((t, idx) => (
                                                                <div key={idx} className="border-b border-slate-100 pb-1.5 last:border-none last:pb-0">
                                                                    <span className="font-bold text-slate-800">{t.testName}:</span> "{t.notes || 'No notes configuration provided'}"
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : selectedVisit.labNotes ? (
                                                        <p className="italic">"{selectedVisit.labNotes}"</p>
                                                    ) : (
                                                        <p className="text-slate-400 italic">No text commentary logged by lab-technician diagnostics staff yet.</p>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {attachmentUrlsArray.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                                    {attachmentUrlsArray.map((fileObj, idx) => (
                                                        <div key={idx} className="flex items-center justify-between text-[11px] bg-white border border-slate-200 rounded-xl p-2.5 px-3">
                                                            <span className="font-bold text-slate-600 truncate max-w-[55%]">{fileObj.testName}</span>
                                                            <div className="flex gap-1.5">
                                                                {fileObj.urls.map((url, uIdx) => (
                                                                    <a 
                                                                        key={uIdx} 
                                                                        href={url} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer" 
                                                                        className="inline-flex items-center gap-0.5 text-blue-600 hover:text-blue-700 font-bold hover:underline"
                                                                    >
                                                                        Doc {uIdx + 1} <ExternalLink size={10} />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                selectedVisit.labFileUrl && (
                                                    <div className="pt-1 flex items-center justify-end">
                                                        <a 
                                                            href={selectedVisit.labFileUrl} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-md shadow-purple-100 hover:scale-[1.01]"
                                                        >
                                                            View Attached Lab File <ExternalLink size={12} />
                                                        </a>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {selectedVisit.dischargeMedication && (
                                <div className="w-full pt-2">
                                    <div className="space-y-3 bg-rose-50/40 p-5 rounded-2xl border border-rose-100/70">
                                        <div>
                                            <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                                                <LogOut size={14} /> Final Discharge Prescription
                                            </p>
                                            <p className="text-[11px] text-rose-500/80 font-semibold mb-2">
                                                Take-home medications issued by the doctor at the time of discharge.
                                            </p>
                                            <div className="text-sm text-slate-700 leading-relaxed font-mono whitespace-pre-line bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                                {selectedVisit.dischargeMedication}
                                            </div>
                                        </div>
                                        {selectedVisit.dischargedAt && isMounted && (
                                            <p className="text-[10px] font-bold text-rose-500/70 flex items-center gap-1">
                                                <Calendar size={12} /> Discharged: {new Date(selectedVisit.dischargedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {selectedVisit.updatedAt && isMounted && (
                                <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                                    <Calendar size={13} className="text-slate-400" />
                                    <span>Records Updated: {new Date(selectedVisit.updatedAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'})}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
                            <button 
                                onClick={() => setSelectedVisit(null)}
                                className="w-full py-3 bg-[#357DF9] text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all"
                            >
                                Close Summary
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                    height: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #E2E8F0;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #CBD5E1;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}