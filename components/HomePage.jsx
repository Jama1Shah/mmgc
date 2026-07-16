"use client";

import Link from "next/link";
import { usePathname } from 'next/navigation';

export default function HomePage() {
    const pathname = usePathname();

    // Smooth scroll for internal jumps if already on home
    const handleHomeClick = (e) => {
        if (pathname === '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <main className="flex-1">
            {/* HERO SECTION */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{
                        opacity: 0.5,
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1580281657702-257584239a55')",
                    }}
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/70"></div>
                </div>

                {/* Content */}
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                            Modern healthcare management for better patient outcomes
                        </h1>

                        <p className="text-lg md:text-xl text-muted-foreground mb-8">
                            Streamline your healthcare operations with our comprehensive
                            management system. Secure, efficient, and designed for modern
                            medical practices.
                        </p>

                        <div className="flex flex-col pb-3 sm:flex-row gap-4">
                            <Link href="/register">
                                <button className="px-8 py-2 bg-blue-500 rounded-md hover:cursor-pointer hover:bg-blue-600 transition text-white shadow-lg active:scale-95">
                                    Get started
                                </button>
                            </Link>

                            <Link href="/login">
                                <button className="px-8 py-2 bg-blue-500 rounded-md hover:cursor-pointer hover:bg-blue-600 transition text-white shadow-lg active:scale-95">
                                    Login to your account
                                </button>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className="py-20 bg-secondary">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Built for healthcare professionals
                    </h2>
                    <p className="text-muted-foreground mb-16 max-w-2xl mx-auto">
                        Everything you need to manage patient care and operations in one
                        platform.
                    </p>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto text-left">
                        {features.map((item, i) => (
                            <div
                                key={i}
                                className="p-6 border flex flex-col rounded-xl bg-white shadow hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    {item.icon}
                                    <h3 className="text-xl font-semibold">
                                        {item.title}
                                    </h3>
                                </div>
                                <p className="text-muted-foreground">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
            
            <hr className="border-gray-100" />

            {/* ROLES */}
            <section className="py-20">
                <div className="container mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <h2 className="text-3xl font-bold mb-6">
                            Role-based access for your entire team
                        </h2>

                        <ul className="space-y-4 flex flex-col border-l-2 border-blue-500 pl-6">
                            {roles.map((role, i) => (
                                <li key={i} className="group">
                                    <div className="flex items-center gap-2 mb-1">
                                        {role.icon}
                                        <p className="font-semibold text-gray-800">{role.title}</p>
                                    </div>
                                    <p className="text-sm text-muted-foreground group-hover:text-gray-600 transition-colors">
                                        {role.desc}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Stats Box */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-8 rounded-2xl space-y-6 shadow-inner">
                        {stats.map((item, i) => (
                            <div key={i} className="bg-white flex flex-col p-6 rounded-xl shadow-md hover:translate-x-2 transition-transform">
                                <div className="flex items-center gap-2 mb-1">
                                    {item.icon}
                                    <p className="font-bold text-lg text-gray-800">{item.value}</p>
                                </div>
                                <p className="text-sm text-muted-foreground">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-blue-500 text-white text-center">
                <div className="max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Ready to transform your healthcare operations?
                    </h2>

                    <p className="mb-8 opacity-90 text-lg">
                        Join professionals who trust MMGC Healthcare.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/register">
                            <button className="border-2 border-white px-8 py-3 rounded-md font-semibold hover:bg-white/10 transition active:scale-95">
                                Create your account
                            </button>
                        </Link>

                        <Link href="/login">
                            <button className="border-2 border-white px-8 py-3 rounded-md font-semibold hover:bg-white/10 transition active:scale-95">
                                Login
                            </button>
                        </Link>
                    </div>
                </div>
            </section>
        </main>
    );
}

/* DATA - Kept exactly as provided */
const features = [
    {
        title: "Multi-role access control",
        desc: "Admins, doctors, nurses, lab staff, billing staff and patients with secure permissions.",
        icon: (
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-8 w-8 text-blue-500 block"
            >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        ),
    },
    {
        title: "Comprehensive medical records",
        desc: "Complete patient history, diagnoses, and prescriptions.",
        icon: (
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
                className="h-8 w-8 text-blue-500 block"
            >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                <path d="M10 9H8"></path>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
            </svg>
        ),
    },
    {
        title: "HIPAA compliant security",
        desc: "Enterprise-grade security for patient data protection.",
        icon: (
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
                className="h-8 w-8 text-blue-500 block"
            >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
            </svg>
        ),
    },
    {
        title: "Real-time updates",
        desc: "Instant synchronization across all departments.",
        icon: (
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
                className="h-8 w-8 text-blue-500 block"
            >
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
        ),
    },
];

const roles = [
    {
        title: "Doctors",
        desc: "Manage patient records and prescriptions.",
        icon: (<svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1"
        >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>),
    },
    {
        title: "Nurses",
        desc: "Monitor patient care and vital signs.",
        icon: (<svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1"
        >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>),
    },
    {
        title: "Lab Staff",
        desc: "Upload and manage test results.",
        icon: (<svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1"
        >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>),
    },
    {
        title: "Billing Staff",
        desc: "Seamlessly handle invoices and payments.",
        icon: (<svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1"
        >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>),
    },
    {
        title: "Patients",
        desc: "Access personal health records.",
        icon: (<svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-blue-600 bg-blue-100 rounded-full p-1"
        >
            <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"></path>
        </svg>),
    },
];

const stats = [
    {
        value: "2,847 patients",
        label: "Active in system",
        icon: (
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
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
        )
    },
    {
        value: "12,483 records", label: "Medical records managed",
        icon: (
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
                className="h-6 w-6 text-red-500"
            >
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"></path>
                <path d="M14 2v4a2 2 0 0 0 2 2h4"></path>
                <path d="M10 9H8"></path>
                <path d="M16 13H8"></path>
                <path d="M16 17H8"></path>
            </svg>
        )
    },
    {
        value: "100% secure", label: "HIPAA compliant",
        icon: (
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
                className="h-6 w-6 text-green-500"
            >
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
            </svg>
        )
    },
];