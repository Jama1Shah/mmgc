'use client';

import { useEffect } from 'react';

export default function TabCookieSync() {
  useEffect(() => {
    function syncTabCookies() {
      try {
        var token = sessionStorage.getItem('token');
        var role = sessionStorage.getItem('role');
        if (token && role) {
          document.cookie = "token=" + token + "; path=/; max-age=86400; Secure; SameSite=Strict";
          document.cookie = "role=" + role + "; path=/; max-age=86400; Secure; SameSite=Strict";
        }
      } catch (e) {
        console.error("Cookie sync failed", e);
      }
    }

    // Sync immediately on initial script execution inside the browser
    syncTabCookies();

    // Sync whenever user clicks or focuses back onto this specific tab
    window.addEventListener('focus', syncTabCookies);
    window.addEventListener('click', syncTabCookies);

    return () => {
      window.removeEventListener('focus', syncTabCookies);
      window.removeEventListener('click', syncTabCookies);
    };
  }, []);

  return null; // This component handles background logic and renders nothing visual
}