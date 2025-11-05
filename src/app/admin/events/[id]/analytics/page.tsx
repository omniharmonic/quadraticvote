'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function EventAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  useEffect(() => {
    // Redirect to the new unified results/analytics page
    router.replace(`/events/${eventId}/results`);
  }, [eventId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to analytics dashboard...</p>
      </div>
    </div>
  );
}