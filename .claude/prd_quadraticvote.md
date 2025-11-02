# Product Requirements Document: QuadraticVote.xyz

## Executive Summary

QuadraticVote.xyz is a free, highly configurable quadratic voting platform designed to serve as a modular governance utility for decentralized communities. The platform enables ephemeral, anonymous, and secure voting events with sophisticated visualization and reporting capabilities. **Events support both admin-defined options and community-submitted proposals, with two distinct decision frameworks: binary selection (threshold-based) and proportional resource distribution.**

## Product Vision

Create the premier open-source quadratic voting tool that combines anonymous security, intuitive UX, and comprehensive analytics to serve as a foundational building block in decentralized governance ecosystems. **Support both selective decision-making (choosing winners) and distributive decision-making (allocating resources).**

## Core Value Proposition

- **Ephemeral by Design**: Quick event creation and execution without unnecessary persistence
- **Anonymous & Secure**: Unique invite codes enable gated participation without identity exposure
- **Dual Decision Frameworks**: Binary selection OR proportional distribution built into core architecture
- **Flexible Option Sources**: Admin-defined AND/OR community-proposed options
- **Beautiful UX**: Intuitive interface that adapts to decision type
- **Extensible**: Token-gating and modular architecture for integration into larger governance systems

---

## Critical Architectural Distinction: Two Decision Frameworks

### Framework 1: Binary Selection (Threshold-Based)
**Purpose**: Choose which options are approved/selected/implemented  
**Output**: Boolean result per option (selected: yes/no)  
**Use Cases**: 
- Project approval (which projects get funded?)
- Feature prioritization (which features should we build?)
- Candidate selection (which candidates win seats?)
- Multi-winner elections (top N proposals advance)

**Configuration**:
- Threshold type: Absolute (e.g., "Top 3 options") or Relative (e.g., "Options with >60% of max votes")
- Pass criteria: Clear binary outcome per option

### Framework 2: Proportional Distribution
**Purpose**: Allocate a finite resource pool across options based on vote weight  
**Output**: Numeric allocation per option (amount of resource)  
**Use Cases**:
- Budget allocation (distribute $100k across departments)
- Token distribution (allocate governance tokens)
- Time allocation (divide team hours across initiatives)
- Reputation distribution (assign community points)

**Configuration**:
- Resource type: Currency name (USD, ETH, governance tokens, hours, points, etc.)
- Total pool amount: Numeric value with decimal support
- Distribution formula: Proportional to quadratic votes (customizable)
- Minimum allocation: Optional floor (e.g., winners get at least 5%)

---

## User Personas

### Primary: Community Organizer/Administrator
Technical understanding, needs to deploy voting events quickly. **Must clearly understand which decision framework fits their governance need.**

### Secondary: Proposal Contributor
Community member submitting options. **Needs to understand if this is competitive selection or resource sharing.**

### Tertiary: Voter/Participant
Varying technical literacy. **Must clearly see whether they're choosing winners or distributing resources.**

### Quaternary: Data Analyst/Governance Lead
Requires comprehensive results. **Needs different export formats for binary vs. proportional outcomes.**

---

## Functional Requirements

## 1. Event Creation & Configuration

### 1.1 Event Setup (Core Metadata)
- **Event Metadata**
  - Title (required, 200 char max)
  - Rich text description with markdown support
  - Tags/categories for organization
  - Event image/banner (optional)
  - Duration: Start time, end time, timezone handling

- **Visibility Controls**
  - Public: Anyone with link can view (but not vote without invite)
  - Private: Only accessible via invite code
  - Unlisted: Accessible by URL but not discoverable

---

### 1.2 **Decision Framework Selection** ⭐ CRITICAL

**This is the FIRST configuration choice after basic event metadata, as it affects all downstream settings.**

#### **Framework A: Binary Selection (Threshold-Based)**

**Admin Configuration Screen:**
```
┌─────────────────────────────────────────────────────────┐
│ Decision Framework: Binary Selection                    │
│                                                          │
│ Voters will choose which options should be selected.    │
│ Each option will have a YES/NO outcome based on votes.  │
│                                                          │
│ Threshold Configuration:                                │
│                                                          │
│ ○ Top N Options                                         │
│   Select top [  3  ] options by quadratic vote count    │
│                                                          │
│ ○ Percentage Threshold                                  │
│   Select options that receive ≥ [ 60 ]% of the          │
│   highest-voted option's score                          │
│                                                          │
│ ○ Absolute Vote Threshold                               │
│   Select options that receive ≥ [ 100 ] quadratic votes │
│                                                          │
│ ○ All Above Average                                     │
│   Select all options scoring above mean vote total      │
│                                                          │
│ Tie-breaking: [Timestamp (earliest wins) ▾]             │
│                                                          │
│ [ Next: Configure Options ]                             │
└─────────────────────────────────────────────────────────┘
```

**Data Model (Binary Framework)**:
```typescript
interface BinaryDecisionConfig {
  framework_type: 'binary_selection',
  threshold_mode: 'top_n' | 'percentage' | 'absolute_votes' | 'above_average',
  
  // For 'top_n' mode
  top_n_count?: number, // e.g., 3 (top 3 options selected)
  
  // For 'percentage' mode
  percentage_threshold?: number, // e.g., 60 (≥60% of max votes)
  
  // For 'absolute_votes' mode
  absolute_vote_threshold?: number, // e.g., 100 (≥100 quadratic votes)
  
  // Tie-breaking
  tiebreaker: 'timestamp' | 'random' | 'alphabetical',
  
  // Display settings
  show_pass_fail_during_voting: boolean, // Show which options are currently "winning"
  
  // Output
  // Result per option: { option_id: uuid, selected: boolean, votes: number, rank: number }
}
```

---

#### **Framework B: Proportional Distribution**

