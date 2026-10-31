# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

Plain HTML/CSS/JS with no build step, package manager, linter or test suite. The repo root is served as-is. It holds these pages:

| Page | Files | Data |
|---|---|---|
| Soccer club attendance (main app, site root) | `index.html`, `attendance.css`, `attendance.js`, `sw.js`, `manifest.webmanifest`, `icon-*.png` | Supabase project `soccer-attendance` (id `ldektmvedvhumdvrdbxj`) |
| "Best Line-up" phone-storage copy of the attendance app | `local/` (`index.html`, `local.css`, `local.js`, `sw.js`, own manifest/icons) | IndexedDB on the phone (falls back to `localStorage`); no server. Data moves only via its JSON backup file. Its APK (`apk/local/`, package `io.github.sedapa9277.bestlineup`) wraps the live `/local/` page, so pushing updates it |
| RPG-style todo ("monsters" = tasks, XP/level-ups) | `todo.html`, `style.css`, `script.js` | `localStorage` only |
| Legacy attendance page for claude.ai | `soccer-attendance.html` | claude.ai artifact DB (`window.claude.use("db")`), published at https://claude.ai/artifact/FsvfEfYGV3dSjW4hpASNUa |

`soccer-attendance.html` is the original single-file version. It runs only as a claude.ai Artifact, which blocks network calls to Supabase. It is no longer the source of truth; Supabase is. Change it only when asked, and republish it with the Artifact tool, not by pushing.

`local/` is a separately maintained copy, not shared code: changes in one never reach the other. Active development now happens only in `local/` (Best Line-up, commits prefixed `local/:`); the root Supabase app is no longer being worked on, so leave it alone unless the user asks for it by name. The Android APK wraps the live `/local/` page, so pushes reach it without a rebuild; `apk/` (package, signing key, store material) is gitignored and must never be committed.

UI copy and code comments are in Korean. Keep them that way.

## Deploy and preview

- **Live site:** GitHub Pages serves `main` from the repo root at https://sedapa-9277.github.io/design_skill/. Pushing to `main` updates it in about 1–2 minutes. The repo is public for this reason, and the Supabase anon key in `attendance.js` is intentionally public.
- **Team deep links:** `#faith` (믿음), `#hope` (소망), `#love` (사랑).
- **Cache busting:** whenever `attendance.css` or `attendance.js` changes, bump the `?v=N` query on both links in `index.html` and the `CACHE = 'attendance-shell-vN'` name in `sw.js` (kept equal). Phones and home-screen installs otherwise keep the stale files. The root service worker is network-first and only deletes caches with its own `attendance-shell-` prefix, so it never touches `local/`'s caches.
  - `local/` works the same way but cache-first, so a missed bump means phones never see the change. When `local.css`/`local.js` change, bump their `?v=N` in `local/index.html`, the matching entries in `local/sw.js`'s `SHELL`, `VERSION` in `local/sw.js`, and `APP_VERSION` in `local.js` (kept equal to `VERSION`; the settings dialog shows it so the user can confirm a phone updated). Icons carry their own `?v=N` in `manifest.webmanifest`, `index.html` and `SHELL`.
- **Azure workflow:** `.github/workflows/azure-webapps-static.yml` runs on every push.
  - It copies only root-level `*.html *.css *.js *.webmanifest *.png` into `site/`. A new asset type must be added to that glob, and subfolders such as `local/` are not deployed to Azure (GitHub Pages does serve them).
  - It fails if a page references a missing local CSS/JS file.
  - The Azure deploy step is skipped while `AZURE_WEBAPP_NAME` is `your-app-name` or the `AZURE_WEBAPP_PUBLISH_PROFILE` secret is unset, so the run still passes.
- **Local preview:** this machine has no Node or Python. `.claude/launch.json` defines a `static` server (`.claude/serve.ps1`, PowerShell `HttpListener` on port 8765) for the preview tools; open `/index.html` or `/local/index.html`. The root page talks to the live Supabase project, so local edits act on real data; `/local/` only touches the browser's own storage.
  - `local/sw.js` caches cache-first, so after editing, unregister the service worker and clear caches in the preview before reloading, or you will test stale files.
