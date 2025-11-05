'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminContextType {
  adminCode: string | null;
  setAdminCode: (code: string | null) => void;
  isAdmin: boolean;
  getAdminCode: (eventId: string) => string | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [adminCode, setAdminCodeState] = useState<string | null>(null);

  // Load admin code from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('quadratic-admin-codes');
      if (stored) {
        try {
          const codes = JSON.parse(stored);
          // For simplicity, we'll use the first/most recent admin code
          const latestCode = Object.values(codes)[0] as string;
          setAdminCodeState(latestCode);
        } catch (error) {
          console.error('Failed to parse stored admin codes:', error);
        }
      }
    }
  }, []);

  const setAdminCode = (code: string | null) => {
    setAdminCodeState(code);

    if (typeof window !== 'undefined') {
      if (code) {
        // Store in sessionStorage (clears when browser closes)
        const stored = sessionStorage.getItem('quadratic-admin-codes');
        const codes = stored ? JSON.parse(stored) : {};
        codes[Date.now()] = code; // Use timestamp as key for simplicity
        sessionStorage.setItem('quadratic-admin-codes', JSON.stringify(codes));
      } else {
        // Clear storage when logging out
        sessionStorage.removeItem('quadratic-admin-codes');
      }
    }
  };

  const getAdminCode = (eventId: string): string | null => {
    // First check if we have a current admin code
    if (adminCode) return adminCode;

    // Fallback to checking sessionStorage for any stored codes
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('quadratic-admin-codes');
      if (stored) {
        try {
          const codes = JSON.parse(stored);
          // Return the most recent code
          const timestamps = Object.keys(codes).sort((a, b) => parseInt(b) - parseInt(a));
          if (timestamps.length > 0) {
            return codes[timestamps[0]];
          }
        } catch (error) {
          console.error('Failed to retrieve admin codes:', error);
        }
      }
    }

    return null;
  };

  const value: AdminContextType = {
    adminCode,
    setAdminCode,
    isAdmin: !!adminCode,
    getAdminCode,
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}