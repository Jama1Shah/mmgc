'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    agreeToTerms: false
  });

  // Custom modal state
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' // 'success', 'error', 'warning', 'info'
  });

  // Helper to open our custom modal
  const showAlert = (title, message, type = 'info') => {
    setModal({
      isOpen: true,
      title,
      message,
      type
    });
  };

  // Helper to close the custom modal and refresh the page
  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    window.location.reload();
  };

  // Trap focus and handle key events (Enter and Escape) when modal is open
  useEffect(() => {
    if (!modal.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modal.isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleResendVerification = async () => {
    if (!formData.email) {
      showAlert("Email Required", "Please enter your email address first to resend the verification link.", "warning");
      return;
    }

    setIsResending(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', email: formData.email }),
      });

      const result = await response.json();
      if (response.ok) {
        showAlert("Success", result.message || "Verification email resent successfully! Please check your inbox.", "success");
      } else {
        showAlert("Failed", result.error || "Failed to resend verification email.", "error");
      }
    } catch (error) {
      console.error("Connection error:", error);
      showAlert("Connection Error", "Could not connect to the server to resend verification.", "error");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. Validation check
    if (!formData.agreeToTerms) {
      showAlert("Terms of Service", "Please agree to the Terms of Services.", "warning");
      return;
    }

    setIsLoading(true);

    try {
      // --- THIS IS THE MISSING PIECE ---
      // We combine the form data into a single object that matches your API
      const payload = {
        name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        role: 'Patient', // Matches your Schema default
        dept: 'General'  // Matches your Schema default
      };
      // ---------------------------------

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), // Now payload is defined!
      });

      const result = await response.json();

      if (response.ok) {
        showAlert("Registration Successful", result.message || "Registration successful! Please check your email inbox to verify your account before logging in.", "success");
        // window.location.href = '/login'; 
      } else {
        // Use result.error because that's what your route.js returns
        showAlert("Registration Failed", result.error || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Connection error:", error);
      showAlert("Connection Error", "Could not connect to the server. Check your terminal for DB errors.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>
      <div className="min-h-screen bg-white font-['DM_Sans',sans-serif] text-[#1D1E20]">
        <title>Register - MMGC</title>

        <div className="flex min-h-screen">
          {/* Left Side: Form Container */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12">
            <div className="max-w-md w-full mx-auto">
              <h1 className="text-3xl font-bold mb-2">Create Account</h1>
              <p className="text-gray-500 mb-8">Join MMGC Healthcare to manage your health services.</p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                {/* Password Input with Eye Icon */}
                <div>
                  <label className="block text-sm font-medium mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    >
                      {showPassword ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    name="agreeToTerms"
                    id="agreeToTerms"
                    required
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    onChange={handleChange}
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-500">
                    I agree to the <Link href="terms-of-services" className="text-blue-600 hover:underline">Terms of Services</Link> and <Link href="privacy-policy" className="text-blue-600 hover:underline">Privacy Policy</Link>.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full text-white font-semibold py-3.5 rounded-xl transform transition-active active:scale-[0.98] ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-[#357DF9] hover:bg-blue-700'
                    }`}
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>

                {/* Resend Verification Action Button */}
                <div className="text-center mt-2">
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending}
                    className="text-sm text-blue-600 font-semibold hover:underline focus:outline-none disabled:text-blue-400"
                  >
                    {isResending ? 'Resending Link...' : 'Resend Verification Email'}
                  </button>
                </div>
              </form>

              <p className="mt-8 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <a href="/login" className="text-blue-600 font-semibold hover:underline">
                  Log in
                </a>
              </p>
            </div>
          </div>

          {/* Right Side: Decorative/Image */}
          <div className="hidden lg:flex flex-1 bg-gray-50 items-center justify-center p-12">
            <div className="max-w-lg text-center">
              <div className="bg-blue-100 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold mb-4">Start your healthcare journey</h2>
              <p className="text-gray-500">Access your medical records, schedule appointments, and consult with specialists all in one secure platform.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Custom UI Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop Blur overlay */}
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={closeModal}
          />
          {/* Modal Container */}
          <div className="relative bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 flex flex-col items-center text-center transform scale-100 transition-all duration-200">
            
            {/* Success Icon */}
            {modal.type === 'success' && (
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}

            {/* Error Icon */}
            {modal.type === 'error' && (
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}

            {/* Warning Icon */}
            {modal.type === 'warning' && (
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}

            {/* Info Icon */}
            {modal.type === 'info' && (
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}

            <h3 className="text-lg font-bold text-gray-900 mb-2">{modal.title}</h3>
            <p className="text-sm text-gray-500 mb-6 leading-relaxed">{modal.message}</p>

            <button
              type="button"
              onClick={closeModal}
              className="w-full bg-[#357DF9] hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Okay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}