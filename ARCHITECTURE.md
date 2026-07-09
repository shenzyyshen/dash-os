# ARCHITECTURE.md — Dash

> **Document status:** Living spec — update this file the moment a boundary, port, or delivery decision changes. If the code and this doc disagree, that is a bug in one of them — fix it same-day, don't let them drift.
> **Audience:** Any contributor, human or LLM agent, writing code in this repo.
> **Do not invent alternatives to the folder structure or port contracts below without updating this doc first.**

---

## 0. What Dash Is

Dash is a personal accountability dashboard: a standalone local web app that sits on top of an Obsidian vault and Google Calendar, and uses Claude Code as its reasoning engine. It is a **data display and agent-trigger layer** — it shows you state (selected projects, staleness, today's plan, research findings, video watch list) and fires triggers. It does not think for itself and it does not hold its own copy of the truth.

**Dash is not a chat assistant.** Interaction happens through triggers on a grid UI (initiate plan, tweak calendar, refresh research), not a freeform chat loop. A chat surface can exist elsewhere; it is not Dash's job.

**Dash is not a database.** Your Obsidian vault is the only source of truth for project state, ideas, and notes. Google Calendar is the only source of truth for scheduled time. GitHub is the only source of truth for code-project activity. Dash never duplicates these into its own persistent store — it reads them live and writes back to them.

**Dash owns no personal data.** Every vault path, project reference, and credential lives outside this repo, in a config layer you provide (see §8). This repo is the engine; your instance is the config.

**Watch your own naming.** If your codebase already has a feature or concept that overlaps with "mentor," "dashboard," or similar terms, namespace Dash's domain code (`dash/`) distinctly so it doesn't collide with unrelated existing features when you clone this in alongside other projects.

---

## 1. Feature Boundary

### Dash owns

| Concern | Owner |
|---|---|
| Reading/writing vault frontmatter and kanban state for "selected" projects | Dash |
| Deriving staleness (last touched) per project from GitHub or vault checklists | Dash |
| Rendering the grid dashboard UI | Dash |
| Firing triggers that invoke Claude Code headless for reasoning tasks | Dash |
| Reading/writing Google Calendar events for day plans | Dash |
| Running the daily background research job | Dash |
| Maintaining the Watch List trigger (reads a configured watch-list note, fires research) | Dash |
| Mentor tone setting per project/time period | Dash |

### Dash depends on (via ports — not owned)

| Concern | Source |
|---|---|
| Vault content and structure | `IVaultPort` → filesystem at a configured path |
| Calendar read/write | `ICalendarPort` → Google Calendar API |
| Commit/push history | `IGitHistoryPort` → GitHub API |
| Reasoning, drafting, research, video curation | `IAgentPort` → headless Claude Code CLI |
| Local push notifications | `INotificationPort` |

### Dash explicitly does not own

- Your vault's note conventions themselves — those belong to whatever system already governs your vault (e.g. a `_CLAUDE.md` or equivalent). Dash is a *consumer* of that contract, not a second rulebook.
- Any unrelated feature-specific logic that happens to live in the same monorepo as your instance of Dash.
- Chat UI.
- Auth/multi-user concerns — Dash is single-user, local-only by default. No login system.

If a PR adds any of these, it's in the wrong place.

---

## 2. Two Runtimes, One Domain

This is the one structural decision that isn't obvious from a typical CRUD app, so it's called out up front.

Dash has **two independent entry points** sharing the same domain/ports/adapters code:

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   WEB APP (on-demand)        │        │   WORKER (always scheduled)   │
│   Next.js, runs when you     │        │   Independent process,        │
│   open the dashboard          │        │   OS-scheduled, runs           │
│                                │        │   overnight whether or not     │
│   - grid UI                   │        │   the dashboard is open        │
│   - fast reads (calendar,     │        │                                │
│     kanban, git history)      │        │   - daily research job for    │
│   - trigger buttons →         │        │     selected project(s)       │
│     IAgentPort (Claude Code)  │        │   - writes findings to vault  │
└──────────────┬────────────────┘        └───────────────┬────────────────┘
               │                                          │
               └──────────────┬───────────────────────────┘
                               ▼
                  domain/ · ports/ · adapters/ (shared)
```

**Why this matters:** the daily research job has to run even when you're asleep and the browser tab is closed. A Next.js API route only exists while the app is running. So the scheduled job is a **separate driving adapter** (a small standalone script triggered by your OS scheduler — `launchd` on macOS, `cron`/`systemd` on Linux), not a `setInterval` inside the web server. Both entry points call the same use cases — this is the actual payoff of ports & adapters here, not just ceremony.

---

## 3. Folder Structure

```
dash/
├── ARCHITECTURE.md                 ← this file
├── .env                            ← credentials (gitignored — see §9, never committed)
├── dash.config.json                ← gitignored personal config, see §8
├── dash.config.example.json        ← committed template, no personal data
│
├── src/
│   ├── domain/
│   │   └── dash/
│   │       ├── models/
│   │       │   ├── selected-project.ts      ← SelectedProject, ProjectStatus
│   │       │   ├── day-plan.ts              ← DayPlan, CalendarBlock, DayTemplate
│   │       │   ├── task-item.ts             ← TaskItem, TaskState
│   │       │   ├── research-finding.ts      ← ResearchFinding
│   │       │   ├── watch-list-item.ts       ← WatchListItem, VideoSuggestion
│   │       │   └── mentor-tone.ts           ← ToneSetting
│   │       └── functions/
│   │           ├── compute-staleness.ts     ← days-since-last-activity, pure
│   │           ├── derive-day-template.ts   ← workout size + admin filler + shape
│   │           ├── merge-calendar-blocks.ts ← conflict-free block placement
│   │           └── rank-research-findings.ts
│   │
│   ├── ports/
│   │   └── outbound/
│   │       ├── i-vault-port.ts
│   │       ├── i-calendar-port.ts
│   │       ├── i-git-history-port.ts
│   │       ├── i-agent-port.ts              ← headless Claude Code contract
│   │       └── i-notification-port.ts
│   │
│   ├── adapters/
│   │   ├── vault/
│   │   │   └── filesystem-vault-adapter.ts  ← gray-matter + kanban-line parser
│   │   ├── calendar/
│   │   │   └── google-calendar-adapter.ts
│   │   ├── git/
│   │   │   └── github-adapter.ts
│   │   ├── agent/
│   │   │   └── claude-cli-agent-adapter.ts  ← spawns `claude -p`, validates JSON out
│   │   └── notification/
│   │       └── local-notification-adapter.ts
│   │
│   ├── application/
│   │   └── dash/
│   │       ├── get-dashboard-state.use-case.ts     ← fast reads only, no agent call
│   │       ├── initiate-day-plan.use-case.ts        ← agent call + calendar write
│   │       ├── tweak-calendar.use-case.ts
│   │       ├── refresh-project-research.use-case.ts ← on-demand agent call
│   │       ├── run-daily-research-job.use-case.ts    ← worker entry point
│   │       ├── select-project.use-case.ts
│   │       ├── set-task-state.use-case.ts            ← done / missed / cancelled / low-interest
│   │       └── register-project.use-case.ts          ← link a repo folder to a vault note
│   │
│   ├── infrastructure/
│   │   ├── container.ts             ← DI wiring, constructor injection, shared by both entry points
│   │   └── config.ts                ← loads + validates dash.config.json and .env (Zod)
│   │
│   ├── worker/
│   │   └── run-daily-job.ts         ← standalone entry point, invoked by the OS scheduler
│   │
│   └── app/                         ← Next.js App Router (delivery layer)
│       ├── api/
│       │   dash/
│       │     ├── state/route.ts
│       │     ├── plan/initiate/route.ts
│       │     ├── calendar/tweak/route.ts
│       │     └── projects/[id]/refresh/route.ts
│       ├── page.tsx                 ← grid dashboard
│       └── components/
│           ├── MentorAvatar.tsx
│           ├── ProjectGrid.tsx
│           ├── CalendarPanel.tsx
│           └── WatchListPanel.tsx
│
├── scheduler/
│   └── dash-daily-job.example.plist ← template for scheduling src/worker/run-daily-job.ts
│
└── tests/
    └── (mirrors src/, see §12)
```

**Rule of thumb for "where does this go":** if it's a fact about the world (what a project is, what counts as stale) → `domain/`. If it's "how do I get that fact" → `ports/` (the question) + `adapters/` (the answer). If it's "what happens when you click this" → `application/`. If it's pixels or an HTTP/cron entry point → `app/` or `worker/`.

---

## 4. Layer Import Rules

| Layer | May import | Must not import |
|---|---|---|
| `domain/dash/` | other domain models | ports, adapters, Next.js, Node built-ins, SDKs |
| `ports/outbound/` | domain models only | implementation code |
| `adapters/` | the port it implements, domain models, its own SDK (googleapis, Octokit, `child_process`) | other adapters, use cases |
| `application/dash/` | ports, domain functions | adapters directly, SDKs directly |
| `infrastructure/` | adapters, use cases, ports | — (this is the only place allowed to know concrete adapter classes) |
| `app/` and `worker/` | `infrastructure/container` only | domain, adapters, use cases directly |

**The domain never imports adapters. Adapters never import each other. Arrows point inward.**

---

## 5. Core Domain Models

```typescript
// domain/dash/models/selected-project.ts
export type ProjectStatus = 'selected' | 'low-interest' | 'cancelled'

export interface SelectedProject {
  vaultNotePath: string          // path relative to your configured vault root
  title: string
  status: ProjectStatus
  kind: 'code' | 'non-code'
  githubRepoPath: string | null  // local folder path, if kind === 'code'
  toneOverride: ToneSetting | null // falls back to global default if null
  lastKnownActivity: string | null // ISO date, computed not stored
}
```

```typescript
// domain/dash/models/task-item.ts
export type TaskState = 'open' | 'done' | 'missed' | 'cancelled' | 'low-interest'

export interface TaskItem {
  vaultNotePath: string
  label: string
  state: TaskState
  date: string        // ISO date this instance belongs to
  rolledFrom: string | null  // ISO date if this is a deferred item from a prior day
}
```

```typescript
// domain/dash/models/day-plan.ts
export type DayShape = 'deep-work' | 'vacation' | 'travel'

export interface CalendarBlock {
  title: string
  startIso: string
  endIso: string
  kind: 'workout' | 'admin' | 'project' | 'other'
  projectRef: string | null   // vaultNotePath, if kind === 'project'
}

export interface DayPlan {
  date: string           // ISO date
  shape: DayShape
  workoutMinutes: number // 0 means "still show a small session", per rule: workout is a daily constant
  blocks: CalendarBlock[]
}
```

```typescript
// domain/dash/models/mentor-tone.ts
export type ToneSetting = 'drill-sergeant' | 'calm-coach' | 'adaptive'
```

```typescript
// domain/dash/models/research-finding.ts
export interface ResearchFinding {
  projectRef: string
  claim: string
  sourceUrl: string
  recencyDate: string   // date the claim is as-of
  confidence: 'stated' | 'high' | 'medium' | 'speculation'
  foundAt: string        // ISO datetime the job ran
}
```

```typescript
// domain/dash/models/watch-list-item.ts
export interface WatchListItem {
  topic: string
  addedAt: string
}

export interface VideoSuggestion {
  topic: string
  title: string
  url: string
  reason: string
  surfacedAt: string
}
```

---

## 6. Port Contracts

All I/O returns `AttemptResult<E, T>` — a typed discriminated union, never a thrown exception for expected failure modes. Domain functions may throw on invariant violations (impossible states); ports/adapters/use cases never do.

```typescript
// shared result type, used everywhere I/O crosses a boundary
export type AttemptResult<E, T> =
  | { success: true; error: null; value: T }
  | { success: false; error: E; value: null }
```

```typescript
// ports/outbound/i-vault-port.ts
export interface IVaultPort {
  readFrontmatter(notePath: string): Promise<AttemptResult<VaultError, Record<string, unknown>>>
  writeFrontmatterField(notePath: string, field: string, value: unknown): Promise<AttemptResult<VaultError, void>>
  listSelectedProjects(): Promise<AttemptResult<VaultError, SelectedProject[]>>
  appendToNote(notePath: string, section: string, content: string): Promise<AttemptResult<VaultError, void>>
  readChecklistCompletions(notePath: string): Promise<AttemptResult<VaultError, { label: string; completedAt: string }[]>>
}

export type VaultError =
  | { type: 'note_not_found'; path: string }
  | { type: 'malformed_frontmatter'; path: string; reason: string }
  | { type: 'write_failed'; path: string; reason: string }
```

```typescript
// ports/outbound/i-calendar-port.ts
export interface ICalendarPort {
  getEventsForDate(date: string): Promise<AttemptResult<CalendarError, CalendarBlock[]>>
  createEvents(blocks: CalendarBlock[]): Promise<AttemptResult<CalendarError, void>>
  clearProjectBlocksForDate(date: string): Promise<AttemptResult<CalendarError, void>>
}

export type CalendarError =
  | { type: 'auth_expired' }
  | { type: 'api_error'; reason: string }
```

```typescript
// ports/outbound/i-git-history-port.ts
export interface IGitHistoryPort {
  getLastActivity(repoPath: string): Promise<AttemptResult<GitHistoryError, { lastCommitAt: string; lastPushAt: string | null }>>
}

export type GitHistoryError =
  | { type: 'repo_not_found'; path: string }
  | { type: 'api_rate_limited' }
  | { type: 'auth_failed' }
```

```typescript
// ports/outbound/i-agent-port.ts
// The one port every "reasoning" use case goes through. Implemented by spawning
// headless Claude Code — never a bespoke LLM call. See §7 (Critical Warning).
export interface IAgentPort {
  run<T>(job: AgentJob<T>): Promise<AttemptResult<AgentError, T>>
}

export interface AgentJob<T> {
  prompt: string
  expectedShape: ZodSchema<T>   // response is validated before the use case ever sees it
  timeoutMs: number
}

export type AgentError =
  | { type: 'timeout' }
  | { type: 'process_failed'; exitCode: number; stderr: string }
  | { type: 'parse_failure'; raw: string }
```

```typescript
// ports/outbound/i-notification-port.ts
export interface INotificationPort {
  send(title: string, body: string): Promise<AttemptResult<{ type: 'send_failed' }, void>>
}
```

---

## 7. The Agent Port — Critical Rules

This is the part most likely to be built wrong, so it gets its own section.

**Every reasoning task goes through one adapter: `ClaudeCliAgentAdapter`.** It spawns `claude -p "<prompt>" --output-format json` as a child process (headless/non-interactive mode) and captures stdout. This is a deliberate choice, not a shortcut: Claude Code already knows your vault's conventions and can carry connectors (Calendar/GitHub/Drive/etc.) and memory across sessions. A bespoke LLM API call from inside Dash would have to re-implement all of that — a straight duplication of infrastructure that already exists and already works. Don't build a second agent loop.

**Every agent response is validated before the use case sees it.** The adapter parses the CLI's JSON output against a Zod schema (`AgentJob.expectedShape`). If validation fails, return `{ type: 'parse_failure' }` — never pass malformed data upstream.

**Prompts are not business logic.** Prompt text/templates live next to the adapter (`adapters/agent/prompts/`), one file per job type (`initiate-day-plan.prompt.ts`, `refresh-research.prompt.ts`, `pick-videos.prompt.ts`). Domain functions never format prompt strings.

**The worker and the web app share the same adapter.** `run-daily-research-job.use-case.ts` (worker entry point) and `refresh-project-research.use-case.ts` (on-demand, web-triggered) both call `IAgentPort.run()` with different `AgentJob` payloads — same port, same adapter, two different callers. This is exactly the case the hybrid trigger model (fast reads vs. agent calls) was designed for.

---

## 8. Configuration and Portability

Dash ships with **zero personal data**. Everything that would need to change to point Dash at a different vault or a different person's setup lives in `dash.config.json`, which is gitignored — you create your own from the committed `dash.config.example.json` template:

```json
{
  "vaultPath": "/absolute/path/to/your/obsidian/vault",
  "watchListNotePath": "Watch List.md",
  "defaultTone": "calm-coach",
  "dayTemplates": {
    "deep-work": { "workoutMinutesDefault": 30 },
    "vacation": { "workoutMinutesDefault": 15 },
    "travel": { "workoutMinutesDefault": 15 }
  },
  "researchJob": { "scheduleCron": "0 3 * * *" }
}
```

No vault path, project name, or personal topic list is ever hardcoded in `src/`. Everything project-specific reads from this file, loaded once through `infrastructure/config.ts` (validated with Zod — fail fast and loud if the config is malformed, don't silently fall back to a guess). This is what makes it possible for anyone to clone this repo and point it at their own vault without touching application code.

---

## 9. Credentials

**Never committed, ever.** All secrets live in `.env` at the repo root, gitignored:

```
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_REFRESH_TOKEN=      # obtained via one-time interactive consent, then reused by the worker
GITHUB_TOKEN=                    # fine-grained PAT, read-only on your repos
```

The worker (`src/worker/run-daily-job.ts`) runs unattended overnight — it cannot do an interactive OAuth flow. The Google refresh token must be minted once via an interactive login (a one-time setup script), then reused headlessly from then on.

If you're setting up a `GITHUB_TOKEN` for the first time, scope it as narrowly as possible (read-only, limited to the repos Dash needs to check activity on) and store it only in `.env`. Never in a vault note, a commit, or any file this repo tracks.

---

## 10. Vault Conventions Dash Reads/Writes

Dash does not invent vault conventions from scratch — it expects a small, additive set of frontmatter fields on top of whatever your vault already does:

| Field | On | Values | Meaning |
|---|---|---|---|
| `dashboard-status` | project notes | `selected \| low-interest \| cancelled` | which projects Dash actively tracks |
| `dashboard-tone` | project notes | `drill-sergeant \| calm-coach \| adaptive` | per-project override; falls back to config default |
| `github-repo` | project notes | absolute local path | links the note to a local repo for `IGitHistoryPort` |

Task state (`done / missed / cancelled / low-interest`) is expected to live as kanban-style checklist lines, e.g.:

```
- [ ] 🔴 **Title** · @{YYYY-MM-DD}
- [x] ~~🔴 **Title**~~ ✅ YYYY-MM-DD        ← done
- [ ] 🔴 **Title** · @{YYYY-MM-DD} ⏭ missed  ← rolled to tomorrow
- [ ] ~~🔴 **Title**~~ ❌ cancelled           ← cancelled
- [ ] 🔴 **Title** 🧊 low-interest            ← back-burner
```

If your vault already has its own kanban/task syntax, adapt `filesystem-vault-adapter.ts`'s parser to match it rather than forcing your vault to adopt Dash's — the adapter is the seam meant to absorb that difference.

---

## 11. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript strict mode | UI + API routes in one process |
| Package manager | pnpm | fast, disk-efficient, current default |
| Validation | Zod | schema validation for config, env, and agent JSON output |
| Vault parsing | `gray-matter` + a small custom kanban-line parser | frontmatter is standard YAML; kanban lines are often a house convention, need bespoke parsing |
| Calendar | `googleapis` (official client), OAuth2 | direct API for fast reads/writes, no round-trip needed for the hot path |
| GitHub | `octokit` | official client, handles auth/rate limits/pagination |
| Agent invocation | Node `child_process.execFile` → `claude -p` | see §7 |
| Scheduling | OS scheduler (`launchd`/`cron`/`systemd`), calling `src/worker/run-daily-job.ts` directly with `node` | survives independent of whether the web app is running; no in-process cron needed |
| Testing | Vitest | fast, native ESM, current default over Jest |
| Error handling | `AttemptResult<E, T>` discriminated unions | no thrown exceptions across boundaries |

---

## 12. Testing Strategy

| Layer | Test type | Covers |
|---|---|---|
| `domain/dash/functions/` | Unit | All pure functions, 100% target — this is where the actual product rules live (staleness math, day-template derivation, block merging) |
| `application/dash/` | Unit, mocked ports | Happy path + every documented error branch per port call |
| `adapters/` | Integration | Real Google Calendar sandbox event, real GitHub API against a test repo, recorded fixtures for the Claude CLI adapter |
| `app/api/` | Minimal | Route maps `AttemptResult` → correct HTTP status, nothing else |
| `worker/` | Integration | Runs `run-daily-research-job` end-to-end against a fixture vault directory |

Claude CLI adapter tests use recorded fixtures (`adapters/agent/__fixtures__/*.json`), never a live call in CI.

---

## 13. MVP Delivery Order

Build in this order. Don't start a slice until the previous one's done criteria are met — this is the mechanism that prevents the plan changing under itself day to day.

### Slice 1 — Vault read layer
- `IVaultPort` defined, `FilesystemVaultAdapter` implemented
- `listSelectedProjects()` correctly parses `dashboard-status` frontmatter
- `GetDashboardStateUseCase` returns real selected-project data
- Unit tests on frontmatter parsing edge cases (missing field, malformed YAML)

### Slice 2 — Grid UI, read-only
- `app/page.tsx` renders the grid from `GetDashboardStateUseCase`
- No triggers wired yet — just visibility
- Techy/grid visual direction established here

### Slice 3 — Google Calendar integration
- OAuth setup script (one-time interactive), refresh token stored in `.env`
- `ICalendarPort` + `GoogleCalendarAdapter`, read-only first (`getEventsForDate`)
- Calendar panel shows real events on the grid

### Slice 4 — GitHub staleness
- `IGitHistoryPort` + `GithubAdapter`
- `compute-staleness.ts` domain function, unit tested
- "Last touched: N days ago" visible per selected code project
- Non-code projects fall back to `readChecklistCompletions`

### Slice 5 — Agent port + "initiate day plan"
- `IAgentPort` + `ClaudeCliAgentAdapter`, one prompt type (`initiate-day-plan`)
- `InitiateDayPlanUseCase`: agent drafts the plan → `ICalendarPort.createEvents()`
- Day templates (workout sizing, admin filler, shape) applied via `derive-day-template.ts`
- This is the first end-to-end trigger — mentor avatar button becomes real

### Slice 6 — Calendar tweaks + task states
- `TweakCalendarUseCase`
- `SetTaskStateUseCase` writing the four-state kanban convention back to the vault

### Slice 7 — Research job (worker)
- `src/worker/run-daily-job.ts` + scheduler config
- `RunDailyResearchJobUseCase` scoped to selected project(s) only
- Findings written to vault, each claim carrying a source URL, recency date, and confidence level
- `RefreshProjectResearchUseCase` (on-demand variant, same underlying job)

### Slice 8 — Watch List
- Watch-list note seeded once from a vault scan
- Video-suggestion agent job, surfaced on the grid independent of active project

### Slice 9 — Tone settings + project registration
- `dashboard-tone` frontmatter, settings UI
- `RegisterProjectUseCase`: point at a local folder once, auto-link to a vault note

---

## 14. Code Review Checklist

Before merging any Dash PR:

- [ ] New files are in the correct layer folder (§3)
- [ ] No SDK imports inside `domain/` or `application/`
- [ ] No business logic inside adapters or route handlers
- [ ] All port I/O returns `AttemptResult`, nothing thrown across a boundary
- [ ] Every `IAgentPort.run()` call has a Zod `expectedShape` and a handled `parse_failure` path
- [ ] New frontmatter fields are documented in §10, not invented ad hoc
- [ ] No secret or personal data ever committed to this repo
- [ ] New domain functions have unit tests
- [ ] This document is updated if any of the above changed the plan

---

## 15. Key Risks

| Risk | Mitigation |
|---|---|
| Dash drifts into a chat assistant | Interaction stays trigger-based; if you're building a streaming Q&A loop, stop |
| A second source of truth creeps in | Vault/Calendar/GitHub are the only truth; no Dash-owned database, ever |
| Worker can't authenticate overnight | Refresh tokens minted once via interactive setup, reused headlessly — never require interactive login in `worker/` |
| Agent output silently corrupts vault notes | Every agent response validated by Zod before any write happens |
| Daily research job scope creeps to "all projects" | Hard-scoped to `dashboard-status: selected` in the query itself, not a convention someone can forget |
| Personal data leaks into this public repo | `dash.config.json` and `.env` are gitignored from the first commit; only `.example` templates are tracked |
| Architecture doc goes stale | §0 status line — update same-day, not "eventually" |

---

*Architecture version: 1.0 — MVP scope. Tech stack and delivery order fixed as of first write; renegotiate explicitly, don't drift silently.*
