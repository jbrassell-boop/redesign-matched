# Ops Review Presentation Prompt

Use this prompt to generate a presentation-ready deck + executive Excel
summary from the raw ops review workbook produced by `Run-OpsReview.ps1`.

Swap the **[BRACKETED]** placeholders for the period you're reporting,
then paste the whole block into Claude Code.

---

## TSI Brand Reference

**Colors** (from official brand sheet, Pantone + Web hex):

| Name    | Pantone | Web hex   | RGB            | Usage                         |
|---------|---------|-----------|----------------|-------------------------------|
| Primary | 2747    | `#00257A` | 0 / 37 / 122   | Headers, primary fills, title |
| Light   | 2716    | `#9DABE2` | 157 / 171 / 226| Accents, banded rows, outlines|
| Red     | 200     | `#B71234` | 183 / 18 / 52  | Unfavorable deltas, alerts    |
| Slate   | 5405    | `#44697D` | 68 / 105 / 125 | Body text, subdued elements   |

**Typography:**
- "Total Scope, Inc." → **Impact**
- "The Leader in Medical Device Repair & Services" → **Helvetica Neue Bold**
- Body copy / numbers → Helvetica Neue (or Arial as fallback)

**Logo source PDF:**
`C:\Users\JoeBrassell\OneDrive - totalscopeinc.com\Desktop\Logos with Pantone numbers - new.pdf`

**Favorable / unfavorable indicator colors:**
- Favorable movement → green (`#16A34A`)
- Unfavorable movement → TSI red (`#B71234`)

---

## THE PROMPT (copy from here down)

