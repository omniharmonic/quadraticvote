import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, FileText, Settings, BarChart3 } from 'lucide-react';
import Navigation from '@/components/layout/navigation';

export default function AdminDashboard() {
  return (
    <>
      <Navigation />
      <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage events, proposals, and system settings</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Events Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Events
            </CardTitle>
            <CardDescription>
              Create and manage voting events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/events/create">
                <Button className="w-full" variant="outline">
                  Create New Event
                </Button>
              </Link>
              <Link href="/admin/events">
                <Button className="w-full" variant="outline">
                  Manage Events
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Proposals
            </CardTitle>
            <CardDescription>
              Moderate community proposals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/proposals">
                <Button className="w-full" variant="outline">
                  Moderation Queue
                </Button>
              </Link>
              <Link href="/admin/proposals/all">
                <Button className="w-full" variant="outline">
                  All Proposals
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* User & Invite Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Users & Invites
            </CardTitle>
            <CardDescription>
              Manage user invitations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/invites">
                <Button className="w-full" variant="outline">
                  Manage Invites
                </Button>
              </Link>
              <Link href="/admin/invites/create">
                <Button className="w-full" variant="outline">
                  Create Invites
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Settings
            </CardTitle>
            <CardDescription>
              Configure platform settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link href="/admin/settings">
                <Button className="w-full" variant="outline">
                  Platform Settings
                </Button>
              </Link>
              <Link href="/admin/logs">
                <Button className="w-full" variant="outline">
                  View Logs
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </>
  );
}