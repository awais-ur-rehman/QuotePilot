# QuotePilot — Autonomous Multi-Vendor RFQ Agent

> **TinyFish $2M Pre-Accelerator Hackathon Submission**
> Deadline: Mar 29, 2026 11:59 PM IST

---

## What This Is

QuotePilot is a web application that automates procurement quote collection. A user describes what they need to buy (e.g., "500 custom printed corrugated boxes, 12×12×6, 2-color print"), and QuotePilot dispatches multiple parallel TinyFish browser agents to real supplier websites. Each agent navigates the vendor's site, fills out their quote request form with the user's specs, extracts any available pricing/lead-time info, and streams progress back in real-time. The user sees a live dashboard showing each agent's status and a final comparison matrix of all collected quotes.

**This is NOT a chatbot, NOT a RAG app, NOT a price scraper.** The agents perform real multi-step form submissions on live vendor websites — the exact use case TinyFish's hackathon is built around.

---

## Why This Wins

1. **3,607 teams registered** — the overwhelming majority are building consumer price comparison tools (food delivery, betting odds, product finders). Zero visible procurement/B2B agents.
2. **Judges want "real revenue-making businesses"** — procurement SaaS with clear unit economics ($200-500/mo) is exactly what VCs fund.
3. **Perfect API alignment** — parallel form filling + structured extraction + multi-site navigation = what TinyFish is built for.
4. **Browser-dependent** — vendor websites don't have APIs. You MUST navigate their actual web portals. This can't be built with REST calls.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript + Vite |
| **Styling** | Tailwind CSS (utility classes only, NO component libraries like shadcn/MUI) |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | MongoDB with Mongoose ODM |
| **Web Agent** | TinyFish API (SSE streaming + async endpoints) |
| **Real-time** | Server-Sent Events (backend → frontend) |
| **Monorepo** | Single repo, `/client` and `/server` directories |

### Important Constraints
- NO Next.js — this is a Vite + React SPA with a separate Express server
- NO component libraries (shadcn, MUI, Chakra) — custom Tailwind only
- NO Playwright/Puppeteer — all browser automation goes through TinyFish API
- The frontend must look premium and distinctive, not generic AI slop (reference the `frontend-design` skill)
- Follow the `nodejs-backend-patterns` skill for layered architecture (controllers → services → repositories)
- Follow the `vercel-react-best-practices` skill for React performance patterns
- Reference `agent/skills/cost/cost-effectiveness-SKILL.md` for cost-conscious decisions

---

## TinyFish API Reference (Everything You Need)

**Base URL:** `https://agent.tinyfish.ai/v1`
**Auth:** `X-API-Key` header with value from `TINYFISH_API_KEY` env var

### Three Endpoints

| Endpoint | Pattern | Use For |
|----------|---------|---------|
| `POST /automation/run` | Sync — blocks until done | Quick single tasks |
| `POST /automation/run-async` | Async — returns `run_id`, poll for result | Batch processing |
| `POST /automation/run-sse` | SSE stream — real-time events | User-facing live progress |

### Request Body (same for all three)

```json
{
  "url": "https://vendor-website.com/contact",
  "goal": "Fill the quote request form with: Company Name 'Acme Corp', Product 'Custom boxes 12x12x6', Quantity '500', Email 'buyer@acme.com'. Click Submit. Extract any confirmation number or message. Return as JSON.",
  "browserProfile": "stealth",
  "proxyCountry": "US"
}
```

**Parameters:**
- `url` (required): Starting URL for the agent
- `goal` (required): Natural language instructions — be explicit, remove ambiguity, specify output format
- `browserProfile` (optional): `"lite"` (default) or `"stealth"` (anti-detection, use for bot-protected sites)
- `proxyCountry` (optional): ISO country code for geo-routing

### SSE Event Types (for `/run-sse`)

```typescript
type TinyFishEvent =
  | { type: "STARTED"; runId: string }
  | { type: "STREAMING_URL"; streamingUrl: string } // URL to embed in iframe for live browser view
  | { type: "PROGRESS"; purpose: string }            // Description of current action
  | { type: "HEARTBEAT" }
  | { type: "COMPLETE"; status: "COMPLETED" | "FAILED"; resultJson: any; error?: { message: string } }
```