**Admin Configuration Screen:**
```
┌─────────────────────────────────────────────────────────┐
│ Decision Framework: Proportional Distribution           │
│                                                          │
│ Voters will allocate a resource pool across options.    │
│ Each option receives a share based on votes received.   │
│                                                          │
│ Resource Configuration:                                 │
│                                                          │
│ Resource Name/Type: [________________________]          │
│ Examples: "USD Budget", "ETH", "Hours", "Points"        │
│                                                          │
│ Total Pool Amount: [________________________]           │
│                    100000                                │
│                                                          │
│ Currency Symbol (optional): [ $ ]                       │
│                                                          │
│ Decimal Places: [ 2 ▾ ] (0-8)                          │
│                                                          │
│ Distribution Formula:                                   │
│ ○ Proportional to Quadratic Votes (standard)           │
│   allocation = (option_votes / total_votes) × pool     │
│                                                          │
│ ○ Proportional to Credits (raw)                        │
│   allocation = (option_credits / total_credits) × pool │
│                                                          │
│ Minimum Allocation Floor:                               │
│ □ Enable minimum allocation per winning option          │
│   Minimum: [ 5 ]% of pool (ensures meaningful funding) │
│                                                          │
│ Zero-Vote Handling:                                     │
│ ○ Exclude from distribution (unallocated pool remains) │
│ ○ Distribute equally (pool fully allocated)            │
│                                                          │
│ [ Next: Configure Options ]                             │
└─────────────────────────────────────────────────────────┘
```

**Data Model (Proportional Framework)**:
```typescript
interface ProportionalDistributionConfig {
  framework_type: 'proportional_distribution',
  
  // Resource definition
  resource_name: string, // e.g., "USD Budget", "Governance Tokens", "Work Hours"
  resource_symbol: string, // e.g., "$", "ETH", "hrs", "pts"
  total_pool_amount: number, // e.g., 100000
  decimal_places: number, // 0-8, for display formatting
  
  // Distribution formula
  distribution_mode: 'quadratic_votes' | 'raw_credits',
  
  // Constraints
  minimum_allocation_enabled: boolean,
  minimum_allocation_percentage?: number, // e.g., 5 (5% of pool)
  
  // Zero-vote handling
  zero_vote_handling: 'exclude' | 'distribute_equally',
  
  // Display settings
  show_allocations_during_voting: boolean, // Show projected distribution in real-time
  
  // Output
  // Result per option: { option_id: uuid, allocation_amount: number, percentage: number, votes: number }
}
```

---

### 1.3 **Option Creation Mode**

**Applies to BOTH decision frameworks** - this is about the SOURCE of options, not how they're decided.

#### **Mode A: Admin-Defined Options**
- Administrator manually creates all voting options
- Best for: Curated choices, predefined alternatives

#### **Mode B: Community Proposals**
- Community members submit proposals that become voting options
- Best for: Participatory budgeting, open innovation

#### **Mode C: Hybrid** 
- Administrator pre-seeds some options AND opens proposal submission
- Best for: Ensuring baseline options while allowing community additions

---

### 1.3.1 Admin-Defined Options Configuration

**Option Entry Interface (Adapted by Decision Framework):**

**Binary Selection Mode:**
```
┌─────────────────────────────────────────────────────────┐
│ Add Voting Options                                       │
│                                                          │
│ These options will compete for selection (Top 3 win).   │
│                                                          │
│ Option 1                                                │
│ Title: [Build Community Center_______________]          │
│ Description: [markdown editor...]                       │
│ Image: [upload]                                         │
│ [ Remove Option ]                                       │
│                                                          │
│ Option 2                                                │
│ Title: [Renovate Public Park_______________]            │
│ ...                                                     │
│                                                          │
│ [ + Add Another Option ]                                │
│                                                          │
│ Current count: 2 options (min: 2, max: 50)             │
└─────────────────────────────────────────────────────────┘
```

**Proportional Distribution Mode:**
```
┌─────────────────────────────────────────────────────────┐
│ Add Budget Categories                                    │
│                                                          │
│ These categories will receive portions of the $100,000  │
│ budget based on voter allocation.                       │
│                                                          │
│ Category 1                                              │
│ Title: [Infrastructure___________________]              │
│ Description: [Roads, utilities, facilities...]          │
│ Image: [upload]                                         │
│ [ Remove Category ]                                     │
│                                                          │
│ Category 2                                              │
│ Title: [Education________________________]              │
│ ...                                                     │
│                                                          │
│ [ + Add Another Category ]                              │
│                                                          │
│ Note: All categories will receive some allocation.      │
│ Voters will determine the proportions.                  │
└─────────────────────────────────────────────────────────┘
```

**Data Model:**
```typescript
interface Option {
  id: uuid,
  event_id: uuid (FK),
  title: string,
  description: string?,
  image_url: string?,
  position: number, // Display order
  
  // Source tracking (applies to both frameworks)
  source: 'admin' | 'community' | 'merged',
  created_by: 'admin' | uuid (proposal_id reference)?,
  created_at: timestamp,
  
  // If merged from multiple proposals
  merged_from: uuid[]?
}
```

---

### 1.3.2 Community Proposal Configuration

**Applies to BOTH frameworks, but language adapts:**

#### **Proposal Submission Settings**

**Binary Selection Context:**
- "Submit proposals for projects to be selected"
- "Top proposals will be chosen by the community"

**Proportional Distribution Context:**
- "Submit proposals for budget allocation"
- "All approved proposals will receive funding based on votes"

**Configuration Options (Same for Both Frameworks):**

- **Submission Period**
  - Proposal start time
  - Proposal end time
  - Example flow: Day 1-7 proposals → Day 8-10 review → Day 11-17 voting

- **Submission Requirements**
  - Min proposals required (default: 2)
  - Max proposals allowed (default: 50)
  - Character limits (title: 100, description: 2000)
  - Required fields toggles

- **Access Control for Proposals**
  - Open: Anyone with link
  - Invite-Only: Requires invite code
  - Token-Gated: Requires specific token

- **Moderation Mode**
  - Pre-Approval: Admin review required
  - Post-Approval: Auto-publish, admin can remove
  - Threshold Approval: Auto-approve after X upvotes
  - No Moderation: All submissions auto-approved

**Data Model:**
```typescript
interface ProposalConfig {
  enabled: boolean,
  submission_start: timestamp,
  submission_end: timestamp,
  min_proposals: number,
  max_proposals: number,
  
  access_control: 'open' | 'invite_only' | 'token_gated',
  moderation_mode: 'pre_approval' | 'post_approval' | 'threshold' | 'none',
  threshold_votes?: number,
  
  max_proposals_per_user: number,
  
  // Framework-specific guidance
  submission_context: {
    framework_type: 'binary_selection' | 'proportional_distribution',
    resource_name?: string, // e.g., "$100k Budget" for distribution mode
    selection_count?: number, // e.g., "Top 3" for binary mode
  }
}
```

