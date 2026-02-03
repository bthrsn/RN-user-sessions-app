# Session Analysis App

React Native application for analyzing user sessions with support for unstable API and inconsistent data.

## Features

- Session list with pagination and client-side filtering
- 7 filter types including regex for URLs
- Custom severity calculation with corruption detection
- Multi-lane timeline visualization
- Pending request detection with edge case handling
- Session clustering using Levenshtein distance
- Side-by-side diff visualization
- State persistence across navigation

## Setup

```bash
npm install
npm start
# Press 'w' for web, 'a' for Android, 'i' for iOS
```

## Architecture

### Tech Stack
- React Native (Expo SDK 50)
- TypeScript
- Zustand (state management)
- FlashList (virtualized lists)
- React Navigation (expo-router)
- date-fns (date formatting)

### Folder Structure
```
src/
├── api/           # API client with retry logic
├── stores/        # Zustand store
├── types/         # TypeScript interfaces
├── components/    # UI components
│   ├── Timeline/  # Event timeline components
│   └── SessionDiff/ # Clustering visualization
└── utils/         # Business logic
    ├── severity.ts    # Severity calculation
    ├── filters.ts     # Session filtering
    ├── events.ts      # Event analysis
    └── clustering.ts  # Similarity algorithm
```

## Architecture Decisions

### Severity Formula

**Goal:** Balance different error types without outlier dominance

**Implementation:**
```typescript
severity = Σ log₁₀(count + 1) × weight
```

- **Weights:** JS errors (10) > Failed requests (8) > Pending (7) > Console (5) > Rage clicks (3) > Dead clicks (2)
- **Log scale:** Prevents 1000 deadClicks from overwhelming 1 jsError
- **P95 latency:** Adds score when >1 second
- **Corrupted flag:** 10× multiplier

**Rationale:** Log scaling is standard for combining metrics with different scales. Weights reflect user experience impact.

### Pending Request Detection

**Challenge:** Inconsistent data (missing requestIds, orphaned responses)

**Solution:**
1. Group requests/responses by requestId
2. Track completion events (response/error/abort)
3. Requests without requestId → always pending
4. Responses without request → display as anomaly (orphaned)

**Edge cases handled:**
- ✅ Request without requestId
- ✅ Response without matching request
- ✅ Multiple completions per request
- ✅ Duplicate requestIds (grouped together)

### Session Clustering

**Algorithm:** Levenshtein (edit) distance on event type sequences

**How it works:**
1. Create session signature from event types array
2. Calculate edit distance between signatures
3. Similarity = 1 - (distance / max_length)
4. Show side-by-side diff with color coding

**Tradeoffs:**
- ✅ Formal similarity metric with clear interpretation
- ✅ Handles insertions/deletions/substitutions
- ⚠️ O(n×m) complexity - acceptable for loaded sessions
- ⚠️ List view uses estimated signatures (no full events available)

### State Management

**Choice:** Zustand (not RTK Query)

**Rationale:**
- Client-side filtering means data is already in memory
- No cache invalidation benefits for single-pass data
- Simpler API for code review
- Direct control over loading states

## Data Inconsistency Handling

| Issue | Solution |
|-------|----------|
| Request without requestId | Mark as always pending |
| Response without matching request | Show as orphaned anomaly |
| Duplicate timestamps | Stable sort preserves original order |
| Corrupted flag | Visual banner + 10× severity multiplier |
| Missing fields | Graceful fallback to defaults |
| Unknown event types | Grouped in "Unknown" lane |
| Large JSON data | Truncated at 10KB for UI safety |

## Known Limitations

1. **Client-side filtering** doesn't scale to 100k+ sessions
   - Solution: Backend filtering API

2. **Clustering uses estimates** in list view (no full events)
   - Solution: Fetch full sessions for comparison

3. **No optimistic updates** for API mutations
   - Out of scope for read-only analysis

4. **JSON viewer** truncates at 10KB
   - Prevents UI freezing on massive payloads

## API Endpoints

```
GET /session/list?page=N&limit=N
GET /session/{session_id}
```

## What I'd Improve with More Time

1. Comprehensive error boundaries per feature
2. Persistent cache (AsyncStorage) for offline access
3. Virtual scrolling for timeline with 10k+ events
4. Fuzzy matching for URL filters
5. Export session data (JSON/CSV)
6. Dark mode support
7. Full session fetch for accurate clustering comparison