### SSE Parsing in TypeScript (Node.js)

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url, goal, browserProfile: "stealth" }),
});

const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  const lines = text.split("\n");

  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      // Handle event based on event.type
    }
  }
}
```

### Concurrent Requests with Promise.all

```typescript
const tasks = vendors.map(vendor =>
  fetch("https://agent.tinyfish.ai/v1/automation/run", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: vendor.quoteUrl,
      goal: buildGoalForVendor(vendor, userSpecs),
    }),
  }).then(r => r.json())
);

const results = await Promise.all(tasks);
```

### Polling Async Runs

```typescript
// Start
const { run_id } = await fetch(".../run-async", { ... }).then(r => r.json());

// Poll
const poll = async (runId: string): Promise<any> => {
  const run = await fetch(`https://agent.tinyfish.ai/v1/runs/${runId}`, {
    headers: { "X-API-Key": process.env.TINYFISH_API_KEY! },
  }).then(r => r.json());

  if (run.status === "COMPLETED") return run.result;
  if (run.status === "FAILED") throw new Error(run.error?.message);
  await new Promise(r => setTimeout(r, 3000));
  return poll(runId);
};

// Cancel
await fetch(`https://agent.tinyfish.ai/v1/runs/${runId}/cancel`, {
  method: "POST",
  headers: { "X-API-Key": process.env.TINYFISH_API_KEY! },
});
```

### Goal Writing Best Practices
- Be explicit: name every field, every button, every expected output
- Specify JSON output format in the goal itself
- Break multi-step workflows into numbered steps
- Describe buttons by their visible text: "Click the 'Get Quote' button"
- For multi-page forms, describe each page step by step
- Always end with "Return the result as JSON with fields: ..."

### Cost Awareness
- Each "step" (click, type, scroll, navigate) costs ~$0.012-0.015
- Free tier: 500 steps total, 2 concurrent agents
- A typical vendor form fill = 8-15 steps = ~$0.10-0.18 per vendor
- Querying 5 vendors = ~$0.50-0.90 per RFQ request
- Concurrency limit: requests beyond the limit are queued automatically (no 429 errors, just longer wait)

---

## Architecture

```
quotepilot/
├── client/                          # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── assets/                  # Fonts, static images
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── AppShell.tsx     # Main layout wrapper
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Header.tsx
│   │   │   ├── rfq/
│   │   │   │   ├── RFQForm.tsx          # Spec input form
│   │   │   │   ├── VendorCard.tsx       # Individual vendor status card
│   │   │   │   └── AgentActivityFeed.tsx # Live SSE event stream
│   │   │   ├── dashboard/
│   │   │   │   ├── QuoteMatrix.tsx      # Comparison table
│   │   │   │   ├── QuoteDetail.tsx      # Single quote deep-dive
│   │   │   │   └── CostSummary.tsx      # API cost tracking
│   │   │   └── common/
│   │   │       ├── StatusBadge.tsx
│   │   │       ├── LiveBrowserPreview.tsx  # TinyFish streaming iframe
│   │   │       └── EmptyState.tsx
│   │   ├── hooks/
│   │   │   ├── useSSE.ts               # SSE connection hook
│   │   │   ├── useRFQ.ts               # RFQ CRUD operations
│   │   │   └── useAgentStatus.ts        # Poll/stream agent state
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx
│   │   │   ├── NewRFQPage.tsx
│   │   │   ├── RFQDetailPage.tsx
│   │   │   └── VendorsPage.tsx
│   │   ├── services/
│   │   │   └── api.ts                   # Axios/fetch wrapper
│   │   ├── types/
│   │   │   └── index.ts                 # Shared TypeScript types
│   │   ├── utils/
│   │   │   └── formatters.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css                    # Tailwind base + custom fonts
│   ├── index.html
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── package.json
│
├── server/                          # Express + TypeScript backend
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.ts                    # MongoDB connection
│   │   │   └── env.ts                   # Environment validation
│   │   ├── controllers/
│   │   │   ├── rfq.controller.ts
│   │   │   ├── vendor.controller.ts
│   │   │   └── agent.controller.ts
│   │   ├── services/
│   │   │   ├── rfq.service.ts           # RFQ business logic
│   │   │   ├── vendor.service.ts        # Vendor CRUD
│   │   │   ├── tinyfish.service.ts      # TinyFish API wrapper
│   │   │   └── goal-builder.service.ts  # Dynamic goal string construction
│   │   ├── models/
│   │   │   ├── RFQ.model.ts
│   │   │   ├── Vendor.model.ts
│   │   │   ├── Quote.model.ts
│   │   │   └── AgentRun.model.ts
│   │   ├── routes/
│   │   │   ├── rfq.routes.ts
│   │   │   ├── vendor.routes.ts
│   │   │   └── agent.routes.ts
│   │   ├── middleware/
│   │   │   ├── error.middleware.ts
│   │   │   └── validate.middleware.ts
│   │   ├── utils/
│   │   │   ├── sse-parser.ts            # TinyFish SSE event parser
│   │   │   ├── errors.ts                # Custom error classes
│   │   │   └── logger.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── app.ts                       # Express app entry
│   ├── tsconfig.json
│   └── package.json
│
├── .env.example
├── .gitignore
├── README.md
└── package.json                     # Root workspace scripts
```

---

## Database Schema (MongoDB/Mongoose)

### Vendor

```typescript
interface IVendor {
  _id: ObjectId;
  name: string;                      // "Uline"
  website: string;                   // "https://uline.com"
  quoteUrl: string;                  // "https://uline.com/cls/Custom-Boxes"
  category: string;                  // "packaging"
  formInstructions: string;          // Extra hints for the TinyFish goal builder
  browserProfile: "lite" | "stealth";
  isActive: boolean;
  reliability: number;               // 0-100, updated after each run
  avgSteps: number;                  // Average TinyFish steps per run
  createdAt: Date;
  updatedAt: Date;
}
```

### RFQ (Request for Quote)

```typescript
interface IRFQ {
  _id: ObjectId;
  title: string;                     // "500 Custom Printed Boxes"
  description: string;               // Full natural language spec
  specs: {
    productType: string;             // "corrugated boxes"
    quantity: number;                 // 500
    dimensions?: string;             // "12x12x6 inches"
    material?: string;
    color?: string;
    customFields: Record<string, string>;  // Flexible key-value for any spec
  };
  contactInfo: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
  };
  status: "draft" | "running" | "completed" | "failed";
  vendorIds: ObjectId[];             // Which vendors to query
  createdAt: Date;
  updatedAt: Date;
}
```

### Quote (collected result from each vendor)

```typescript
interface IQuote {
  _id: ObjectId;
  rfqId: ObjectId;
  vendorId: ObjectId;
  agentRunId: ObjectId;
  status: "pending" | "running" | "completed" | "failed" | "no_quote";
  price?: number;
  currency?: string;
  unitPrice?: number;
  leadTime?: string;                 // "5-7 business days"
  minimumOrder?: number;
  shippingCost?: number;
  notes?: string;                    // Any extra info extracted
  rawResult?: any;                   // Raw TinyFish JSON result
  errorMessage?: string;
  stepsUsed?: number;
  costUsd?: number;                  // Approximate API cost for this run
  createdAt: Date;
  updatedAt: Date;
}
```

### AgentRun (TinyFish run tracking)

```typescript
interface IAgentRun {
  _id: ObjectId;
  rfqId: ObjectId;
  vendorId: ObjectId;
  quoteId: ObjectId;
  tinyfishRunId?: string;            // From STARTED event
  streamingUrl?: string;             // From STREAMING_URL event
  status: "queued" | "started" | "running" | "completed" | "failed" | "cancelled";
  events: Array<{                    // Log of all SSE events
    type: string;
    data: any;
    timestamp: Date;
  }>;
  startedAt?: Date;
  completedAt?: Date;
}
```

---

## API Endpoints (Express)

### RFQ Routes — `/api/rfq`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all RFQs (paginated) |
| `GET` | `/:id` | Get RFQ with populated quotes |
| `POST` | `/` | Create new RFQ |
| `POST` | `/:id/run` | **Trigger agents** — dispatches TinyFish runs for all selected vendors |
| `DELETE` | `/:id` | Delete RFQ |

### Vendor Routes — `/api/vendors`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | List all vendors (filterable by category) |
| `GET` | `/:id` | Get vendor details |
| `POST` | `/` | Add new vendor |
| `PUT` | `/:id` | Update vendor |
| `DELETE` | `/:id` | Remove vendor |

### Agent Routes — `/api/agent`

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/runs/:rfqId` | Get all agent runs for an RFQ |
| `GET` | `/stream/:rfqId` | **SSE endpoint** — streams live progress to frontend |
| `POST` | `/cancel/:runId` | Cancel a running agent |

