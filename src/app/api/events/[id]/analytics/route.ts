import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { events, votes, proposals, invites, options } from '@/lib/db/schema';
import { eq, count, avg, max, min, sql } from 'drizzle-orm';

// Fixed import path to resolve webpack caching issue
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const eventId = params.id;
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'all';

    // Get basic event info using Drizzle
    const event = await db.select({
      id: events.id,
      title: events.title,
      startTime: events.startTime,
      endTime: events.endTime,
      createdAt: events.createdAt
    }).from(events).where(eq(events.id, eventId)).limit(1);

    if (event.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get real analytics data
    const [
      votingStats,
      proposalStats,
      inviteStats,
      eventOptions,
      individualVotes,
      timelineData
    ] = await Promise.all([
      // Voting statistics
      db.select({
        total_votes: count(),
        unique_voters: sql<number>`count(distinct ${votes.inviteCode})`,
        avg_credits_used: avg(votes.totalCreditsUsed),
        max_credits_used: max(votes.totalCreditsUsed),
        min_credits_used: min(votes.totalCreditsUsed),
      }).from(votes).where(eq(votes.eventId, eventId)),

      // Proposal statistics
      db.select({
        total: count(),
        status: proposals.status
      }).from(proposals)
       .where(eq(proposals.eventId, eventId))
       .groupBy(proposals.status),

      // Invite statistics
      db.select({
        total: count(),
        used: sql<number>`count(case when ${invites.usedAt} is not null then 1 end)`,
        opened: sql<number>`count(case when ${invites.openedAt} is not null then 1 end)`,
      }).from(invites).where(eq(invites.eventId, eventId)),

      // Get all options for this event
      db.select({
        id: options.id,
        title: options.title
      }).from(options).where(eq(options.eventId, eventId)),

      // Individual vote data for network analysis
      db.select({
        id: votes.id,
        inviteCode: votes.inviteCode,
        allocations: votes.allocations,
        totalCreditsUsed: votes.totalCreditsUsed,
        submittedAt: votes.submittedAt,
        ipAddress: votes.ipAddress
      }).from(votes).where(eq(votes.eventId, eventId)),

      // Timeline data (votes over time)
      db.select({
        hour: sql<string>`date_trunc('hour', ${votes.submittedAt})`,
        voteCount: count(),
        totalCredits: sql<number>`sum(${votes.totalCreditsUsed})`
      }).from(votes)
       .where(eq(votes.eventId, eventId))
       .groupBy(sql`date_trunc('hour', ${votes.submittedAt})`)
       .orderBy(sql`date_trunc('hour', ${votes.submittedAt})`)
    ]);

    // Process proposal stats into the expected format
    const proposalCounts = proposalStats.reduce((acc, stat) => {
      acc[stat.status || 'unknown'] = stat.total;
      return acc;
    }, {} as Record<string, number>);

    // Calculate option performance in JavaScript
    const optionPerformance = eventOptions.map(option => {
      let totalCredits = 0;
      let voteCount = 0;

      individualVotes.forEach(vote => {
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
    const networkData = generateNetworkGraph(individualVotes, optionPerformance);

    // Generate cluster analysis
    const clusterAnalysis = generateClusterAnalysis(individualVotes);

    // Process timeline data
    const processedTimeline = timelineData.map(t => ({
      timestamp: t.hour,
      voteCount: Number(t.voteCount),
      totalCredits: Number(t.totalCredits)
    }));

    const analytics = {
      event: event[0],
      voting: {
        total_votes: votingStats[0]?.total_votes || 0,
        unique_voters: Number(votingStats[0]?.unique_voters) || 0,
        avg_credits_used: Number(votingStats[0]?.avg_credits_used) || 0,
        max_credits_used: Number(votingStats[0]?.max_credits_used) || 0,
        min_credits_used: Number(votingStats[0]?.min_credits_used) || 0,
      },
      proposals: {
        total: Object.values(proposalCounts).reduce((a, b) => a + b, 0),
        approved: proposalCounts['approved'] || 0,
        pending: (proposalCounts['pending_approval'] || 0) + (proposalCounts['submitted'] || 0),
        rejected: proposalCounts['rejected'] || 0,
      },
      invites: {
        total: inviteStats[0]?.total || 0,
        used: Number(inviteStats[0]?.used) || 0,
        opened: Number(inviteStats[0]?.opened) || 0,
      },
      participation_over_time: processedTimeline,
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
      individual_votes: individualVotes.map(vote => ({
        id: vote.id,
        voter_id: vote.inviteCode,
        allocations: vote.allocations,
        total_credits: vote.totalCreditsUsed,
        timestamp: vote.submittedAt,
        ip_hash: vote.ipAddress ? hashString(vote.ipAddress) : null
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
      id: `voter_${vote.inviteCode}`,
      type: 'voter',
      label: `Voter ${index + 1}`,
      credits: vote.totalCreditsUsed,
      timestamp: vote.submittedAt,
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
          id: `${vote.inviteCode}_${optionId}`,
          source: `voter_${vote.inviteCode}`,
          target: `option_${optionId}`,
          weight: credits,
          label: `${credits} credits`,
          timestamp: vote.submittedAt
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
    const totalCredits = voters.reduce((sum, voter) => sum + voter.totalCreditsUsed, 0);
    const avgCredits = totalCredits / voters.length;

    clusters.push({
      id: `cluster_${index}`,
      pattern: pattern,
      voterCount: voters.length,
      totalCredits: totalCredits,
      avgCredits: avgCredits,
      voters: voters.map(v => v.inviteCode),
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