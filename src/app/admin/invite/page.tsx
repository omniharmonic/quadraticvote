import { AcceptInviteForm } from '@/components/admin/AcceptInviteForm';
import { Suspense } from 'react';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: { code?: string };
}

export default function AcceptInvitePage({ searchParams }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-paper text-ink">
          <div className="mx-auto max-w-md px-5 md:px-8 py-20 font-mono text-[11px] uppercase tracking-widest text-ink-3">
            Loading…
          </div>
        </div>
      }
    >
      <AcceptInviteForm inviteCode={searchParams.code} />
    </Suspense>
  );
}