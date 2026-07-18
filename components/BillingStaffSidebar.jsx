"use client";

import React from 'react'
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Receipt, 
  History, 
  LogOut, 
  Activity,
  Settings,
  X 
} from 'lucide-react';

const BillingStaffSidebar = ({ isOpen, setIsOpen }) => {
    const pathname = usePathname();
    const router = useRouter();

    const navLinks = [
        { name: 'Billing Overview', href: '/billingstaff-dashboard', icon: <BarChart3 size={20} /> },
        { name: 'Pending Invoices', href: '/billingstaff-dashboard/pending-bills', icon: <Receipt size={20} /> },
        { name: 'Payment Records', href: '/billingstaff-dashboard/billing-records', icon: <History size={20} /> },
        { name: 'Settings', href: '/billingstaff-dashboard/settings', icon: <Settings size={20} /> },
    ];

    const handleLogout = (e) => {
        e.preventDefault();
        setIsOpen(false);

        // 1. Clear active operational session storage
        sessionStorage.clear();

        // 2. Clear persistent history backups completely
        localStorage.removeItem('user');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('token');
        localStorage.removeItem('role');

        // 3. Clear client-side auth cookies explicitly
        document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

        // 4. Redirect cleanly back to the login/landing gateway
        router.push('/');
    };

    return (
        <>
            {/* Mobile Overlay Background */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed lg:sticky top-0 left-0 z-[70]
                flex flex-col w-64 bg-white border-r border-slate-200 h-screen 
                transition-transform duration-300 ease-in-out
                ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            `}>
                
                {/* Logo Section */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#357DF9] p-1.5 rounded-lg">
                            <Activity className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-800">MMGC</h2>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold -mt-1">Billing Dept</p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 p-4 space-y-2 mt-4">
                    {navLinks.map((link) => {
                        const isActive = pathname === link.href;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsOpen(false)} // Close on click for mobile
                                className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
                                    isActive
                                        ? "bg-[#357DF9] text-white shadow-md shadow-blue-200"
                                        : "text-slate-500 hover:bg-slate-50 hover:text-[#357DF9]"
                                }`}
                            >
                                <span className={`${isActive ? 'text-white' : 'text-slate-400 group-hover:text-[#357DF9]'} transition-colors`}>
                                    {link.icon}
                                </span>
                                <span className="text-sm font-semibold tracking-wide">
                                    {link.name}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Logout Section */}
                <div className="p-4 border-t border-slate-100">
                    <Link 
                        href="/" 
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all group font-semibold text-sm"
                    >
                        <LogOut size={20} className="group-hover:translate-x-1 transition-transform duration-200" />
                        <span>Log Out</span>
                    </Link>
                </div>
            </aside>
        </>
    )
}

export default BillingStaffSidebar;