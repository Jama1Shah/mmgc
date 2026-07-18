<div align="center">

# 🏥 MMGC — Hospital Management System

A comprehensive, full-stack hospital management web application designed to digitize healthcare operations, patient record management, and administrative workflows.

*Developed as a final-year academic project.*

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?logo=next.js)](https://nextjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://mmgc.vercel.app)
[![License](https://img.shields.io/badge/License-Academic%20Use%20Only-lightgrey)](#-license)

**[🔗 Live Demo](https://mmgc.vercel.app)**

</div>

---

## 📋 Table of Contents

1. [Overview](#-overview)
2. [Features](#-features)
3. [Tech Stack](#️-tech-stack)
4. [Project Structure](#-project-structure)
5. [Environment Variables](#-environment-variables)
6. [Installation & Setup](#️-installation--setup)
7. [Deployment](#-deployment-vercel)
8. [Contributors](#-contributors)
9. [License](#-license)

---

## 🔍 Overview

MMGC serves as a centralized platform for hospital administration, enabling efficient tracking of patient data, secure authentication, and role-based access for staff and patients. The system was built to provide a scalable, secure, and user-friendly digital environment for clinical management.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Secure Authentication** | User registration and login using `bcryptjs` for robust password hashing |
| 👥 **Role-Based Access Control** | Distinct dashboards and permissions for Admins, Doctors, Nurse, Lab Staff, Billing Staff and Patients |
| ✉️ **Account Verification** | Automated email verification via `Nodemailer` and custom crypto tokens |
| 🔑 **Password Management** | Secure "Forgot Password" flow with tokenized resets |
| ⚙️ **Administrative Tools** | Automated admin account seeding and full user CRUD operations |
| 🗄️ **Database Integration** | Scalable, cloud-hosted data storage powered by MongoDB Atlas |

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **Language** | JavaScript |
| **Database** | MongoDB Atlas (via Mongoose) |
| **Auth** | `next-auth`, `bcryptjs` |
| **Email Service** | Nodemailer |
| **Validation** | Zod |
| **Styling** | Tailwind CSS |
| **Deployment** | Vercel |

---

## 📁 Project Structure

```
mmgc/
├── app/            # Next.js App Router pages, layouts, and API routes
├── components/     # Reusable UI components
├── lib/            # Utility functions, DB connection, auth helpers
├── models/         # Mongoose schemas/models (User, Patient, etc.)
├── public/         # Static assets (images, icons)
├── schemas/        # Zod validation schemas
├── scripts/        # Utility scripts (e.g. initial admin seeding)
└── proxy.js        # Prevents unauthorized access
```

---

## 🔑 Environment Variables

Create a `.env` file in the project root with the following variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_URL` | Base URL used by NextAuth |
| `NEXTAUTH_SECRET` | Secret used to sign NextAuth sessions |
| `AUTH_URL` | Auth.js v5 compatibility — app base URL |
| `AUTH_SECRET` | Auth.js v5 compatibility — session secret |
| `AUTH_TRUST_HOST` | Set to `true` to trust the host header (required for deployment) |
| `EMAIL_USER` | Email account used to send verification/reset emails |
| `EMAIL_PASS` | App password / credential for the email account |
| `NEXT_PUBLIC_APP_URL` | Publicly exposed app URL (client-side) |
| `INITIAL_ADMIN_PASSWORD` | One-time passphrase for the initial admin seed |

> ⚠️ **Security note:** Change or remove `INITIAL_ADMIN_PASSWORD` immediately after the first successful admin login.

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js v18 or later
- npm
- A MongoDB Atlas cluster (or local MongoDB instance)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Jama1Shah/mmgc.git
   cd mmgc
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory using the table in [Environment Variables](#-environment-variables).

4. **Seed the initial admin account**
   ```bash
   node scripts/[seed-script-name].js
   ```
   > ⚠️ Change or remove `INITIAL_ADMIN_PASSWORD` after the first successful admin login.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## 🚀 Deployment (Vercel)

This project is deployed on [Vercel](https://mmgc.vercel.app). Pushes to `main` trigger an automatic build and deployment.

To deploy your own instance:
1. Import the repository into [Vercel](https://vercel.com/new).
2. Add all variables from [Environment Variables](#-environment-variables) to your Vercel project settings.
3. Deploy.

---

## 🤝 Contributors

- [Jamal Shah](https://github.com/Jama1Shah) — Full-stack development, architecture, and implementation
- Rehanullah — Project team member

*(Contribution breakdown pending confirmation with course instructor)*

---

## 📄 License

This project was developed for academic purposes as part of a final-year university project. All rights reserved. Not licensed for reuse or redistribution without permission.