### The Critical Endpoint: `POST /api/rfq/:id/run`

This is the core of the application. When called:

1. Fetch the RFQ and its selected vendors from MongoDB
2. For each vendor, build a TinyFish goal string using `goal-builder.service.ts`
3. Fire all TinyFish requests concurrently using `/run-sse` endpoint
4. Parse SSE events from each stream
5. Forward events to the frontend via the `/api/agent/stream/:rfqId` SSE endpoint
6. On COMPLETE, parse the result JSON, create/update the Quote document
7. When all vendors finish, update RFQ status to "completed"

### The SSE Bridge: `GET /api/agent/stream/:rfqId`

The frontend connects to this endpoint to receive real-time updates. The server:
- Maintains an array of SSE client connections per RFQ
- When a TinyFish event arrives for any vendor in this RFQ, broadcasts it to all connected clients
- Sends a custom wrapper event:

```typescript
interface AgentStreamEvent {
  rfqId: string;
  vendorId: string;
  vendorName: string;
  type: "STARTED" | "PROGRESS" | "STREAMING_URL" | "COMPLETE" | "ERROR";
  data: any;
  timestamp: string;
}
```

---

## Goal Builder Service

The `goal-builder.service.ts` is key. It dynamically constructs TinyFish goal strings:

```typescript
function buildGoal(vendor: IVendor, rfq: IRFQ): string {
  const { specs, contactInfo } = rfq;

  return `
