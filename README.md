# QuotePilot

**Autonomous multi-vendor RFQ (Request for Quote) agent — powered by TinyFish AI.**

QuotePilot automates the entire process of sourcing quotes from multiple vendors simultaneously. You describe what you need, select your vendors, and AI browser agents visit each vendor's website, fill in quote forms, extract pricing, and stream live progress back to your dashboard — all without manual work. After quotes arrive, the pipeline automatically estimates shipping costs, benchmarks prices against market data, and scores vendor trust using BBB, Trustpilot, and Google ratings.

Built for the TinyFish Hackathon — March 2026.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Installation](#installation)
- [Running the App](#running-the-app)
- [Seeding Demo Vendors](#seeding-demo-vendors)
- [API Reference](#api-reference)
- [Testing Guide](#testing-guide)
- [Pages and User Flows](#pages-and-user-flows)
- [Agent Intelligence Pipeline](#agent-intelligence-pipeline)
- [Design System](#design-system)
- [Known Limitations](#known-limitations)

---

## Features

### Core RFQ Engine
- Create RFQs with product type, quantity, dimensions, material, color, and custom fields
- Select up to N vendors simultaneously
- Launch TinyFish browser agents per vendor — each agent visits the vendor's site, fills out the quote form, and returns structured pricing data
- Real-time progress via Socket.io — live event stream shows exactly what each agent is doing
- Re-run individual failed vendors without restarting the whole RFQ
- Cancel in-flight runs
- Award a quote to a winning vendor with optional notes

### Agent Intelligence Pipeline
After quote agents complete, the following stages fire automatically:

1. **Shipping Estimator** — TinyFish agents check FedEx and UPS rates for your destination ZIP, comparing both carriers and picking the cheapest. Landed cost (unit price + shipping) is shown per vendor.
2. **Market Benchmark** — Alibaba market price check via TinyFish agent. Shows each vendor's price relative to the current market average (↓ below / ↑ above / ≈ market).
3. **Trust Scoring** — BBB rating, Trustpilot score, and Google rating aggregated into a single 0–100 trust score per vendor.

### Vendor Discovery
- Search for new vendors using Google, ThomasNet, and Alibaba via TinyFish agents
- Review discovered vendors in a detail panel before committing — inspect and edit the vendor name, website, quote URL, tags, and browser profile
- Discovered vendors are tagged with their source

### Vendor Management
- Full CRUD for vendor catalog
- Per-vendor trust score with tooltip showing BBB/Trustpilot/Google sub-scores
- Recheck trust on demand
- Slide-in panel for add/edit — no page navigations

### Templates
- Save any RFQ's product specs as a named template
- Load templates instantly on the New RFQ form
- Manage (load / delete) templates from a dropdown panel

### Profile
- Set your company name, contact name, email, and phone once in Settings
- Auto-fills contact info into every RFQ — no re-entry
- Profile banner on Dashboard prompts setup if missing

### Analytics
- Vendor reliability scores and average step counts
- Price trend chart
- Success/failure breakdown

### Export
- Download quotes as CSV — includes unit price, total, lead time, MOQ, shipping estimate, landed cost, vs market columns

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Client (React)                  │
│   Vite · React Router · TanStack Query           │
│   Socket.io-client · Tailwind CSS                │
└────────────────────┬────────────────────────────┘
                     │ HTTP /api  +  ws /socket.io
┌────────────────────▼────────────────────────────┐
│              Server (Express + TS)               │
│   MongoDB (Mongoose) · Socket.io                 │
│   Routes: /rfq · /vendors · /discovery           │
│           /agent · /analytics                    │
└────────────────────┬────────────────────────────┘
                     │ HTTPS  X-API-Key
┌────────────────────▼────────────────────────────┐
│           TinyFish Agent Platform                │
│   https://agent.tinyfish.ai/v1                   │
│   SSE streaming · Run polling · Cancel           │
└─────────────────────────────────────────────────┘
```

**Data flow for a live RFQ run:**

1. Client calls `POST /api/rfq/:id/run`
2. Server marks RFQ as `running`, then fires `Promise.allSettled` across all selected vendors — each dispatch calls TinyFish `/automation/run-sse`
3. TinyFish events (STARTED, STREAMING_URL, PROGRESS, COMPLETE, ERROR) stream back via SSE
4. Server parses events, updates Quote documents in MongoDB, and emits Socket.io events to the room `rfq:{id}`
5. Client `useAgentSocket` hook receives events and updates the live terminal + vendor strip in real time
6. On all agents completing → server triggers shipping → benchmark → pipeline stage updates
7. React Query auto-refetches RFQ data to show final quote table

---

## Tech Stack

### Backend
| Package | Version | Purpose |
|---|---|---|
| Express | 4.x | HTTP server |
| TypeScript | 5.x | Type safety |
| Mongoose | 8.x | MongoDB ODM |
| Socket.io | 4.x | Real-time events |
| Zod | 3.x | Env var + schema validation |
| Helmet | 7.x | Security headers |
| Compression | 1.x | gzip responses |
| tsx | 4.x | Dev server (no build step) |
| tsup | 8.x | Production build |

### Frontend
| Package | Version | Purpose |
|---|---|---|
| React | 18.x | UI library |
| Vite | 5.x | Dev server + bundler |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.x | Styling |
| React Router | 6.x | Client-side routing |
| TanStack Query | 5.x | Server state, caching, refetch |
| Socket.io-client | 4.x | Real-time events |
| react-hot-toast | 2.x | Toast notifications |
| framer-motion | 12.x | Landing page animations |
| cobe | 2.x | WebGL globe animation |

### Infrastructure
- **MongoDB** — local instance on port 27017, database `quotepilot`
- **TinyFish** — AI browser agent platform (`https://agent.tinyfish.ai/v1`)

---

## Project Structure

```
QuotePilot/
├── server/
│   └── src/
│       ├── app.ts                        # Express entry point + bootstrap
│       ├── config/
│       │   ├── env.ts                    # Zod-validated env vars
│       │   ├── db.ts                     # MongoDB connection with retry
│       │   └── socket.ts                 # Socket.io init + room helpers
│       ├── models/
│       │   ├── RFQ.model.ts              # RFQ schema (specs, status, pipeline)
│       │   ├── Vendor.model.ts           # Vendor schema (trust, tags, browserProfile)
│       │   ├── Quote.model.ts            # Quote schema (pricing, shipping, benchmark)
│       │   ├── AgentRun.model.ts         # Per-run metadata
│       │   └── DiscoveryRun.model.ts     # Vendor discovery run results
│       ├── services/
│       │   ├── tinyfish.service.ts       # runSSE, runSync, runAsync, pollRun, cancelRun
│       │   ├── goal-builder.service.ts   # Builds TinyFish goal strings from RFQ + vendor data
│       │   ├── shipping.service.ts       # FedEx/UPS rate estimation via TinyFish
│       │   ├── benchmark.service.ts      # Alibaba market price benchmark via TinyFish
│       │   ├── trust.service.ts          # BBB/Trustpilot/Google trust scoring via TinyFish
│       │   └── discovery.service.ts      # Vendor discovery via Google/ThomasNet/Alibaba
│       ├── controllers/
│       │   ├── rfq.controller.ts
│       │   ├── vendor.controller.ts
│       │   ├── agent.controller.ts
│       │   ├── analytics.controller.ts
│       │   └── discovery.controller.ts
│       ├── routes/
│       │   ├── rfq.routes.ts
│       │   ├── vendor.routes.ts
│       │   ├── agent.routes.ts
│       │   ├── analytics.routes.ts
│       │   └── discovery.routes.ts
│       ├── middleware/
│       │   ├── error.middleware.ts       # Global error handler + asyncHandler
│       │   └── validate.middleware.ts    # Zod request validation
│       ├── utils/
│       │   ├── errors.ts                 # AppError, ValidationError, NotFoundError, TinyFishError
│       │   ├── logger.ts                 # Console logger
│       │   └── sse-parser.ts             # Parses TinyFish SSE chunks → typed TinyFishEvent[]
│       ├── types/
│       │   └── index.ts                  # All TypeScript interfaces
│       └── scripts/
│           ├── seed-vendors.ts           # Populates demo vendor catalog
│           └── test-tinyfish.ts          # Standalone TinyFish connection test
│
└── client/
    └── src/
        ├── App.tsx                       # Router + page layout
        ├── index.css                     # Tailwind + custom component classes
        ├── types/
        │   └── index.ts                  # Frontend types (mirrors server)
        ├── services/
        │   └── api.ts                    # All API calls (rfqApi, vendorApi, discoveryApi)
        ├── hooks/
        │   ├── useRFQ.ts                 # React Query wrapper for RFQ data
        │   ├── useAgentSocket.ts         # Socket.io room subscription
        │   ├── useProfile.ts             # localStorage profile (key: qp_profile)
        │   └── useTemplates.ts           # localStorage templates (key: qp_templates)
        ├── components/
        │   ├── layout/
        │   │   ├── AppShell.tsx          # Sidebar + outlet wrapper
        │   │   └── Header.tsx            # Page header with action slot
        │   ├── common/
        │   │   ├── StatusBadge.tsx       # Colored status pill
        │   │   ├── EmptyState.tsx        # Empty list placeholder
        │   │   └── ConfirmDialog.tsx     # Destructive action confirmation modal
        │   └── vendors/
        │       └── VendorPicker.tsx      # Multi-select vendor picker with trust badges
        └── pages/
            ├── LandingPage.tsx           # Marketing page (/landing)
            ├── OverviewPage.tsx          # Dashboard overview (/)
            ├── RequestsPage.tsx          # RFQ list with filters (/rfqs)
            ├── NewRFQPage.tsx            # Create RFQ form (/rfq/new)
            ├── RFQDetailPage.tsx         # Live run view + quotes table (/rfq/:id)
            ├── VendorsPage.tsx           # Vendor catalog + discovery (/vendors)
            ├── AnalyticsPage.tsx         # Vendor performance charts (/analytics)
            └── SettingsPage.tsx          # Profile setup (/settings)
```

---

## Prerequisites

- **Node.js** 18+ (20 LTS recommended)
- **MongoDB** running locally on port 27017
- **TinyFish API key** — get one at [agent.tinyfish.ai](https://agent.tinyfish.ai)
- npm 9+

---

## Environment Variables

Create `server/.env`:

```env
# Required
PORT=3000
MONGODB_URI=mongodb://localhost:27017/quotepilot
TINYFISH_API_KEY=your_tinyfish_api_key_here
NODE_ENV=development

# Optional — email notifications (skipped silently if not set)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@quotepilot.ai
```

The client proxies `/api` and `/socket.io` to the backend, so no `.env` is needed for the client.

---

## Installation

```bash
# Clone the repo
git clone <repo-url>
cd QuotePilot

# Install all dependencies (root workspace installs both server + client)
npm install

# Or install separately
cd server && npm install
cd ../client && npm install
```

---

## Running the App

Open **two terminals**:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```
Server starts on `http://localhost:3000`

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```
Client starts on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

The landing page is at `http://localhost:5173/landing`.

**Health check:**
```bash
curl http://localhost:3000/health
# {"status":"ok","service":"quotepilot-server","env":"development"}
```

---

## Seeding Demo Vendors

Populate the vendor catalog with 6 pre-configured vendors (Packlane, The Custom Boxes, UPrinting, Packaging Supplies, VistaPrint, Global Industrial):

```bash
cd server
npm run seed
```

Each vendor includes a `quoteUrl` (where the agent starts), browser profile (`lite` or `stealth`), tags, and form instructions that guide the AI agent.

Running the seed multiple times is safe — it skips existing vendors.

---

## API Reference

### RFQ

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/rfq` | List all RFQs (paginated, `?page=1&limit=20`) |
| `GET` | `/api/rfq/:id` | Get single RFQ with populated quotes |
| `POST` | `/api/rfq` | Create new RFQ |
| `POST` | `/api/rfq/:id/run` | Launch agents (optionally pass `vendorIds[]` to re-run specific vendors) |
| `POST` | `/api/rfq/:id/cancel` | Cancel running agents |
| `PATCH` | `/api/rfq/:id/award` | Award quote to a vendor |
| `DELETE` | `/api/rfq/:id` | Delete RFQ and all its quotes |

**Create RFQ body:**
```json
{
  "title": "Custom Packaging Q3",
  "specs": {
    "productType": "Custom Box",
    "quantity": 500,
    "dimensions": "12x8x4 inches",
    "material": "Corrugated",
    "color": "Full color print"
  },
  "description": "Need branded boxes for product launch",
  "vendorIds": ["vendor_id_1", "vendor_id_2"],
  "contactInfo": {
    "companyName": "Acme Corp",
    "contactName": "Jane Smith",
    "email": "jane@acme.com",
    "phone": "+1 555 000 0000"
  },
  "shippingDetails": {
    "destinationZip": "90210",
    "estimatedWeight": 2.5,
    "packageType": "box"
  }
}
```

### Vendors

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/vendors` | List all vendors |
| `GET` | `/api/vendors/:id` | Get single vendor |
| `POST` | `/api/vendors` | Create vendor |
| `PUT` | `/api/vendors/:id` | Update vendor |
| `DELETE` | `/api/vendors/:id` | Delete vendor |
| `POST` | `/api/vendors/:id/check-trust` | Trigger trust score check via TinyFish |

### Discovery

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/discovery/search` | Search for vendors by keyword + sources |
| `GET` | `/api/discovery/runs` | List past discovery runs |
| `GET` | `/api/discovery/runs/:id` | Get a single discovery run with results |
| `POST` | `/api/discovery/accept` | Mark a discovered vendor as accepted |

**Discovery search body:**
```json
{
  "keyword": "custom packaging manufacturer",
  "sources": ["google", "thomasnet", "alibaba"],
  "maxResults": 10
}
```

### Analytics

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/vendors` | Vendor performance stats |
| `GET` | `/api/analytics/rfqs` | RFQ success/failure stats |

---

## Testing Guide

### 1. Verify the server is up

```bash
curl http://localhost:3000/health
```

Expected: `{"status":"ok","service":"quotepilot-server","env":"development"}`

### 2. Test TinyFish connectivity

```bash
cd server
npx tsx src/scripts/test-tinyfish.ts https://packlane.com
```

This fires a real TinyFish agent at the URL and streams events to the console. If you see `STARTED` and `COMPLETE` events, your API key works.

### 3. Set up your profile

1. Open the app at `http://localhost:5173`
2. Go to **Settings** (bottom of sidebar)
3. Fill in company name, contact name, and email — click Save
4. The amber banner on the Dashboard should disappear

### 4. Create your first RFQ

1. Click **+ New Request** from the Dashboard or sidebar
2. Fill in:
   - **Title:** e.g. `Custom Packaging Test`
   - **Product Type:** `Custom Box`
   - **Quantity:** `100`
   - **Dimensions:** `10x8x4 inches`
3. Under **Vendors**, select 1–2 vendors from the list (seed them first if the list is empty)
4. Optionally add a **Destination ZIP** (e.g. `10001`) to trigger shipping + benchmark
5. Click **Launch RFQ**

You land on the RFQ detail page.

### 5. Watch the live run

- The **Activity** tab shows the live terminal — every agent event streams in real time
- The **Vendor strip** at the top shows each vendor with a pulsing green dot while running
- Running agents show a **Watch →** link in the quotes table that opens the TinyFish browser stream

### 6. Review quotes

Once agents complete:
- Switch to the **Quotes** tab
- Rows show unit price, total, lead time, and MOQ
- If you provided a destination ZIP, **Shipping Est.** and **Landed Cost** columns appear
- The **vs Market** column shows how each quote compares to Alibaba's market price
- The teal **BEST** badge highlights the lowest landed cost (or unit price if no shipping)
- Click any completed row to see the full quote detail overlay

### 7. Award the quote

- The **Award to:** bar appears at the top of the Quotes tab (above the table, outside the scroll area)
- Select a vendor radio button, optionally add a note, click **Award →**
- The bar updates to show the awarded state

### 8. Re-run a failed vendor

- Any row with status `failed` or `no_quote` shows a **↺ Retry** button in the Lead Time column
- Click it to re-run just that vendor without touching the others
- The bulk **↺ Re-run Failed (N)** button in the sort bar re-runs all failed vendors at once

### 9. Export to CSV

- On the Quotes tab, click **↓ CSV** — downloads a `.csv` with all columns including shipping and market benchmark

### 10. Discover new vendors

1. Go to **Vendors** in the sidebar
2. Expand the **Discover Vendors** panel at the top
3. Enter a keyword (e.g. `custom mailer box manufacturer`)
4. Check the sources you want to search (Google, ThomasNet, Alibaba)
5. Click **Search** — a TinyFish agent runs the search
6. Results appear as cards. Each card shows the vendor name, website, and detected quote URL
7. Click **Review →** on any card to open the **Discovery Detail Panel**
8. Inspect and edit the name, website, quote URL, tags, and browser profile
9. Click **Add to Catalog** — the vendor is added and available for future RFQs

### 11. Check trust scores

1. On the **Vendors** page, click any vendor row to open the edit panel
2. Or click the trust score badge (★ XX/100) to see a tooltip showing BBB, Trustpilot, and Google sub-scores
3. Click **↺ Recheck trust** inside the tooltip to trigger a fresh trust check via TinyFish

### 12. Save and load templates

1. After creating an RFQ, open it and go to the **Details** tab
2. Click **+ Save as Template** → name it (e.g. `Custom Box 500 units`)
3. On the **New RFQ** page, use the **Load template…** dropdown to pre-fill specs
4. Click **▼** next to the dropdown to manage templates (load or delete)

---

## Pages and User Flows

| Route | Page | Description |
|---|---|---|
| `/landing` | Landing Page | Marketing page with feature overview, animated globe, pipeline visualization |
| `/` | Overview | Dashboard with recent activity and running RFQ cards |
| `/rfqs` | Requests | Full RFQ list with status filter tabs and search |
| `/rfq/new` | New RFQ | Form to create and launch a new RFQ |
| `/rfq/:id` | RFQ Detail | Live run view — quotes table, activity terminal, details |
| `/vendors` | Vendors | Vendor catalog management + discovery panel |
| `/analytics` | Analytics | Vendor performance charts and price trends |
| `/settings` | Settings | Profile setup (name, company, email, phone) |

---

## Agent Intelligence Pipeline

When an RFQ has a `destinationZip` set, the following stages fire automatically after quote agents complete:

```
[quotes] → [shipping] → [benchmarking] → [complete]
```

The **Pipeline Indicator** in the RFQ detail tab bar shows the current stage in real time.

### Stage: Shipping
- TinyFish agents check both FedEx and UPS rates for the given ZIP, weight, and package type
- Cheapest carrier is selected
- `Quote.shipping` is populated: `{ fedexRate, upsRate, cheapestCarrier, cheapestRate, estimatedDays }`
- `Quote.totalLandedCost = unitPrice * quantity + cheapestRate`

### Stage: Market Benchmark
- TinyFish agent searches Alibaba for the product type
- Extracts current market average unit price
- `Quote.marketBenchmark` is populated: `{ avgMarketPrice, source, percentDiff }`
- `percentDiff` = how much the vendor's price differs from the market average

### Stage: Trust Scoring
- Can be triggered manually (Recheck button) or automatically
- TinyFish agents check BBB, Trustpilot, and Google for the vendor
- Results are normalized into a 0–100 composite score
- `Vendor.trustScore`, `trustData.bbbRating`, `trustData.trustpilotScore`, `trustData.googleRating`

---

## Design System

- **Font — UI:** Plus Jakarta Sans
- **Font — Mono:** JetBrains Mono (used in terminal, prices, IDs)
- **Background:** `#FAFAFA`
- **Surface:** `#FFFFFF`
- **Border:** `#E2E8F0`
- **Accent:** Teal — `#0D9488` (teal-600), hover `#0F766E` (teal-700)
- **Terminal panel:** Dark background `#0F172A` — the only dark section in the UI
- **No component libraries** — all custom Tailwind utility classes
- **Vendor panel:** Slide-in from right (`fixed right-0 top-0 bottom-0`)
- **Toasts:** react-hot-toast, top-center position

Custom Tailwind component classes defined in `client/src/index.css`:
- `.btn-primary` — teal filled button
- `.btn-secondary` — white with slate border
- `.btn-ghost` — transparent, hover background
- `.input` — standard text input
- `.label` — form label
- `.terminal` — dark terminal panel base styles

---

## Known Limitations

- **No authentication** — the app is single-user, local only. Anyone with access to port 5173/3000 can see and modify all data.
- **TinyFish rate limits** — dispatching many agents simultaneously may hit API limits. Use 3–4 vendors per RFQ for reliable results.
- **Agent success rate varies by vendor** — some vendor websites use bot detection or non-standard form layouts. Use `stealth` browser profile for difficult sites.
- **Shipping estimates require a valid US ZIP code** — international shipping is not currently supported.
- **MongoDB must be running locally** — no remote database or connection string is configurable beyond `MONGODB_URI`.
- **Email notifications** — SMTP fields in `.env` are optional; if not set, email is silently skipped.
