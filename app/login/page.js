'use client';

import Link from 'next/link';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });

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

  // Handle "Remember Me" on mount - loads the LAST logged-in person
  useEffect(() => {
    const savedEmail = localStorage.getItem('mmgc_remember_email');
    const savedPass = localStorage.getItem('mmgc_remember_pass');
    if (savedEmail) {
      setFormData(prev => ({
        ...prev,
        email: savedEmail,
        password: savedPass || '', // Fallback if no password was saved
        rememberMe: true
      }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // ✅ NEW: Handle Remember Me logic on successful login
        if (formData.rememberMe) {
          localStorage.setItem('mmgc_remember_email', formData.email);
          localStorage.setItem('mmgc_remember_pass', formData.password); // Note: Still insecure, but works as requested
        } else {
          // If they unchecked it, wipe the data so they aren't remembered next time
          localStorage.removeItem('mmgc_remember_email');
          localStorage.removeItem('mmgc_remember_pass');
        }

        if (data.user) {
          // 🔍 SMART NAME DETECTOR
          let detectedName = "";

          const possibleKeys = ['name', 'fullName', 'username', 'firstName', 'displayName', 'patientName', 'customerName'];
          for (let key of possibleKeys) {
            if (data.user[key]) {
              detectedName = data.user[key];
              break;
            }
          }

          if (!detectedName) {
            const emailPrefix = data.user.email.split('@')[0];
            detectedName = emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
          }

          sessionStorage.setItem('user', JSON.stringify({
            name: detectedName,
            email: data.user.email,
            role: data.user.role
          }));

          sessionStorage.setItem('userEmail', data.user.email);

          // ========================================================
          // ADDED: Tab Isolation Auth Storage
          // ========================================================
          const tokenFromCookie = document.cookie.split('; ').find(row => row.trim().startsWith('token='))?.split('=')[1];
          const currentToken = data.token || data.user?.token || tokenFromCookie;

          if (currentToken) {
            sessionStorage.setItem('token', currentToken);
          }
          sessionStorage.setItem('role', data.user.role);
          // ========================================================
        }

        const rolePath = data.user.role.toLowerCase().replace(/\s+/g, '');
        router.push(`/${rolePath}-dashboard`);
      } else {
        showAlert(data.error || "Login failed. Please check your credentials.", "Login Failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      showAlert("Error connecting to server. Please check your internet connection.", "Connection Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen relative">
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      <main className="flex-grow bg-white font-['DM_Sans',sans-serif] text-[#1D1E20]">
        <title>Login - MMGC</title>

        <div className="flex min-h-screen">
          {/* Left Side: Login Form */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-24 py-12">
            <div className="max-w-md w-full mx-auto">
              <div className="mb-10">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome Back</h1>
                <p className="text-gray-500 mt-2">Please enter your details to sign in.</p>
              </div>

              <form onSubmit={handleSubmit} method="POST" className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    autoCapitalize="none"   // Stops mobile from capitalizing the first letter
                    autoCorrect="off"       // Stops mobile from changing your email name
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#357DF9] focus:border-transparent outline-none transition-all"
                    placeholder="name@company.com"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Password</label>
                    <Link href="/forgot-password" className="text-sm font-semibold text-[#357DF9] hover:underline">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#357DF9] focus:border-transparent outline-none transition-all"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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

                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#357DF9] border-gray-300 rounded focus:ring-[#357DF9] cursor-pointer"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-600 cursor-pointer">
                    Remember me for 30 days
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#357DF9] text-white font-semibold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-md shadow-blue-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
                >
                  {loading ? "Signing In..." : "Sign In"}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-gray-500">
                Don't have an account?{' '}
                <Link href="/register" className="text-[#357DF9] font-semibold hover:underline">
                  Create one now
                </Link>
              </p>
            </div>
          </div>

          {/* Right Side: Decorative Branding */}
          <div className="hidden lg:flex flex-1 bg-gray-50 items-center justify-center p-12">
            <div className="max-w-lg text-center">
              <div className="bg-blue-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-blue-50">
                <svg className="w-12 h-12 text-[#357DF9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Secure Access</h2>
              <p className="text-gray-500 text-lg leading-relaxed">
                Log in to your MMGC account to manage appointments, view records, and securely communicate with healthcare professionals.
              </p>
            </div>
          </div>
        </div>
      </main>

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