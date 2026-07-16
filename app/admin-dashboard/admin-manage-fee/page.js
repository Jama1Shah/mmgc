'use client';

import React, { useState, useEffect } from 'react';
import AdminSidebar from '@/components/AdminSidebar';
import { Menu } from 'lucide-react';

export default function AdminManagementPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('doctors');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null });

  // Data States
  const [doctors, setDoctors] = useState([]);
  const [wards, setWards] = useState([]);
  const [labTests, setLabTests] = useState([]);

  // Creation Form States
  const [wardForm, setWardForm] = useState({ name: '', specialty: '', admissionFee: '', overnightFee: '' });
  const [labForm, setLabForm] = useState({ name: '', cost: '' });

  // Editing Row States
  const [editingDoctorId, setEditingDoctorId] = useState(null);
  const [doctorFeeInput, setDoctorFeeInput] = useState('');

  const [editingWardId, setEditingWardId] = useState(null);
  const [editWardForm, setEditWardForm] = useState({ name: '', specialty: '', admissionFee: '', overnightFee: '' });

  const [editingLabTestId, setEditingLabTestId] = useState(null);
  const [editLabForm, setEditLabForm] = useState({ name: '', cost: '' });

  // Load Data on Mount & Tab Change
  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: '', text: '' }), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'doctors') {
        const res = await fetch('/api/doctors?list=true');
        if (!res.ok) throw new Error('Failed to fetch doctors');
        const data = await res.json();
        const doctorsList = Array.isArray(data) ? data.filter(u => u.role === 'Doctor') : [];
        setDoctors(doctorsList);
      } else if (activeTab === 'wards') {
        const res = await fetch('/api/wards');
        if (!res.ok) throw new Error('Failed to fetch wards');
        const data = await res.json();
        setWards(Array.isArray(data) ? data : []);
      } else if (activeTab === 'labs') {
        const res = await fetch('/api/lab-tests');
        if (!res.ok) throw new Error('Failed to fetch lab tests');
        const data = await res.json();
        setLabTests(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // DOCTOR FEE HANDLERS
  // ==========================================
  const handleUpdateDoctorFee = async (doctorId, currentDoctorObj) => {
    if (!doctorFeeInput || isNaN(doctorFeeInput)) {
      showMessage('error', 'Please enter a valid numeric fee amount.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/doctors', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: doctorId,
          ...currentDoctorObj,
          fee: Number(doctorFeeInput),
        }),
      });

      if (!res.ok) throw new Error('Failed to update doctor configuration profile');
      
      showMessage('success', 'Doctor fee adjusted successfully!');
      setEditingDoctorId(null);
      setDoctorFeeInput('');
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // WARD HANDLERS (ADD, EDIT, REMOVE)
  // ==========================================
  const handleAddWard = async (e) => {
    e.preventDefault();
    if (!wardForm.name || !wardForm.specialty) {
      showMessage('error', 'Ward Name and Specialty are required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/wards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: wardForm.name,
          specialty: wardForm.specialty,
          admissionFee: wardForm.admissionFee ? Number(wardForm.admissionFee) : 0,
          overnightFee: wardForm.overnightFee ? Number(wardForm.overnightFee) : 0
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to register ward configuration.');

      showMessage('success', 'Ward structural layout registered successfully!');
      setWardForm({ name: '', specialty: '', admissionFee: '', overnightFee: '' });
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWard = async (wardId) => {
    if (!editWardForm.name || !editWardForm.specialty) {
      showMessage('error', 'Ward Name and Specialty cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/wards', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: wardId,
          name: editWardForm.name,
          specialty: editWardForm.specialty,
          admissionFee: editWardForm.admissionFee ? Number(editWardForm.admissionFee) : 0,
          overnightFee: editWardForm.overnightFee ? Number(editWardForm.overnightFee) : 0
        }),
      });

      if (!res.ok) throw new Error('Failed to update ward details.');

      showMessage('success', 'Ward configuration metrics updated successfully!');
      setEditingWardId(null);
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveWard = async (wardId) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Ward Record',
      message: 'Are you sure you want to remove this ward inventory?',
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try {
          setLoading(true);
          const res = await fetch(`/api/wards`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: wardId })
          });
          if (!res.ok) throw new Error('Failed to delete the specified ward item.');
          showMessage('success', 'Ward tracking record deleted successfully.');
          fetchData();
        } catch (err) {
          showMessage('error', err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  // ==========================================
  // LAB TEST HANDLERS (ADD, EDIT, REMOVE)
  // ==========================================
  const handleAddLabTest = async (e) => {
    e.preventDefault();
    if (!labForm.name) {
      showMessage('error', 'Lab panel display title tracking name is required.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/lab-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: labForm.name,
          cost: labForm.cost ? Number(labForm.cost) : undefined
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to sync lab catalog profile.');

      showMessage('success', 'New lab test entry initialized and synced.');
      setLabForm({ name: '', cost: '' });
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLabTest = async (testId, originalName) => {
    const targetName = editLabForm.name || originalName;
    if (!targetName) {
      showMessage('error', 'Lab panel name cannot be empty.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/lab-tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: testId,
          originalName: originalName,
          name: targetName,
          cost: editLabForm.cost ? Number(editLabForm.cost) : 1000
        }),
      });

      if (!res.ok) throw new Error('Failed to update lab test parameters.');

      showMessage('success', 'Lab test modifications saved successfully!');
      setEditingLabTestId(null);
      fetchData();
    } catch (err) {
      showMessage('error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLabTest = async (testName) => {
    setConfirmModal({
      isOpen: true,
      title: 'Deregister Laboratory Test',
      message: `Are you sure you want to remove ${testName} from application catalogs?`,
      onConfirm: async () => {
        setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null });
        try {
          setLoading(true);
          const res = await fetch(`/api/lab-tests`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: testName })
          });
          if (!res.ok) throw new Error('Failed to wipe the targeted lab panel configuration.');
          showMessage('success', 'Lab panel configuration removed.');
          fetchData();
        } catch (err) {
          showMessage('error', err.message);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 w-full flex flex-col p-6 md:p-10 font-sans">
        <div className="max-w-7xl mx-auto w-full">
          
          {/* Header Segment */}
          <div className="mb-8 border-b border-slate-200 pb-5 flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg border border-slate-200"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">MMGC Administration Center</h1>
              <p className="text-sm text-slate-500 mt-1">Configure clinical fee profiles, manage ward allocations, and baseline laboratory panels.</p>
            </div>
          </div>

          {/* Dynamic Alerts Feedback Panel */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium border shadow-sm transition-all duration-300 ${
              message.type === 'error' 
                ? 'bg-rose-50 text-rose-800 border-rose-200' 
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {message.text}
            </div>
          )}

          {/* Tab System Control Navigation */}
          <div className="bg-white border border-slate-200 p-2 rounded-2xl mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex gap-1 overflow-x-auto p-1 no-scrollbar w-full md:w-auto">
              <button
                onClick={() => setActiveTab('doctors')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'doctors' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                🩺 Doctor Fees
              </button>
              <button
                onClick={() => setActiveTab('wards')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'wards' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                🏥 Ward Management
              </button>
              <button
                onClick={() => setActiveTab('labs')}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === 'labs' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                🧪 Lab Tests
              </button>
            </div>
          </div>

          {/* Global Loading Indicator */}
          {loading && (
            <div className="text-sm font-medium text-blue-600 animate-pulse mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping"></span>
              Syncing database cluster state updates...
            </div>
          )}

          {/* TAB MAIN ACTIONS PANELS CONTAINER */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* TAB 1: DOCTOR FEE MANAGEMENT PANEL */}
            {activeTab === 'doctors' && (
              <div className="p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Doctor Consultation Rate Management</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4">Doctor Profile Details</th>
                        <th className="p-4">Department Spec</th>
                        <th className="p-4">Operational Status</th>
                        <th className="p-4">Consultation Fee (PKR)</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {doctors.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="p-8 text-center text-slate-400">No active doctors loaded in system cluster registers.</td>
                        </tr>
                      ) : (
                        doctors.map((doc) => (
                          <tr key={doc._id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-800">{doc.name}</div>
                              <div className="text-xs text-slate-400 font-mono">{doc.email}</div>
                            </td>
                            <td className="p-4">
                              <span className="bg-blue-50 text-blue-700 text-xs px-2.5 py-1 rounded-full font-medium">
                                {doc.dept || 'General'}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                                doc.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                              }`}>{doc.status}</span>
                            </td>
                            <td className="p-4 font-semibold text-slate-700">
                              {editingDoctorId === doc._id ? (
                                <input
                                  type="number"
                                  placeholder="Enter Amount"
                                  className="border border-slate-300 rounded-lg p-1.5 w-32 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                  value={doctorFeeInput}
                                  onChange={(e) => setDoctorFeeInput(e.target.value)}
                                />
                              ) : (
                                <span>{doc.fee ? `${doc.fee} PKR` : 'Not Set (Default Matrix)'}</span>
                              )}
                            </td>
                            <td className="p-4 text-right">
                              {editingDoctorId === doc._id ? (
                                <div className="flex justify-end space-x-2">
                                  <button 
                                    onClick={() => handleUpdateDoctorFee(doc._id, doc)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition shadow-sm"
                                  >
                                    Save Change
                                  </button>
                                  <button 
                                    onClick={() => { setEditingDoctorId(null); setDoctorFeeInput(''); }}
                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium transition"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setEditingDoctorId(doc._id); setDoctorFeeInput(doc.fee || ''); }}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                                >
                                  Modify Fee Structure
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: WARD REGISTRY CONFIGURATION */}
            {activeTab === 'wards' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Form Entry */}
                <div className="p-6 lg:col-span-1 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Add New Clinical Ward</h3>
                  <form onSubmit={handleAddWard} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Ward Name / Identifier</label>
                      <input
                        type="text"
                        placeholder="e.g. ICU Wing A, Ward 4"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={wardForm.name}
                        onChange={(e) => setWardForm({ ...wardForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Medical Specialty Category</label>
                      <input
                        type="text"
                        placeholder="e.g. Cardiology, Pediatrics"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={wardForm.specialty}
                        onChange={(e) => setWardForm({ ...wardForm, specialty: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">One-Time Admission Fee (PKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={wardForm.admissionFee}
                        onChange={(e) => setWardForm({ ...wardForm, admissionFee: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Overnight Daily Fee Rate (PKR)</label>
                      <input
                        type="number"
                        placeholder="e.g. 4500"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={wardForm.overnightFee}
                        onChange={(e) => setWardForm({ ...wardForm, overnightFee: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition shadow-sm"
                    >
                      Commit New Ward Entry
                    </button>
                  </form>
                </div>

                {/* Data Table View */}
                <div className="p-6 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-4 font-sans">Active Ward Inventory Configurations</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3">Ward Label Designation</th>
                          <th className="p-3">Specialty Track</th>
                          <th className="p-3">Admission Fee</th>
                          <th className="p-3">Overnight Rate</th>
                          <th className="p-3 text-right">Options</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {wards.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="p-6 text-center text-slate-400">No wards structural layouts configured.</td>
                          </tr>
                        ) : (
                          wards.map((ward) => {
                            const isEditingWard = editingWardId === ward._id;
                            return (
                              <tr key={ward._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  {isEditingWard ? (
                                    <input 
                                      type="text"
                                      className="border border-slate-300 rounded-lg p-1 w-full text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editWardForm.name}
                                      onChange={(e) => setEditWardForm({ ...editWardForm, name: e.target.value })}
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-800">{ward.name}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isEditingWard ? (
                                    <input 
                                      type="text"
                                      className="border border-slate-300 rounded-lg p-1 w-full text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editWardForm.specialty}
                                      onChange={(e) => setEditWardForm({ ...editWardForm, specialty: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-slate-600">{ward.specialty}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isEditingWard ? (
                                    <input 
                                      type="number"
                                      className="border border-slate-300 rounded-lg p-1 w-24 text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editWardForm.admissionFee}
                                      onChange={(e) => setEditWardForm({ ...editWardForm, admissionFee: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-slate-700 font-semibold">
                                      {ward.admissionFee ? `${ward.admissionFee} PKR` : '0 PKR'}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isEditingWard ? (
                                    <input 
                                      type="number"
                                      className="border border-slate-300 rounded-lg p-1 w-24 text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editWardForm.overnightFee}
                                      onChange={(e) => setEditWardForm({ ...editWardForm, overnightFee: e.target.value })}
                                    />
                                  ) : (
                                    <span className="text-slate-700 font-semibold">
                                      {ward.overnightFee ? `${ward.overnightFee} PKR` : '0 PKR'}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {isEditingWard ? (
                                    <div className="flex justify-end space-x-1.5">
                                      <button
                                        onClick={() => handleUpdateWard(ward._id)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-2 py-1 rounded transition"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingWardId(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs px-2 py-1 rounded transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={() => {
                                          setEditingWardId(ward._id);
                                          setEditWardForm({ 
                                            name: ward.name, 
                                            specialty: ward.specialty, 
                                            admissionFee: ward.admissionFee || '', 
                                            overnightFee: ward.overnightFee || '' 
                                          });
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleRemoveWard(ward._id)}
                                        className="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition"
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LABORATORY PANEL CATALOG MATRIX */}
            {activeTab === 'labs' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                {/* Form Entry Module */}
                <div className="p-6 lg:col-span-1 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Add Laboratory Panel Profile</h3>
                  <form onSubmit={handleAddLabTest} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Lab Panel Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Complete Blood Count (CBC)"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={labForm.name}
                        onChange={(e) => setLabForm({ ...labForm, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Billing Value Cost (PKR)</label>
                      <input
                        type="number"
                        placeholder="Leave blank for 1000 PKR baseline rate"
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={labForm.cost}
                        onChange={(e) => setLabForm({ ...labForm, cost: e.target.value })}
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-xl transition shadow-sm"
                    >
                      Deploy to Live Inventory Matrix
                    </button>
                  </form>
                </div>

                {/* Data Table Configuration View Matrix */}
                <div className="p-6 lg:col-span-2">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Active Application Invoice-Ready Panels</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3">Test Panel Listing Name</th>
                          <th className="p-3">Base System Cost Structure</th>
                          <th className="p-3 text-right">Options Management</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {labTests.length === 0 ? (
                          <tr>
                            <td colSpan="3" className="p-6 text-center text-slate-400">No custom data loaded. Fetching base templates initialization map...</td>
                          </tr>
                        ) : (
                          labTests.map((test, index) => {
                            const testIdentifier = test._id || index;
                            const isEditingLab = editingLabTestId === testIdentifier;
                            const currentName = test.description || test.name;
                            const currentCost = test.cost || test.baseCost;

                            return (
                              <tr key={testIdentifier} className="hover:bg-slate-50/50 transition-colors">
                                <td className="p-3">
                                  {isEditingLab ? (
                                    <input 
                                      type="text"
                                      className="border border-slate-300 rounded-lg p-1 w-full text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editLabForm.name}
                                      onChange={(e) => setEditLabForm({ ...editLabForm, name: e.target.value })}
                                    />
                                  ) : (
                                    <span className="font-semibold text-slate-800">{currentName}</span>
                                  )}
                                </td>
                                <td className="p-3">
                                  {isEditingLab ? (
                                    <input 
                                      type="number"
                                      className="border border-slate-300 rounded-lg p-1 w-32 text-sm focus:ring-2 focus:ring-blue-500"
                                      value={editLabForm.cost}
                                      onChange={(e) => setEditLabForm({ ...editLabForm, cost: e.target.value })}
                                    />
                                  ) : (
                                    <span className="font-bold text-slate-700">{currentCost} PKR</span>
                                  )}
                                </td>
                                <td className="p-3 text-right">
                                  {isEditingLab ? (
                                    <div className="flex justify-end space-x-1.5">
                                      <button
                                        onClick={() => handleUpdateLabTest(test._id, currentName)}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-2 py-1 rounded transition"
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingLabTestId(null)}
                                        className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium text-xs px-2 py-1 rounded transition"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex justify-end space-x-2">
                                      <button
                                        onClick={() => {
                                          setEditingLabTestId(testIdentifier);
                                          setEditLabForm({ name: currentName, cost: currentCost });
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-medium text-xs bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md transition"
                                      >
                                        Edit
                                      </button>
                                      <button
                                        onClick={() => handleRemoveLabTest(currentName)}
                                        className="text-rose-600 hover:text-rose-800 font-medium text-xs bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-md transition"
                                      >
                                        Deregister
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* Custom High-Fidelity Matching Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 transform transition-all duration-200 scale-100">
            <div className="flex items-start gap-4">
              <div className="bg-rose-50 p-3 rounded-xl text-rose-600 shrink-0 border border-rose-100">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{confirmModal.title}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{confirmModal.message}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmModal({ isOpen: false, title: '', message: '', onConfirm: null })}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-rose-100"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}