---

### 1.4 Voting Configuration (Credit Allocation)

**Applies to BOTH frameworks - credit allocation is framework-agnostic:**

- **Credit Allocation**
  - Total credits per voter (default: 100, range: 10-10,000)
  - Credit calculation mode:
    - Equal distribution
    - Weighted by token balance
    - Weighted by trust score
    - Custom weighting formula

**Credits convert to quadratic votes the same way regardless of framework:**
```
votes_for_option = √(credits_allocated_to_option)
```

**The decision framework only affects how these votes are INTERPRETED, not how they're CAST.**

---

### 1.5 Access Control (Same for Both Frameworks)

- **Invite List Management**
  - CSV upload, manual entry
  - Generate unique invite codes
  - Separate lists for proposal submitters vs. voters

- **Invite Distribution**
  - Automated email sending
  - Template customization
  - Tracking

- **Token Gating**
  - Apply to proposals, voting, or both
  - Chain support: Ethereum, Polygon, Arbitrum, Optimism, Base
  - WalletConnect integration

---

## 2. Proposal Submission Experience

**Language and context adapt based on decision framework, but mechanics are identical:**

### 2.1 Submission Form Context Adaptation

**Binary Selection Event:**
```
┌─────────────────────────────────────────────────────────┐
│ Submit Your Proposal                                     │
│ Event: Community Project Selection                       │
│                                                          │
│ The top 5 proposals will be selected for implementation.│
│ Submit your best idea to be considered!                 │
│                                                          │
│ [Proposal form fields...]                               │
└─────────────────────────────────────────────────────────┘
```

**Proportional Distribution Event:**
```
┌─────────────────────────────────────────────────────────┐
│ Submit Budget Proposal                                   │
│ Event: 2025 Budget Allocation ($500k)                   │
│                                                          │
│ All approved proposals will receive funding based on    │
│ community votes. Submit your proposal for consideration.│
│                                                          │
│ [Proposal form fields...]                               │
└─────────────────────────────────────────────────────────┘
```

**Mechanics remain the same** (authentication, validation, moderation) - only the framing text changes.

---

## 3. Voting Experience

### 3.1 Entry & Authentication (Same for Both)
- Code entry
- Wallet connection (if token-gated)
- Session persistence

---

### 3.2 Voting Interface (Framework-Adapted)

**The voting mechanics are IDENTICAL (credit allocation via sliders), but the UI messaging and result preview differ:**

---

#### **Binary Selection Voting Interface:**

**Event Header:**
```
┌─────────────────────────────────────────────────────────┐
│ Community Project Selection                              │
│ Select your preferred projects by allocating credits.   │
│ Top 5 projects will be implemented.                     │
│                                                          │
│ Time remaining: 3 days 14 hours                         │
└─────────────────────────────────────────────────────────┘
```

**Option Cards:**
```
┌─────────────────────────────────────────────────────────┐
│ Build Community Center                           [#1]    │
│ A new community gathering space in North Park.          │
│                                                          │
│ Credits allocated: [=========>                    ] 25   │
│ Your votes: 5.0 (√25)                                   │
│                                                          │
│ Current rank: 2nd place (if live results enabled)       │
│ Status: ✓ Currently selected (Top 5)                    │
└─────────────────────────────────────────────────────────┘
```

**Voting Bar (Bottom):**
```
┌─────────────────────────────────────────────────────────┐
│ Credits: 75 remaining / 100 total                       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                                   │
│                                                          │
│ Projects you're supporting: 3                           │
│ Projects currently in Top 5: 2 of yours                 │
│                                                          │
│ [ Submit Votes ]  [ Save Draft ]  [ Reset ]             │
└─────────────────────────────────────────────────────────┘
```

---

#### **Proportional Distribution Voting Interface:**

**Event Header:**
```
┌─────────────────────────────────────────────────────────┐
│ 2025 Budget Allocation                                   │
│ Allocate credits to determine how $500,000 is divided.  │
│ All categories will receive funding proportionally.     │
│                                                          │
│ Time remaining: 3 days 14 hours                         │
└─────────────────────────────────────────────────────────┘
```

**Option Cards:**
```
┌─────────────────────────────────────────────────────────┐
│ Infrastructure                                           │
│ Roads, utilities, and public facilities maintenance.    │
│                                                          │
│ Credits allocated: [=========>                    ] 25   │
│ Your votes: 5.0 (√25)                                   │
│                                                          │
│ Projected allocation: $87,500 (17.5% of pool)          │
│ If voting ended now, this category would receive:       │
│ $87,500 based on current community votes                │
└─────────────────────────────────────────────────────────┘
```

**Voting Bar (Bottom):**
```
┌─────────────────────────────────────────────────────────┐
│ Credits: 75 remaining / 100 total                       │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░                                   │
│                                                          │
│ Projected Distribution (your impact):                   │
│ Infrastructure: $87,500 (17.5%)  ← You contributed 25 credits │
│ Education:      $125,000 (25%)   ← You contributed 40 credits │
│ Healthcare:     $62,500 (12.5%)  ← You contributed 10 credits │
│ ...                                                      │
│                                                          │
│ [ Submit Votes ]  [ Save Draft ]  [ Reset ]             │
└─────────────────────────────────────────────────────────┘
```

---

### 3.3 Real-Time Feedback Logic (Framework-Specific)

**Binary Selection:**
- Show current rank of each option (1st, 2nd, 3rd...)
- Indicate which options are currently "selected" (in Top N)
- Color coding: Green = selected, Yellow = on bubble, Gray = not selected

**Proportional Distribution:**
- Show projected dollar amount (or other resource) per option
- Display percentage of pool
- Update dynamically as user adjusts sliders
- Show total pool distribution (must equal 100% if all allocated)

**Backend Calculation (Real-Time Preview):**

