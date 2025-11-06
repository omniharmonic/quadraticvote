import { NextRequest, NextResponse } from 'next/server';

// Force this route to be dynamic (not pre-rendered during build)
export const dynamic = 'force-dynamic';

import { supabase } from '@/lib/supabase';

// Fixed import path to resolve webpack caching issue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';

    // Get basic event info using Supabase
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, title, start_time, end_time, created_at')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get real analytics data using Supabase
    const [
      { data: allVotes },
      { data: allProposals },
      { data: allInvites },
      { data: eventOptions }
    ] = await Promise.all([
      supabase.from('votes').select('*').eq('event_id', eventId),
      supabase.from('proposals').select('*').eq('event_id', eventId),
      supabase.from('invites').select('*').eq('event_id', eventId),
      supabase.from('options').select('id, title').eq('event_id', eventId)
    ]);

    // Calculate statistics in JavaScript since we can't use complex SQL aggregations
    const votingStats = calculateVotingStats(allVotes || []);
    const proposalStats = calculateProposalStats(allProposals || []);
    const inviteStats = calculateInviteStats(allInvites || []);
    const timelineData = calculateTimelineData(allVotes || []);

    // Calculate option performance in JavaScript
    const optionPerformance = (eventOptions || []).map(option => {
      let totalCredits = 0;
      let voteCount = 0;

      (allVotes || []).forEach(vote => {
        const allocations = vote.allocations as Record<string, number>;
        const credits = allocations[option.id];
        if (credits && credits > 0) {
          totalCredits += credits;
          voteCount += 1;
        }
      });

      return {
        optionId: option.id,
        title: option.title,
        totalCredits,
        voteCount,
        quadraticVotes: Math.sqrt(totalCredits)
      };
    });

    // Generate network graph data
    const networkData = generateNetworkGraph(allVotes || [], optionPerformance);

    // Generate cluster analysis
    const clusterAnalysis = generateClusterAnalysis(allVotes || []);

    const analytics = {
      event: event,
      voting: votingStats,
      proposals: proposalStats,
      invites: inviteStats,
      participation_over_time: timelineData,
      option_performance: optionPerformance.map(opt => ({
        option_id: opt.optionId,
        title: opt.title,
        total_credits: opt.totalCredits,
        vote_count: opt.voteCount,
        quadratic_votes: opt.quadraticVotes
      })),
      // New advanced analytics data
      network_graph: networkData,
      cluster_analysis: clusterAnalysis,
      individual_votes: (allVotes || []).map(vote => ({
        id: vote.id,
        voter_id: vote.invite_code,
        allocations: vote.allocations,
        total_credits: vote.total_credits_used,
        timestamp: vote.submitted_at,
        ip_hash: vote.ip_address ? hashString(vote.ip_address) : null
      }))
    };

    return NextResponse.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch analytics'
      },
      { status: 500 }
    );
  }
}

// Helper functions to calculate statistics in JavaScript
function calculateVotingStats(votes: any[]) {
  if (votes.length === 0) {
    return {
      total_votes: 0,
      unique_voters: 0,
      avg_credits_used: 0,
      max_credits_used: 0,
      min_credits_used: 0,
    };
  }

  const uniqueVoters = new Set(votes.map(v => v.invite_code)).size;
  const totalCredits = votes.reduce((sum, v) => sum + (v.total_credits_used || 0), 0);
  const creditsUsed = votes.map(v => v.total_credits_used || 0);

  return {
    total_votes: votes.length,
    unique_voters: uniqueVoters,
    avg_credits_used: totalCredits / votes.length,
    max_credits_used: Math.max(...creditsUsed),
    min_credits_used: Math.min(...creditsUsed),
  };
}

