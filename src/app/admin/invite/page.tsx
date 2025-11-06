import { AcceptInviteForm } from '@/components/admin/AcceptInviteForm';
import { Suspense } from 'react';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { code?: string };
}

export default function AcceptInvitePage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admin Invitation
          </h1>
          <p className="mt-2 text-gray-600">
            Accept your invitation to become an administrator
          </p>
        </div>

        <Suspense fallback={
          <div className="max-w-md mx-auto bg-white rounded-lg border p-6">
            <div className="animate-pulse">Loading...</div>
          </div>
        }>
          <AcceptInviteForm inviteCode={searchParams.code} />
        </Suspense>
      </div>
    </div>
  );
}