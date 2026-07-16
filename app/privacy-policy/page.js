'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function PrivacyPolicy() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      <main className="flex-grow bg-gray-50 font-['DM_Sans',sans-serif] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-sm border border-gray-100">
          <Link 
            href="/" 
            className="text-[#357DF9] hover:text-blue-700 transition-colors text-sm font-medium mb-8 inline-flex items-center gap-2"
          >
            <span>←</span> Back to Home
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-400 mb-10 italic text-sm">Last Updated: April 2026</p>

          <div className="space-y-10 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>
                MMGC Healthcare ("we," "us," or "our") is committed to protecting your personal and medical information. 
                This policy explains how we collect, use, and safeguard the data within our Medical Management & General Care System. 
                Your privacy is paramount to our healthcare service delivery.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <p>To provide high-quality medical management, we collect the following categories of information:</p>
              <ul className="list-disc pl-6 mt-3 space-y-3 marker:text-[#357DF9]">
                <li><strong>Personal Identification:</strong> Name, email address, phone number, and date of birth.</li>
                <li><strong>Medical Records:</strong> Patient history, diagnoses, prescriptions, and appointment details.</li>
                <li><strong>Technical Data:</strong> IP address, browser type, and usage patterns to improve system performance.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Data</h2>
              <p>Your information is used strictly for healthcare services, including:</p>
              <div className="mt-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#357DF9] shrink-0" />
                  <p>Managing patient consultations and digital appointments.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#357DF9] shrink-0" />
                  <p>Maintaining accurate medical records for authorized doctor review.</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#357DF9] shrink-0" />
                  <p>Sending essential notifications and reminders regarding your care.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Security</h2>
              <div className="bg-blue-50 border-l-4 border-[#357DF9] p-5 rounded-r-lg text-sm text-blue-900">
                <span className="font-bold uppercase tracking-wide block mb-1 text-[#357DF9]">Security Protocol:</span>
                We implement advanced encryption and industry-standard security protocols to prevent 
                unauthorized access. As a healthcare provider, we prioritize the confidentiality 
                and integrity of all medical data stored within the MMGC ecosystem.
              </div>
            </section>

            <section className="pt-6 border-t border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Access & Support</h2>
              <p>
                If you have questions about your data privacy or wish to request a summary of your 
                stored information, please contact our privacy compliance team:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-xl inline-block border border-gray-200">
                <p className="font-semibold text-gray-900">Support: <Link href="mailto:privacy-policy@mmgc-health.com" className="text-[#357DF9]">privacy-policy@mmgc-health.com</Link></p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}