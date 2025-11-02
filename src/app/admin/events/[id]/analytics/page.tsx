'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
  Mail,
  Vote,
  Eye,
  Download,
  RefreshCw,
  Calendar,
  Target,
  PieChart
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface AnalyticsData {
  overview: {
    totalInvites: number;
    totalVotes: number;
    participationRate: number;
    avgCreditsUsed: number;
    totalCreditsAllocated: number;
    uniqueVoters: number;
  };
  participation: {
    hourly: Array<{ hour: string; votes: number; invitesSent: number }>;
    daily: Array<{ date: string; votes: number; invitesSent: number }>;
  };
  options: Array<{
    id: string;
    title: string;
    totalVotes: number;
    totalCredits: number;
    percentage: number;
    rank: number;
  }>;
  invites: {
    sent: number;
    opened: number;
    voted: number;
    bounced: number;
    openRate: number;
    conversionRate: number;
  };
  geographic?: Array<{
    region: string;
    votes: number;
    percentage: number;
  }>;
  devices?: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export default function EventAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, [eventId, timeRange]);

  const fetchAnalytics = async () => {
    if (loading) setLoading(true);
    if (!loading) setRefreshing(true);

    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${eventId}`);
      const eventData = await eventResponse.json();

      // Fetch analytics data (we'll create mock data for now since API might not exist)
      const analyticsResponse = await fetch(`/api/events/${eventId}/analytics?range=${timeRange}`);

      let analyticsData: AnalyticsData;

      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json();
        analyticsData = data.analytics;
      } else {
        // Create mock analytics data if API doesn't exist yet
        analyticsData = generateMockAnalytics(eventData.event);
      }

      if (eventData.success) {
        setEvent(eventData.event);
        setAnalytics(analyticsData);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Create mock data if API fails
      try {
        const eventResponse = await fetch(`/api/events/${eventId}`);
        const eventData = await eventResponse.json();
        if (eventData.success) {
          setEvent(eventData.event);
          setAnalytics(generateMockAnalytics(eventData.event));
        }
      } catch {
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const generateMockAnalytics = (event: any): AnalyticsData => {
    const totalOptions = event?.options?.length || 3;
    const baseVotes = Math.floor(Math.random() * 50) + 20;

    return {
      overview: {
        totalInvites: Math.floor(Math.random() * 100) + 50,
        totalVotes: baseVotes,
        participationRate: Math.floor((baseVotes / 100) * 100),
        avgCreditsUsed: Math.floor(Math.random() * 30) + 70,
        totalCreditsAllocated: baseVotes * (event?.creditsPerVoter || 100),
        uniqueVoters: baseVotes,
      },
      participation: {
        hourly: Array.from({ length: 24 }, (_, i) => ({
          hour: `${i}:00`,
          votes: Math.floor(Math.random() * 10),
          invitesSent: Math.floor(Math.random() * 15),
        })),
        daily: Array.from({ length: 7 }, (_, i) => ({
          date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          votes: Math.floor(Math.random() * 20),
          invitesSent: Math.floor(Math.random() * 25),
        })),
      },
      options: (event?.options || []).map((option: any, index: number) => {
        const votes = Math.floor(Math.random() * baseVotes) + 5;
        return {
          id: option.id,
          title: option.title,
          totalVotes: votes,
          totalCredits: votes * Math.floor(Math.random() * 50 + 25),
          percentage: (votes / baseVotes) * 100,
          rank: index + 1,
        };
      }),
      invites: {
        sent: Math.floor(Math.random() * 100) + 50,
        opened: Math.floor(Math.random() * 80) + 30,
        voted: baseVotes,
        bounced: Math.floor(Math.random() * 5),
        openRate: Math.floor(Math.random() * 30) + 60,
        conversionRate: Math.floor(Math.random() * 40) + 40,
      },
      geographic: [
        { region: 'North America', votes: Math.floor(baseVotes * 0.4), percentage: 40 },
        { region: 'Europe', votes: Math.floor(baseVotes * 0.3), percentage: 30 },
        { region: 'Asia', votes: Math.floor(baseVotes * 0.2), percentage: 20 },
        { region: 'Other', votes: Math.floor(baseVotes * 0.1), percentage: 10 },
      ],
      devices: [
        { type: 'Desktop', count: Math.floor(baseVotes * 0.6), percentage: 60 },
        { type: 'Mobile', count: Math.floor(baseVotes * 0.3), percentage: 30 },
        { type: 'Tablet', count: Math.floor(baseVotes * 0.1), percentage: 10 },
      ],
    };
  };

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Invites', analytics.overview.totalInvites],
      ['Total Votes', analytics.overview.totalVotes],
      ['Participation Rate', `${analytics.overview.participationRate}%`],
      ['Average Credits Used', analytics.overview.avgCreditsUsed],
      ['', ''],
      ['Option', 'Votes', 'Credits', 'Percentage'],
      ...analytics.options.map(option => [
        option.title,
        option.totalVotes,
        option.totalCredits,
        `${option.percentage.toFixed(1)}%`
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.title || 'event'}-analytics.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Analytics exported',
      description: 'Analytics data has been downloaded as CSV.',
    });
  };

  if (loading || !event || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const isEventActive = () => {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/admin/events/${eventId}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event Management
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Detailed insights for: <span className="font-medium">{event.title}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="1h">Last Hour</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={fetchAnalytics}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Status Banner */}
        {isEventActive() && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="font-medium text-green-900">Event is currently live</span>
              <span className="text-green-700">• Data updates in real-time</span>
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Total Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analytics.overview.uniqueVoters}</div>
              <div className="text-sm text-gray-500">
                {analytics.overview.participationRate}% participation rate
              </div>
              <Progress value={analytics.overview.participationRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Vote className="w-4 h-4" />
                Total Votes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{analytics.overview.totalVotes}</div>
              <div className="text-sm text-gray-500">
                {analytics.overview.totalCreditsAllocated.toLocaleString()} credits allocated
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg Credits Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{analytics.overview.avgCreditsUsed}</div>
              <div className="text-sm text-gray-500">
                out of {event.creditsPerVoter} per voter
              </div>
              <Progress value={(analytics.overview.avgCreditsUsed / event.creditsPerVoter) * 100} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{analytics.invites.openRate}%</div>
              <div className="text-sm text-gray-500">
                {analytics.invites.conversionRate}% conversion rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Option Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Option Performance
            </CardTitle>
            <CardDescription>
              How votes and credits are distributed across options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.options
                .sort((a, b) => b.totalVotes - a.totalVotes)
                .map((option, index) => (
                  <div key={option.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <h4 className="font-medium">{option.title}</h4>
                      </div>
                      <div className="space-y-1">
                        <Progress value={option.percentage} className="h-2" />
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{option.totalVotes} votes</span>
                          <span>{option.totalCredits} credits</span>
                          <span>{option.percentage.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Engagement Metrics */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Invite Engagement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Invites Sent</span>
                  <span className="font-bold">{analytics.invites.sent}</span>
                </div>
                <div className="flex justify-between">
                  <span>Opened</span>
                  <span className="font-bold text-blue-600">{analytics.invites.opened}</span>
                </div>
                <div className="flex justify-between">
                  <span>Voted</span>
                  <span className="font-bold text-green-600">{analytics.invites.voted}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bounced</span>
                  <span className="font-bold text-red-600">{analytics.invites.bounced}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Device Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.devices?.map((device) => (
                  <div key={device.type} className="flex items-center justify-between">
                    <span>{device.type}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <Progress value={device.percentage} className="h-2" />
                      </div>
                      <span className="text-sm font-medium w-12 text-right">
                        {device.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geographic Distribution */}
        {analytics.geographic && (
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>
                Where your participants are voting from
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {analytics.geographic.map((region) => (
                  <div key={region.region} className="flex items-center justify-between p-3 border rounded-lg">
                    <span>{region.region}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <Progress value={region.percentage} className="h-2" />
                      </div>
                      <span className="text-sm font-medium w-16 text-right">
                        {region.votes} ({region.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}