import { describe, it, expect } from 'vitest';
import { getInitialProposalStatus } from '@/lib/utils/proposal-status';

describe('getInitialProposalStatus', () => {
  describe('camelCase config (what the frontend writes)', () => {
    it('auto-approves when moderationMode is "none"', () => {
      expect(getInitialProposalStatus({ moderationMode: 'none' })).toBe('approved');
    });

    it('queues for approval when moderationMode is "pre_approval"', () => {
      expect(getInitialProposalStatus({ moderationMode: 'pre_approval' })).toBe(
        'pending_approval'
      );
    });

    it('auto-approves when moderationMode is "post_moderation"', () => {
      expect(getInitialProposalStatus({ moderationMode: 'post_moderation' })).toBe(
        'approved'
      );
    });
  });

  describe('snake_case config (legacy / DB-native rows)', () => {
    it('auto-approves when moderation_mode is "none"', () => {
      expect(getInitialProposalStatus({ moderation_mode: 'none' })).toBe('approved');
    });

    it('queues for approval when moderation_mode is "pre_approval"', () => {
      expect(getInitialProposalStatus({ moderation_mode: 'pre_approval' })).toBe(
        'pending_approval'
      );
    });
  });

  describe('safety defaults', () => {
    it('treats null/undefined config as requiring approval', () => {
      expect(getInitialProposalStatus(null)).toBe('pending_approval');
      expect(getInitialProposalStatus(undefined)).toBe('pending_approval');
    });

    it('treats unknown moderation modes as requiring approval', () => {
      expect(
        getInitialProposalStatus({ moderationMode: 'something_new' as any })
      ).toBe('pending_approval');
    });

    it('treats missing moderation field as requiring approval', () => {
      expect(getInitialProposalStatus({})).toBe('pending_approval');
    });
  });

  it('uses threshold mode for "threshold"', () => {
    expect(getInitialProposalStatus({ moderationMode: 'threshold' })).toBe(
      'submitted'
    );
  });
});
