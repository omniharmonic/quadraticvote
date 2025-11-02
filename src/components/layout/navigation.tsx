'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home, Settings, Users, FileText, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface NavigationProps {
  eventId?: string;
  eventTitle?: string;
  showAdminNav?: boolean;
}

export default function Navigation({ eventId, eventTitle, showAdminNav = false }: NavigationProps) {
  const router = useRouter();
  const pathname = usePathname();

  const canGoBack = pathname !== '/';

  return (
    <div className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Back/Home navigation */}
          <div className="flex items-center gap-3">
            {canGoBack && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.back()}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}

            <Link href="/">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-2"
              >
                <Home className="w-4 h-4" />
                Home
              </Button>
            </Link>

            {eventTitle && (
              <div className="flex items-center gap-2 ml-4">
                <span className="text-sm text-gray-500">•</span>
                <span className="font-medium text-gray-900 max-w-md truncate">
                  {eventTitle}
                </span>
              </div>
            )}
          </div>

          {/* Right side - Admin navigation for event pages */}
          {showAdminNav && eventId && (
            <div className="flex items-center gap-2">
              <Link href={`/admin/events/${eventId}`}>
                <Button
                  variant={pathname.includes('/admin/events/') ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Manage Event
                </Button>
              </Link>

              <Link href={`/admin/events/${eventId}/invites`}>
                <Button
                  variant={pathname.includes('/invites') ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Invites
                </Button>
              </Link>

              <Link href="/admin/proposals">
                <Button
                  variant={pathname.includes('/proposals') ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Proposals
                </Button>
              </Link>

              <Link href={`/events/${eventId}/results`}>
                <Button
                  variant={pathname.includes('/results') ? 'default' : 'outline'}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  Results
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}