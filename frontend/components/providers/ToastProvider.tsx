'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#111118',
          color: '#f1f5f9',
          border: '1px solid #1e1e2e',
          borderRadius: '10px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 12px 30px -4px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.15)',
        },
        success: {
          iconTheme: {
            primary: '#22c55e',
            secondary: '#111118',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#111118',
          },
        },
      }}
    />
  );
}
