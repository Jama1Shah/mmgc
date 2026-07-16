"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Added to check current page

const Navbar = () => {
  const pathname = usePathname();

  const handleHomeClick = (e) => {
    // If we are already on home, just scroll up and don't "reload" the route
    if (pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className='flex items-center justify-between px-6 py-2 bg-white shadow-md sticky top-0 z-50'>
      
      {/* Logo + Name */}
      <div className='flex items-center gap-2'>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-blue-500"
        >
          <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>
        <span className='text-xl font-semibold text-gray-800 tracking-tight'>
          MMGC HealthCare
        </span>
      </div>

      {/* Navigation Links */}
      <div className='flex items-center gap-6'>
        <Link 
          href="/" 
          onClick={handleHomeClick} 
          className='text-gray-600 hover:text-blue-500 font-medium transition-colors'
        >
          Home
        </Link>
        <Link 
          href="/login" 
          className='text-gray-600 hover:text-blue-500 font-medium transition-colors'
        >
          Login
        </Link>
        <Link 
          href="/register" 
          className='bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 shadow-sm active:scale-95 transition-all'
        >
          Register
        </Link>
      </div>

    </nav>
  );
};

export default Navbar;