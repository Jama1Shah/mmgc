'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  Activity,
  X,
  Settings
} from 'lucide-react';

const NurseSidebar = ({ isOpen, setIsOpen }) => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { icon: <LayoutDashboard size={20} />, label: "Nursing Station", href: "/nurse-dashboard" },
    { icon: <Settings size={20} />, label: "Account Settings", href: "/nurse-dashboard/settings" },
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[110] lg:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 h-screen bg-white border-r border-slate-200 z-[120] w-64 flex flex-col
        transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:sticky lg:top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>

        {/* Brand Section */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-[#357DF9] p-1.5 rounded-lg text-white">
              <Activity size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-800">MMGC</h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold -mt-1">Nursing Dept</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1 text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <SidebarLink
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={pathname === item.href}
              setIsOpen={setIsOpen}
            />
          ))}
        </nav>

        {/* Updated Logout Section */}
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
  );
};

const SidebarLink = ({ icon, label, href, active, setIsOpen }) => (
  <Link
    href={href}
    onClick={() => setIsOpen(false)}
    className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 group ${active
      ? 'bg-[#357DF9] text-white shadow-md shadow-blue-200'
      : 'text-slate-500 hover:bg-slate-50 hover:text-[#357DF9]'
      }`}
  >
    <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-[#357DF9]'} transition-colors`}>
      {icon}
    </span>
    <span className="text-sm font-semibold tracking-wide">{label}</span>
  </Link>
);

export default NurseSidebar;