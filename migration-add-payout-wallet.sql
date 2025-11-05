-- Add payout_wallet column to proposals table
-- This migration adds support for separate payout wallet addresses

-- Add the new column
ALTER TABLE proposals
ADD COLUMN payout_wallet VARCHAR(100);

-- Update existing wallet columns to support ENS (increase size from 42 to 100)
ALTER TABLE proposals
ALTER COLUMN submitter_wallet TYPE VARCHAR(100);

-- Add comment for documentation
COMMENT ON COLUMN proposals.payout_wallet IS 'Wallet address where payments should be sent if proposal wins (supports 0x format and ENS)';
COMMENT ON COLUMN proposals.submitter_wallet IS 'Wallet address for contact/verification (supports 0x format and ENS)';