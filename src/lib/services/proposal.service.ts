import { db } from '@/lib/db/client';
import { proposals, events, invites, options } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { hashString } from '@/lib/utils/auth';
import type { Proposal } from '@/lib/types';

export class ProposalService {
  /**
   * Submit a new proposal
   */
  async submitProposal(input: {
    eventId: string;
    title: string;
    description?: string;
    imageUrl?: string;
    submitterEmail: string;
    submitterWallet?: string;
    payoutWallet?: string;
    inviteCode?: string;
  }): Promise<Proposal> {
    // 1. Validate event accepts proposals
    const eventResults = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
    const event = eventResults[0];
    
    if (!event) throw new Error('Event not found');
    if (!this.areProposalsOpen(event)) throw new Error('Proposal submission is closed');
    
    // 2. Validate submitter authorization if needed
    if ((event.proposalConfig as any)?.access_control === 'invite_only') {
      if (!input.inviteCode) throw new Error('Invite code required');
      await this.validateSubmitter(event.id, input.submitterEmail, input.inviteCode);
    }
    
    // 3. Generate anonymous ID
    const anonymousId = hashString(input.submitterEmail);
    
    // 4. Determine initial status based on moderation mode
    const initialStatus = this.getInitialStatus(event.proposalConfig);
    
    // 5. Insert proposal and auto-convert if approved
    let proposal: any;

    await db.transaction(async (tx) => {
      [proposal] = await tx.insert(proposals).values({
        eventId: input.eventId,
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl,
        submitterEmail: input.submitterEmail,
        submitterWallet: input.submitterWallet,
        payoutWallet: input.payoutWallet,
        submitterAnonymousId: anonymousId,
        status: initialStatus,
        submittedAt: initialStatus !== 'draft' ? new Date() : null,
      }).returning();

      // 6. Auto-convert to option if approved (moderation disabled)
      if (initialStatus === 'approved') {
        await this.convertSingleProposalToOption(proposal, tx);
      }

      // 7. Update invite tracking if applicable
      if (input.inviteCode) {
        await tx.update(invites)
          .set({
            proposalsSubmitted: 1, // Simplified for now
          })
          .where(eq(invites.code, input.inviteCode));
      }
    });

    return proposal as Proposal;
  }
  
  /**
   * Check if proposals are currently open
   */
  private areProposalsOpen(event: any): boolean {
    console.log('DEBUG: Checking if proposals are open for event:', {
      eventId: event.id,
      optionMode: event.optionMode,
      proposalConfig: event.proposalConfig,
      startTime: event.startTime,
      endTime: event.endTime
    });

    if (event.optionMode === 'admin_defined') {
      console.log('DEBUG: Proposals blocked - admin_defined mode');
      return false;
    }

    // Check if proposalConfig exists and is properly configured
    if (!event.proposalConfig) {
      console.log('DEBUG: Proposals blocked - no proposalConfig found');
      return false;
    }

    // If enabled is explicitly false, block proposals
    if (event.proposalConfig.enabled === false) {
      console.log('DEBUG: Proposals blocked - explicitly disabled in config');
      return false;
    }

    const now = new Date();
    console.log('DEBUG: Current time:', now.toISOString());

    // Support both camelCase and snake_case for backwards compatibility
    const submissionStart = event.proposalConfig.submissionStart || event.proposalConfig.submission_start;
    const submissionEnd = event.proposalConfig.submissionEnd || event.proposalConfig.submission_end;

    console.log('DEBUG: Submission window from config:', {
      submissionStart,
      submissionEnd,
      hasSubmissionWindow: !!(submissionStart && submissionEnd),
      configKeys: Object.keys(event.proposalConfig || {})
    });

    if (!submissionStart || !submissionEnd) {
      // If no submission window specified, allow submissions during event time
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      const isWithinEventTime = now >= eventStart && now <= eventEnd;

      console.log('DEBUG: No submission window, checking event time:', {
        eventStart: eventStart.toISOString(),
        eventEnd: eventEnd.toISOString(),
        isWithinEventTime
      });

      return isWithinEventTime;
    }

    // Parse submission window with proper timezone handling
    let startTime, endTime;
    try {
      startTime = new Date(submissionStart);
      endTime = new Date(submissionEnd);

      // Validate dates are valid
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.log('DEBUG: Invalid submission dates, falling back to event time');
        const eventStart = new Date(event.startTime);
        const eventEnd = new Date(event.endTime);
        return now >= eventStart && now <= eventEnd;
      }
    } catch (error) {
      console.log('DEBUG: Error parsing submission dates:', error);
      // Fall back to event time window
      const eventStart = new Date(event.startTime);
      const eventEnd = new Date(event.endTime);
      return now >= eventStart && now <= eventEnd;
    }

    const isWithinSubmissionWindow = now >= startTime && now <= endTime;

    console.log('DEBUG: Checking submission window:', {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isWithinSubmissionWindow,
      nowIsoString: now.toISOString()
    });

