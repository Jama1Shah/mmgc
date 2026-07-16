'use client';
import React from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation'; // Added for consistent scroll logic

const Footer = () => {
    const pathname = usePathname();

    const handleHomeClick = (e) => {
        if (pathname === '/') {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <footer className="bg-[#1D1E20] text-gray-400">
            <div className="max-w-7xl mx-auto px-6 py-12 grid gap-10 md:grid-cols-4 border-b border-gray-800">

                {/* Column 1: Logo & About */}
                <div>
                    <h2 className="text-2xl font-bold text-white mb-4">MMGC Healthcare</h2>
                    <p className="text-sm leading-relaxed">
                        A modern hospital management system designed to simplify patient
                        care, appointments, and medical records efficiently.
                    </p>
                </div>

                {/* Column 2: Quick Links */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Quick Links</h3>
                    <ul className="space-y-2 text-sm">
                        {/* Updated Home Link Logic */}
                        <li>
                            <Link 
                                href="/" 
                                onClick={handleHomeClick} 
                                className="hover:text-white transition-colors"
                            >
                                Home
                            </Link>
                        </li>
                        <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                        <li><Link href="/our-services" className="hover:text-white transition-colors">Our Services</Link></li>
                    </ul>
                </div>

                {/* Column 3: Account */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
                    <ul className="space-y-2 text-sm">
                        <li><Link href="/login" className="hover:text-white transition-colors">Login</Link></li>
                        <li><Link href="/register" className="hover:text-white transition-colors">Create Account</Link></li>
                    </ul>
                </div>

                {/* Column 4: Contact Information */}
                <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Contact Us</h3>
                    <div className="flex flex-col gap-3 text-sm">
                        {/* Phone */}
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#357DF9]">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                            <Link href="tel:+921234567899" className="hover:text-white transition-colors">
                                +92-123-4567899
                            </Link>
                        </div>

                        {/* Email */}
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#357DF9]">
                                <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                            </svg>
                            <Link href="mailto:contact@mmgc-health.com" className="hover:text-white transition-colors">
                                contact@mmgc-health.com
                            </Link>
                        </div>

                        {/* Address */}
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#357DF9]">
                                <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <Link href="https://www.google.com/maps/search/?api=1&query=123+Medical+Center+Dr,+City" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                123 Medical Center Dr, City
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col sm:flex-row justify-between items-center text-sm">
                <p>© {new Date().getFullYear()} MMGC Healthcare. All rights reserved.</p>

                <div className="flex gap-6 mt-3 sm:mt-0">
                    <Link href="/privacy-policy" className="hover:text-white transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="/terms-of-services" className="hover:text-white transition-colors">
                        Terms of Services
                    </Link>
                </div>
            </div>
        </footer>
    );
};

export default Footer;