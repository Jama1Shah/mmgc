'use client';
import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [showPass, setShowPass] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // State for custom alert modal
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: 'Notification' });

  // Handle keyboard events (Enter & Escape) when the custom alert modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setAlertModal({ isOpen: false, message: '', title: 'Notification' });
        }
      }
    };

    if (alertModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [alertModal.isOpen]);

  const showAlert = (message, title = "Notification") => {
    setAlertModal({ isOpen: true, message, title });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!token) {
      showAlert("Missing reset token. Please request a new link.", "Missing Token");
      return;
    }
    if (passwords.new !== passwords.confirm) {
      showAlert("Passwords do not match!", "Error");
      return;
    }
    if (passwords.new.length < 6) {
      showAlert("Password must be at least 6 characters long.", "Invalid Password");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: token,
          newPassword: passwords.new
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        showAlert(data.error || "Failed to update password.", "Error");
      }
    } catch (error) {
      console.error("Connection error:", error);
      showAlert("Could not connect to the server.", "Connection Error");
    } finally {
      setIsLoading(false);
    }
  };

  const eyeIcon = (
    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
      {showPass ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
      )}
    </button>
  );

  if (!token) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-2xl border border-red-100">
        <p className="text-red-800 font-medium">Invalid or missing reset token. Please request a new link from the forgot password page.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto relative">
      <title>Reset Password - MMGC</title>
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Set New Password</h1>
        <p className="text-gray-500 mt-2">Please enter your new secure password details below.</p>
      </div>

      {!isSubmitted ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} required className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#357DF9]"
                placeholder="••••••••" value={passwords.new} onChange={(e) => setPasswords({...passwords, new: e.target.value})}
              />
              {eyeIcon}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"} required className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#357DF9]"
                placeholder="••••••••" value={passwords.confirm} onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
              />
              {eyeIcon}
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="w-full bg-[#357DF9] text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-100 disabled:bg-blue-400">
            {isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      ) : (
        <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
          <p className="text-green-800 font-medium mb-4">Your password has been successfully updated!</p>
          <Link href="/login" className="text-sm font-semibold text-[#357DF9] hover:underline">Proceed to Login Page</Link>
        </div>
      )}

      {/* MATCHING CUSTOM ALERT MODAL */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#357DF9] flex items-center justify-center mx-auto shadow-lg shadow-blue-50">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{alertModal.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{alertModal.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setAlertModal({ isOpen: false, message: '', title: 'Notification' })}
              className="w-full bg-[#357DF9] text-white py-3.5 rounded-xl font-semibold hover:bg-blue-600 transition-all shadow-md shadow-blue-100"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div>
      <header className="sticky top-0 z-50"><Navbar /></header>
      <div className="min-h-screen bg-white font-['DM_Sans',sans-serif] text-[#1D1E20] flex flex-col justify-center px-8 py-12">
        <title>Reset Password - MMGC Healthcare</title>
        <Suspense fallback={<div className="text-center">Loading verification payload...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}