```typescript
// Binary Selection
function calculateCurrentRanks(allVotes: Vote[]): OptionRank[] {
  const voteTotals = aggregateQuadraticVotes(allVotes);
  const sorted = voteTotals.sort((a, b) => b.votes - a.votes);
  return sorted.map((opt, index) => ({
    option_id: opt.option_id,
    rank: index + 1,
    selected: index < event.binary_config.top_n_count, // if top_n mode
    votes: opt.votes
  }));
}

// Proportional Distribution
function calculateProjectedDistribution(allVotes: Vote[], config: ProportionalDistributionConfig): Distribution[] {
  const voteTotals = aggregateQuadraticVotes(allVotes);
  const totalVotes = voteTotals.reduce((sum, opt) => sum + opt.votes, 0);
  
  return voteTotals.map(opt => {
    const percentage = opt.votes / totalVotes;
    const amount = percentage * config.total_pool_amount;
    
    return {
      option_id: opt.option_id,
      allocation_amount: amount,
      percentage: percentage * 100,
      votes: opt.votes
    };
  });
}
```

---

### 3.4 Vote Submission (Framework-Aware Confirmation)

**Binary Selection Confirmation Modal:**
```
┌─────────────────────────────────────────────────────────┐
│ Confirm Your Votes                                       │
│                                                          │
│ You allocated credits to 3 projects:                    │
│                                                          │
│ Community Center       5.0 votes (25 credits)           │
│ Public Park Renovation 7.1 votes (50 credits)           │
│ Library Expansion      5.0 votes (25 credits)           │
│                                                          │
│ Currently, Public Park Renovation is ranked 1st.       │
│                                                          │
│ [ ← Edit Votes ]  [ Confirm & Submit → ]                │
└─────────────────────────────────────────────────────────┘
```

**Proportional Distribution Confirmation Modal:**
```
┌─────────────────────────────────────────────────────────┐
│ Confirm Your Budget Allocation                           │
│                                                          │
│ Based on your votes and current community votes:        │
│                                                          │
│ Infrastructure   $87,500  (17.5%)  [5.0 votes from you] │
│ Education       $125,000  (25.0%)  [7.1 votes from you] │
│ Healthcare       $62,500  (12.5%)  [5.0 votes from you] │
│ ...                                                      │
│                                                          │
│ Total Distributed: $500,000 (100%)                      │
│                                                          │
│ Note: Final amounts will change as more people vote.    │
│                                                          │
│ [ ← Edit Votes ]  [ Confirm & Submit → ]                │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Results & Reporting

### 4.1 Results Dashboard Architecture

**Critical: The results dashboard has TWO COMPLETELY DIFFERENT LAYOUTS based on decision framework.**

---

#### **Binary Selection Results Dashboard:**

**Summary Section:**
```
┌─────────────────────────────────────────────────────────┐
│ Final Results: Community Project Selection               │
│                                                          │
│ Decision Rule: Top 5 projects selected                  │
│ Total Voters: 247                                       │
│ Total Credits Allocated: 24,700                         │
│                                                          │
│ ✓ 5 PROJECTS SELECTED FOR IMPLEMENTATION                │
└─────────────────────────────────────────────────────────┘
```

**Selected Options Table:**
```
┌─────────────────────────────────────────────────────────┐
│ SELECTED PROJECTS (5)                                    │
├──────┬────────────────────────┬────────┬────────┬───────┤
│ Rank │ Project                │ Votes  │Credits │ %     │
├──────┼────────────────────────┼────────┼────────┼───────┤
│  1st │ Public Park Renovation │  156.3 │ 24,421 │ 18.2% │
│  2nd │ Community Center       │  143.7 │ 20,650 │ 16.7% │
│  3rd │ Library Expansion      │  128.9 │ 16,615 │ 15.0% │
│  4th │ Youth Sports Complex   │  119.4 │ 14,256 │ 13.9% │
│  5th │ Senior Care Facility   │  112.8 │ 12,723 │ 13.1% │
└──────┴────────────────────────┴────────┴────────┴───────┘
```

**Not Selected Options:**
```
┌─────────────────────────────────────────────────────────┐
│ NOT SELECTED (12 proposals did not make the cut)        │
│ [ Show All ] [ Hide ]                                   │
└─────────────────────────────────────────────────────────┘
```

**Visualizations:**
- **Bar Chart**: Votes per option, with cut-off line at 5th place
- **Pass/Fail Pie**: 5 selected vs. 12 not selected
- **Vote Distribution**: Histogram showing vote clustering

---

#### **Proportional Distribution Results Dashboard:**

**Summary Section:**
```
┌─────────────────────────────────────────────────────────┐
│ Final Results: 2025 Budget Allocation                    │
│                                                          │
│ Resource: USD Budget                                     │
│ Total Pool: $500,000                                    │
│ Total Voters: 247                                       │
│ Total Credits Allocated: 24,700                         │
│                                                          │
│ Distribution: $500,000 allocated across 8 categories    │
└─────────────────────────────────────────────────────────┘
```

**Allocation Table:**
```
┌──────────────────────────────────────────────────────────────┐
│ FINAL BUDGET ALLOCATION                                      │
├──────────────────────┬──────────┬────────────┬──────────────┤
│ Category             │ Votes    │ Allocation │ % of Budget  │
├──────────────────────┼──────────┼────────────┼──────────────┤
│ Infrastructure       │  156.3   │  $125,000  │    25.0%     │
│ Education            │  143.7   │  $115,000  │    23.0%     │
│ Healthcare           │  128.9   │   $90,000  │    18.0%     │
│ Public Safety        │  119.4   │   $75,000  │    15.0%     │
│ Parks & Recreation   │  112.8   │   $50,000  │    10.0%     │
│ Arts & Culture       │   87.6   │   $30,000  │     6.0%     │
│ Transportation       │   45.2   │   $10,000  │     2.0%     │
│ Community Programs   │   22.1   │    $5,000  │     1.0%     │
├──────────────────────┴──────────┴────────────┴──────────────┤
│ TOTAL                              $500,000      100.0%     │
└──────────────────────────────────────────────────────────────┘
```

**Visualizations:**
- **Pie Chart**: Budget distribution by category
- **Stacked Bar**: Credits → Votes → Dollar allocation (transformation visualization)
- **Waterfall Chart**: Showing how pool was distributed
- **Allocation Flow**: Sankey diagram from voters → credits → options → dollars

---

### 4.2 Framework-Specific Metrics

**Binary Selection Metrics:**
- Winner margin: How close was 5th place to 6th?
- Consensus score: How much agreement on top options?
- Polarization: Were votes concentrated or distributed?
- Wasted votes: Credits allocated to non-winning options

**Proportional Distribution Metrics:**
- Gini coefficient: How equal/unequal was the distribution?
- Majority allocation: Did top 3 categories get >50% of pool?
- Minimum allocation: Did all options receive at least X%?
- Voter satisfaction: What % of each voter's credits went to top-funded options?

---

### 4.3 Cluster Visualization (Same for Both, But Interpreted Differently)

**3D Cluster Visualization (Implementation Identical):**
- Voters plotted in 3D space based on allocation similarity
- **Binary Selection interpretation**: "These voters wanted similar projects"
- **Proportional Distribution interpretation**: "These voters prioritized similar budget areas"

**Cluster Analysis Output:**
- Identify voting coalitions
- Show consensus vs. polarization
- **Binary**: Highlight "kingmaker" voters who pushed 5th place over 6th
- **Proportional**: Show which voters most influenced large allocations

---

### 4.4 Export Functionality (Framework-Specific Formats)

**Binary Selection Exports:**

**CSV - Summary:**
```csv
option_id,title,votes,credits,rank,selected
uuid1,Public Park Renovation,156.3,24421,1,TRUE
uuid2,Community Center,143.7,20650,2,TRUE
uuid3,Library Expansion,128.9,16615,3,TRUE
...
uuid8,New Sidewalks,67.4,4543,8,FALSE
```

**JSON - Detailed:**
```json
{
  "event": {
    "id": "uuid",
    "title": "Community Project Selection",
    "decision_framework": {
      "type": "binary_selection",
      "threshold_mode": "top_n",
      "top_n_count": 5
    }
  },
  "results": {
    "selected_options": [
      {
        "option_id": "uuid1",
        "title": "Public Park Renovation",
        "votes": 156.3,
        "credits": 24421,
        "rank": 1,
        "selected": true,
        "selection_margin": 30.9  // votes ahead of 6th place
      },
      ...
    ],
    "not_selected_options": [...]
  },
  "voter_data": [...]
}
```

---

**Proportional Distribution Exports:**

**CSV - Summary:**
```csv
option_id,title,votes,credits,allocation_amount,allocation_percentage
uuid1,Infrastructure,156.3,24421,125000,25.0
uuid2,Education,143.7,20650,115000,23.0
uuid3,Healthcare,128.9,16615,90000,18.0
...
```

**JSON - Detailed:**
```json
{
  "event": {
    "id": "uuid",
    "title": "2025 Budget Allocation",
    "decision_framework": {
      "type": "proportional_distribution",
      "resource_name": "USD Budget",
      "resource_symbol": "$",
      "total_pool_amount": 500000,
      "distribution_mode": "quadratic_votes"
    }
  },
  "results": {
    "distribution": [
      {
        "option_id": "uuid1",
        "title": "Infrastructure",
        "votes": 156.3,
        "credits": 24421,
        "allocation_amount": 125000,
        "allocation_percentage": 25.0,
        "allocation_formula": "(156.3 / 816.0) * 500000"
      },
      ...
    ],
    "total_allocated": 500000,
    "total_votes": 816.0,
    "total_credits": 24700
  },
  "voter_data": [...]
}
```

**PDF Report Differences:**
- **Binary**: Emphasizes winners vs. losers, competitive framing
- **Proportional**: Emphasizes fair distribution, cooperative framing

---

## 5. Backend Architecture for Dual Frameworks

### 5.1 Database Schema (Framework-Agnostic Core + Extensions)

**Event Table (Core + Framework Configuration):**
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Decision Framework Configuration (CRITICAL COLUMN)
  decision_framework JSONB NOT NULL,
  -- Structure depends on framework_type:
  -- {
  --   "framework_type": "binary_selection" | "proportional_distribution",
  --   "config": { ... framework-specific config ... }
  -- }
  
  -- Option creation mode (same for both frameworks)
  option_mode VARCHAR(50) NOT NULL, -- 'admin_defined' | 'community_proposals' | 'hybrid'
  proposal_config JSONB,
  
  -- Voting configuration (same for both frameworks)
  credits_per_voter INTEGER NOT NULL,
  weighting_mode VARCHAR(50),
  token_gating JSONB,
  
  -- Metadata
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  visibility VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Index for querying by framework type
CREATE INDEX idx_events_framework_type ON events ((decision_framework->>'framework_type'));
```

