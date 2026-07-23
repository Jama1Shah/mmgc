"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PatientSidebar from '@/components/PatientSidebar';
import { Menu, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';

const BookingForm = () => {
    const searchParams = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- CUSTOM MODAL STATE ---
    const [alertModal, setAlertModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        isSuccess: false,
        onClose: null
    });

    // --- HELPER TO SAFELY ACCESS STORAGE ---
    const getAuthenticatedUser = () => {
        if (typeof window !== "undefined") {
            const savedProfile = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (savedProfile) {
                try {
                    const parsed = JSON.parse(savedProfile);
                    return {
                        name: parsed.name || "Patient Profile",
                        email: parsed.email || sessionStorage.getItem('userEmail') || ""
                    };
                } catch (err) {
                    console.error("Error reading authentication tokens:", err);
                }
            } else {
                const fallbackEmail = sessionStorage.getItem('userEmail');
                if (fallbackEmail) {
                    return { name: "Patient Profile", email: fallbackEmail };
                }
            }
        }
        return null;
    };

    const [patientInfo, setPatientInfo] = useState({
        name: "Patient Profile",
        email: ""
    });

    // --- AVAILABILITY STATE ---
    const [availabilityStatus, setAvailabilityStatus] = useState('idle');
    const [recommendation, setRecommendation] = useState(null);

    const today = new Date().toISOString().split('T')[0];
    const twoWeeksLater = new Date();
    twoWeeksLater.setDate(twoWeeksLater.getDate() + 14);
    const maxDate = twoWeeksLater.toISOString().split('T')[0];

    const [specialtyMap, setSpecialtyMap] = useState({});

    // --- RESCHEDULING CONSTANTS FROM URL ---
    const isRescheduling = searchParams.get('mode') === 'reschedule';
    const appointmentId = searchParams.get('appointmentId');

    const [bookingDetails, setBookingDetails] = useState({
        specialty: searchParams.get('specialty') || '',
        doctor: searchParams.get('doctor') || '',
        date: today,
        time: '',
        reason: ''
    });

    const generateTimeSlots = (targetDate = bookingDetails.date) => {
        const slots = [];
        let current = new Date();
        current.setHours(9, 0, 0);
        const end = new Date();
        end.setHours(17, 0, 0);

        const now = new Date();

        while (current <= end) {
            const slotTimeStr = current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

            if (targetDate === today) {
                const currentHours = current.getHours();
                const currentMinutes = current.getMinutes();
                const nowHours = now.getHours();
                const nowMinutes = now.getMinutes();

                // Only include the slot if it's in the future for today's date
                if (currentHours > nowHours || (currentHours === nowHours && currentMinutes > nowMinutes)) {
                    slots.push(slotTimeStr);
                }
            } else {
                slots.push(slotTimeStr);
            }
            current.setMinutes(current.getMinutes() + 5); // Reduced appointment slot increment to 5 minutes
        }
        return slots;
    };

    // --- SYNCING RUNS SAFELY AFTER HYDRATION COMPLETES ---
    useEffect(() => {
        const user = getAuthenticatedUser();
        if (user) {
            setPatientInfo({
                name: user.name || "Guest Patient",
                email: user.email || "patient@example.com"
            });
        }

        const fetchDoctors = async () => {
            try {
                const res = await fetch('/api/doctors');
                const data = await res.json();
                setSpecialtyMap(data);
            } catch (err) {
                console.error("Failed to load doctors database mapping:", err);
            }
        };
        fetchDoctors();
    }, []);

    // Trigger an initial slot validation check if a complete setup is provided directly via the URL parameters
    useEffect(() => {
        if (bookingDetails.doctor && bookingDetails.date && bookingDetails.time) {
            verifySlot(bookingDetails);
        }
    }, [specialtyMap]);

    // --- HANDLE ENTER KEY FOR MODAL ---
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (alertModal.isOpen && e.key === 'Enter') {
                e.preventDefault();
                setAlertModal(prev => ({ ...prev, isOpen: false }));
                if (alertModal.onClose) alertModal.onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [alertModal.isOpen]);

    // --- REAL-TIME AVAILABILITY CHECK ---
    const verifySlot = async (details) => {
        if (!details.date || !details.time || !details.doctor) return;

        setAvailabilityStatus('checking');
        try {
            // Append target excludeId if rescheduling so your current appointment slot doesn't trigger a false negative conflict
            let checkUrl = `/api/appointments/check?doctor=${encodeURIComponent(details.doctor)}&date=${details.date}&time=${details.time}`;
            if (isRescheduling && appointmentId) {
                checkUrl += `&excludeId=${appointmentId}`;
            }

            const res = await fetch(checkUrl);
            const result = await res.json();

            if (result.available) {
                setAvailabilityStatus('available');
                setRecommendation(null);
            } else {
                setAvailabilityStatus('taken');
                setRecommendation(result.recommendation);
            }
        } catch (err) {
            setAvailabilityStatus('idle');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        const updated = { ...bookingDetails, [name]: value };
        if (name === 'specialty') updated.doctor = '';
        setBookingDetails(updated);

        if (['doctor', 'date', 'time'].includes(name)) {
            verifySlot(updated);
        }
    };

    const applyRecommendation = () => {
        if (recommendation) {
            // Pre-generate slots for the recommended date to look up formatting matching rules
            const slots = generateTimeSlots(recommendation.date);
            
            // Helper function to turn strings like "09:05 AM", "9:05 am", or "14:30" into absolute numeric minutes
            const getMinutes = (str) => {
                const match = str.match(/(\d+):(\d+)/);
                if (!match) return null;
                let h = parseInt(match[1], 10);
                const m = parseInt(match[2], 10);
                const isPM = /pm/i.test(str);
                const isAM = /am/i.test(str);
                if (isPM && h < 12) h += 12;
                if (isAM && h === 12) h = 0;
                return h * 60 + m;
            };

            const recMinutes = getMinutes(recommendation.time);
            
            // Re-map recommended string directly to browser generated format counterparts
            const matchingSlot = slots.find(slot => getMinutes(slot) === recMinutes) || recommendation.time;

            const updated = { ...bookingDetails, date: recommendation.date, time: matchingSlot };
            setBookingDetails(updated);
            verifySlot(updated);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (alertModal.isOpen) return;

        if (availabilityStatus === 'taken') {
            setAlertModal({
                isOpen: true,
                title: "Slot Unavailable",
                message: "This time slot is already booked or has passed. Please select the recommended time or another slot.",
                isSuccess: false,
                onClose: null
            });
            return;
        }

        const verifiedUser = getAuthenticatedUser();
        let absoluteName = verifiedUser?.name || patientInfo.name;
        const absoluteEmail = verifiedUser?.email || patientInfo.email;

        if (!absoluteName || absoluteName === "Patient Profile") {
            if (absoluteEmail) {
                const prefix = absoluteEmail.split('@')[0];
                absoluteName = prefix.charAt(0).toUpperCase() + prefix.slice(1);
            } else {
                absoluteName = "Anonymous Patient";
            }
        }

        try {
            let res;
            const targetPayload = {
                ...bookingDetails,
                doctorName: bookingDetails.doctor,
                patientName: absoluteName,
                patientEmail: absoluteEmail
            };

            if (isRescheduling && appointmentId) {
                // Route to PUT to update the current database log file in-place
                res = await fetch('/api/appointments', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: appointmentId,
                        status: 'Pending', // Resets back to pending overview for clinic coordination
                        ...targetPayload
                    }),
                });
            } else {
                // Route to standard entry creation POST
                res = await fetch('/api/appointments', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(targetPayload),
                });
            }

            const result = await res.json();
            if (res.ok && (result.success || result.id || result._id)) {
                setAlertModal({
                    isOpen: true,
                    title: "Success!",
                    message: isRescheduling ? "Appointment Successfully Rescheduled!" : "Appointment Successfully Confirmed!",
                    isSuccess: true,
                    onClose: () => { window.location.href = "/patient-dashboard/appointments"; }
                });
            } else {
                setAvailabilityStatus('taken');
                setRecommendation(result.recommendation);
                setAlertModal({
                    isOpen: true,
                    title: "Booking Error",
                    message: result.error || result.message || "Someone just booked that slot, the time has passed, or a processing issue occurred. Please see the new recommendation.",
                    isSuccess: false,
                    onClose: null
                });
            }
        } catch (err) {
            setAlertModal({
                isOpen: true,
                title: "Connection Error",
                message: "Connection error. Please try again.",
                isSuccess: false,
                onClose: null
            });
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <title>Book Appointment - MMGC</title>
            <PatientSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
                <div className="max-w-4xl mx-auto">
                    {/* Top Hamburger toggle for responsive viewports */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="md:hidden mb-4 p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <Menu size={20} />
                    </button>

                    <div className="mb-8">
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                            Logged in as: {patientInfo.name} {patientInfo.email && `(${patientInfo.email})`}
                        </p>
                        <h1 className="text-3xl font-bold text-slate-900">
                            {isRescheduling ? "Reschedule Visit" : "Book New Appointment"}
                        </h1>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-[32px] p-6 md:p-10 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Specialty</label>
                                    <select
                                        name="specialty"
                                        required
                                        value={bookingDetails.specialty}
                                        disabled={isRescheduling} // Lock down fields if updating an existing booking
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Specialty</option>
                                        {Object.keys(specialtyMap).sort((a, b) => a.localeCompare(b)).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Doctor</label>
                                    <select
                                        name="doctor"
                                        required
                                        disabled={!bookingDetails.specialty || isRescheduling}
                                        value={bookingDetails.doctor}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 outline-none disabled:opacity-60"
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Doctor</option>
                                        {bookingDetails.specialty && [...(specialtyMap[bookingDetails.specialty] || [])].sort((a, b) => a.localeCompare(b)).map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Date</label>
                                    <input
                                        type="date"
                                        name="date"
                                        min={today}
                                        max={maxDate}
                                        required
                                        value={bookingDetails.date}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 outline-none"
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-600 ml-1">Time</label>
                                    <select
                                        name="time"
                                        required
                                        value={bookingDetails.time}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 outline-none"
                                        onChange={handleInputChange}
                                    >
                                        <option value="">Select Time</option>
                                        {generateTimeSlots().map(slot => <option key={slot} value={slot}>{slot}</option>)}
                                    </select>
                                </div>
                            </div>

                            {availabilityStatus === 'checking' && (
                                <div className="p-4 bg-blue-50 text-blue-700 rounded-2xl flex items-center gap-2 animate-pulse">
                                    <Calendar size={20} /> <span className="text-sm font-medium">Checking doctor's schedule...</span>
                                </div>
                            )}

                            {availabilityStatus === 'available' && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-2xl flex items-center gap-2">
                                    <CheckCircle2 size={20} /> <span className="text-sm font-medium">Great! This slot is available.</span>
                                </div>
                            )}

                            {availabilityStatus === 'taken' && (
                                <div className="p-4 bg-red-50 border border-red-100 text-red-800 rounded-2xl flex flex-col gap-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle size={20} className="text-red-600" />
                                        <span className="text-sm font-bold">This slot is already booked or has passed.</span>
                                    </div>
                                    {recommendation && (
                                        <div className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-red-200">
                                            <p className="text-xs">Next available: <span className="font-bold">{recommendation.time}</span> ({recommendation.date === today ? 'Today' : recommendation.date})</p>
                                            <button type="button" onClick={applyRecommendation} className="text-[10px] uppercase tracking-tighter font-black bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all">
                                                Switch to this
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-600 ml-1">Reason for Visit</label>
                                <textarea
                                    name="reason"
                                    maxLength={500}
                                    value={bookingDetails.reason}
                                    placeholder="Short description detailing your update or symptoms..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 h-24 outline-none resize-none"
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="submit"
                                    disabled={availabilityStatus !== 'available'}
                                    className="flex-1 bg-[#357DF9] hover:bg-[#2a66cc] text-white py-4 rounded-2xl font-bold text-lg shadow-lg disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
                                >
                                    {isRescheduling ? "Update Appointment" : "Confirm Appointment"}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="px-8 py-4 border border-slate-200 text-slate-600 rounded-2xl font-semibold hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>

            {/* --- CUSTOM ALERT MODAL COMPONENT --- */}
            {alertModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 transition-all">
                    <div className="bg-white border border-slate-200 rounded-[28px] max-w-sm w-full p-6 md:p-8 shadow-xl text-center transform scale-100 transition-all">
                        <div className="flex justify-center mb-4">
                            {alertModal.isSuccess ? (
                                <div className="p-3 bg-emerald-50 rounded-full text-emerald-600 border border-emerald-100">
                                    <CheckCircle2 size={32} />
                                </div>
                            ) : (
                                <div className="p-3 bg-red-50 rounded-full text-red-600 border border-red-100">
                                    <AlertCircle size={32} />
                                </div>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">{alertModal.title}</h3>
                        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{alertModal.message}</p>
                        <button
                            type="button"
                            onClick={() => {
                                setAlertModal(prev => ({ ...prev, isOpen: false }));
                                if (alertModal.onClose) alertModal.onClose();
                            }}
                            className="w-full bg-[#357DF9] hover:bg-[#2a66cc] text-white py-3.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-lg"
                        >
                            Okay
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function BookingPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center font-medium">Loading component dependencies...</div>}>
            <BookingForm />
        </Suspense>
    );
}