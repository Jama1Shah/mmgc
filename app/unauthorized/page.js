'use client';

import { useRouter } from 'next/navigation';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center p-6 font-sans">
      <title>Unauthorized - MMGC</title>
      <div className="max-w-md w-full bg-white border border-slate-100 rounded-2xl shadow-xl shadow-slate-100/50 p-8 text-center transition-all duration-300 hover:shadow-2xl hover:shadow-slate-200/40">
        
        {/* Shield Icon Graphic */}
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={1.5} 
            stroke="currentColor" 
            className="w-10 h-10"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        {/* Text Content */}
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">
          Access Denied
        </h1>
        <p className="text-sm text-slate-500 font-medium leading-relaxed mb-8">
          You do not have the required permissions to access this department portal. Please contact the system administrator if you believe this is an error.
        </p>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-red-600 text-white font-semibold text-sm py-3.5 px-4 rounded-xl shadow-sm hover:bg-red-500 active:scale-[0.99] transition-all duration-200"
          >
            Go Back
          </button>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-slate-50 text-slate-600 font-medium text-sm py-3.5 px-4 rounded-xl border border-slate-100 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.99] transition-all duration-200"
          >
            Login with Different Account
          </button>
        </div>

        {/* Footer Brand tag */}
        <div className="mt-8 pt-6 border-t border-slate-50">
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase">
            MMGC Hospital Security System
          </span>
        </div>

      </div>
    </div>
  );
}