**Framework Configuration Examples:**

```sql
-- Binary Selection Event
INSERT INTO events (id, title, decision_framework, ...) VALUES (
  'uuid1',
  'Project Selection',
  '{
    "framework_type": "binary_selection",
    "config": {
      "threshold_mode": "top_n",
      "top_n_count": 5,
      "tiebreaker": "timestamp",
      "show_pass_fail_during_voting": true
    }
  }'::jsonb,
  ...
);

-- Proportional Distribution Event
INSERT INTO events (id, title, decision_framework, ...) VALUES (
  'uuid2',
  'Budget Allocation',
  '{
    "framework_type": "proportional_distribution",
    "config": {
      "resource_name": "USD Budget",
      "resource_symbol": "$",
      "total_pool_amount": 500000,
      "decimal_places": 2,
      "distribution_mode": "quadratic_votes",
      "minimum_allocation_enabled": true,
      "minimum_allocation_percentage": 5,
      "zero_vote_handling": "exclude",
      "show_allocations_during_voting": true
    }
  }'::jsonb,
  ...
);
```

---

### 5.2 Results Calculation Engine

**Core Calculation Service (Framework-Agnostic):**

```typescript
// 1. Aggregate votes (same for both frameworks)
function aggregateQuadraticVotes(votes: Vote[]): OptionVoteTotal[] {
  const optionTotals = new Map<string, number>();
  
  for (const vote of votes) {
    for (const [optionId, credits] of Object.entries(vote.allocations)) {
      const quadraticVotes = Math.sqrt(credits);
      optionTotals.set(
        optionId, 
        (optionTotals.get(optionId) || 0) + quadraticVotes
      );
    }
  }
  
  return Array.from(optionTotals.entries()).map(([id, votes]) => ({
    option_id: id,
    votes: votes
  }));
}
```