    return isWithinSubmissionWindow;
  }
  
  /**
   * Validate submitter is authorized
   */
  private async validateSubmitter(
    eventId: string,
    email: string,
    inviteCode: string
  ): Promise<void> {
    const inviteResults = await db.select().from(invites).where(
      and(
        eq(invites.eventId, eventId),
        eq(invites.code, inviteCode)
      )
    ).limit(1);
    const invite = inviteResults[0];
    
    if (!invite) throw new Error('Invalid invite code');
    if (invite.inviteType === 'voting') {
      throw new Error('This code is only for voting');
    }
  }
  
  /**
   * Determine initial proposal status based on moderation mode
   */
  private getInitialStatus(proposalConfig: any): string {
    if (!proposalConfig) return 'pending_approval';

    const { moderation_mode } = proposalConfig;

    switch (moderation_mode) {
      case 'pre_approval':
        return 'pending_approval';
      case 'post_approval':
      case 'none':
        return 'approved';
      case 'threshold':
        return 'submitted';
      default:
        return 'pending_approval';
    }
  }

  /**
   * Convert a single proposal to an option
   */
  private async convertSingleProposalToOption(proposal: any, tx?: any): Promise<void> {
    const dbClient = tx || db;

    // Skip if already converted
    if (proposal.convertedToOptionId) return;

    // Get current max position for this event
    const existingOptions = await dbClient.select()
      .from(options)
      .where(eq(options.eventId, proposal.eventId))
      .orderBy(desc(options.position));

    const nextPosition = existingOptions.length > 0 ? existingOptions[0].position + 1 : 0;

    // Insert as option
    const [option] = await dbClient.insert(options).values({
      eventId: proposal.eventId,
      title: proposal.title,
      description: proposal.description,
      imageUrl: proposal.imageUrl,
      position: nextPosition,
      source: 'community',
      createdByProposalId: proposal.id,
    }).returning();

    // Update proposal with option ID
    await dbClient.update(proposals)
      .set({ convertedToOptionId: option.id })
      .where(eq(proposals.id, proposal.id));
  }
  
  /**
   * Get proposals for an event
   */
  async getProposalsByEventId(
    eventId: string,
    status?: string
  ): Promise<Proposal[]> {
    const whereClause = status
      ? and(eq(proposals.eventId, eventId), eq(proposals.status, status))
      : eq(proposals.eventId, eventId);

    const result = await db.select().from(proposals).where(whereClause).orderBy(desc(proposals.submittedAt));

    return result as Proposal[];
  }

  /**
   * Get all proposals across all events (for admin)
   */
  async getAllProposals(status?: string): Promise<Proposal[]> {
    const whereClause = status ? eq(proposals.status, status) : undefined;

    const result = whereClause
      ? await db.select().from(proposals).where(whereClause).orderBy(desc(proposals.submittedAt))
      : await db.select().from(proposals).orderBy(desc(proposals.submittedAt));

    return result as Proposal[];
  }
  
  /**
   * Approve proposal (admin action) - automatically converts to option
   */
  async approveProposal(proposalId: string, adminUserId: string | null): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Update proposal status
      const [proposal] = await tx.update(proposals)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: adminUserId,
        })
        .where(eq(proposals.id, proposalId))
        .returning();

      if (!proposal) throw new Error('Proposal not found');

      // 2. Automatically convert to option
      await this.convertSingleProposalToOption(proposal, tx);
    });
  }
  
  /**
   * Reject proposal (admin action)
   */
  async rejectProposal(
    proposalId: string,
    reason: string
  ): Promise<void> {
    await db.update(proposals)
      .set({
        status: 'rejected',
        rejectedAt: new Date(),
        rejectionReason: reason,
      })
      .where(eq(proposals.id, proposalId));
  }
  
  /**
   * Convert approved proposals to voting options
   */
  async convertProposalsToOptions(eventId: string): Promise<number> {
    // Get all approved proposals
    const approvedProposals = await this.getProposalsByEventId(eventId, 'approved');
    
    let converted = 0;
    
    await db.transaction(async (tx) => {
      // Get current max position
      const existingOptions = await tx.query.options.findMany({
        where: eq(options.eventId, eventId),
        orderBy: (options, { desc }) => [desc(options.position)],
      });
      
      let nextPosition = existingOptions.length > 0 ? existingOptions[0].position + 1 : 0;
      
      for (const proposal of approvedProposals) {
        if (proposal.convertedToOptionId) continue; // Already converted
        
        // Insert as option
        const [option] = await tx.insert(options).values({
          eventId: eventId,
          title: proposal.title,
          description: proposal.description,
          imageUrl: proposal.imageUrl,
          position: nextPosition++,
          source: 'community',
          createdByProposalId: proposal.id,
        }).returning();
        
        // Update proposal with option ID
        await tx.update(proposals)
          .set({ convertedToOptionId: option.id })
          .where(eq(proposals.id, proposal.id));
        
        converted++;
      }
    });
    
    return converted;
  }
}

export const proposalService = new ProposalService();

