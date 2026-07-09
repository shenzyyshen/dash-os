# Dash — Build Progress

> Living checklist. Check items off here as they're actually done (tests passing, not just "started"). Cross-reference `ARCHITECTURE.md` §13 for what each slice means — this file tracks status, that one defines scope.
>
> **Last updated:** 2026-07-09

---

## Start here next session

**Next action:** Slice 3 (Google Calendar) is blocked on OAuth setup — that needs your interactive input (browser consent), not just code. Either do the OAuth setup first, or jump to Slice 4 prep / pick more projects to select while that's pending.

**First real project selected:** `Bases/projects/Spain/Grants/Grants - Full Breakdown.md` — `dashboard-status: selected`, confirmed rendering live on the grid ("Spain Grants" tile, 1 tracked). That edit is sitting uncommitted in the vault by design — the vault has its own daily auto-backup commit, not something this project touches.

**Known stray item, not yet cleaned up:** `Brain/Dash/` — an orphaned old clone of `shenzyyshen/Dash`, stuck at its first commit, unrelated to the real work in `/Users/shenmay/Projects_/Dash`. Flagged, not deleted — ask before removing it.

## Repo setup

- [x] Public repo created — `shenzyyshen/dash-os`
- [x] Private config repo created — `shenzyyshen/Dash` (vault path, personal preferences, future credentials)
- [x] `ARCHITECTURE.md` written and pushed
- [x] `README.md` written and pushed
- [x] `.gitignore`, `dash.config.example.json`, `.env.example` in place
- [x] Toolchain scaffolded — pnpm, TypeScript strict, Vitest

## Credentials (blocking Slices 3 & 4 — not code work)

- [ ] Google Calendar OAuth app created, one-time interactive consent run, refresh token stored in `Dash` repo's `.env`
- [ ] Fresh scoped GitHub PAT minted for Dash's own GitHub API reads, stored in `Dash` repo's `.env`
- [ ] Old leaked GitHub PAT (flagged in `Brain/_CLAUDE.md`, `archive of done stuff/Untitled.md`) rotated/revoked at github.com/settings/tokens — unrelated to Dash but flagged during credential setup, still outstanding

## Slices

- [x] **Slice 1 — Vault read layer**
  - [x] `IVaultPort` + `FilesystemVaultAdapter` (`readFrontmatter`, `listSelectedProjects`)
  - [x] Malformed frontmatter skipped, doesn't crash the whole listing
  - [x] `GetDashboardStateUseCase`
  - [x] 9 tests passing, `pnpm typecheck` clean
  - Commit: `adfd487`

- [x] **Slice 2 — Grid UI, read-only**
  - [x] Next.js App Router scaffolded
  - [x] `src/app/page.tsx` renders the grid from `GetDashboardStateUseCase`
  - [x] No triggers yet — visibility only
  - [x] Grid/techy visual direction established (dark surface, dataviz-skill status palette, icon+label badges, monospace data fields)
  - [x] Verified against the real vault via `pnpm dev` — correctly shows empty state (0 notes have `dashboard-status` yet)
  - Commit: `2f58324`

- [ ] **Slice 3 — Google Calendar integration**
  - [ ] Blocked on Google OAuth credentials above
  - [ ] `ICalendarPort` + `GoogleCalendarAdapter`, read-only (`getEventsForDate`)
  - [ ] Calendar panel shows real events on the grid

- [ ] **Slice 4 — GitHub staleness**
  - [ ] Blocked on GitHub token above
  - [ ] `IGitHistoryPort` + `GithubAdapter`
  - [ ] `compute-staleness.ts`, unit tested
  - [ ] "Last touched: N days ago" per selected code project
  - [ ] Non-code projects fall back to checklist completions

- [ ] **Slice 5 — Agent port + "initiate day plan"**
  - [ ] `IAgentPort` + `ClaudeCliAgentAdapter`
  - [ ] `InitiateDayPlanUseCase` — agent drafts plan → `ICalendarPort.createEvents()`
  - [ ] Day templates applied (workout sizing, admin filler, shape)
  - [ ] First real end-to-end trigger — mentor avatar button becomes functional

- [ ] **Slice 6 — Calendar tweaks + task states**
  - [ ] `TweakCalendarUseCase`
  - [ ] `SetTaskStateUseCase` — missed / cancelled / low-interest written back to vault

- [ ] **Slice 7 — Research job (worker)**
  - [ ] `src/worker/run-daily-job.ts` + OS scheduler config
  - [ ] `RunDailyResearchJobUseCase`, scoped to selected project(s) only
  - [ ] `RefreshProjectResearchUseCase` (on-demand variant)

- [ ] **Slice 8 — Watch List**
  - [ ] Watch-list note seeded from vault scan
  - [ ] Video-suggestion agent job

- [ ] **Slice 9 — Tone settings + project registration**
  - [ ] `dashboard-tone` frontmatter + settings UI
  - [ ] `RegisterProjectUseCase`

---

## How to update this file

When a slice's checkboxes are all true and its tests pass: check the slice header box, add the commit hash, update "Last updated." Don't check a box because code exists — check it because the done-criteria in `ARCHITECTURE.md` §13 are actually met.
