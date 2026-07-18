# MMGC - Hospital Management System

A comprehensive, full-stack hospital management web application designed to digitize healthcare operations, patient record management, and administrative workflows. Developed as a final-year academic project.

---

## 🚀 Live Demo
Live Application: mmgc.vercel.app

---

## 📋 Table of Contents
1. [Overview](#-overview)
2. [Features](#-features)
3. [Tech Stack](#-tech-stack)
4. [Environment Variables](#-environment-variables)
5. [Project Structure](#-project-structure)
6. [Installation & Setup](#-installation--setup)
7. [Contributors](#-contributors)
8. [License](#-license)

---

## 🔍 Overview
MMGC serves as a centralized platform for hospital administration, enabling efficient tracking of patient data, secure authentication, and role-based access for staff and patients. The system was built to provide a scalable, secure, and user-friendly digital environment for clinical management.

---

## ✨ Features
*   **Secure Authentication:** User registration and login utilizing `bcryptjs` for robust password hashing.
*   **Role-Based Access Control (RBAC):** Distinct dashboards and permissions for Admins, Doctors, and Patients.
*   **Account Verification:** Automated email verification system using `Nodemailer` and custom crypto tokens.
*   **Password Management:** Secure "Forgot Password" flow with tokenized resets.
*   **Administrative Tools:** Automated admin account seeding and user management (CRUD operations).
*   **Database Integration:** Scalable data storage powered by MongoDB Atlas.

---

## 🛠️ Tech Stack
*   **Framework:** Next.js (App Router)
*   **Language:** JavaScript/TypeScript
*   **Database:** MongoDB Atlas (via Mongoose)
*   **Security:** `bcryptjs` (Password Hashing), `next-auth`
*   **Email Service:** Nodemailer
*   **Validation:** Zod
*   **Styling:** 
*   **Deployment:** Vercel

---

## 🔑 Environment Variables
To run this project, you will need to add the following environment variables to your `.env` file:

```
MONGODB_URI
NEXTAUTH_URL
NEXTAUTH_SECRET

# Auth.js v5 Compatibility Configurations
AUTH_URL
AUTH_SECRET
AUTH_TRUST_HOST=true

EMAIL_USER
EMAIL_PASS
NEXT_PUBLIC_APP_URL

# Initial System Admin Setup Passphrase
INITIAL_ADMIN_PASSWORD
```

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
└── proxy.js        # 
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18 or later recommended)
- npm / yarn / pnpm
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
   Create a `.env` file in the root directory and add the variables listed in the [Environment Variables](#-environment-variables) section above.

4. **Seed the initial admin account**
   ```bash
   node scripts/
   ```
   > ⚠️ Change or remove `INITIAL_ADMIN_PASSWORD` after the first successful admin login for security.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to see the result.

---

## 🤝 Contributors

- [ ]( ) — 

---

## 📄 License