```
Take the ops review workbook at
C:\Users\JoeBrassell\Desktop\TSI Ops Reports\OpsReview_[START]_[END].xlsx
and produce TWO presentation-ready deliverables for the internal
ops leadership meeting.

CONTEXT
- Company: Total Scope, Inc. (TSI)
- Tagline: "The Leader in Medical Device Repair & Services"
- Current period: [PERIOD LABEL, e.g. Q1 2026] ([START] – [END])
- Prior period: auto-computed equal-length window, shown in "Prior" column
- Audience: internal ops leadership — TSI owners, ops managers, tech leads
- Use: [PRESENTER NAME] presents live (30–45 min), then circulates
  as a read-alone document. Must work both ways.
- Meeting date: [MEETING DATE]

DELIVERABLE 1 — POWERPOINT DECK
Save as OpsReview_[PERIOD LABEL].pptx next to the workbook.

Slide structure (~16 slides):
  1.  Title slide: "TSI Ops Review — [PERIOD LABEL]" · meeting date ·
      presenter name. TSI logo top-left.
  2.  QoQ Scorecard: 8 headline KPI cards in a 4x2 grid
      (WOs Completed, Avg TAT, Total Revenue, Gross Margin %,
      Tech Utilization %, 40-Day Return Rate, Open WO $ at Risk,
      Active Clients). Each card: Current / Prior / Δ / Δ% with
      green/red indicator. REMEMBER polarity — for TAT, Return
      Rate, and Open WO $ at Risk, LOWER is favorable.
  3.  OPERATIONS — overview. All 12 KPIs from tab 0A in a single
      table with Δ arrows. One sentence takeaway at top.
  4.  OPERATIONS — Throughput & TAT. Chart: WO count + Avg TAT
      bars. 2–3 bullets of insight + 1 proposed action.
  5.  OPERATIONS — Quality. Returns · Warranty · Avoidable
      Damage · NR Rate · D&I Conversion. Insight bullets + action.
  6.  OPERATIONS — Backlog. Open WOs · Open >30d · $ at Risk.
      Insight + action.
  7.  FINANCIAL — overview. 9 KPIs from tab 0B + takeaway.
  8.  FINANCIAL — Revenue & Mix. Total Revenue · Contract % ·
      Avg Rev/WO. Chart: contract vs FFS stacked bar.
  9.  FINANCIAL — Cost & Margin. Labor+Material · Outsource ·
      Gross Margin %. Insight + action.
 10.  FINANCIAL — Customer Health. Active · New · Lost + Top 10
      Clients table from tab 0D.
 11.  TEAM — overview. 8 KPIs from tab 0C + takeaway.
 12.  TEAM — Hours & Utilization. Paid · Hands-On · Rework ·
      Utilization %. Per-tech table from tab 17 if space.
 13.  TEAM — Accountability. Amendments · Misquotes.
      Insight + action.
 14.  TOP MOVERS — 5 biggest favorable changes and 5 biggest
      unfavorable changes across all KPIs, ranked by Δ%.
 15.  FOCUS AREAS for next period — 3–5 concrete initiatives
      implied by the data. Each with owner placeholder, success
      metric, target.
 16.  Appendix pointer — "Detail tabs 1–17 in the workbook for
      drill-down."

Every slide MUST have speaker notes written in full sentences as
if Joe were reading them cold. The notes are what makes this
work as a leave-behind document.

Visual style (exact TSI brand):
- Primary color Pantone 2747 = #00257A (deep blue) — headers,
  title fills, KPI card values.
- Secondary Pantone 2716 = #9DABE2 (light blue) — banded rows,
  subtle accents.
- Red Pantone 200 = #B71234 — unfavorable deltas, alert text.
- Slate Pantone 5405 = #44697D — body copy, axis labels.
- Favorable movement: green #16A34A.
- "Total Scope, Inc." wordmark: Impact font.
- Subhead "The Leader in Medical Device Repair & Services":
  Helvetica Neue Bold.
- Body + numbers: Helvetica Neue (Arial fallback).
- Large Current value, small Prior underneath, Δ with arrow
  at bottom of each KPI card.
- No chart junk. No 3D. No stock photos. No clip art.
- If possible, pull TSI logo from
  C:\Users\JoeBrassell\OneDrive - totalscopeinc.com\Desktop\Logos with Pantone numbers - new.pdf
  — use the horizontal version with blue wordmark + tagline.

DELIVERABLE 2 — EXCEL EXECUTIVE SUMMARY
Update the workbook in place.

- Insert new tab "00 - Executive Summary" at position 1 (before 0A).
- A4 landscape, print-ready as a 1-page PDF. Set print area
  and page break explicitly.
- Header: "TSI Ops Review — [PERIOD LABEL]" in Impact,
  Pantone 2747 fill. Tagline line underneath in Helvetica
  Neue Bold.
- Top: same 8 headline KPI cards as slide 2 of the deck.
- Middle: three 2-column story blocks (Ops · Financial · Team).
  Each block: 2–3 bullet insights + 1 proposed action.
- Bottom: Top 5 Discussion Items — movers most needing attention.
- On each dashboard tab (0A / 0B / 0C), add a merged "Takeaway:"
  cell at the top summarizing the single most important finding
  in one sentence.
- Do NOT modify detail tabs 1–17.

TONE & FORMATTING RULES (apply to both deliverables)
- TSI brand tone: direct, concrete, no consultant-speak.
  Ban words: leverage, synergy, optimize, best-in-class, unpack,
  circle back, deep dive, tap into, unlock, empower, world-class,
  seamlessly, robust.
- Numbers formatted for humans: $485K not 485000; 72% not 0.7234;
  8.2 days not 8.234 days. Hours: 1.5h not 1:30:00.
- Short declarative sentences. Active voice. Named actions.
- Insights should answer "what changed and so what?" — never
  just restate the number.

GUARDRAILS
- Do not fabricate numbers. Every figure must trace to a cell
  in the workbook. If a KPI is missing or NULL, say so; do not
  guess.
- Do not invent initiative owners or dates — use placeholder
  "[OWNER]" / "[DATE]".
- If you spot a data anomaly (e.g. a KPI that moved >50% and
  seems implausible), flag it inline rather than hide it.
- Company name is "Total Scope, Inc." — never "Technical
  Services Inc." or any other expansion.

Before you start, read all 4 dashboard tabs (0A, 0B, 0C, 0D)
plus tab 17 (Tech Hours). Then produce both deliverables in
one pass.
```

---

## How to run it

```powershell
# 1. Refresh the raw workbook
cd C:\Projects\redesign-matched\docs\reports\sql\operations
.\Run-OpsReview.ps1 -StartDate "2026-01-01" -EndDate "2026-03-31"

# 2. Open Claude Code and paste the prompt above, with the bracketed
#    placeholders filled in for the period.
```

## Placeholders to fill

| Placeholder        | Example                    |
|--------------------|----------------------------|
| `[START]`          | `2026-01-01`               |
| `[END]`            | `2026-03-31`               |
| `[PERIOD LABEL]`   | `Q1 2026`                  |
| `[PRESENTER NAME]` | `Joe Brassell`             |
| `[MEETING DATE]`   | `April 22, 2026`           |
