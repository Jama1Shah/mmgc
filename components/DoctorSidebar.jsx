"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Users, 
  Calendar, 
  ClipboardList,
  LucideFlaskConical,
  LogOut, 
  Activity,
  X,
  Hospital,
  Settings 
} from 'lucide-react';

const DoctorSidebar = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: <Users size={20}/>, label: "Patient Registry", href: "/doctor-dashboard" },
    { icon: <Calendar size={20}/>, label: "Daily Schedule", href: "/doctor-dashboard/daily-schedule" },
    { icon: <ClipboardList size={20}/>, label: "Prescriptions", href: "/doctor-dashboard/prescriptions" },
    { icon: <LucideFlaskConical size={20}/>, label: "Lab Tests", href: "/doctor-dashboard/assign-lab-test" },
    { icon: <Activity size={20}/>, label: "Lab Analytics", href: "/doctor-dashboard/lab-analytics" },
    { icon: <Hospital size={20}/>, label: "Admitted Patients", href: "/doctor-dashboard/admitted-patients" },
    { icon: <Settings size={20}/>, label: "Account Settings", href: "/doctor-dashboard/settings" },
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
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* MATCHED CLASSES TO ADMIN SIDEBAR */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-64 bg-white border-r border-slate-200 
        flex flex-col transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Brand Section */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-1.5 rounded-lg">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800">MMGC</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold -mt-1">Healthcare</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href} 
              onClick={() => setIsOpen(false)}
              className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${
                pathname === item.href 
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-blue-600'
              }`}
            >
              <span className={`${pathname === item.href ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`}>
                {item.icon}
              </span>
              <span className="text-sm font-semibold tracking-wide">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout Section - Now pushed to bottom by mt-auto and lg:h-screen */}
        <div className="p-4 border-t border-slate-100 mt-auto shrink-0">
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
  );
};

export default DoctorSidebar;