- **GitHub access:** `gh` is not installed. The repo belongs to `sedapa-9277`; the repo-local config `credential.https://github.com.username=sedapa-9277` makes Git Credential Manager use that account (this PC also holds a `sedapa2010-K` login with no access, which gives a 403). For GitHub API calls, read the token with `printf "protocol=https\nhost=github.com\nusername=sedapa-9277\n\n" | git credential fill`. The Bash tool cannot show a login prompt; if the stored token expires, the user must run `git push` once in their own terminal and paste a new personal access token. Commits use author `leejjang812 <leejjang812@gmail.com>` (set in the repo's local git config).

## Attendance app architecture

### Supabase side

The schema lives only in Supabase migrations; there are no SQL files in this repo. Change it with the Supabase MCP `apply_migration` tool.

- **Tables (`public`):**
  - `members(id, name, active, team, injured, created_at)`: `injured` marks a member as hurt (dimmed in the grid, own group in the lineup picker) and is cleared server-side when they are checked in or placed. `team` is one of `'믿음' | '소망' | '사랑'`, and active names are unique across all teams.
  - `attendance(day, member_id, game)`: a row's existence means the member played that game (1–6) that day.
  - `lineups(day, team, game, formation)`
  - `lineup_slots(day, team, game, slot 0–10, member_id)`: slot 0 is the GK, and a member appears at most once per (day, team, game).
  - Deleting a member cascades to attendance and slots.
  - `team_names(team, name)`: the editable display name per team key (1–12 chars, unique) and an `active` flag (1–3 active teams; the UI lists only active teams via `activeTeams()`). The client's `tn(team)` reads it and falls back to `"<team>팀"`. Team keys and `#faith`/`#hope`/`#love` never change.
- **Security model:**
  - RLS allows `select` for anon. Insert, update and delete are revoked.
  - Every write goes through a `SECURITY DEFINER` RPC that takes `p_pin` and calls `private.check_pin`.
  - The PIN is a 4-digit club code. Only its bcrypt hash is stored, in `private.settings`.
  - The RPCs are `verify_pin`, `add_members(p_pin, p_team, p_names)`, `rename_member`, `set_member_team`, `set_member_active`, `set_member_injured`, `purge_member` (inactive members only), `set_attendance(p_pin, p_day, p_member, p_games[], p_on)`, `set_formation`, `place_member`, `delete_team_day(p_pin, p_day, p_team)`, `clear_team_game(p_pin, p_day, p_team, p_game)`, `rename_team(p_pin, p_team, p_name)`, `delete_team(p_pin, p_team)` (deletes the team's members and records, marks it inactive; never the last active team), `add_team(p_pin, p_name)` (reactivates the first inactive key, returns it), `purge_team_members(p_pin, p_team)` and `change_pin`.
  - Server-side rules live in these functions, and the client only mirrors them optimistically:
    - Unchecking attendance also removes the member from that game's lineup.
    - Placing a member also checks their attendance.
    - Moving teams drops the member's other-team lineup slots.
  - Advisor warnings about anon-executable `SECURITY DEFINER` functions are expected under this design.
- **PostgREST `safeupdate` gotcha:** requests through the API reject `UPDATE`/`DELETE` without a `WHERE` clause. `execute_sql` does not enforce this, so a function can pass a SQL test and still fail from the page. Test RPCs through the REST endpoint (`/rest/v1/rpc/<name>` with the anon key), and use no-op arguments when touching real data.
- **Realtime:** all five tables are in the `supabase_realtime` publication.

### Client (`attendance.js`, one IIFE)

- **State:** everything lives in a single `S` object.
  - `reload()` fetches all four tables, paging 1000 rows at a time, and rebuilds `S.members` (id → `{name, active, team}`) and `S.days` (`"YYYY-MM-DD"` → `{ att: {memberId: {g1: true…}}, lineup: {team: {g1: {formation, pos: {s0: memberId}}}} }`).
  - Realtime events and date changes call a debounced `scheduleReload()`.
- **Writes:** `write(queueKey, pend, call, okMsg)` handles every write.
  1. It applies optimistic values into `S.pending` (keys `"date|memberId|gN"`) or `S.pendingLineup` (keys `"date|team|gN|sI"` and `"date|team|gN|form"`).
  2. It serializes the call per key, runs the RPC, then calls `reload()`.
  3. It clears the pending entries.
  - Read helpers (`attended`, `lineupOf`) check the pending maps before `S.days`.
- **Team scoping:** almost every view filters by `S.team` through `teamMembers()`/`activeMembers()`, including the roster, stats, recent dates (`hasAny`) and lineups. Attendance rows themselves carry no team; it comes from the member.
- **PIN:** stored in `sessionStorage` after `verify_pin` succeeds. `needPin()` guards every edit control. An `invalid_pin` error re-locks the page.
- **Layout:**
  - At `max-width: 860px` the page becomes a phone app. A bottom `.tabbar` switches `.view[data-view]` sections (`check`, `lineup`, `summary`, `stats`, `members`); `.main` and `.side` use `display: contents`.
  - `body.picking` hides the header and shrinks the pitch while the bottom-sheet member picker is open.
  - The date button (`#calBtn`, a `.cal-tile` on phones) opens an in-app month calendar (`#calModal`) that circles the current team's meeting days. The native `<input type="date" id="datePick">` is kept hidden only for its `change` handler.
  - The attendance grid shows 4 games by default (`visibleGames()`; +/− up to 6, shared with the lineup tabs and day summary). Circle size depends on `#attTable[data-games]`, and checked cells render as an inline-SVG soccer ball.
  - Stats rate is meeting-day based: days attended ÷ team meeting days in the period, shown as "참석/전체".
  - Desktop shows all panels at once.
- **Formations:** positions come from the `FORMATIONS` table, `[label, x%, y%]` per slot with index 0 as the GK. The DB allows only the four formation keys defined there, so adding one needs a migration too.

## Phone-storage app (`local/local.js`, one IIFE)

Same screens as the root app, but no server and no PIN. Read the root client section above first; differences:

- **Storage:** the whole state is one snapshot object (`snapshot()`), saved under one key in IndexedDB `soccer-attendance-local` (`kvGet`/`kvSet`, falling back to `localStorage`). The backup JSON file is the same snapshot. Everything loaded from storage or a backup goes through `parseData()`, which whitelists ids, teams, formations and values; a new field must be added there or it is silently dropped on load.
- **Writes:** `write(change, okMsg)` runs `change()` synchronously against `S` (the `db*` functions, which mirror the root app's server-side rules), re-renders, then persists; a failed save calls `revert()`. There are no pending maps or reloads.
- **Data shapes:** `S.days` date → `{ att: {memberId: {g1: true | "sub"}}, lineup: {team: {g1: {formation, opp, pos: {s0: memberId}}}} }`. `"sub"` marks a substitute (double-tap in the grid) and still counts as present: read attendance through `attended()`/`isSub()`, never with `=== true`. `tidyDay()` drops empty entries. Members carry `created_at` (used for the stats "added" date and the recent-meetings strip) and `healedOn` for the injury flag.
- **Teams:** keys are always `믿음/소망/사랑`; display names live in `S.teamNames`, availability in `S.teamActive`. The last active team cannot be deleted; it is reset instead (`dbResetTeam`, renamed to `팀1`).
- **i18n:** Korean and English. JS strings use `L(ko, en)`; static HTML uses `data-en`, `data-en-placeholder`, `data-en-aria-label`, etc., applied by `applyStaticLang()`. Long help content uses `data-lang-only="ko|en"` blocks.
- **Settings** (all `localStorage`, keys prefixed `soccer-local-`): language, theme (`data-theme` on `<html>`, set early by `boot.js`), position colors (`data-poscolor="color|mono"`, CSS vars `--pos-fwd/mid/def/gk`), recent-absence count, recent meetings shown. The settings dialog also opens sub-dialogs (user guide, position tactics, formations, quiz, open source licenses); each is a `.help-modal` with open/close functions that must also be listed in the Escape handler and in `backStep()`.
- **Quiz:** questions live in `quiz.js` as `window.QUIZ_KO` and `window.QUIZ_EN`, same order and same answer index (`a`); edit both together. `startQuiz()` picks the set by language and shuffles 10 questions and their choices.
- **New files:** any file the page loads at startup (scripts, CSS) must be added to `SHELL` in `local/sw.js` with its own `?v=N`, or it will not work offline.
- **Back button:** a `{backGuard: true}` history entry is pushed on the first touch; `popstate` closes the top dialog, then the lineup picker, then returns to the Attendance view, and only then lets a second press within 2 s leave. Use `history.replaceState(history.state, …)` when changing the URL hash so the guard survives.
- **No external requests:** `index.html` carries a Content-Security-Policy meta (`script-src 'self'`, no other hosts). Inline `<script>` blocks are blocked, so code that must run before the page draws lives in `boot.js` (theme, splash, service worker registration). Fonts are bundled in `local/fonts/` (Google Fonts subsets plus `fonts.css`, OFL licensed) and cached on demand by `sw.js`; the privacy policy and store data-safety answers rely on there being no third-party requests.
- **Images:** lineup and attendance images are drawn on a canvas (`drawLineupImage`, `drawAttendanceImage`) and shown in `#imgModal` via `openShot()`.

## Android app and Play Store

- The APK/AAB is a PWABuilder Trusted Web Activity of `https://sedapa-9277.github.io/design_skill/local/`. The launcher icon is baked into the package: changing `local/` icons does not change it until the package is rebuilt with the existing signing key (`apk/local/package/signing.keystore`).
- Digital Asset Links live in a separate repo, `sedapa-9277/sedapa-9277.github.io` (`.well-known/assetlinks.json` plus `.nojekyll`). If Play App Signing is used, its SHA-256 fingerprint must be added there.
- Store listing text, content-rating and data-safety answers, and store graphics are in the gitignored `apk/local/store-listing.md` and `apk/local/store/`. The privacy policy is `local/privacy.html` (linked from the settings dialog). Bundled third-party code and fonts are credited in the settings "open source licenses" dialog, with full texts in `local/licenses/` and `local/fonts/OFL-*.txt`; add an entry there when bundling anything new.
- The app launched on Play with no ads and "no data collected"; adding ads means updating the Play ads and data-safety declarations and the privacy policy before any ad code is pushed, since pushes go live immediately.
