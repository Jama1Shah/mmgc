"use client";
import { use, useState, useEffect } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State for custom alert modal
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    title: "Alert",
    message: "",
  });

  // Handle keyboard events when the modal is active
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === "Enter" || e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setAlertModal({ isOpen: false, title: "Alert", message: "" });
        }
      }
    };

    if (alertModal.isOpen) {
      window.addEventListener("keydown", handleKeyDown, true);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [alertModal.isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setAlertModal({
        isOpen: true,
        title: "Password Mismatch",
        message: "Passwords do not match",
      });
      return;
    }

    console.log("Form Data:", form);

    // Later: send to backend
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary px-4 relative">
      <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-8">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-center mb-6">
          Create your account
        </h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name */}
          <div>
            <label className="text-sm font-medium">Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="John Doe"
              value={form.name}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              name="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium">Password</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="text-sm font-medium">Confirm Password</label>
            <input
              type="password"
              name="confirmPassword"
              placeholder="••••••••"
              value={form.confirmPassword}
              onChange={handleChange}
              className="w-full mt-1 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition"
          >
            Register
          </button>
        </form>

        {/* Footer */}
        <p className="text-sm text-center mt-4">
          Already have an account?{" "}
          <Link href="/login" className="text-blue-500 hover:underline">
            Login
          </Link>
        </p>
      </div>

      {/* MATCHING CUSTOM ALERT MODAL */}
      {alertModal.isOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-sm">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{alertModal.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {alertModal.message}
              </p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setAlertModal({ isOpen: false, title: "Alert", message: "" })}
              className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}