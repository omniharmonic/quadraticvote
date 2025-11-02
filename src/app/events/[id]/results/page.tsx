'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { Trophy, TrendingUp, Users, Clock, CheckCircle, XCircle, Download, ArrowLeft } from 'lucide-react';

export default function ResultsPage() {
  const params = useParams();
  const router = useRouter();
  
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [params.id]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/events/${params.id}/results`);
      const data = await response.json();
      
      if (response.ok) {
        setResults(data.results);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load results',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load results',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-gray-600">Calculating results...</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Results Available</CardTitle>
            <CardDescription>Results couldn't be loaded</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const isBinary = results.framework_type === 'binary_selection';
  const frameworkResults = results.results;
  const participation = results.participation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.push(`/events/${params.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Event
          </Button>

          <div className="flex items-center gap-2 mb-4">
            {isBinary ? (
              <Trophy className="h-8 w-8 text-blue-600" />
            ) : (
              <TrendingUp className="h-8 w-8 text-purple-600" />
            )}
            <h1 className="text-4xl font-bold text-gray-900">Results</h1>
            {participation.is_final && (
              <Badge className="bg-green-500">Final</Badge>
            )}
          </div>
        </div>

        {/* Participation Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Voters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="h-5 w-5 text-primary mr-2" />
                <span className="text-3xl font-bold">{participation.total_voters}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="h-5 w-5 text-primary mr-2" />
                <span className="text-3xl font-bold">{participation.total_credits_allocated.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={participation.is_final ? 'default' : 'secondary'} className="text-base px-3 py-1">
                {participation.is_final ? 'Closed' : 'Live'}
              </Badge>
            </CardContent>
          </Card>
        </div>

        {/* Binary Selection Results */}
        {isBinary && (
          <>
            {/* Summary Card */}
            <Card className="mb-8 border-blue-500 border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Selection Summary</CardTitle>
                <CardDescription>
                  Threshold: {frameworkResults.threshold_mode.replace('_', ' ')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-5xl font-bold text-blue-600 mb-2">
                    {frameworkResults.selected_count}
                  </div>
                  <p className="text-lg text-gray-600">Options Selected</p>
                  {frameworkResults.selection_margin !== undefined && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selection margin: {frameworkResults.selection_margin.toFixed(1)} votes
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Options */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  Selected Options ({frameworkResults.selected_count})
                </CardTitle>
                <CardDescription>These options passed the selection threshold</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {frameworkResults.selected_options.map((option: any) => (
                    <div 
                      key={option.option_id}
                      className="p-4 bg-green-50 border-2 border-green-200 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-500 text-white rounded-full font-bold">
                              {option.rank}
                            </div>
                            <div>
                              <h4 className="font-semibold text-lg">{option.title}</h4>
                              <p className="text-sm text-green-700">
                                {option.votes.toFixed(1)} quadratic votes
                              </p>
                            </div>
                          </div>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Not Selected Options */}
            {frameworkResults.not_selected_options.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-6 w-6 text-gray-400" />
                    Not Selected ({frameworkResults.not_selected_options.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {frameworkResults.not_selected_options.map((option: any) => (
                      <div 
                        key={option.option_id}
                        className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-7 h-7 bg-gray-300 text-gray-700 rounded-full text-sm font-bold">
                            {option.rank}
                          </div>
                          <div>
                            <h4 className="font-medium">{option.title}</h4>
                            <p className="text-xs text-gray-600">
                              {option.votes.toFixed(1)} votes
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Proportional Distribution Results */}
        {!isBinary && (
          <>
            {/* Summary Card */}
            <Card className="mb-8 border-purple-500 border-2">
              <CardHeader>
                <CardTitle className="text-2xl">Distribution Summary</CardTitle>
                <CardDescription>
                  {frameworkResults.resource_name} Allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="text-5xl font-bold text-purple-600 mb-2">
                      {frameworkResults.resource_symbol}{frameworkResults.total_allocated.toLocaleString()}
                    </div>
                    <p className="text-lg text-gray-600">
                      Total {frameworkResults.resource_name} Allocated
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Total Pool</p>
                      <p className="text-2xl font-bold">
                        {frameworkResults.resource_symbol}{frameworkResults.total_pool.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-1">Gini Coefficient</p>
                      <p className="text-2xl font-bold">{frameworkResults.gini_coefficient.toFixed(3)}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {frameworkResults.gini_coefficient < 0.3 ? 'Equal' : frameworkResults.gini_coefficient < 0.6 ? 'Moderate' : 'Unequal'} distribution
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Distribution Table */}
            <Card>
              <CardHeader>
                <CardTitle>Final Allocation</CardTitle>
                <CardDescription>
                  Resources distributed proportionally based on quadratic votes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {frameworkResults.distributions.map((dist: any, index: number) => {
                    const percentage = (dist.allocation_amount / frameworkResults.total_pool) * 100;
                    
                    return (
                      <div key={dist.option_id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">#{index + 1}</Badge>
                              <h4 className="font-semibold">{dist.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {dist.votes.toFixed(1)} quadratic votes
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-bold text-purple-600">
                              {frameworkResults.resource_symbol}{dist.allocation_amount.toLocaleString(undefined, { 
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export Results
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push(`/events/${params.id}/vote`)}
          >
            View Voting Interface
          </Button>
        </div>
      </div>
    </div>
  );
}

