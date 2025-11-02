'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import {
  Upload,
  Download,
  Mail,
  Users,
  Send,
  CheckCircle,
  AlertTriangle,
  FileText,
  Copy
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface BatchResult {
  successful: number;
  failed: number;
  errors: string[];
  invites: Array<{
    email: string;
    code: string;
    success: boolean;
    error?: string;
  }>;
}

export default function BatchInvitePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const [formData, setFormData] = useState({
    emails: '',
    inviteType: 'voting' as 'voting' | 'proposal' | 'both',
    sendEmail: true,
    customMessage: '',
    customSubject: ''
  });

  const [emailStats, setEmailStats] = useState({
    total: 0,
    valid: 0,
    invalid: 0,
    duplicates: 0
  });

  useEffect(() => {
    fetchEvent();
  }, [eventId]);

  useEffect(() => {
    analyzeEmails();
  }, [formData.emails]);

  const fetchEvent = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();

      if (data.success) {
        setEvent(data.event);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load event',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load event',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeEmails = () => {
    if (!formData.emails.trim()) {
      setEmailStats({ total: 0, valid: 0, invalid: 0, duplicates: 0 });
      return;
    }

    const lines = formData.emails.split('\n').map(line => line.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const emails = new Set<string>();
    let valid = 0;
    let invalid = 0;
    let duplicates = 0;

    lines.forEach(line => {
      // Extract email from line (handles "Name <email>" format)
      const emailMatch = line.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
      const email = emailMatch ? emailMatch[1].toLowerCase() : line.toLowerCase();

      if (emailRegex.test(email)) {
        if (emails.has(email)) {
          duplicates++;
        } else {
          emails.add(email);
          valid++;
        }
      } else {
        invalid++;
      }
    });

    setEmailStats({
      total: lines.length,
      valid,
      invalid,
      duplicates
    });
  };

  const processEmails = () => {
    const lines = formData.emails.split('\n').map(line => line.trim()).filter(Boolean);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const processedEmails = new Set<string>();
    const validEmails: string[] = [];

    lines.forEach(line => {
      // Extract email from line (handles "Name <email>" format)
      const emailMatch = line.match(/([^\s@]+@[^\s@]+\.[^\s@]+)/);
      const email = emailMatch ? emailMatch[1].toLowerCase() : line.toLowerCase();

      if (emailRegex.test(email) && !processedEmails.has(email)) {
        processedEmails.add(email);
        validEmails.push(email);
      }
    });

    return validEmails;
  };

  const handleBatchCreate = async () => {
    const validEmails = processEmails();

    if (validEmails.length === 0) {
      toast({
        title: 'No valid emails',
        description: 'Please enter at least one valid email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setBatchResult(null);

    const results: BatchResult = {
      successful: 0,
      failed: 0,
      errors: [],
      invites: []
    };

    try {
      // Process emails in batches to avoid overwhelming the server
      const batchSize = 5;
      const totalBatches = Math.ceil(validEmails.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = validEmails.slice(i * batchSize, (i + 1) * batchSize);

        // Process batch in parallel
        const batchPromises = batch.map(async (email) => {
          try {
            const response = await fetch(`/api/events/${eventId}/invites`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                inviteType: formData.inviteType,
                count: 1,
                sendEmail: formData.sendEmail,
                customMessage: formData.customMessage,
                customSubject: formData.customSubject
              }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
              results.successful++;
              results.invites.push({
                email,
                code: data.invites[0]?.code || '',
                success: true
              });
            } else {
              results.failed++;
              const error = data.message || 'Unknown error';
              results.errors.push(`${email}: ${error}`);
              results.invites.push({
                email,
                code: '',
                success: false,
                error
              });
            }
          } catch (error) {
            results.failed++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.errors.push(`${email}: ${errorMessage}`);
            results.invites.push({
              email,
              code: '',
              success: false,
              error: errorMessage
            });
          }
        });

        await Promise.allSettled(batchPromises);

        // Update progress
        const completedEmails = (i + 1) * batchSize;
        setProgress(Math.min((completedEmails / validEmails.length) * 100, 100));

        // Small delay between batches
        if (i < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      setBatchResult(results);

      toast({
        title: 'Batch processing completed',
        description: `${results.successful} invites created successfully${results.failed > 0 ? `, ${results.failed} failed` : ''}.`,
      });

    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process batch invites',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const exportResults = () => {
    if (!batchResult) return;

    const csvContent = [
      'Email,Code,Status,Error',
      ...batchResult.invites.map(invite =>
        `${invite.email},${invite.code},${invite.success ? 'Success' : 'Failed'},"${invite.error || ''}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-invites-${eventId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copySuccessfulLinks = () => {
    if (!batchResult) return;

    const baseUrl = window.location.origin;
    const successfulInvites = batchResult.invites.filter(i => i.success);
    const links = successfulInvites.map(invite =>
      `${invite.email}: ${baseUrl}/events/${eventId}/vote?code=${invite.code}`
    ).join('\n');

    navigator.clipboard.writeText(links);
    toast({
      title: 'Links copied!',
      description: `${successfulInvites.length} invite links have been copied to clipboard.`,
    });
  };

  const loadSampleData = () => {
    const sampleEmails = [
      'alice@example.com',
      'bob@example.com',
      'charlie@example.com',
      'diana@example.com',
      'eve@example.com'
    ].join('\n');

    setFormData({ ...formData, emails: sampleEmails });
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading batch invite...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        eventId={eventId}
        eventTitle={event.title}
        showAdminNav={true}
      />

      <div className="container mx-auto py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Batch Invites</h1>
          <p className="text-gray-600">
            Send invites to multiple participants at once for: <span className="font-medium">{event.title}</span>
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Email List
                </CardTitle>
                <CardDescription>
                  Enter email addresses (one per line) to create invites in bulk
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="emails">Email Addresses *</Label>
                  <Textarea
                    id="emails"
                    value={formData.emails}
                    onChange={(e) => setFormData({ ...formData, emails: e.target.value })}
                    placeholder={`alice@example.com\nBob Smith <bob@example.com>\ncharlie@company.com`}
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Supports name formatting: "Name &lt;email@domain.com&gt;"</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={loadSampleData}
                    >
                      Load Sample
                    </Button>
                  </div>
                </div>

                {/* Email Analysis */}
                {emailStats.total > 0 && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Email Analysis</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700">Total lines: </span>
                        <span className="font-medium">{emailStats.total}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Valid emails: </span>
                        <span className="font-medium text-green-600">{emailStats.valid}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Invalid emails: </span>
                        <span className="font-medium text-red-600">{emailStats.invalid}</span>
                      </div>
                      <div>
                        <span className="text-blue-700">Duplicates: </span>
                        <span className="font-medium text-orange-600">{emailStats.duplicates}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Invite Settings</CardTitle>
                <CardDescription>
                  Configure how the invites will be created and sent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Invite Type</Label>
                    <Select
                      value={formData.inviteType}
                      onValueChange={(value: any) => setFormData({ ...formData, inviteType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="voting">Voting Only</SelectItem>
                        <SelectItem value="proposal">Proposals Only</SelectItem>
                        <SelectItem value="both">Voting & Proposals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="sendEmail"
                      checked={formData.sendEmail}
                      onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked })}
                    />
                    <Label htmlFor="sendEmail">Send emails automatically</Label>
                  </div>
                </div>

                {formData.sendEmail && (
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="customSubject">Custom Subject (optional)</Label>
                      <input
                        id="customSubject"
                        type="text"
                        value={formData.customSubject}
                        onChange={(e) => setFormData({ ...formData, customSubject: e.target.value })}
                        placeholder="You're invited to participate in quadratic voting..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customMessage">Custom Message (optional)</Label>
                      <Textarea
                        id="customMessage"
                        value={formData.customMessage}
                        onChange={(e) => setFormData({ ...formData, customMessage: e.target.value })}
                        placeholder="Add a personal message to the invite emails..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBatchCreate}
                  disabled={isProcessing || emailStats.valid === 0}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Mail className="w-4 h-4 mr-2 animate-pulse" />
                      Processing {emailStats.valid} invites...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Create {emailStats.valid} Invite{emailStats.valid !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing invites...</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <strong>Email Format:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600">
                    <li>One email per line</li>
                    <li>Supports "Name &lt;email&gt;" format</li>
                    <li>Duplicates will be automatically removed</li>
                    <li>Invalid emails will be skipped</li>
                  </ul>
                </div>

                <div>
                  <strong>Processing:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-gray-600">
                    <li>Emails are processed in small batches</li>
                    <li>Failed invites will be reported</li>
                    <li>Results can be exported as CSV</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {batchResult && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    Batch Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="text-center p-3 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{batchResult.successful}</div>
                      <div className="text-green-700">Successful</div>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">{batchResult.failed}</div>
                      <div className="text-red-700">Failed</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copySuccessfulLinks}
                      className="w-full"
                      disabled={batchResult.successful === 0}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy All Links
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportResults}
                      className="w-full"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                  </div>

                  {batchResult.errors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <h5 className="font-medium text-red-900 mb-2">Errors:</h5>
                      <div className="space-y-1 text-xs text-red-800 max-h-32 overflow-y-auto">
                        {batchResult.errors.slice(0, 5).map((error, index) => (
                          <div key={index}>{error}</div>
                        ))}
                        {batchResult.errors.length > 5 && (
                          <div className="text-red-600">...and {batchResult.errors.length - 5} more</div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}