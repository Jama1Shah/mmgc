'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function TermsOfService() {
  return (
    <div className="flex flex-col min-h-screen">
      <title>Terms of Services - MMGC</title>
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

          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Services</h1>
          <p className="text-gray-400 mb-10 italic text-sm">Last Updated: April 2026</p>

          <div className="space-y-10 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using the MMGC Healthcare system, you agree to comply with and be bound by these Terms of Service. 
                Our platform is designed to streamline healthcare management, and your use constitutes a formal agreement to these guidelines. 
                If you do not agree, please do not use the system.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Medical Disclaimer</h2>
              <div className="bg-blue-50 border-l-4 border-[#357DF9] p-5 rounded-r-lg text-sm text-blue-900">
                <span className="font-bold uppercase tracking-wide block mb-1 text-[#357DF9]">Important Notice:</span>
                This system is a administrative management tool. In the event of a medical emergency, 
                please contact your local emergency services immediately. The platform does not 
                provide automated emergency diagnosis or urgent medical intervention.
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. User Responsibilities</h2>
              <p>As a user of this healthcare platform, you are responsible for maintaining the integrity of the system by:</p>
              <ul className="list-disc pl-6 mt-3 space-y-3 marker:text-[#357DF9]">
                <li>Protecting the confidentiality of your unique login credentials and password.</li>
                <li>Ensuring all medical data and personal information provided is accurate and truthful.</li>
                <li>Notifying the administration immediately if you suspect unauthorized access to your account.</li>
                <li>Complying with all local and international healthcare data regulations.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Account Termination</h2>
              <p>
                To maintain a safe environment for all patients and practitioners, we reserve the right 
                to suspend or terminate accounts that violate our safety policies, misuse data, 
                or provide fraudulent medical information.
              </p>
            </section>

            <section className="pt-6 border-t border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Contact Us</h2>
              <p>
                If you have questions regarding these terms or require clarification on our policies, 
                please reach out to the MMGC administration team:
              </p>
              <div className="mt-4 p-4 bg-gray-50 rounded-xl inline-block border border-gray-200">
                <p className="font-semibold text-gray-900">Email: <Link href="mailto:contact@mmgc-health.com" className="text-[#357DF9]">contact@mmgc-health.com</Link></p>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}