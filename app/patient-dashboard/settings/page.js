'use client'
import React, { useState, useEffect } from 'react';
import PatientSidebar from '@/components/PatientSidebar';
import { 
  Menu,
  Lock, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';

export default function PatientSettings() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    
    // Passwords Form State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Toggle Password Visibility
    const [showOld, setShowOld] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    // Status Messaging & Loading
    const [updateLoading, setUpdateLoading] = useState(false);
    const [forgotLoading, setForgotLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', message: '' }); // type: 'success' | 'error'

    useEffect(() => {
        document.title = "Settings - MMGC";
        const email = sessionStorage.getItem('userEmail');
        if (!email) return;
        
        setUserEmail(email);

        async function fetchUserProfile() {
            try {
                const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
                if (res.ok) {
                    const data = await res.ok ? await res.json() : null;
                    if (data?.name) {
                        setUserName(data.name);
                    }
                }
            } catch (err) {
                console.error("Failed to load patient name in Settings:", err);
            }
        }
        fetchUserProfile();
    }, []);

    // Change Password Form Submission
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setFeedback({ type: '', message: '' });

        if (!oldPassword || !newPassword || !confirmPassword) {
            setFeedback({ type: 'error', message: 'All password entry fields are required.' });
            return;
        }

        if (newPassword.length < 6) {
            setFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
            return;
        }

        if (newPassword !== confirmPassword) {
            setFeedback({ type: 'error', message: 'Confirm password selection does not match new password.' });
            return;
        }

        setUpdateLoading(true);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail, oldPassword, newPassword })
            });

            const data = await res.json();
            if (res.ok) {
                setFeedback({ type: 'success', message: data.message || 'Password updated successfully!' });
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setFeedback({ type: 'error', message: data.error || 'Failed to update user password.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'An unexpected database error occurred.' });
        } finally {
            setUpdateLoading(false);
        }
    };

    // Nodemailer Email Verification Flow
    const triggerResetEmail = async () => {
        if (!userEmail) {
            setFeedback({ type: 'error', message: 'Session expired. Please log back in.' });
            return;
        }

        setForgotLoading(true);
        setFeedback({ type: '', message: '' });

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });

            const data = await res.json();
            if (res.ok) {
                setFeedback({ 
                    type: 'success', 
                    message: `Nodemailer transmission complete! We've dispatched a password reset token to: ${userEmail}.` 
                });
            } else {
                setFeedback({ type: 'error', message: data.error || 'Failed to dispatch reset instructions.' });
            }
        } catch (err) {
            setFeedback({ type: 'error', message: 'Nodemailer mailer pipeline connection exception.' });
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex relative">
            <title>Settings - MMGC</title>
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
                            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Account Settings</h1>
                            <p className="text-xs md:text-sm text-slate-500 font-medium font-semibold">Manage your authentication and preferences</p>
                        </div>
                    </div>
                </header>

                <div className="p-4 md:p-10 max-w-2xl mx-auto w-full space-y-8">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 md:p-8 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50">
                            <div className="p-2.5 bg-blue-50 text-[#357DF9] rounded-2xl border border-blue-100">
                                <Lock size={22} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-slate-800">Change Authentication Password</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure your MMGC account</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordUpdate} className="p-6 md:p-8 space-y-6">
                            
                            {/* Feedback Messages */}
                            {feedback.message && (
                                <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                                    feedback.type === 'success' 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                        : 'bg-rose-50 border-rose-100 text-rose-800'
                                }`}>
                                    {feedback.type === 'success' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                                    )}
                                    <p className="text-xs font-semibold leading-relaxed">{feedback.message}</p>
                                </div>
                            )}

                            {/* Old Password Input */}
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                                <div className="relative">
                                    <input 
                                        type={showOld ? "text" : "password"}
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#357DF9] transition-all text-slate-800 text-sm font-semibold pr-11"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowOld(!showOld)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showOld ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password Input */}
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showNew ? "text" : "password"}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#357DF9] transition-all text-slate-800 text-sm font-semibold pr-11"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password Input */}
                            <div className="space-y-2 relative">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Confirm New Password</label>
                                <div className="relative">
                                    <input 
                                        type={showConfirm ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#357DF9] transition-all text-slate-800 text-sm font-semibold pr-11"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Forgot Password Integration */}
                            <div className="pt-2 text-right">
                                <button
                                    type="button"
                                    onClick={triggerResetEmail}
                                    disabled={forgotLoading}
                                    className="text-xs font-bold text-[#357DF9] hover:text-blue-600 hover:underline inline-flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
                                >
                                    {forgotLoading ? (
                                        <>
                                            <Loader2 size={13} className="animate-spin" />
                                            Sending Nodemailer Link...
                                        </>
                                    ) : (
                                        "Forgot your current password?"
                                    )}
                                </button>
                            </div>

                            <button
                                type="submit"
                                disabled={updateLoading}
                                className="w-full py-3 bg-[#357DF9] text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all text-sm flex items-center justify-center gap-2"
                            >
                                {updateLoading ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Updating Password...
                                    </>
                                ) : (
                                    "Update Password"
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </main>

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