'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

const services = [
  {
    title: "Appointment Booking",
    description: "Easily schedule, reschedule, or cancel appointments with specialists through our intuitive patient portal.",
    icons: {
      icon: '/mmgc-svg.svg',
      shortcut: '/mmgc-svg.svg',
      apple: '/mmgc-svg.svg',
    },
  },
  {
    title: "Patient Records",
    description: "Secure, digital storage for medical history, lab results, and immunization records, accessible to authorized doctors.",
    icons: {
      icon: '/mmgc-svg.svg',
      shortcut: '/mmgc-svg.svg',
      apple: '/mmgc-svg.svg',
    },
  },
  {
    title: "Online Consultation",
    description: "Connect with healthcare professionals from the comfort of your home via secure video and chat integrations.",
    icons: {
      icon: '/mmgc-svg.svg',
      shortcut: '/mmgc-svg.svg',
      apple: '/mmgc-svg.svg',
    },
  },
  {
    title: "Billing & Invoices",
    description: "Transparent billing system where patients can view their treatment costs and pay invoices securely online.",
    icons: {
      icon: '/mmgc-svg.svg',
      shortcut: '/mmgc-svg.svg',
      apple: '/mmgc-svg.svg',
    },
  },
];

export default function ServicesPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <title>Our Services - MMGC</title>
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