'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white font-['DM_Sans',sans-serif]">
      <title>About - MMGC</title>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50">
        <Navbar />
      </header>

      {/* Hero Section */}
      <section className="bg-[#357DF9] py-20 px-6 text-center text-white">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 text-white">
          About MMGC Healthcare
        </h1>
        <p className="text-blue-100 max-w-2xl mx-auto text-lg">
          Revolutionizing medical management through technology and compassionate care.
        </p>
      </section>

      {/* Main Content Section */}
      <main className="max-w-5xl mx-auto py-16 px-6">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed mb-4">
              MMGC Healthcare (Medical Management & General Care) was developed to streamline the often complex 
              interactions between healthcare providers and patients. Our goal is to provide a seamless, 
              secure, and efficient digital environment for managing medical records and consultations.
            </p>
            <p className="text-gray-600 leading-relaxed">
              We believe that technology should empower doctors to focus on what matters most: saving lives 
              and providing high-quality care to their patients.
            </p>
          </div>
          <div className="bg-gray-100 rounded-3xl p-8 flex items-center justify-center min-h-[250px]">
             <div className="text-[#357DF9] text-6xl font-bold tracking-tight">MMGC</div>
          </div>
        </div>

        {/* Core Values Grid */}
        <section className="mt-20 grid sm:grid-cols-3 gap-8">
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="text-[#357DF9] font-bold text-xl mb-2">Security</div>
            <p className="text-sm text-gray-500">
              Patient data is encrypted and handled with the highest standards of privacy.
            </p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="text-[#357DF9] font-bold text-xl mb-2">Efficiency</div>
            <p className="text-sm text-gray-500">
              Fast appointment booking and instant access to medical history for doctors.
            </p>
          </div>
          <div className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <div className="text-[#357DF9] font-bold text-xl mb-2">Accessibility</div>
            <p className="text-sm text-gray-500">
              A user-friendly interface designed for patients of all ages and backgrounds.
            </p>
          </div>
        </section>

        {/* Call to Action */}
        <div className="mt-20 text-center">
          <Link 
            href="/register" 
            className="inline-block bg-[#357DF9] text-white px-8 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg"
          >
            Join Our Community
          </Link>
        </div>
      </main>
    </div>
  );
}