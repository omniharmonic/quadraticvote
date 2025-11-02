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
    inviteCode?: string;
  }): Promise<Proposal> {
    // 1. Validate event accepts proposals
    const eventResults = await db.select().from(events).where(eq(events.id, input.eventId)).limit(1);
    const event = eventResults[0];
    
    if (!event) throw new Error('Event not found');
    if (!this.areProposalsOpen(event)) throw new Error('Proposal submission is closed');
    
    // 2. Validate submitter authorization if needed
    if (event.proposalConfig?.access_control === 'invite_only') {
      if (!input.inviteCode) throw new Error('Invite code required');
      await this.validateSubmitter(event.id, input.submitterEmail, input.inviteCode);
    }
    
    // 3. Generate anonymous ID
    const anonymousId = hashString(input.submitterEmail);
    
    // 4. Determine initial status based on moderation mode
    const initialStatus = this.getInitialStatus(event.proposalConfig);
    
    // 5. Insert proposal
    const [proposal] = await db.insert(proposals).values({
      eventId: input.eventId,
      title: input.title,
      description: input.description,
      imageUrl: input.imageUrl,
      submitterEmail: input.submitterEmail,
      submitterWallet: input.submitterWallet,
      submitterAnonymousId: anonymousId,
      status: initialStatus,
      submittedAt: initialStatus !== 'draft' ? new Date() : null,
    }).returning();
    
    // 6. Update invite tracking if applicable
    if (input.inviteCode) {
      await db.update(invites)
        .set({ 
          proposalsSubmitted: 1, // Simplified for now
        })
        .where(eq(invites.code, input.inviteCode));
    }
    
    return proposal as Proposal;
  }
  
  /**
   * Check if proposals are currently open
   */
  private areProposalsOpen(event: any): boolean {
    if (event.optionMode === 'admin_defined') return false;
    if (!event.proposalConfig?.enabled) return false;
    
    const now = new Date();
    const { submission_start, submission_end } = event.proposalConfig;
    
    return now >= new Date(submission_start) && now <= new Date(submission_end);
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
   * Approve proposal (admin action)
   */
  async approveProposal(proposalId: string, adminUserId: string | null): Promise<void> {
    await db.update(proposals)
      .set({
        status: 'approved',
        approvedAt: new Date(),
        approvedBy: adminUserId,
      })
      .where(eq(proposals.id, proposalId));
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

