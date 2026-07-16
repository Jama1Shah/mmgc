"use client";

import AdminSidebar from '@/components/AdminSidebar';
import React, { useState, useEffect } from 'react';
import { 
  Search, UserPlus, Edit2, Trash2, 
  Shield, User, Activity, 
  X, Check, Loader2, Menu, Clock, AlertTriangle
} from 'lucide-react';

export default function UserManagement() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isVerified, setIsVerified] = useState(true); // Added state for toggle

  // Custom Modal States
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, message: '', onConfirm: null });
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', title: 'Notification' });

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- KEYBOARD LISTENERS FOR CUSTOM MODALS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (alertModal.isOpen) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setAlertModal(prev => ({ ...prev, isOpen: false }));
        }
      } else if (confirmModal.isOpen) {
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (confirmModal.onConfirm) {
            confirmModal.onConfirm();
          }
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    };

    if (confirmModal.isOpen || alertModal.isOpen) {
      window.addEventListener('keydown', handleKeyDown, true);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [confirmModal, alertModal]);

  // Helper to trigger custom alerts
  const showAlert = (message, title = "Notification") => {
    setAlertModal({ isOpen: true, message, title });
  };

  // --- DYNAMIC DEPARTMENT LOGIC ---
  // This extracts every unique department currently in your database
  const dynamicDepartments = Array.from(
    new Set(users.map((u) => u.dept).filter(Boolean))
  ).sort();

  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(" ");
    return parts.length > 1 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
      : name.slice(0, 2).toUpperCase();
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setShowPassword(false);
    setIsVerified(user.isVerified ?? false); // Set toggle value from existing state
    setIsModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.target);
    const userData = Object.fromEntries(formData);
    
    const method = editingUser ? 'PUT' : 'POST';
    const body = editingUser 
      ? { ...userData, id: editingUser._id, isVerified } 
      : { ...userData, isVerified };

    try {
      const response = await fetch('/api/users', {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const savedUser = await response.json();
        
        if (editingUser) {
          setUsers(users.map(u => u._id === editingUser._id ? savedUser : u));
        } else {
          setUsers((prev) => [savedUser, ...prev]);
        }

        setIsModalOpen(false);
        setEditingUser(null);
        setShowPassword(false);
        setIsVerified(true);
        e.target.reset();
      } else {
        const err = await response.json();
        showAlert(err.error || "Operation failed", "Operation Failed");
      }
    } catch (error) {
      showAlert("Error: " + error.message, "System Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = (id) => {
    setConfirmModal({
      isOpen: true,
      message: "Are you sure you want to delete this account? This process cannot be undone.",
      onConfirm: async () => {
        try {
          const res = await fetch('/api/users', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id }),
          });
          
          if (res.ok) {
            setUsers(users.filter(user => user._id !== id));
          } else {
            showAlert("Could not delete user", "Error");
          }
        } catch (error) {
          showAlert("Could not delete user", "Error");
        }
      }
    });
  };

  const roles = ['All', 'Admin', 'Doctor', 'Nurse', 'Lab Staff', 'Billing Staff', 'Patient'];

  const filteredUsers = users.filter(user => {
    const matchesTab = activeTab === 'All' || user.role === activeTab;
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans text-slate-900">
      <title>Dashboard - MMGC</title>
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center p-4 bg-white border-b border-slate-200 sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 mr-3 text-slate-500 hover:bg-slate-100 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-2">
            <div className="bg-[#357DF9] p-1.5 rounded-lg">
              <Activity className="text-white" size={16} />
            </div>
            <span className="font-bold text-slate-800 tracking-tight">MMGC Admin</span>
          </div>
        </div>

        <div className="p-4 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">User Management</h1>
              <p className="text-slate-500 mt-1">Full control over staff roles and patient access levels.</p>
            </div>
            <button 
              onClick={() => { setEditingUser(null); setShowPassword(false); setIsVerified(true); setIsModalOpen(true); }}
              className="w-full md:w-auto bg-[#357DF9] text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 font-semibold hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
            >
              <UserPlus size={18} /> Add New User
            </button>
          </div>

          <div className="bg-white border border-slate-200 p-2 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex gap-1 overflow-x-auto p-1 no-scrollbar w-full md:w-auto">
              {roles.map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveTab(role)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === role ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {role}
                </button>
              ))}
            </div>
            
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-[#357DF9]/20 outline-none transition-all"
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-widest">
                  <th className="px-6 py-4">Profile</th>
                  <th className="px-6 py-4">Role / Permissions</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="group hover:bg-slate-50/40 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#357DF9] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-200">
                          {getInitials(user.name)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        {user.role === 'Admin' ? <Shield size={14} className="text-[#357DF9]" /> : <User size={14} />}
                        {user.role}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                      {user.dept || 'General'}
                    </td>
                    <td className="px-6 py-4">
                      {user.isVerified ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                          <Check size={12} className="stroke-[3]" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100 animate-pulse">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 lg:opacity-50 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(user)} className="p-2 text-slate-400 hover:text-[#357DF9] hover:bg-[#357DF9]/5 rounded-lg transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => deleteUser(user._id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <form onSubmit={handleSaveUser} className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden my-auto">
              <div className="p-6 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold">{editingUser ? 'Edit Account' : 'Register New Account'}</h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">MMGC Credential System</p>
                </div>
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingUser(null); setShowPassword(false); setIsVerified(true); }} className="text-slate-300 hover:text-slate-600 transition-colors"><X size={24}/></button>
              </div>
              
              <div className="p-6 md:p-8 space-y-4 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Name</label>
                    <input name="name" required defaultValue={editingUser?.name || ""} type="text" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#357DF9]/20 outline-none text-sm" placeholder="Enter Full Name" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Role</label>
                    <select name="role" defaultValue={editingUser?.role || "Doctor"} className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#357DF9]/20 outline-none text-sm">
                      {roles.slice(1).map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </div>
                </div>

                {/* DYNAMIC DEPARTMENT INPUT */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label>
                  <input 
                    name="dept" 
                    list="dept-options" 
                    required 
                    defaultValue={editingUser?.dept || ""} 
                    placeholder="Type or select dept"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#357DF9]/20 outline-none text-sm"
                  />
                  <datalist id="dept-options">
                    {dynamicDepartments.map(dept => (
                      <option key={dept} value={dept} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                  <input name="email" required defaultValue={editingUser?.email || ""} type="email" className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#357DF9]/20 outline-none text-sm" placeholder="example@mmgc.com" />
                </div>

                {/* IS VERIFIED TOGGLE */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <div>
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Account Verified</label>
                    <span className="text-[11px] text-slate-400">If checked, user is verified immediately without email validation.</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isVerified}
                      onChange={(e) => setIsVerified(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#357DF9]"></div>
                  </label>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingUser ? "New Password" : "Enter Password"}</label>
                  <div className="relative">
                    <input 
                      name="password" 
                      required={!editingUser} 
                      type={showPassword ? "text" : "password"} 
                      className="w-full p-3 pr-10 bg-slate-50 border border-slate-100 rounded-xl focus:ring-2 focus:ring-[#357DF9]/20 outline-none text-sm" 
                      placeholder="********" 
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
              </div>

              <div className="p-6 md:p-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row justify-end gap-3">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingUser(null); setShowPassword(false); setIsVerified(true); }} className="px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all order-2 md:order-1">Cancel</button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-8 py-2.5 bg-[#357DF9] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all flex items-center justify-center gap-2 order-1 md:order-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {isSubmitting ? "Saving..." : editingUser ? "Update Details" : "Confirm Registration"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* CUSTOM CONFIRMATION MODAL */}
        {confirmModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center shrink-0 shadow-lg shadow-red-50">
                  <Trash2 size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">Confirm Deletion</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{confirmModal.message}</p>
                </div>
              </div>
              <div className="flex flex-col md:flex-row justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                  className="w-full md:w-auto px-5 py-2.5 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all text-center order-2 md:order-1"
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                  }} 
                  className="w-full md:w-auto px-6 py-2.5 bg-red-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-red-100 hover:bg-red-600 transition-all text-center order-1 md:order-2"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CUSTOM ALERT MODAL */}
        {alertModal.isOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-6 md:p-8 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#357DF9] flex items-center justify-center shrink-0 shadow-lg shadow-blue-50">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">{alertModal.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{alertModal.message}</p>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setAlertModal(prev => ({ ...prev, isOpen: false }))} 
                  className="w-full md:w-auto px-6 py-2.5 bg-[#357DF9] text-white text-sm font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all text-center"
                >
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}