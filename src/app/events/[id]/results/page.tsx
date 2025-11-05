'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import {
  Trophy, TrendingUp, Users, Clock, CheckCircle, XCircle, Download, ArrowLeft,
  Network, BarChart3, PieChart, Activity, RefreshCw, Zap, Target, Eye
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RechartsePieChart, Cell, Pie, LineChart, Line, Area, AreaChart
} from 'recharts';

// Network Graph Component
function NetworkGraph({ data, width = 700, height = 500 }: { data: any, width?: number, height?: number }) {
  const [selectedNode, setSelectedNode] = useState<any>(null);

  if (!data || !data.nodes || !data.edges) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No network data available</p>
      </div>
    );
  }

  const handleNodeClick = (node: any) => {
    setSelectedNode(node);
  };

  return (
    <div className="relative w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="border rounded-lg bg-white w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Render edges first */}
        {data.edges.map((edge: any) => {
          const sourceNode = data.nodes.find((n: any) => n.id === edge.source);
          const targetNode = data.nodes.find((n: any) => n.id === edge.target);

          if (!sourceNode || !targetNode) return null;

          const strokeWidth = Math.max(1, Math.log(edge.weight + 1) * 2);
          const opacity = Math.min(1, edge.weight / 100);

          return (
            <line
              key={edge.id}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke="#3B82F6"
              strokeWidth={strokeWidth}
              opacity={opacity}
              className="hover:stroke-blue-600 transition-colors"
            >
              <title>{edge.label}</title>
            </line>
          );
        })}

        {/* Render nodes */}
        {data.nodes.map((node: any) => {
          const isVoter = node.type === 'voter';
          const radius = isVoter ? 8 : 12;
          const fill = isVoter ? '#10B981' : '#F59E0B';
          const scale = selectedNode?.id === node.id ? 1.2 : 1;

          return (
            <g key={node.id} transform={`translate(${node.x}, ${node.y}) scale(${scale})`}>
              <circle
                r={radius}
                fill={fill}
                stroke="#FFF"
                strokeWidth={2}
                className="cursor-pointer hover:opacity-80 transition-all"
                onClick={() => handleNodeClick(node)}
              >
                <title>
                  {node.label}
                  {isVoter ? ` (${node.credits} credits)` : ` (${node.totalCredits} total credits)`}
                </title>
              </circle>
              <text
                y={radius + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600 pointer-events-none"
              >
                {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
              </text>
            </g>
          );
        })}
      </svg>

      {selectedNode && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border max-w-xs">
          <h4 className="font-bold text-sm">{selectedNode.label}</h4>
          <p className="text-xs text-gray-600 mt-1">
            {selectedNode.type === 'voter'
              ? `Credits used: ${selectedNode.credits}`
              : `Total credits: ${selectedNode.totalCredits}, Votes: ${selectedNode.voteCount}`
            }
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 text-xs"
            onClick={() => setSelectedNode(null)}
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}

// Cluster Analysis Component
function ClusterAnalysis({ data }: { data: any }) {
  if (!data || !data.clusters) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No cluster data available</p>
      </div>
    );
  }

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{data.summary.totalClusters}</div>
          <div className="text-sm text-gray-600">Total Clusters</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{data.summary.largestCluster}</div>
          <div className="text-sm text-gray-600">Largest Cluster</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">{(data.summary.diversity * 100).toFixed(0)}%</div>
          <div className="text-sm text-gray-600">Diversity Score</div>
        </div>
      </div>

      <div className="space-y-3">
        {data.clusters.slice(0, 6).map((cluster: any, index: number) => (
          <div key={cluster.id} className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <h4 className="font-medium">Cluster {index + 1}</h4>
                <Badge variant="outline">{cluster.voterCount} voters</Badge>
              </div>
              <span className="text-sm text-gray-600">{cluster.percentage.toFixed(1)}%</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              Average credits: {cluster.avgCredits.toFixed(1)}
            </div>
            <Progress value={cluster.percentage} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Timeline Visualization Component
function TimelineVisualization({ data }: { data: any }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
        <p className="text-gray-500">No timeline data available</p>
      </div>
    );
  }

  const formattedData = data.map((item: any) => {
    const date = new Date(item.timestamp);
    return {
      ...item,
      timestamp: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      hour: date.getHours(),
      dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
      voteCount: Number(item.voteCount),
      totalCredits: Number(item.totalCredits)
    };
  }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="timestamp"
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          yAxisId="votes"
          orientation="left"
          tick={{ fontSize: 12 }}
        />
        <YAxis
          yAxisId="credits"
          orientation="right"
          tick={{ fontSize: 12 }}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-white p-3 border rounded shadow-lg">
                  <p className="font-medium">{label}</p>
                  {payload.map((item: any, index: number) => (
                    <p key={index} style={{ color: item.color }}>
                      {item.name}: {item.value}
                    </p>
                  ))}
                </div>
              );
            }
            return null;
          }}
        />
        <Area
          type="monotone"
          dataKey="voteCount"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.3}
          name="Votes"
          yAxisId="votes"
        />
        <Area
          type="monotone"
          dataKey="totalCredits"
          stroke="#10B981"
          fill="#10B981"
          fillOpacity={0.3}
          name="Credits Used"
          yAxisId="credits"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AdvancedAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('all');
  const refreshInterval = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetchAnalytics();

    // Set up real-time updates every 30 seconds
    refreshInterval.current = setInterval(() => {
      if (!loading) {
        fetchAnalytics(true);
      }
    }, 30000);

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [params.id, timeRange]);

  const fetchAnalytics = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    if (isRefresh) setRefreshing(true);

    try {
      // Fetch event details
      const eventResponse = await fetch(`/api/events/${params.id}`);
      const eventData = await eventResponse.json();

      // Fetch analytics data
      const analyticsResponse = await fetch(`/api/events/${params.id}/analytics?range=${timeRange}`);
      const analyticsData = await analyticsResponse.json();

      if (eventData.success) {
        setEvent(eventData.event);
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load analytics data',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const exportData = () => {
    if (!analytics) return;

    const csvData = [
      ['Metric', 'Value'],
      ['Total Votes', analytics.voting.total_votes],
      ['Unique Voters', analytics.voting.unique_voters],
      ['Avg Credits Used', analytics.voting.avg_credits_used],
      ['Total Clusters', analytics.cluster_analysis?.summary.totalClusters || 0],
      ['', ''],
      ['Option', 'Credits', 'Votes', 'Quadratic Score'],
      ...analytics.option_performance.map((option: any) => [
        option.title,
        option.total_credits,
        option.vote_count,
        option.quadratic_votes.toFixed(2)
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
      description: 'Advanced analytics data has been downloaded as CSV.',
    });
  };

  if (loading || !event || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading advanced analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  const isEventActive = () => {
    const now = new Date();
    return now >= new Date(event.startTime) && now <= new Date(event.endTime);
  };

  // Prepare chart data
  const pieChartData = analytics.option_performance.map((option: any, index: number) => ({
    name: option.title,
    value: option.quadratic_votes,
    fill: `hsl(${(index * 137.5) % 360}, 70%, 60%)`
  }));

  const barChartData = analytics.option_performance.map((option: any) => ({
    name: option.title.length > 20 ? option.title.substring(0, 20) + '...' : option.title,
    credits: option.total_credits,
    votes: option.vote_count,
    quadratic: option.quadratic_votes
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Button
              variant="ghost"
              onClick={() => router.push(`/events/${params.id}`)}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Event
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">
              Advanced Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive insights for: <span className="font-medium">{event.title}</span>
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
              onClick={() => fetchAnalytics(true)}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button onClick={exportData} className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Live Status */}
        {isEventActive() && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-900">Live Event</span>
              <span className="text-green-700">• Real-time data updates</span>
              {refreshing && <span className="text-green-600">• Refreshing...</span>}
            </div>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Unique Voters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{analytics.voting.unique_voters}</div>
              <div className="text-sm text-gray-500 mt-1">
                {analytics.voting.total_votes} total votes
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Target className="w-4 h-4" />
                Avg Credits Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {analytics.voting.avg_credits_used.toFixed(1)}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                of {event.creditsPerVoter} available
              </div>
              <Progress
                value={(analytics.voting.avg_credits_used / event.creditsPerVoter) * 100}
                className="mt-2"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Network className="w-4 h-4" />
                Voter Clusters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {analytics.cluster_analysis?.summary.totalClusters || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {((analytics.cluster_analysis?.summary.diversity || 0) * 100).toFixed(0)}% diversity
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Network Edges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">
                {analytics.network_graph?.edges?.length || 0}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                vote connections
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Visualizations */}
        <Tabs defaultValue="network" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="network">Network Graph</TabsTrigger>
            <TabsTrigger value="clusters">Cluster Analysis</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="network" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Voter Network Graph
                </CardTitle>
                <CardDescription>
                  Interactive visualization showing voters as nodes and their votes as weighted edges
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NetworkGraph
                  data={analytics.network_graph}
                  width={800}
                  height={600}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clusters" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Voter Cluster Analysis
                </CardTitle>
                <CardDescription>
                  Analysis of voting patterns and voter groupings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClusterAnalysis data={analytics.cluster_analysis} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Results Comparison
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={barChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="quadratic" fill="#3B82F6" name="Quadratic Score" />
                      <Bar dataKey="credits" fill="#10B981" name="Total Credits" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5" />
                    Vote Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsePieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieChartData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsePieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Real-time Voting Timeline
                </CardTitle>
                <CardDescription>
                  How voting activity progressed over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineVisualization data={analytics.participation_over_time} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Final Results
                </CardTitle>
                <CardDescription>
                  Ranked results using quadratic voting calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.option_performance
                    .sort((a: any, b: any) => b.quadratic_votes - a.quadratic_votes)
                    .map((option: any, index: number) => (
                      <div key={option.option_id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                              <Badge variant={index === 0 ? 'default' : 'outline'}>
                                #{index + 1}
                              </Badge>
                            </div>
                            <h4 className="font-medium">{option.title}</h4>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Quadratic Score:</span>
                              <span className="font-bold ml-2">{option.quadratic_votes.toFixed(2)}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Total Credits:</span>
                              <span className="font-bold ml-2">{option.total_credits}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Vote Count:</span>
                              <span className="font-bold ml-2">{option.vote_count}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}