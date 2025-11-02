'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import {
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Users,
  ArrowUpDown,
  ExternalLink,
  MoreHorizontal,
  Eye
} from 'lucide-react';
import Navigation from '@/components/layout/navigation';

interface Proposal {
  id: string;
  eventId: string;
  title: string;
  description?: string;
  imageUrl?: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'submitted';
  submitterEmail: string;
  submitterAnonymousId: string;
  submittedAt: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  convertedToOptionId?: string;
  event?: {
    title: string;
  };
}

export default function AdminProposalsPage() {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  useEffect(() => {
    filterProposals();
  }, [proposals, statusFilter]);

  const fetchProposals = async () => {
    try {
      const response = await fetch('/api/proposals');
      const data = await response.json();

      if (response.ok) {
        setProposals(data.proposals || []);
      } else {
        toast({
          title: 'Error',
          description: 'Failed to load proposals',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load proposals',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProposals = () => {
    if (statusFilter === 'all') {
      setFilteredProposals(proposals);
    } else {
      setFilteredProposals(proposals.filter(p => p.status === statusFilter));
    }
  };

  const handleApprove = async (proposalId: string) => {
    setActionLoading(proposalId);

    try {
      const response = await fetch(`/api/proposals/${proposalId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        toast({
          title: 'Proposal approved',
          description: 'The proposal has been approved successfully.',
        });
        fetchProposals(); // Refresh the list
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to approve proposal');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to approve proposal',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!selectedProposal || !rejectionReason.trim()) return;

    setActionLoading(selectedProposal.id);

    try {
      const response = await fetch(`/api/proposals/${selectedProposal.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });

      if (response.ok) {
        toast({
          title: 'Proposal rejected',
          description: 'The proposal has been rejected.',
        });
        setShowRejectDialog(false);
        setSelectedProposal(null);
        setRejectionReason('');
        fetchProposals(); // Refresh the list
      } else {
        const data = await response.json();
        throw new Error(data.message || 'Failed to reject proposal');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reject proposal',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertProposals = async (eventId: string) => {
    setActionLoading('convert-' + eventId);

    try {
      const response = await fetch(`/api/events/${eventId}/proposals/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Proposals converted',
          description: `${data.converted || 0} approved proposals have been converted to voting options.`,
        });
        fetchProposals(); // Refresh the list
      } else {
        throw new Error(data.message || 'Failed to convert proposals');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to convert proposals',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'submitted':
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Submitted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const stats = {
    total: proposals.length,
    pending: proposals.filter(p => p.status === 'pending_approval').length,
    approved: proposals.filter(p => p.status === 'approved').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading proposals...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="container mx-auto py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Proposal Management</h1>
          <p className="text-gray-600">Review and manage community proposals across all events</p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Proposals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Proposals</SelectItem>
                <SelectItem value="pending_approval">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Proposals List */}
        {filteredProposals.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals found</h3>
              <p className="text-gray-600">
                {statusFilter === 'all'
                  ? 'No proposals have been submitted yet.'
                  : `No proposals with status "${statusFilter}" found.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredProposals.map((proposal) => (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle className="text-lg">{proposal.title}</CardTitle>
                        {getStatusBadge(proposal.status)}
                      </div>

                      {proposal.description && (
                        <CardDescription className="mb-3">
                          {proposal.description.length > 200
                            ? `${proposal.description.substring(0, 200)}...`
                            : proposal.description}
                        </CardDescription>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Event: {proposal.event?.title || 'Unknown Event'}</span>
                        <span>•</span>
                        <span>Submitted: {formatDate(proposal.submittedAt)}</span>
                        <span>•</span>
                        <span>ID: {proposal.submitterAnonymousId.substring(0, 8)}</span>
                      </div>

                      {proposal.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>Rejection Reason:</strong> {proposal.rejectionReason}
                          </p>
                        </div>
                      )}

                      {proposal.convertedToOptionId && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            <CheckCircle className="inline w-4 h-4 mr-2" />
                            Converted to voting option
                          </p>
                        </div>
                      )}
                    </div>

                    {proposal.imageUrl && (
                      <div className="ml-4">
                        <img
                          src={proposal.imageUrl}
                          alt="Proposal"
                          className="w-20 h-20 object-cover rounded border"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center gap-2">
                    {proposal.status === 'pending_approval' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(proposal.id)}
                          disabled={actionLoading === proposal.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {actionLoading === proposal.id ? (
                            'Approving...'
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setSelectedProposal(proposal);
                            setShowRejectDialog(true);
                          }}
                          disabled={actionLoading === proposal.id}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}

                    {proposal.status === 'approved' && !proposal.convertedToOptionId && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConvertProposals(proposal.eventId)}
                        disabled={actionLoading === 'convert-' + proposal.eventId}
                      >
                        {actionLoading === 'convert-' + proposal.eventId ? (
                          'Converting...'
                        ) : (
                          <>
                            <ArrowUpDown className="w-4 h-4 mr-2" />
                            Convert to Option
                          </>
                        )}
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/events/${proposal.eventId}`)}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Event
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Proposal</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this proposal. This will be visible to the submitter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason *</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this proposal is being rejected..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectionReason('');
                setSelectedProposal(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || actionLoading === selectedProposal?.id}
            >
              {actionLoading === selectedProposal?.id ? 'Rejecting...' : 'Reject Proposal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}