**Framework-Specific Result Calculation:**

```typescript
// 2. Calculate results based on framework
function calculateResults(
  event: Event, 
  voteTotals: OptionVoteTotal[]
): BinaryResults | ProportionalResults {
  
  const framework = event.decision_framework.framework_type;
  
  if (framework === 'binary_selection') {
    return calculateBinaryResults(event, voteTotals);
  } else if (framework === 'proportional_distribution') {
    return calculateProportionalResults(event, voteTotals);
  }
  
  throw new Error('Unknown framework type');
}

// Binary Selection
function calculateBinaryResults(
  event: Event, 
  voteTotals: OptionVoteTotal[]
): BinaryResults {
  
  const config = event.decision_framework.config as BinaryDecisionConfig;
  const sorted = voteTotals.sort((a, b) => b.votes - a.votes);
  
  let selectedOptions: string[] = [];
  
  switch (config.threshold_mode) {
    case 'top_n':
      selectedOptions = sorted.slice(0, config.top_n_count).map(o => o.option_id);
      break;
      
    case 'percentage':
      const maxVotes = sorted[0].votes;
      const threshold = maxVotes * (config.percentage_threshold / 100);
      selectedOptions = sorted
        .filter(o => o.votes >= threshold)
        .map(o => o.option_id);
      break;
      
    case 'absolute_votes':
      selectedOptions = sorted
        .filter(o => o.votes >= config.absolute_vote_threshold)
        .map(o => o.option_id);
      break;
      
    case 'above_average':
      const avgVotes = voteTotals.reduce((sum, o) => sum + o.votes, 0) / voteTotals.length;
      selectedOptions = sorted
        .filter(o => o.votes >= avgVotes)
        .map(o => o.option_id);
      break;
  }
  
  return {
    framework_type: 'binary_selection',
    options: sorted.map((opt, index) => ({
      option_id: opt.option_id,
      votes: opt.votes,
      rank: index + 1,
      selected: selectedOptions.includes(opt.option_id)
    })),
    selected_count: selectedOptions.length,
    selection_margin: sorted[config.top_n_count - 1]?.votes - sorted[config.top_n_count]?.votes // margin between last selected and first not selected
  };
}

// Proportional Distribution
function calculateProportionalResults(
  event: Event,
  voteTotals: OptionVoteTotal[]
): ProportionalResults {
  
  const config = event.decision_framework.config as ProportionalDistributionConfig;
  const totalVotes = voteTotals.reduce((sum, o) => sum + o.votes, 0);
  
  let distributions = voteTotals.map(opt => {
    const percentage = opt.votes / totalVotes;
    let allocation = percentage * config.total_pool_amount;
    
    // Apply minimum allocation floor if enabled
    if (config.minimum_allocation_enabled && allocation > 0) {
      const minAllocation = (config.minimum_allocation_percentage / 100) * config.total_pool_amount;
      allocation = Math.max(allocation, minAllocation);
    }
    
    return {
      option_id: opt.option_id,
      votes: opt.votes,
      allocation_amount: allocation,
      allocation_percentage: (allocation / config.total_pool_amount) * 100
    };
  });
  
  // Normalize if minimum allocations caused over-allocation
  const totalAllocated = distributions.reduce((sum, d) => sum + d.allocation_amount, 0);
  if (totalAllocated > config.total_pool_amount) {
    const normalizationFactor = config.total_pool_amount / totalAllocated;
    distributions = distributions.map(d => ({
      ...d,
      allocation_amount: d.allocation_amount * normalizationFactor,
      allocation_percentage: (d.allocation_amount * normalizationFactor / config.total_pool_amount) * 100
    }));
  }
  
  return {
    framework_type: 'proportional_distribution',
    resource_name: config.resource_name,
    resource_symbol: config.resource_symbol,
    total_pool: config.total_pool_amount,
    distributions: distributions.sort((a, b) => b.allocation_amount - a.allocation_amount),
    total_allocated: distributions.reduce((sum, d) => sum + d.allocation_amount, 0),
    gini_coefficient: calculateGini(distributions.map(d => d.allocation_amount)) // inequality measure
  };
}

// Utility: Calculate Gini coefficient (measure of inequality)
function calculateGini(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  const n = sorted.length;
  const total = sorted.reduce((sum, val) => sum + val, 0);
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i + 1) * sorted[i];
  }
  
  return (2 * numerator) / (n * total) - (n + 1) / n;
}
```

---

### 5.3 API Endpoints (Framework-Aware)

**GET /api/events/:eventId/results**

Response varies by framework:

```typescript
// Binary Selection Response
{
  "event_id": "uuid",
  "framework": {
    "type": "binary_selection",
    "threshold_mode": "top_n",
    "top_n_count": 5
  },
  "results": {
    "selected_options": [
      { "option_id": "uuid1", "title": "...", "votes": 156.3, "rank": 1, "selected": true },
      ...
    ],
    "not_selected_options": [...],
    "selection_margin": 30.9
  },
  "participation": {
    "total_voters": 247,
    "total_credits": 24700
  }
}

// Proportional Distribution Response
{
  "event_id": "uuid",
  "framework": {
    "type": "proportional_distribution",
    "resource_name": "USD Budget",
    "resource_symbol": "$",
    "total_pool": 500000
  },
  "results": {
    "distributions": [
      { 
        "option_id": "uuid1", 
        "title": "Infrastructure", 
        "votes": 156.3, 
        "allocation_amount": 125000, 
        "allocation_percentage": 25.0 
      },
      ...
    ],
    "total_allocated": 500000,
    "gini_coefficient": 0.42
  },
  "participation": {
    "total_voters": 247,
    "total_credits": 24700
  }
}
```

**GET /api/events/:eventId/results/export**

Query params: `?format=csv|json|pdf&framework_specific=true`

Returns different file structures based on framework.

---

## 6. Frontend Component Architecture

### 6.1 Framework-Aware Component Tree

