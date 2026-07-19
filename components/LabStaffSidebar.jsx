'use client';
import React from 'react'
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
    Beaker, 
    Settings, 
    LogOut, 
    Activity,
    X
} from 'lucide-react';

const LabStaffSidebar = ({ isOpen, setIsOpen }) => {
    const pathname = usePathname();
    const router = useRouter();

    const navLinks = [
        { name: 'Lab Requests', href: '/labstaff-dashboard', icon: <Beaker size={20} /> },
        { name: 'Settings', href: '/labstaff-dashboard/settings', icon: <Settings size={20} /> },
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
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden transition-opacity duration-300"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside className={`
                fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
                lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
                ${isOpen ? "translate-x-0" : "-translate-x-full"}
            `}>
                
                {/* Logo Section */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-[#357DF9] p-1.5 rounded-lg">
                            <Activity className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-slate-800">MMGC</h2>
                            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold -mt-1">Healthcare</p>
                        </div>
                    </div>
                    {/* Close Button for Mobile */}
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600 p-1">
                        <X size={24} />
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
                                onClick={() => setIsOpen(false)}
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

export default LabStaffSidebar;