Navigate to the page. Look for a quote request form, contact form, or "Get a Quote" / "Request Pricing" button.

Fill in the form with the following information:
- Company Name: "${contactInfo.companyName}"
- Contact Name: "${contactInfo.contactName}"
- Email: "${contactInfo.email}"
${contactInfo.phone ? `- Phone: "${contactInfo.phone}"` : ""}
- Product/Item: "${specs.productType}"
- Quantity: "${specs.quantity}"
${specs.dimensions ? `- Dimensions/Size: "${specs.dimensions}"` : ""}
${specs.material ? `- Material: "${specs.material}"` : ""}
${specs.color ? `- Color/Print: "${specs.color}"` : ""}
${Object.entries(specs.customFields).map(([k, v]) => `- ${k}: "${v}"`).join("\n")}

If the form has a message/notes/description field, write a professional message requesting a quote for the above specifications.

${vendor.formInstructions || ""}

After filling all available fields, click the Submit/Send/Request Quote button.

Then extract any visible information from the confirmation or results page. Look for:
- Price or pricing estimate
- Lead time or delivery estimate
- Minimum order quantity
- Shipping cost
- Confirmation number or reference ID
- Any other relevant pricing details

Return the result as JSON with these fields:
{
  "submitted": true/false,
  "price": number or null,
  "currency": "USD" or other,
  "unitPrice": number or null,
  "leadTime": "string description" or null,
  "minimumOrder": number or null,
  "shippingCost": number or null,
  "confirmationId": "string" or null,
  "notes": "any other extracted information"
}
`.trim();
}
```

---

## Frontend Pages & Flow

### Page 1: Dashboard (`/`)
- Shows all RFQs as cards with status badges (draft, running, completed)
- Running RFQs show a progress bar (X of Y vendors complete)
- Quick-action button to create new RFQ
- Summary stats: total quotes collected, average savings found, time saved

### Page 2: New RFQ (`/rfq/new`)
- Two-section form:
  - **Left**: Product specs (type, quantity, dimensions, material, custom fields)
  - **Right**: Contact info (company, name, email, phone)
- Vendor selection: checkboxes or multi-select of available vendors
- "Launch Agents" button — triggers the run

### Page 3: RFQ Detail (`/rfq/:id`)
- The money page. Three sections:
  - **Agent Activity Feed** (left panel): Live stream of events from all agents — "Navigating to Uline.com", "Filling company name field", "Clicking Submit button", "Quote extracted: $2.45/unit"
  - **Live Browser Preview** (optional center): Embeds TinyFish streaming URL in an iframe to show the actual browser
  - **Quote Comparison Matrix** (main content): Table/grid comparing all vendor quotes side by side — price, unit price, lead time, MOQ, shipping. Sortable. Highlights best price.