```
<EventCreationWizard>
  ├─ <BasicInfoStep>
  ├─ <DecisionFrameworkStep> ⭐ CRITICAL BRANCH POINT
  │   ├─ <BinarySelectionConfig> (if selected)
  │   └─ <ProportionalDistributionConfig> (if selected)
  ├─ <OptionCreationStep>
  │   ├─ <AdminDefinedOptions>
  │   └─ <CommunityProposalConfig>
  ├─ <VotingConfigStep> (framework-agnostic)
  └─ <ReviewAndLaunchStep>

<VotingInterface event={event}>
  {/* Core voting mechanics are the same */}
  <EventHeader framework={event.decision_framework} />
  <OptionList>
    {options.map(option => (
      <OptionCard 
        option={option}
        framework={event.decision_framework}
        onAllocate={handleAllocate}
      />
    ))}
  </OptionList>
  <VotingBar 
    framework={event.decision_framework}
    allocations={currentAllocations}
    liveResults={liveResults} {/* structure varies by framework */}
  />
</VotingInterface>

<ResultsDashboard event={event} results={results}>
  {results.framework_type === 'binary_selection' ? (
    <BinaryResultsView results={results} />
  ) : (
    <ProportionalResultsView results={results} />
  )}
  <ClusterVisualization /> {/* same for both */}
  <ExportPanel framework={event.decision_framework} />
</ResultsDashboard>
```

---

### 6.2 Critical Frontend Logic: Dynamic UI Based on Framework

**Voting Bar Component (Adapts to Framework):**

```typescript
interface VotingBarProps {
  framework: DecisionFramework;
  allocations: Map<string, number>; // option_id → credits
  totalCredits: number;
  liveResults?: BinaryResults | ProportionalResults;
}

function VotingBar({ framework, allocations, totalCredits, liveResults }: VotingBarProps) {
  const usedCredits = Array.from(allocations.values()).reduce((sum, c) => sum + c, 0);
  const remainingCredits = totalCredits - usedCredits;
  
  return (
    <div className="voting-bar">
      <CreditsDisplay used={usedCredits} remaining={remainingCredits} total={totalCredits} />
      
      {framework.framework_type === 'binary_selection' && liveResults && (
        <BinaryVotingPreview 
          allocations={allocations}
          currentRankings={liveResults}
          threshold={framework.config.top_n_count}
        />
      )}
      
      {framework.framework_type === 'proportional_distribution' && liveResults && (
        <ProportionalVotingPreview
          allocations={allocations}
          currentDistribution={liveResults}
          resourceSymbol={framework.config.resource_symbol}
        />
      )}
      
      <ActionButtons />
    </div>
  );
}

// Binary preview component
function BinaryVotingPreview({ allocations, currentRankings, threshold }) {
  const yourOptions = Array.from(allocations.keys());
  const yourSelectedCount = yourOptions.filter(id => {
    const rank = currentRankings.find(r => r.option_id === id)?.rank;
    return rank <= threshold;
  }).length;
  
  return (
    <div className="binary-preview">
      <p>Projects you're supporting: {yourOptions.length}</p>
      <p>Projects currently in Top {threshold}: {yourSelectedCount} of yours</p>
    </div>
  );
}

// Proportional preview component
function ProportionalVotingPreview({ allocations, currentDistribution, resourceSymbol }) {
  return (
    <div className="proportional-preview">
      <p>Projected Distribution (your impact):</p>
      <ul>
        {currentDistribution.distributions.slice(0, 3).map(dist => {
          const yourCredits = allocations.get(dist.option_id) || 0;
          return (
            <li key={dist.option_id}>
              {dist.title}: {resourceSymbol}{dist.allocation_amount.toLocaleString()} ({dist.allocation_percentage.toFixed(1)}%)
              {yourCredits > 0 && <span> ← You contributed {yourCredits} credits</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

---

## 7. User Flows (Framework-Specific)

### 7.1 Organizer Decision Tree

```
Organizer starts event creation
    ↓
What type of decision?
    ├─→ "Choose winners/select projects" → Binary Selection
    │     ↓
    │   How many should win?
    │     ├─→ Fixed number (e.g., top 5) → top_n mode
    │     ├─→ Based on vote strength → percentage/absolute mode
    │     └─→ All above average → above_average mode
    │
    └─→ "Allocate budget/resources" → Proportional Distribution
          ↓
        What are you distributing?
          ├─→ Money → resource_name: "USD Budget", symbol: "$"
          ├─→ Tokens → resource_name: "Governance Tokens", symbol: "TKN"
          ├─→ Time → resource_name: "Work Hours", symbol: "hrs"
          └─→ Other → custom resource_name and symbol
