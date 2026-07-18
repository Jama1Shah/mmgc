'use client';

import { useEffect } from 'react';

export default function SessionInitializer() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const backupEmail = localStorage.getItem('userEmail');
      const activeSession = sessionStorage.getItem('userEmail');

      // If the session died because the tab/browser closed, but backup data exists:
      if (backupEmail && !activeSession) {
        sessionStorage.setItem('userEmail', backupEmail);
        sessionStorage.setItem('user', localStorage.getItem('user') || '');
        sessionStorage.setItem('token', localStorage.getItem('token') || '');
        sessionStorage.setItem('role', localStorage.getItem('role') || '');
      }
    }
  }, []);

  return null; // This component operates silently in the background
}