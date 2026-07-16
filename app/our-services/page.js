'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const services = [
  {
    title: "Appointment Booking",
    description: "Easily schedule, reschedule, or cancel appointments with specialists through our intuitive patient portal.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    title: "Patient Records",
    description: "Secure, digital storage for medical history, lab results, and immunization records, accessible to authorized doctors.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: "Online Consultation",
    description: "Connect with healthcare professionals from the comfort of your home via secure video and chat integrations.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
  },
  {
    title: "Billing & Invoices",
    description: "Transparent billing system where patients can view their treatment costs and pay invoices securely online.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z" />
      </svg>
    ),
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      <main className="flex-grow bg-gray-50 font-['DM_Sans',sans-serif]">
        <title>Our Services - MMGC</title>

        {/* Hero Section */}
        <div className="bg-[#1D1E20] py-24 px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Our Services</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            We provide a comprehensive digital ecosystem for modern healthcare, ensuring 
            efficiency for doctors and convenience for patients.
          </p>
        </div>

        {/* Services Grid */}
        <div className="max-w-7xl mx-auto py-20 px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <div 
                key={index} 
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
              >
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#357DF9] mb-6 group-hover:bg-[#357DF9] group-hover:text-white transition-all duration-300">
                  {service.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div className="max-w-5xl mx-auto mb-20 px-6">
          <div className="bg-[#357DF9] rounded-[2.5rem] p-10 md:p-16 text-center text-white shadow-2xl shadow-blue-200">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Need a custom solution?</h2>
            <p className="text-blue-50 mb-10 max-w-xl mx-auto text-lg opacity-90">
              Our medical management system is fully scalable. Contact our administration for 
              tailored features specific to your hospital or clinic's requirements.
            </p>
            <Link 
              href="/register" 
              className="bg-white text-[#357DF9] px-10 py-4 rounded-xl font-bold hover:bg-gray-100 active:scale-95 transition-all inline-block shadow-lg"
            >
              Get Started Now
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}