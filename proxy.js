import { NextResponse } from 'next/server';

// 1. Group page routes by the exact lowercase role allowed to access them
const ROLE_ROUTES = {
  admin: ['/admin-dashboard'],
  doctor: ['/doctor-dashboard'],
  patient: ['/patient-dashboard'],
  nurse: ['/nurse-dashboard'],
  'lab staff': ['/labstaff-dashboard'],    
  'billing staff': ['/billingstaff-dashboard'], 
};

// 2. CHANGED: Renamed function export from 'middleware' to 'proxy'
export function proxy(request) {
  const { pathname } = request.nextUrl;

  // 3. Retrieve cookies and FORCE lowercase to eliminate casing bugs
  // FIX: Multi-tab isolation support via tab-prefixed cookies, headers, or query params
  const tabId = request.headers.get('x-tab-id') || request.nextUrl.searchParams.get('tabId');
  
  let token = request.cookies.get('token')?.value;
  let userRole = request.cookies.get('role')?.value?.toLowerCase(); 

  // Fallback 1: Check for tab-isolated cookies (e.g., token_tab123)
  if (tabId) {
    const tabToken = request.cookies.get(`token_${tabId}`)?.value;
    const tabRole = request.cookies.get(`role_${tabId}`)?.value?.toLowerCase();
    if (tabToken) token = tabToken;
    if (tabRole) userRole = tabRole;
  }

  // Fallback 2: Check for direct HTTP request header overrides (ideal for fetch/XHR API requests)
  const headerToken = request.headers.get('authorization')?.replace('Bearer ', '');
  const headerRole = request.headers.get('x-user-role')?.toLowerCase();
  if (headerToken) token = headerToken;
  if (headerRole) userRole = headerRole;

  // 4. API Protection Layer (Securing your user management endpoints)
  if (pathname.startsWith('/api/users')) {
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      if (!token || userRole !== 'admin') {
        return NextResponse.json({ error: "Unauthorized access denied" }, { status: 401 });
      }
    }
  }

  // 5. Page Protection Layer
  const isProtectedRoute = Object.values(ROLE_ROUTES)
    .flat()
    .some(route => pathname.startsWith(route));

  // RULE 1: If it's a protected dashboard route and they aren't logged in, boot them to login
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // RULE 2: Protect Admin Pages
  if (pathname.startsWith('/admin-dashboard') && userRole !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // RULE 3: Protect Doctor Pages
  if (pathname.startsWith('/doctor-dashboard') && userRole !== 'doctor') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // RULE 4: Protect Patient Pages
  if (pathname.startsWith('/patient') && userRole !== 'patient') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // RULE 5: Protect Nurse Pages
  if (pathname.startsWith('/nurse') && userRole !== 'nurse') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // RULE 6: Protect Lab Staff Pages
  if (pathname.startsWith('/labstaff') && userRole !== 'lab staff') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  // RULE 7: Protect Billing Staff Pages
  if (pathname.startsWith('/billingstaff') && userRole !== 'billing staff') {
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }

  return NextResponse.next();
}

// 6. The matcher configuration remains completely identical
export const config = {
  matcher: [
    '/admin-dashboard/:path*', 
    '/doctor-dashboard/:path*', 
    '/patient-dashboard/:path*',
    '/nurse-dashboard/:path*',
    '/labstaff-dashboard/:path*',
    '/billingstaff-dashboard/:path*',
    '/api/users/:path*' 
  ],
};