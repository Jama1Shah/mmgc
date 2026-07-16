import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  ClipboardList, 
  Settings, 
  LogOut 
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

const Sidebar = () => {
  const router = useRouter();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', href: '/doctor-dashboard' },
    { icon: <Calendar size={20} />, label: 'Appointments', href: '/appointments' },
    { icon: <Users size={20} />, label: 'My Patients', href: '/patients' },
    { icon: <ClipboardList size={20} />, label: 'Reports', href: '/reports' },
    { icon: <Settings size={20} />, label: 'Settings', href: '/settings' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 transition-all">
      <div className="p-8">
        <h1 className="text-2xl font-bold text-blue-600 tracking-tight">MMGC</h1>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">
          Healthcare System
        </p>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link 
              key={item.label} 
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}>
                {item.icon}
              </span>
              <span className="font-semibold text-sm">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors font-semibold text-sm">
          <LogOut size={20} />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;