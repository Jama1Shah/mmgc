"use client";

import React, { useState, useEffect } from 'react';
import PatientSidebar from '@/components/PatientSidebar';
import { Menu, Loader2, Eye, Calendar, Trash2 } from 'lucide-react';

const AppointmentsPage = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Custom Modal State
    const [customModal, setCustomModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        type: 'confirm', // 'confirm' | 'alert'
        onConfirm: null,
    });

    // Handle Enter and Escape key presses when modal is open
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!customModal.isOpen) return;

            if (e.key === 'Enter') {
                e.preventDefault();
                if (customModal.type === 'confirm' && customModal.onConfirm) {
                    customModal.onConfirm();
                }
                setCustomModal(prev => ({ ...prev, isOpen: false }));
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setCustomModal(prev => ({ ...prev, isOpen: false }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [customModal]);

    // Helper to open UI replacement modals
    const showCustomModal = (title, message, type, onConfirm = null) => {
        setCustomModal({
            isOpen: true,
            title,
            message,
            type,
            onConfirm
        });
    };

    // Get email dynamically from storage
    const getAuthenticatedUserEmail = () => {
        if (typeof window !== "undefined") {
            const savedProfile = sessionStorage.getItem('user') || localStorage.getItem('user');
            if (savedProfile) {
                try {
                    const parsed = JSON.parse(savedProfile);
                    return parsed.email || sessionStorage.getItem('userEmail') || "";
                } catch (err) {
                    console.error("Error reading authentication tokens:", err);
                }
            }
            return sessionStorage.getItem('userEmail') || "";
        }
        return "";
    };

    // Fetch appointments
    useEffect(() => {
        const fetchAppointments = async () => {
            try {
                setLoading(true);
                setError(null);
                const profileSessionEmail = getAuthenticatedUserEmail();

                if (!profileSessionEmail) {
                    throw new Error("No authenticated patient email found. Please sign in again.");
                }

                const response = await fetch(`/api/appointments?patientEmail=${encodeURIComponent(profileSessionEmail)}`);
                if (!response.ok) {
                    throw new Error(`Server status error: ${response.status}`);
                }
                const data = await response.json();
                
                // FILTER: Exclude appointments for patients who are currently admitted or have bills pending
                const filteredAppointments = data.filter(apt => 
                    apt.status?.toLowerCase() !== 'admitted' && 
                    apt.status?.toLowerCase() !== 'bill pending'
                );
                
                setAppointments(filteredAppointments);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        const fetchAppointmentsData = fetchAppointments;
        fetchAppointmentsData();
    }, []);

    // Handles permanent deletion from both backend database and UI layout array
    const handleDeleteAppointment = (id) => {
        showCustomModal(
            "Delete Appointment",
            "Are you sure you want to permanently delete this appointment record? This action cannot be undone.",
            "confirm",
            async () => {
                try {
                    // Send a DELETE request to your appointment API endpoint
                    const res = await fetch(`/api/appointments?id=${id}`, {
                        method: 'DELETE',
                    });

                    if (res.ok) {
                        // Instantly remove the card from local UI array state filter so it vanishes completely
                        setAppointments(prev => prev.filter(apt => apt._id !== id));
                    } else {
                        throw new Error("Failed to drop appointment records from server collection.");
                    }
                } catch (error) {
                    console.error("Error executing collection wipe:", error);
                    showCustomModal("Error", "Could not remove the appointment record. Please try again.", "alert");
                }
            }
        );
    };

    // Standardized status translations
    const getDisplayStatus = (dbStatus) => {
        const status = dbStatus?.toLowerCase();
        if (status === 'prescribed') {
            return 'Prescribed';
        }
        if (status === 'completed' || status === 'accepted for checkup' || status === 'accepted') {
            return 'Accepted';
        }
        if (status === 'cancelled' || status === 'rejected') {
            return status === 'rejected' ? 'Rejected' : 'Canceled';
        }
        if (status === 'rescheduled') {
            return 'Reschedule';
        }
        return 'Upcoming';
    };

    // Style helper for badges
    const getStatusStyle = (displayStatus) => {
        switch (displayStatus) {
            case 'Prescribed': return 'bg-purple-50 text-purple-600';
            case 'Accepted': return 'bg-green-50 text-green-600';
            case 'Rejected':
            case 'Canceled': return 'bg-red-50 text-red-600';
            case 'Reschedule': return 'bg-amber-50 text-amber-600';
            default: return 'bg-blue-50 text-[#357DF9]';
        }
    };

    // Reschedule handler
    const handleReschedule = (apt) => {
        const query = new URLSearchParams({
            mode: 'reschedule',
            appointmentId: apt._id,
            doctor: apt.doctorName,
            specialty: apt.specialty
        }).toString();
        window.location.href = `/book-appointment?${query}`;
    };

    // Cancel handler
    const handleCancel = (apt) => {
        showCustomModal(
            "Cancel Appointment",
            "Are you sure you want to cancel this appointment?",
            "confirm",
            async () => {
                try {
                    const res = await fetch('/api/appointments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id: apt._id, status: 'Cancelled' })
                    });

                    if (res.ok) {
                        setAppointments(prev =>
                            prev.map(item => item._id === apt._id ? { ...item, status: 'Cancelled' } : item)
                        );
                        setSelectedAppointment(prev => prev ? { ...prev, status: 'Cancelled' } : null);
                    } else {
                        showCustomModal("Error", "Failed to cancel appointment.", "alert");
                    }
                } catch (err) {
                    showCustomModal("Error", "Error canceling appointment.", "alert");
                }
            }
        );
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
            <title>Appointments - MMGC</title>
            <PatientSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full">
                <div className="max-w-6xl mx-auto">

                    {/* Header */}
                    <div className="mb-12 flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="lg:hidden p-2 bg-white rounded-lg border border-slate-200 text-slate-600 shadow-sm"
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-slate-900">My Appointments</h1>
                            <p className="text-slate-500 text-base md:text-lg">Track, reschedule, or cancel your clinic visits.</p>
                        </div>
                    </div>

                    {/* Loading State */}
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-[32px] shadow-sm">
                            <Loader2 className="w-8 h-8 text-[#357DF9] animate-spin mb-2" />
                            <p className="text-slate-500">Loading your visits...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {!loading && error && (
                        <div className="p-8 text-center bg-red-50 border border-red-100 rounded-[32px] text-red-600">
                            <p className="font-semibold">Something went wrong</p>
                            <p className="text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {/* Appointments Table */}
                    {!loading && !error && (
                        <div className="bg-white border border-slate-200 rounded-[32px] overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left min-w-[750px]">
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="p-6 text-sm font-semibold text-slate-600">Doctor</th>
                                            <th className="p-6 text-sm font-semibold text-slate-600">Date & Time</th>
                                            <th className="p-6 text-sm font-semibold text-slate-600">Status</th>
                                            <th className="p-6 text-sm font-semibold text-slate-600 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {appointments.length === 0 ? (
                                            <tr>
                                                <td colSpan="4" className="p-12 text-center text-slate-400">
                                                    No appointments booked yet.
                                                </td>
                                            </tr>
                                        ) : (
                                            appointments.map((apt) => {
                                                const displayStatus = getDisplayStatus(apt.status);
                                                return (
                                                    <tr key={apt._id || apt.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-6">
                                                            <div className="font-bold text-slate-900">{apt.doctorName}</div>
                                                            <div className="text-xs text-slate-500">{apt.specialty}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="text-slate-900 font-medium">{apt.date}</div>
                                                            <div className="text-xs text-slate-500">{apt.time}</div>
                                                        </td>
                                                        <td className="p-6">
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusStyle(displayStatus)}`}>
                                                                {displayStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-6">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {/* View Action Button */}
                                                                <button
                                                                    onClick={() => setSelectedAppointment(apt)}
                                                                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
                                                                    title="View Details"
                                                                >
                                                                    <Eye size={14} />
                                                                    View
                                                                </button>

                                                                {/* Reschedule & Cancel actions show if appointment is 'Upcoming' OR explicitly 'Reschedule' status */}
                                                                {(displayStatus === 'Upcoming' || displayStatus === 'Reschedule') && (
                                                                    <>
                                                                        <button
                                                                            onClick={() => handleReschedule(apt)}
                                                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all"
                                                                            title="Reschedule Visit"
                                                                        >
                                                                            <Calendar size={14} />
                                                                            Reschedule
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleCancel(apt)}
                                                                            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all"
                                                                            title="Cancel Visit"
                                                                        >
                                                                            <Trash2 size={14} />
                                                                            Cancel
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {/* Delete Action Button - Excluded from active visits */}
                                                                {displayStatus !== 'Upcoming' && displayStatus !== 'Reschedule' && (
                                                                    <button
                                                                        onClick={() => handleDeleteAppointment(apt._id)}
                                                                        title="Delete Appointment Record"
                                                                        className="p-2 text-slate-400 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all flex items-center justify-center"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* DETAIL MODAL OVERLAY */}
            {selectedAppointment && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-lg p-6 md:p-8 shadow-2xl">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Appointment Details</h2>
                                <p className="text-slate-500">Review your visit information</p>
                            </div>
                            <button onClick={() => setSelectedAppointment(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Doctor</label>
                                    <p className="font-semibold text-slate-900">{selectedAppointment.doctorName}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Specialty</label>
                                    <p className="font-semibold text-slate-900">{selectedAppointment.specialty}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Date & Time</label>
                                    <p className="font-semibold text-slate-900">{selectedAppointment.date} at {selectedAppointment.time}</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                    <p className={`font-semibold ${getStatusStyle(getDisplayStatus(selectedAppointment.status))}`}>
                                        {getDisplayStatus(selectedAppointment.status)}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <label className="text-xs font-bold text-slate-400 uppercase">Reason for Visit</label>
                                <p className="text-slate-700 mt-1 leading-relaxed">{selectedAppointment.reason || "No reason specified."}</p>
                            </div>

                            {(getDisplayStatus(selectedAppointment.status) === 'Upcoming' || getDisplayStatus(selectedAppointment.status) === 'Reschedule') && (
                                <div className="pt-6 border-t border-slate-100">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => handleReschedule(selectedAppointment)}
                                            className="flex-1 border border-slate-200 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-sm"
                                        >
                                            Reschedule
                                        </button>
                                        <button
                                            onClick={() => handleCancel(selectedAppointment)}
                                            className="flex-1 bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 text-sm"
                                        >
                                            Cancel Visit
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedAppointment(null)}
                            className="w-full mt-8 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}

            {/* CUSTOM MATCHING ALERT/CONFIRM UI MODAL OVERLAY */}
            {customModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] w-full max-w-md p-6 md:p-8 shadow-2xl border border-slate-100">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-2">{customModal.title}</h2>
                            <p className="text-slate-600 text-sm leading-relaxed">{customModal.message}</p>
                        </div>
                        
                        <div className="flex gap-3 justify-end">
                            {customModal.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                                        className="px-5 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (customModal.onConfirm) customModal.onConfirm();
                                            setCustomModal(prev => ({ ...prev, isOpen: false }));
                                        }}
                                        className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm shadow-md"
                                    >
                                        Confirm
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setCustomModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all text-sm shadow-md w-full"
                               >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppointmentsPage;