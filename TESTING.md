# QuadraticVote.xyz - Testing Guide

## 🧪 How to Test the Application

This guide will walk you through testing all implemented features of QuadraticVote.xyz.

---

## Prerequisites

Make sure you have completed the setup:
1. Database is running and schema is applied (`pnpm db:push`)
2. Redis is available (local or Upstash)
3. Environment variables are configured in `.env.local`
4. Dev server is running (`pnpm dev`)

---

## Test Scenario 1: Binary Selection Event

### Step 1: Create a Binary Selection Event

1. Go to http://localhost:3000
2. Click **"Create Event"**
3. Fill in **Step 1 - Basic Information**:
   - Title: `Community Project Selection 2025`
   - Description: `Vote for which projects should receive funding`
   - Start Time: Now (or any time in the past for immediate voting)
   - End Time: 24 hours from now
   - Visibility: Public

4. **Step 2 - Choose Framework**:
   - Click on **"Binary Selection"** (competitive)

5. **Step 3 - Configure**:
   - Selection Method: **Top N**
   - Number of Winners: **3**
   - Credits Per Voter: **100**

6. **Step 4 - Add Options**:
   - Option 1: Community Park, Description: Build a new park
   - Option 2: Library Expansion, Description: Expand the library
   - Option 3: Road Repairs, Description: Fix potholes
   - Option 4: Community Center, Description: New community space
   - Option 5: Public Transit, Description: Improve bus routes

7. Click **"Create Event"**

✅ **Expected Result**: Event created successfully, redirected to event page

### Step 2: View the Event

- You should see the event detail page with:
  - Binary Selection badge
  - All 5 options listed
  - Framework explanation
  - "Start Voting" button (if active)

### Step 3: Cast a Vote

1. Click **"Start Voting"**
2. Use sliders to allocate credits:
   - Community Park: 49 credits → 7 votes
   - Library Expansion: 25 credits → 5 votes
   - Community Center: 16 credits → 4 votes
   - Road Repairs: 9 credits → 3 votes
   - Public Transit: 1 credit → 1 vote
   - **Total: 100 credits**

3. Watch the real-time quadratic calculation
4. Note the formula: √49 = 7 votes
5. Click **"Submit Vote"**
6. Review in confirmation dialog
7. Click **"Confirm & Submit"**

✅ **Expected Result**: 
- Vote submitted successfully
- Redirected to results page
- "Vote submitted successfully!" toast notification

### Step 4: View Results

On the results page, you should see:
- **Summary**: 3 options selected (Top 3)
- **Selected Options**:
  - #1 Community Park (7.0 votes) ✓
  - #2 Library Expansion (5.0 votes) ✓
  - #3 Community Center (4.0 votes) ✓
- **Not Selected**:
  - #4 Road Repairs (3.0 votes)
  - #5 Public Transit (1.0 votes)
- **Participation Stats**: 1 voter, 100 credits used

✅ **Expected Result**: Results accurately reflect your vote

---

## Test Scenario 2: Proportional Distribution Event

### Step 1: Create a Proportional Event

1. Return to home page
2. Click **"Create Event"**
3. Fill in **Step 1**:
   - Title: `Community Budget Allocation`
   - Description: `Decide how to allocate our $100,000 budget`

4. **Step 2**: Choose **"Proportional Distribution"** (collaborative)

5. **Step 3 - Configure**:
   - Resource Name: `Budget`
   - Resource Symbol: `$`
   - Total Pool Amount: `100000`
   - Credits Per Voter: `100`

6. **Step 4 - Add Options**:
   - Option 1: Education Programs
   - Option 2: Infrastructure
   - Option 3: Healthcare Services
   - Option 4: Environmental Projects

7. Click **"Create Event"**

### Step 2: Cast a Vote

1. Navigate to the voting interface
2. Allocate credits strategically:
   - Education Programs: 36 credits → 6 votes
   - Infrastructure: 36 credits → 6 votes
   - Healthcare Services: 16 credits → 4 votes
   - Environmental Projects: 12 credits → ~3.46 votes
   - **Total: 100 credits = ~19.46 votes**

3. Notice the projected allocation shown under each option
4. Submit your vote

### Step 3: View Results

The proportional dashboard should show:
- **Total Allocated**: $100,000
- **Distribution**:
  - Education: ~$30,800 (30.8%) - 6 votes
  - Infrastructure: ~$30,800 (30.8%) - 6 votes
  - Healthcare: ~$20,500 (20.5%) - 4 votes
  - Environmental: ~$17,900 (17.9%) - 3.46 votes
- **Gini Coefficient**: ~0.15 (relatively equal distribution)
- Progress bars showing visual distribution

✅ **Expected Result**: 
- Budget distributed proportionally to votes
- All percentages sum to 100%
- Gini coefficient indicates distribution equality

---

## Test Scenario 3: Multi-Voter Simulation

### Test Different Voting Patterns

Create a new event and simulate multiple voters with different preferences:

**Voter 1 (Concentrated)**:
- Option A: 100 credits → 10 votes

**Voter 2 (Distributed)**:
- Option A: 25 credits → 5 votes
- Option B: 25 credits → 5 votes
- Option C: 25 credits → 5 votes
- Option D: 25 credits → 5 votes

**Voter 3 (Strategic)**:
- Option A: 49 credits → 7 votes
- Option B: 36 credits → 6 votes
- Option C: 15 credits → ~3.87 votes

✅ **Expected Learning**:
- Quadratic voting encourages broader support
- Concentrated votes have diminishing returns
- Strategic allocation matters

---

## Test Scenario 4: Edge Cases

### Test Invalid Inputs

1. **Over-Allocation**:
   - Try to allocate 101+ total credits
   - ✅ Expected: Submit button disabled, warning shown

2. **Empty Vote**:
   - Try to submit with 0 credits allocated
   - ✅ Expected: Submit button disabled

3. **Vote Editing**:
   - Submit a vote
   - Return to voting page
   - Change allocations
   - Resubmit
   - ✅ Expected: Vote updated successfully

### Test Framework Configurations

**Binary Selection Modes:**

1. **Top N Mode**:
   - Set top_n_count to 2
   - ✅ Expected: Top 2 options selected

2. **Percentage Mode**:
   - Change to percentage threshold
   - ✅ Expected: Options above % of max selected

3. **Above Average Mode**:
   - Change to above average
   - ✅ Expected: Options above mean selected

---

## Test Scenario 5: API Testing

### Using the Test Dashboard

1. Go to http://localhost:3000/test
2. Click **"Test Event Creation API"**
   - ✅ Expected: Event created via API
   - Response shown with event ID

3. Click **"Test List Events API"**
   - ✅ Expected: All events returned
   - JSON response displayed

### Using curl

**Create Event:**
```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "title": "API Test Event",
    "visibility": "public",
    "startTime": "2025-01-01T00:00:00Z",
    "endTime": "2025-12-31T23:59:59Z",
    "decisionFramework": {
      "framework_type": "binary_selection",
      "config": {
        "threshold_mode": "top_n",
        "top_n_count": 2,
        "tiebreaker": "timestamp"
      }
    },
    "optionMode": "admin_defined",
    "creditsPerVoter": 100,
    "initialOptions": [
      {"title": "Option 1"},
      {"title": "Option 2"},
      {"title": "Option 3"}
    ]
  }'
```

✅ **Expected**: 201 status, event object returned

**Submit Vote:**
```bash
curl -X POST http://localhost:3000/api/events/{event-id}/votes \
  -H "Content-Type: application/json" \
  -d '{
    "inviteCode": "demo-code-123",
    "allocations": {
      "{option-1-id}": 50,
      "{option-2-id}": 30,
      "{option-3-id}": 20
    }
  }'
```

✅ **Expected**: Vote submitted, receipt code returned

**Get Results:**
```bash
curl http://localhost:3000/api/events/{event-id}/results
```

✅ **Expected**: Complete results object with framework-specific data

---

## Test Scenario 6: Mobile Responsiveness

### Test on Different Screen Sizes

1. **Desktop (1920x1080)**:
   - ✅ Full layout with all features visible
   - ✅ Side-by-side framework comparison

2. **Tablet (768x1024)**:
   - ✅ Stacked layouts where appropriate
   - ✅ Touch-friendly slider controls

3. **Mobile (375x667)**:
   - ✅ Sticky header and bottom bar
   - ✅ Easy thumb-reachable controls
   - ✅ Readable text at default zoom

### Browser DevTools Testing

1. Open Chrome DevTools (F12)
2. Click device toolbar (Cmd+Shift+M)
3. Test various devices:
   - iPhone 14 Pro
   - iPad Air
   - Samsung Galaxy S21

✅ **Expected**: Smooth experience on all devices

---

## Test Scenario 7: Real-Time Features

### Test Result Updates

1. Create an event
2. Open event results in one browser
3. Submit a vote in another browser/incognito window
4. Refresh results page

✅ **Expected**: 
- Results update to reflect new vote
- Participation count increases
- Calculations remain accurate

---

## Test Scenario 8: Error Handling

### Test Error Scenarios

1. **Network Errors**:
   - Disable network
   - Try to submit vote
   - ✅ Expected: Clear error message

2. **Invalid Event ID**:
   - Visit `/events/invalid-id`
   - ✅ Expected: "Event Not Found" page

3. **Voting Closed**:
   - Create event with past end time
   - Try to vote
   - ✅ Expected: "Voting is closed" error

4. **Rate Limiting**:
   - Submit 11 votes rapidly
   - ✅ Expected: Rate limit error after 10

---

## Verification Checklist

### Core Features
- [ ] Event creation works for both frameworks
- [ ] Voting interface displays correctly
- [ ] Credit allocation sliders work smoothly
- [ ] Quadratic calculations are accurate
- [ ] Vote submission succeeds
- [ ] Results display correctly for both frameworks
- [ ] All API endpoints respond as expected

### User Experience
- [ ] Loading states show appropriately
- [ ] Error messages are clear and helpful
- [ ] Success toasts confirm actions
- [ ] Navigation is intuitive
- [ ] Forms validate properly
- [ ] Mobile experience is smooth

### Data Integrity
- [ ] Votes are stored correctly
- [ ] Results calculations are accurate
- [ ] Credit limits are enforced
- [ ] Quadratic formula is correct (√credits)
- [ ] Framework configurations work as designed

### Performance
- [ ] Pages load quickly (<3s)
- [ ] API responses are fast (<500ms)
- [ ] No UI lag when interacting
- [ ] Large events handle well

---

## Known Issues / Limitations

### Current Limitations
1. **Demo Invite Codes**: Using hardcoded `demo-code-123` for testing
   - In production, proper invite code distribution would be required
   
2. **Email System**: Not yet implemented
   - Invite codes must be shared manually
   - No automated notifications

3. **Admin Panel**: Basic proposal features exist, but no UI
   - API endpoints work
   - Admin interface pending

4. **Export**: UI buttons present, but functionality partial
   - Results display works
   - CSV/PDF export pending

### Workarounds
- **Testing Votes**: Use any invite code string (no validation in demo mode)
- **Multiple Voters**: Use different browser sessions or incognito windows
- **Admin Actions**: Use API directly via curl or Postman

---

## Bug Reporting

If you encounter issues during testing:

1. **Note the steps to reproduce**
2. **Check browser console for errors** (F12 → Console)
3. **Check network tab for failed requests** (F12 → Network)
4. **Note your environment**:
   - Browser and version
   - Operating system
   - Screen size

---

## Next Testing Phase

Once basic testing is complete:

1. **Performance Testing**:
   - Test with 100+ options
   - Simulate 1000+ voters
   - Measure API response times

2. **Security Testing**:
   - SQL injection attempts
   - XSS testing
   - Rate limit effectiveness

3. **Compatibility Testing**:
   - Safari, Firefox, Edge
   - iOS Safari, Chrome Mobile
   - Various screen sizes

---

## 🎉 Success Criteria

The system is working correctly if:

✅ You can create events with both frameworks  
✅ Voting interface is smooth and intuitive  
✅ Results calculations are accurate  
✅ All quadratic math checks out  
✅ Mobile experience is good  
✅ API responses are fast  
✅ No critical errors in console  
✅ Data persists correctly  

**You're ready to proceed to Phase 2 completion and production deployment!**