```

### 7.2 Voter Mental Model

**Binary Selection (Competitive Mindset):**
- "I'm choosing which projects should win"
- "My credits help projects beat other projects"
- "I should spread credits to multiple projects I want to see win"
- "If my top choice is already winning, maybe I should support my 2nd choice"

**Proportional Distribution (Collaborative Mindset):**
- "I'm deciding how a shared pool should be divided"
- "Everyone will get something, I'm influencing the proportions"
- "I should put credits on areas I think deserve more funding"
- "Even small allocations matter - they're still getting a slice"

**UI Language Reinforces Mental Model:**
- Binary: "Support", "Vote for", "Select", "Champion"
- Proportional: "Allocate to", "Fund", "Prioritize", "Distribute"

---

## 8. MVP Phasing (Framework-Aware)

### MVP (Phase 1) - Core Functionality
✅ Event creation with basic configuration  
✅ **Binary Selection framework (top_n mode only)**  
✅ **Proportional Distribution framework (basic proportional mode)**  
✅ Admin-defined options  
✅ Manual invite distribution  
✅ Voting interface with framework-adapted feedback  
✅ Basic results dashboard (separate layouts for each framework)  
✅ CSV export (framework-specific formats)  
✅ Anonymous voting via codes  

### Phase 2 - Enhanced Features
✅ All threshold modes for Binary Selection (percentage, absolute, above_average)  
✅ Minimum allocation floors for Proportional Distribution  
✅ Community proposals (pre-approval moderation)  
✅ Automated email distribution  
✅ Token gating  
✅ Real-time results preview (framework-specific)  
✅ 3D cluster visualization  
✅ JSON export with full framework-specific data  

### Phase 3 - Advanced Features
✅ Hybrid option mode (admin + community)  
✅ Advanced moderation (post-approval, threshold)  
✅ Weighted credits (token balance, trust scores)  
✅ PDF report generation (framework-specific layouts)  
✅ API endpoints for external integration  
✅ Multi-chain token support  

---

## 9. Technical Risks & Mitigations (Framework-Specific)

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Voter confusion between frameworks** ⚠️⚠️ | Low engagement, invalid votes | Clear UI differentiation, onboarding tooltips, example events |
| **Incorrect result calculation** ⚠️⚠️⚠️ | Loss of trust, unusable outcomes | Comprehensive unit tests for both frameworks, test events, manual verification |
| **Real-time preview performance** ⚠️ | Slow UI for large events | Debounce calculations, server-side caching, progressive loading |
| **Minimum allocation edge cases** ⚠️ | Over-allocation in proportional mode | Normalization algorithm, clear warning to organizer if minimums conflict |
| **Framework migration** ⚠️ | Can't change framework after votes cast | Lock framework after first vote, clear warning during setup |
| **Export format confusion** ⚠️ | Users expect wrong data structure | Clear format documentation, preview exports, framework-specific templates |

---

## 10. Open Questions & Decisions

### Framework-Specific:

1. **Framework Switching**: Should organizers be able to switch frameworks after creating the event but before any votes?
   - **Recommendation**: Yes, but only before voting starts. Lock after first vote.

2. **Mixed Results**: Should we support events where BOTH frameworks apply? (e.g., binary select top 5, THEN distribute budget proportionally among those 5)
   - **Recommendation**: Phase 3 feature. Add "Multi-Stage" event type.

3. **Proportional Rounding**: How to handle rounding errors in proportional distribution (e.g., distributing $99,999.87 instead of $100k)?
   - **Recommendation**: Always allocate rounding remainder to highest-voted option. Document this clearly.

4. **Zero-Vote Options**: In proportional mode, what if an option receives zero votes?
   - **Recommendation**: Make this configurable (exclude vs. distribute equally), default to exclude.

5. **Negative Voting**: Should voters be able to "downvote" options (negative credit allocation)?
   - **Recommendation**: No for MVP. Consider for Phase 3 as "Advanced Quadratic Voting" mode.

6. **Framework Presets**: Should we offer templates like "Grant Allocation", "Project Selection", "Budget Planning"?
   - **Recommendation**: Yes, Phase 2. Pre-fill framework settings based on use case.

### Previously Identified:
7. Email Provider: SendGrid vs. Resend?
   - **Decision**: Resend (developer-friendly API, good deliverability)
8. Hosting: Vercel vs. self-hosted?
   - **Decision**: Vercel (zero-config deployment, optimized for Next.js, serverless functions)
9. Database: Neon vs. Supabase vs. self-hosted?
   - **Decision**: Supabase (PostgreSQL with built-in connection pooling for serverless, integrated Storage, unified dashboard)
10. Open Source: Fully open-source (MIT)?
11. Chain Priority: Base for token gating MVP?

---

## 11. Success Metrics (Framework-Specific)

### Product Metrics
- **Events by framework type**: Track adoption of binary vs. proportional
- **Framework switching rate**: How often do organizers change mid-setup? (indicates confusion)
- **Vote completion rate by framework**: Does one framework have better engagement?
- **Export usage by framework**: Which framework users export more data?

### Quality Metrics
- **Result clarity score**: Post-event survey: "Did you understand the outcome?" (should be >90%)
- **Voter confidence**: "Did you understand how your votes would be used?" (target >85%)
- **Organizer satisfaction**: "Did the results match your expectations?" (target >80%)

---

## 12. Timeline Estimate (Updated for Dual Frameworks)

**Assumptions**: Team of 2-3 engineers, part-time (20 hrs/week each)

| Phase | Deliverables | Duration |
|-------|-------------|----------|
| **Phase 1: MVP** | Core voting, BOTH frameworks (basic modes), admin options, manual invites, basic results | **10-12 weeks** (+2 weeks for dual framework architecture) |
| **Phase 2: Enhancement** | All threshold modes, community proposals, token-gating, automated emails, 3D viz, advanced exports | 10-12 weeks |
| **Phase 3: Advanced** | Hybrid mode, advanced moderation, weighted credits, API, webhooks, multi-stage events | 8-10 weeks |

**Total to feature-complete v1.0**: ~28-34 weeks (7-8.5 months)

**Phase 1 Breakdown (Dual Framework Focus)**:
- Core architecture (framework-agnostic): 2 weeks
- Binary selection implementation: 2 weeks
- Proportional distribution implementation: 2 weeks
- Voting interface adaptation: 1.5 weeks
- Results dashboard (both layouts): 2 weeks
- Testing and refinement: 2-3 weeks

---

## Conclusion

QuadraticVote.xyz now has **two distinct but equally important decision frameworks** at its core:

1. **Binary Selection**: For competitive, winner-takes-all scenarios
2. **Proportional Distribution**: For collaborative, resource-allocation scenarios

**These are not just UI variations - they represent fundamentally different governance philosophies and require distinct:**
- Backend calculation logic
- Database schema approaches
- Frontend components and messaging
- Export formats and visualizations
- User mental models and education

**Critical Implementation Principles:**
1. **Framework choice is the FIRST configuration step** - it affects everything downstream
2. **The voting mechanics remain identical** - only the interpretation and results differ
3. **UI language must reinforce the correct mental model** - competitive vs. collaborative
4. **Results dashboards are completely different** - don't try to unify them
5. **Export formats must be framework-specific** - different data structures for different uses

**Next Steps:**
1. **Technical validation**: Review dual-framework architecture with engineering team
2. **UI mockups**: Create separate mockup sets for binary vs. proportional flows
3. **Test event planning**: Prepare 10+ test scenarios covering both frameworks
4. **Educational content**: Write clear documentation explaining when to use each framework
5. **API specification**: Define framework-specific endpoint contracts

**Questions for you:**
- Do the two frameworks (binary/proportional) cover your intended use cases?
- Should we add a third framework type (e.g., ranked-choice)?
- Any specific proportional distribution edge cases we should plan for?
- Preference on default framework if user skips selection?
- Should we show example results during framework selection to help organizers choose?

This PRD is now architected for dual-framework implementation. The complexity is real, but the value is immense - this tool can now serve both competitive selection AND collaborative resource allocation, covering 90%+ of governance use cases. Let's build it! 🚀