### Page 4: Vendors (`/vendors`)
- CRUD interface for managing the vendor registry
- Each vendor card shows: name, website, category, reliability score, average cost per run
- "Test Agent" button to verify the agent can navigate the vendor's quote form

---

## Design Direction (for frontend-design skill)

**Aesthetic: Industrial-utilitarian meets data dashboard.** Think Bloomberg Terminal crossed with a modern logistics app. Not playful, not corporate — operational and information-dense.

- **Color palette**: Dark slate background (#0F1419), electric teal accent (#00D4AA), warm amber for warnings (#F59E0B), deep charcoal cards (#1A1F2E). White text on dark. High contrast.
- **Typography**: Use a monospace or semi-mono font for data (like JetBrains Mono, IBM Plex Mono) paired with a clean geometric sans for headings (like Outfit, Satoshi, or General Sans). Import from Google Fonts.
- **Layout**: Dense, multi-panel layout. No wasted space. The RFQ detail page should feel like a mission control — multiple live data streams visible simultaneously.
- **Animations**: Subtle pulse on "running" status badges. Smooth slide-in for new activity feed items. Progress bars with easing. No bouncy/playful animations.
- **Cards**: Slight border, subtle backdrop blur, no heavy shadows. Tight padding.
- **Status indicators**: Color-coded dots (green=complete, teal=running with pulse, amber=pending, red=failed).

**The one thing someone should remember**: Watching 5 agents simultaneously navigate different websites and fill out forms in real-time, with events streaming into the activity feed like a stock ticker. That's the "wow" moment.

---

## Environment Variables

```env
# Server
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/quotepilot

# TinyFish
TINYFISH_API_KEY=your_api_key_here

# Client (Vite)
VITE_API_URL=http://localhost:5000/api
```

---

## Pre-Seeded Vendors for Demo

Seed the database with these vendors (pick 5-8 that have accessible quote/contact forms). Test each one with TinyFish before relying on it for the demo:

**Packaging / Printing:**
- Uline (https://uline.com) — huge catalog, quote forms
- PackagingSupplies.com
- The Custom Boxes (https://thecustomboxes.com)
- Packlane (https://packlane.com)

**General Supplies / Industrial:**
- Grainger (https://grainger.com)
- Global Industrial (https://globalindustrial.com)
- Alibaba (https://alibaba.com) — use stealth profile

**Office / Print:**
- VistaPrint (https://vistaprint.com)
- 4Over (https://4over.com)

> **CRITICAL**: Test each vendor site 5+ times with TinyFish before including it. Keep the 5 most reliable ones. TinyFish has ~90% accuracy — the demo MUST show flawless execution.

---

## 5-Day Build Plan

### Day 1: Foundation & API Integration
- Initialize monorepo: `/client` (Vite + React + TS + Tailwind), `/server` (Express + TS)
- Set up MongoDB connection, Mongoose models (all 4 schemas above)
- Build `tinyfish.service.ts` — wrapper around all 3 TinyFish endpoints with SSE parsing
- Build `goal-builder.service.ts`
- Test with one vendor URL — verify form filling works end-to-end via a simple script
- **Deliverable**: Can trigger a TinyFish agent and get back structured quote data

### Day 2: Backend API & SSE Bridge
- Build all Express routes (RFQ CRUD, Vendor CRUD, Agent routes)
- Implement `POST /api/rfq/:id/run` — the parallel dispatch logic
- Implement `GET /api/agent/stream/:rfqId` — SSE bridge to frontend
- Error handling middleware, input validation
- Seed database with 5-8 tested vendors
- **Deliverable**: Can create an RFQ, trigger agents, and see events via curl/Postman

### Day 3: Frontend — Layout & Core Pages
- Set up Tailwind with custom theme (colors, fonts, spacing)
- Build AppShell, Sidebar, Header
- Build Dashboard page with RFQ cards
- Build New RFQ form page
- Build Vendors page with CRUD
- Wire up API calls with fetch/axios
- **Deliverable**: Can create RFQs and manage vendors through the UI

### Day 4: Frontend — Live Dashboard & Real-time
- Build the RFQ Detail page (the main event):
  - Agent Activity Feed with live SSE streaming
  - Live Browser Preview iframe (TinyFish streaming URL)
  - Quote Comparison Matrix
- Build `useSSE` hook for EventSource connection
- Build status badges, progress indicators, cost tracking
- Handle all states: loading, running, completed, failed, empty
- **Deliverable**: Full real-time experience — trigger agents and watch them work live

### Day 5: Polish, Test, Record Demo
- End-to-end testing with all seeded vendors
- Fix edge cases: vendor form failures, timeouts, partial results
- Add error recovery UI (retry failed vendors)
- Polish animations, transitions, responsive layout
- Record 2-3 minute demo video:
  1. (0:00-0:15) Show the manual problem — clicking through vendor sites
  2. (0:15-0:30) Create an RFQ with specs
  3. (0:30-1:30) Launch agents — show live activity feed + browser preview
  4. (1:30-2:15) Show completed comparison matrix, highlight best quote
  5. (2:15-2:45) State the business case: "4 hours → 3 minutes"
- Post on X tagging @Tiny_fish
- Submit on HackerEarth
- **Deliverable**: Submitted hackathon entry

---

## Key Implementation Notes

### SSE Bridge Pattern (Server → Frontend)

The server maintains a map of active SSE connections per RFQ:

```typescript
// In agent.controller.ts
const sseClients = new Map<string, Response[]>();

// GET /api/agent/stream/:rfqId
export function streamAgentEvents(req: Request, res: Response) {
  const { rfqId } = req.params;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  if (!sseClients.has(rfqId)) sseClients.set(rfqId, []);
  sseClients.get(rfqId)!.push(res);

  req.on("close", () => {
    const clients = sseClients.get(rfqId) || [];
    sseClients.set(rfqId, clients.filter(c => c !== res));
  });
}

// Broadcast helper
export function broadcastToRFQ(rfqId: string, event: AgentStreamEvent) {
  const clients = sseClients.get(rfqId) || [];
  const data = `data: ${JSON.stringify(event)}\n\n`;
  clients.forEach(client => client.write(data));
}
```

### Frontend SSE Hook

```typescript
// useSSE.ts
function useSSE(rfqId: string) {
  const [events, setEvents] = useState<AgentStreamEvent[]>([]);
  const [vendorStatuses, setVendorStatuses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const source = new EventSource(`${API_URL}/agent/stream/${rfqId}`);

    source.onmessage = (e) => {
      const event: AgentStreamEvent = JSON.parse(e.data);
      setEvents(prev => [...prev, event]);

      if (event.type === "COMPLETE" || event.type === "ERROR") {
        setVendorStatuses(prev => new Map(prev).set(event.vendorId, event.type));
      }
    };

    return () => source.close();
  }, [rfqId]);

  return { events, vendorStatuses };
}
```

### Error Recovery
- If a TinyFish run fails, log the error, mark quote as "failed", continue with other vendors
- Never let one vendor failure block the entire RFQ
- Use `Promise.allSettled` not `Promise.all` for parallel dispatch
- Show failed vendors in red with a "Retry" button

---

## Skills Reference for Claude Code

When building this project, reference these installed skills:

| Skill | When to Use |
|-------|-------------|
| `frontend-design` | When building ANY React component — follow the aesthetic guidelines above, avoid AI slop |
| `vercel-react-best-practices` | Performance patterns: parallel fetching, memoization, suspense boundaries, bundle optimization |
| `nodejs-backend-patterns` | Layered architecture (controller → service → repo), error handling, middleware, DI patterns |
| `cost-effectiveness` (`agent/skills/cost/cost-effectiveness-SKILL.md`) | Cost-conscious decisions on dependencies, infrastructure, API usage |
| `superpowers` | Enhanced capabilities for complex implementations |

---

## What NOT to Build (Scope Control)

- ❌ User authentication/login (unnecessary for hackathon demo)
- ❌ Payment system
- ❌ Email notifications
- ❌ Mobile responsive (desktop-first for demo, minimal mobile)
- ❌ Admin panel
- ❌ Multiple users / multi-tenancy
- ❌ Automated vendor discovery (manually pre-seed vendors)
- ❌ PDF export of quotes (nice-to-have only if time permits)

Focus everything on the core loop: **Create RFQ → Launch Agents → Watch Live → Compare Quotes.**