function calculateProposalStats(proposals: any[]) {
  const counts = proposals.reduce((acc, p) => {
    const status = p.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    total: proposals.length,
    approved: counts['approved'] || 0,
    pending: (counts['pending_approval'] || 0) + (counts['submitted'] || 0),
    rejected: counts['rejected'] || 0,
  };
}

function calculateInviteStats(invites: any[]) {
  const used = invites.filter(i => i.used_at).length;
  const opened = invites.filter(i => i.opened_at).length;

  return {
    total: invites.length,
    used: used,
    opened: opened,
  };
}

function calculateTimelineData(votes: any[]) {
  // Group votes by hour
  const hourlyData: Record<string, { voteCount: number, totalCredits: number }> = {};

  votes.forEach(vote => {
    if (vote.submitted_at) {
      const hour = new Date(vote.submitted_at).toISOString().substring(0, 13) + ':00:00Z';
      if (!hourlyData[hour]) {
        hourlyData[hour] = { voteCount: 0, totalCredits: 0 };
      }
      hourlyData[hour].voteCount += 1;
      hourlyData[hour].totalCredits += vote.total_credits_used || 0;
    }
  });

  return Object.entries(hourlyData)
    .map(([timestamp, data]) => ({
      timestamp,
      voteCount: data.voteCount,
      totalCredits: data.totalCredits
    }))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

// Helper function to generate network graph data
function generateNetworkGraph(votes: any[], options: any[]) {
  const nodes: any[] = [];
  const edges: any[] = [];

  const width = 700;
  const height = 500;
  const centerX = width / 2;
  const centerY = height / 2;

  // Create nodes for options (placed in center area)
  const optionRadius = Math.min(width, height) / 6;
  options.forEach((option, index) => {
    const angle = (index / options.length) * 2 * Math.PI;
    nodes.push({
      id: `option_${option.optionId}`,
      type: 'option',
      label: option.title,
      totalCredits: option.totalCredits,
      voteCount: option.voteCount,
      x: centerX + Math.cos(angle) * optionRadius,
      y: centerY + Math.sin(angle) * optionRadius
    });
  });

  // Create nodes for voters (placed in outer ring)
  const voterRadius = Math.min(width, height) / 3;
  votes.forEach((vote, index) => {
    const angle = (index / votes.length) * 2 * Math.PI;
    nodes.push({
      id: `voter_${vote.invite_code}`,
      type: 'voter',
      label: `Voter ${index + 1}`,
      credits: vote.total_credits_used,
      timestamp: vote.submitted_at,
      x: centerX + Math.cos(angle) * voterRadius,
      y: centerY + Math.sin(angle) * voterRadius
    });
  });

  // Create edges from voters to options
  votes.forEach((vote) => {
    const allocations = vote.allocations as Record<string, number>;
    Object.entries(allocations).forEach(([optionId, credits]) => {
      if (credits > 0) {
        edges.push({
          id: `${vote.invite_code}_${optionId}`,
          source: `voter_${vote.invite_code}`,
          target: `option_${optionId}`,
          weight: credits,
          label: `${credits} credits`,
          timestamp: vote.submitted_at
        });
      }
    });
  });

  return { nodes, edges };
}

// Helper function for clustering analysis
function generateClusterAnalysis(votes: any[]) {
  const clusters: any[] = [];

  if (votes.length === 0) return { clusters: [], summary: { totalClusters: 0 } };

  // Simple clustering based on voting patterns
  const votingPatterns: { [key: string]: any[] } = {};

  votes.forEach((vote) => {
    const allocations = vote.allocations as Record<string, number>;
    const pattern = Object.keys(allocations)
      .filter(optionId => allocations[optionId] > 0)
      .sort()
      .join(',');

    if (!votingPatterns[pattern]) {
      votingPatterns[pattern] = [];
    }
    votingPatterns[pattern].push(vote);
  });

  // Convert patterns to clusters
  Object.entries(votingPatterns).forEach(([pattern, voters], index) => {
    const totalCredits = voters.reduce((sum, voter) => sum + (voter.total_credits_used || 0), 0);
    const avgCredits = totalCredits / voters.length;

    clusters.push({
      id: `cluster_${index}`,
      pattern: pattern,
      voterCount: voters.length,
      totalCredits: totalCredits,
      avgCredits: avgCredits,
      voters: voters.map(v => v.invite_code),
      percentage: (voters.length / votes.length) * 100
    });
  });

  // Sort clusters by size
  clusters.sort((a, b) => b.voterCount - a.voterCount);

  return {
    clusters: clusters,
    summary: {
      totalClusters: clusters.length,
      largestCluster: clusters[0]?.voterCount || 0,
      diversity: clusters.length / votes.length // Higher = more diverse voting patterns
    }
  };
}

// Helper function to hash IP addresses for privacy
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16);
}