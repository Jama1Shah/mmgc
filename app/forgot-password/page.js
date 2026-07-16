'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // State for matching custom alert modal
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: 'Notification',
    message: ''
  });

  // Handle keyboard events (Enter & Escape) when the alert modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setAlertModal({ isOpen: false, title: 'Notification', message: '' });
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

  const showAlert = (message, title = 'Notification') => {
    setAlertModal({ isOpen: true, title, message });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        showAlert(data.error || "Failed to process request.", "Request Failed");
      }
    } catch (error) {
      console.error("Connection error:", error);
      showAlert("Could not connect to the server.", "Connection Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <title>Forgot Password - MMGC</title>
      <header className="sticky top-0 z-50"><Navbar /></header>
      <div className="min-h-screen bg-white font-['DM_Sans',sans-serif] text-[#1D1E20] flex flex-col justify-center px-8 py-12">
        <title>Forgot Password - MMGC Healthcare</title>
        <div className="max-w-md w-full mx-auto">
          <div className="mb-10 text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-[#357DF9]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Forgot Password</h1>
            <p className="text-gray-500 mt-2">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email" required className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-[#357DF9]"
                  placeholder="enter your email" value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <button type="submit" disabled={isLoading} className="w-full bg-[#357DF9] text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-100 disabled:bg-blue-400">
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
              </button>
            </form>
          ) : (
            <div className="text-center p-6 bg-green-50 rounded-2xl border border-green-100">
              <p className="text-green-800 font-medium">A reset link has been successfully sent to <span className="font-bold">{email}</span>. Please check your inbox.</p>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/login" className="text-sm font-semibold text-gray-500 hover:text-[#357DF9] flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Back to Login
            </Link>
          </div>
        </div>
      </div>

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
              autoFocus
              onClick={() => setAlertModal({ isOpen: false, title: 'Notification', message: '' })}
              className="w-full bg-[#357DF9] text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
    </div>
  );
}