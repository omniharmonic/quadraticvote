'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, Users, Trophy, Sparkles, ArrowRight } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('/api/events');
      const data = await response.json();
      
      if (response.ok) {
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error('Failed to fetch events:', error);
    } finally {
      setLoading(false);
    }
  };

  const isEventActive = (event: any) => {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Hero Section */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              QuadraticVote
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Democratic decision-making powered by quadratic voting. 
              Choose winners or allocate resources fairly and efficiently.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => router.push('/events/create')} className="text-lg px-8">
                <Plus className="mr-2 h-5 w-5" />
                Create Event
              </Button>
              <Button size="lg" variant="outline" onClick={() => router.push('/test')} className="text-lg px-8">
                API Test Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Card className="border-blue-500/20 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Trophy className="h-8 w-8 text-blue-600" />
                <div>
                  <CardTitle>Binary Selection</CardTitle>
                  <CardDescription>Choose winners from options</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Perfect for competitions, awards, or selecting projects. 
                Voters choose their favorites and the system determines winners based on quadratic votes.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Sparkles className="h-8 w-8 text-purple-600" />
                <div>
                  <CardTitle>Proportional Distribution</CardTitle>
                  <CardDescription>Allocate resources fairly</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                Ideal for budgets, grants, or resource allocation. 
                Resources are distributed proportionally based on the community's preferences.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Events List */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-bold text-gray-900">Active Events</h2>
            <Button variant="outline" onClick={fetchEvents}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-gray-600">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-600 mb-6">
                  Be the first to create a quadratic voting event!
                </p>
                <Button onClick={() => router.push('/events/create')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Event
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const framework = event.decisionFramework;
                const isBinary = framework?.framework_type === 'binary_selection';
                const active = isEventActive(event);

                return (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/events/${event.id}`)}>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant={isBinary ? 'default' : 'secondary'}>
                          {isBinary ? 'Binary' : 'Proportional'}
                        </Badge>
                        {active && (
                          <Badge className="bg-green-500">Live</Badge>
                        )}
                      </div>
                      <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                      {event.description && (
                        <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Ends {formatDate(event.endTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{event.creditsPerVoter} credits per voter</span>
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="outline">
                        View Event <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              <ol className="list-decimal list-inside space-y-2">
                <li>Create an event with your options</li>
                <li>Share the link with voters</li>
                <li>Voters allocate credits using quadratic voting</li>
                <li>View results in real-time or after voting closes</li>
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quadratic Voting</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">
              Quadratic voting uses the formula: votes = √credits. This means the more credits you allocate to an option, the less impact each additional credit has, encouraging voters to spread their support.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Use Cases</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600 space-y-1">
              • Community budgeting<br />
              • Grant allocation<br />
              • Feature prioritization<br />
              • Award selection<br />
              • DAO governance
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
