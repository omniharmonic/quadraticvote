'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';

export default function EventAdminPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = params.id as string;
  const adminCode = searchParams.get('code');

  useEffect(() => {
    // Redirect to the comprehensive admin dashboard
    const url = `/admin/events/${eventId}${adminCode ? `?code=${adminCode}` : ''}`;
    router.replace(url);
  }, [eventId, adminCode, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to admin dashboard...</p>
      </div>
    </div>
  );
}