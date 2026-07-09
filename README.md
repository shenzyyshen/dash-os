# Dash

**A grid-wise dashboard that keeps your projects, ambitions, and goals honest — and up to date every single day.**

---

## What this is

Dash is the front door to your work. Not a task app, not another place to write notes — a live, always-current view of what you're building, what's due, what's stale, and what's next. It sits on top of the things that already hold the truth (your Obsidian vault, your real Google Calendar, your actual GitHub commit history) and shows you all of it in one place, laid out like a real engineer's dashboard: dense, grid-based, data-forward. No soft rounded planner-app aesthetic — this looks like something you'd monitor a system with, because that's what it's doing.

It works like a journal that writes itself. Every project you're actively working gets tracked automatically — last commit, last checklist item, last research update — so the record of what happened stays accurate without you maintaining it by hand.

## Why it exists

Ideas are easy. Follow-through is the hard part. Dash exists to close the gap between "I have a plan" and "I did the plan" — by making the current state of every active project impossible to not see, every morning, before the day gets away from you.

It's the interactive version of a boss who actually knows what you're working on: not a nag, not a blocker — a source of truth you check in with, that checks in back.

## What it does

- **Shows a grid of your selected projects** — the ones you've chosen to actively work on right now, pulled straight from your vault. Not everything you've ever thought of; just what's live.
- **Tells you when you last touched each one.** Real GitHub commit/push history for code projects. Checklist progress for non-code work (paperwork, setup steps, anything with a checklist in its vault note). No self-reporting, no guessing.
- **Keeps your real calendar in sync with your real plan.** Click "initiate today's plan" and Dash drafts the day — a workout block sized to the day, project time blocks, admin tasks slotted in wherever they fit — and writes it straight to Google Calendar. It's there on your phone, not trapped in a dashboard.
- **Researches in the background.** A scheduled job runs overnight for whatever project you've currently selected, so if something relevant changed, you find out before you sit down to work — not mid-task. You can also trigger a fresh check on demand when you're about to dive into something that needs current information.
- **Keeps a running watch list.** A separate, standing list of topics you're interested in (independent of whatever's active right now) that surfaces relevant videos over time.
- **Lets you say no without losing the thread.** Tasks can be marked missed (rolls to tomorrow), cancelled (archived, done with it), or low-interest (parked, not deleted) — so the record stays honest without forcing you to pretend everything's on schedule.
- **A mentor character that isn't fixed in tone.** Drill sergeant this month, calm coach next month, adjustable per project. It shows you the facts; whether to act on them is always your call.

## What it isn't

- Not a database. Your vault, your calendar, and GitHub remain the only sources of truth — Dash never keeps its own copy that could drift out of sync.
- Not a chat assistant. Interaction happens through triggers on the grid, not a freeform conversation loop.
- Not an enforcer. Nothing here blocks you from starting something new or locks you out of anything. Visibility is the mechanism, not restriction.

## How it works, at a glance

Dash is a standalone local web app (not an Obsidian plugin, not a browser tab pretending to be one) with two moving parts:

1. **The dashboard itself** — open it, see the grid, click a trigger.
2. **A background worker** — runs the overnight research job on its own schedule, independent of whether the dashboard is open.

Fast facts (calendar events, commit history, kanban state) are read directly, instantly. Anything that needs judgment — drafting a plan, researching, picking videos — is handed to Claude Code running headless, so it inherits everything already built into how your vault operates rather than reinventing it.

Full technical detail — folder structure, port contracts, data flow, delivery order — lives in [`ARCHITECTURE.md`](./ARCHITECTURE.md). That document is the binding contract for how this gets built; this README is the plain-language why.

## Making it yours

This repo ships with **no personal data** — no vault path, no project names, no credentials. To run your own instance:

1. Clone this repo.
2. Copy `dash.config.example.json` → `dash.config.json` (gitignored) and point `vaultPath` at your own Obsidian vault.
3. Copy `.env.example` → `.env` (gitignored) and fill in your own Google Calendar OAuth credentials and GitHub token.
4. Add `dashboard-status: selected` frontmatter to whichever project notes in your vault you want tracked.

Nothing in `src/` ever needs to change to point Dash at a different vault or a different person's projects — see `ARCHITECTURE.md` §8.

## Status

Not built yet — this is the architecture and intent, locked before writing code so the plan doesn't change out from under itself day to day. See `ARCHITECTURE.md` §13 for the build order (vault read layer → grid UI → calendar → GitHub staleness → the first real trigger → tweaks → the overnight research worker → watch list → tone settings). Each slice has to be genuinely done before the next one starts.
