# DealerPulse — Product and Technical Decisions

This document accompanies the take-home described in `doc/ASSIGNMENT.md`: a dealership performance dashboard backed by `doc/dealership_data.json`, deployable on Vercel.

## What we chose to build and why

**Core product:** A single **network overview** that answers “how is the group doing?” with KPIs, monthly delivery vs. target trend, lead source mix, conversion funnel (for leads created in the selected range), and ranked **branch** and **rep** tables.

**Drill-down:** Dedicated routes for **branch** (`/branch/[branchId]`) and **rep** (`/rep/[repId]`) so leadership can move from aggregate to local context without losing the mental model. Filters are driven by **URL query parameters** (`from`, `to`, optional `branch`) so a filtered view is **bookmarkable and shareable**—important for executives forwarding links.

**Actionable insight:** A **stale open leads** table: open pipeline leads with **no activity for 7+ days** (configurable in code), with branch/rep attribution. This turns the dataset’s `status_history` into something a manager can act on (call lists, coaching), not only charts.

**AI assistant:** A **chat** experience over the same date/branch context, with **retrieval-augmented** context (embeddings + optional Pinecone, with an in-memory vector fallback when keys or the index are unavailable). That supports natural-language questions without sending the entire JSON on every turn, while keeping **deterministic analytics** for charts and tables so the UI stays trustworthy.

**Export:** **CSV export** of leads in the selected range for offline review or sharing with ops.

Together this hits the assignment’s minimum bar (overview, drill-down, at least one actionable insight, time filtering, responsive layout) while leaving room to differentiate via AI and RAG.

## Key product decisions and tradeoffs

| Decision | Tradeoff |
|----------|----------|
| **Import JSON at build/runtime in the app** (and in API routes) instead of a separate database | Faster to ship and fits ~500 leads; no sync or auth. Not suitable for multi-tenant live CRM data without a backend store. |
| **Metrics definitions spelled out in UI** (e.g. funnel uses leads *created* in range; revenue uses *delivery* dates) | Avoids silent mismatch when users compare funnel to revenue; requires one line of explanation on the page. |
| **Branch filter on overview** narrows KPIs/trend/stale/rep views; funnel and source charts stay network-wide when unfiltered | Clearer branch “scorecard” behavior; users who want funnel-by-branch can scope via branch pages or chat. |
| **Multi-provider chat** (Gemini default path; Anthropic, Bedrock, Ollama as options via env) | Operational flexibility for reviewers and local dev; more configuration surface than a single vendor. |
| **RAG with Pinecone optional + memory fallback** | Works on Vercel without Pinecone; production can attach a vector index when `PINECONE_API_KEY` (and index settings) are set. |
| **Rate limiting and sanitization on chat API** | Reduces abuse on a public deployment; not a substitute for auth if the app were exposed broadly. |

## What we would build next with more time

1. **Target pressure in the main flow** — Surface `getLargestTargetGap`-style insights as first-class cards or alerts on the overview (not only inside AI context), with “days left in month” callouts.
2. **What-if and forecasting** — Simple pipeline-to-target projections (e.g. required run-rate) using open pipeline value and historical conversion by stage.
3. **Funnel and sources by branch** — Toggle or deep-link from branch detail to branch-scoped funnel/source charts.
4. **Operational workflow** — Assign stale leads, notes, or exports to CRM (would require real integrations; out of scope for static JSON).
5. **Auth and roles** — If this moved beyond a CEO-only demo, branch-scoped access for managers.

## Interesting patterns in the data

The file is labeled **synthetic** in metadata (`dealership_data.json` → `metadata.description` / `notes`). Still, the schema is rich:

- **`status_history` on every lead** enables reconstructing **time-in-stage**, **funnel drop-off**, and **last activity** for aging—more realistic than snapshot-only data.
- **Monthly branch targets** vs. **deliveries** supports attainment narratives and gap detection.
- **Delivery delay reasons** (where present) could feed a follow-up chart on operational friction (not fully productized in the first pass).

Those patterns informed **stale-lead detection** and **funnel analytics** as the highest-leverage first features.
