# Lockout Watch refresh instructions

These are the instructions for the scheduled Claude task that keeps https://lockoutwatch.com current. The task's prompt points here. Nobody is watching a run: do not ask questions, take the most reasonable reading and keep going. Timezone: America/New_York.

Lockout Watch tracks the MLB and MLBPA collective bargaining talks. The 2022-26 CBA expires Dec. 1, 2026 at 11:59 p.m. ET and owners are expected to lock out players on Dec. 2.

## What you may change

Only these files: `data/status.json`, `data/key_dates.json`, `data/timeline.json`, `data/issues.json`, `data/money.json`, `data/news.json`, `data/stoppages.json`, `data/outlook.json`.

Never change `index.html`, `about.html`, `assets/`, `config.json`, `CNAME`, `data/xposts.json` or this file.

## Run log

Danny reads this to see what happened. Load ArtifactData via ToolSearch (`select:ArtifactData`). Log to artifact `https://claude.ai/artifact/Qwh7JzmFkUszmUTzn532hv` with ArtifactData action `set`, collection `runlog`, doc_id = the run start time as `YYYYMMDDTHHMMZ` (UTC), data = `{started, step, ok, detail}`. Write it at the start (step `start`), then `update` it after each step with the step name and a one-line detail. If a step fails, record the exact error in `detail`, set `ok` to false, and continue with whatever later steps still make sense. Never stop silently. If logging itself fails, carry on and say so in the summary.

## Step 1: the repo

The repo is attached to the task and cloned at the start of the run. Work on `main`: `git checkout main && git pull origin main`. Read the eight data files as the baseline and change only what is new.

## Step 2: research

Use WebSearch (several distinct queries, e.g. "MLB lockout", "MLB CBA negotiations", "MLBPA Bruce Meyer", "Manfred salary cap", "MLB bargaining session", "MLB lockout news today") and WebFetch on the most relevant articles from the last few days. Prefer AP, ESPN, The Athletic, CBS Sports, MLB.com, Sportico, Forbes, Yahoo Sports, USA Today, Boston Globe. Look for new proposals or counters, bargaining sessions, statements, whether the CBA expired, whether a lockout or strike began, a federal mediator, deal reports, ratification, and spring training or games canceled.

Only record facts found in sources fetched this run. Never invent dates, numbers or events. If nothing new happened, only update the date-driven fields.

## Step 3: update the JSON files

Each file is a JSON array of row objects. Keep the exact field names and a 2-space indent.

- `status.json` (one row): `as_of` (today, YYYY-MM-DD), `phase` ("Negotiating", "Lockout", "Deal reached", "Deal ratified", "Strike"), `phase_detail` (one line), `headline` (one-sentence takeaway), `watch_level` (integer 1-5: 1 deal done; 2 talks progressing toward a deal; 3 serious risk of a stoppage; 4 stoppage very likely or underway with the season not yet threatened; 5 spring training or regular season games lost or officially threatened), `watch_label` (a few words matching the level), `days_until_expiry` (whole days from today to 2026-12-01; 0 on or after Dec 1), `lockout_day` (null before a lockout starts; once it starts, the day count with the first lockout day as 1; null again once it ends), `cba_expires` ("2026-12-01"), `latest_date` and `latest` (the most recent meaningful development, two sentences max), `next_milestone` and `next_milestone_date` (the next upcoming key date).
- `key_dates.json` rows `{date, end, event, note, kind, state}`: state "done" for dates already past, "next" for the single next upcoming one, "upcoming" for the rest. Add or adjust dates only when reporting confirms them.
- `timeline.json` rows `{date, side ("MLB"|"MLBPA"|"Both"|"Other"), title, detail, source, url}`: add new dated events, keep existing rows. `url` must be the https link of the article used.
- `issues.json` rows `{issue, mlb, mlbpa, gap ("Wide"|"Moderate"|"Some overlap"|"Open"|"Agreed")}`: update positions only when a new proposal or report changes them.
- `money.json` rows `{metric ("payroll" or "minimum", values in $ millions), label, side ("MLB"|"MLBPA"|"Current"), value}`: replace old proposal values when either side changes its numbers; no duplicates.
- `news.json` rows `{date, outlet, headline, summary, url}`: keep the 6 to 8 most recent relevant articles, newest first.
- `stoppages.json`: only if a stoppage has ENDED, add `{label: "2026-27", type: "Lockout", start: "2026-12-02", end: "<last day>"}`.

Validate every file with `python3 -m json.tool` and check that none contains an em dash character.

## Step 3b: revise the outlook (`data/outlook.json`)

This powers the site's Outlook section: three end scenarios, where the sides already agree, and possible middle ground. It is a single JSON object, not an array. Review it on every run against the latest reporting and the updated data files, and revise it when the news warrants. It is editorial analysis, so reason carefully and stay even-handed between owners and players.

Fields:
- `as_of`: today (YYYY-MM-DD), every run.
- `updated_reason`: one or two sentences on what changed in the read this run and why. If nothing changed, say the read holds and why (for example, no sessions held).
- `summary`: two or three sentences on where the impasse stands and what kind of structure a deal likely needs.
- `common_ground`: short strings for items both sides have proposed or reported progress on. Add or remove only on reported facts.
- `middle_ground`: four to six objects `{title, how, owners_get, players_get, precedent}`. Each is a possible compromise built from the sides' reported positions plus a real precedent (other leagues' systems or past MLB deals). Revise when proposals change: drop ideas the sides have rejected outright or overtaken, and add ideas that bridge the newest gap. Never present an idea as an offer on the table unless reporting says it is.
- `scenarios`: exactly three objects `{id ("A","B","C"), name, odds, end_window, end_date (YYYY-MM-DD, the midpoint guess the site plots), season_impact, how_it_ends, signals (two to four short strings)}`. Keep A the quickest outcome and C the longest. `odds` are whole numbers that must sum to 100.
- `method`: leave as is unless the approach changes.

How to move the odds:
- Shift odds only for concrete developments (sessions held or canceled, new proposals or counters, public softening or hardening, a lockout starting, spring training or games canceled, legal moves such as a disclaimer of interest, owner or player splits), usually 5 to 15 points per run, and explain the shift in `updated_reason`.
- When a scenario's window has clearly passed without a deal, set its odds to 0 or redefine it with a later, realistic window, and re-split the odds.
- Once a lockout starts, keep the end windows and end dates consistent with the lockout clock. After a deal is reached, set the matching scenario to 100, the others to 0, and rewrite `summary` as how it actually ended.
- Use past stoppages as anchors: the 2021-22 lockout lasted 99 days and ended March 10 with a full season; the 1994-95 strike lasted 232 days; the NHL lost all of 2004-05 before accepting a cap; the NHL's 2012-13 lockout lasted 119 days; the 2011 NBA lockout lasted 161 days and kept a soft cap with a tougher tax.

## Writing rules (strict)

- Never use em dashes anywhere. Use commas, periods, colons or hyphens.
- Write every headline, summary, title and detail in your own words. No copied sentences. A direct quote, if any, must be under 15 words and at most one per source.
- Neutral and factual.

## Step 4: publish directly to main

The live site serves from `main`, so push there, not to a `claude/` branch.

- Commit even if nothing changed beyond `as_of`, so readers can see the site is current.
- `git add data/ && git commit -m "Refresh YYYY-MM-DD HH:MM ET: <one-line summary>"`, ending the message with the line `Co-Authored-By: Claude <noreply@anthropic.com>`.
- `git pull --rebase origin main`, then `git push origin main`. Log the commit hash or the exact push error.

## Step 5: mirror to the private dashboard (best effort)

Same artifact as the run log. Mirror only the seven array files, never `outlook.json` (the dashboard has no outlook dataset). ArtifactData `list` on collection `datasets` for versions and current `source.url` values. For each changed file: upload it with Artifact action `publish`, that url, `asset: true`, `file_path` = the file (one per call), getting `/_blob/<newid>`. Then one ArtifactData `batch` of `update` writes: collection `datasets`, doc_id = file name without `.json`, `if_version` = its version, data = `{source: {kind: "file", url: "/_blob/<newid>", name: "<id>.json"}, updated: {at: <ISO now>, by: "Claude refresh"}}`. Then delete each replaced old blob with Artifact action `delete`, `path` = the old 32-hex id. Never change `files/index.html` or `dash/meta`.

## Step 6: summary

Final run log update with step "done". End with 2 to 4 lines: what changed (or "no new developments"), the phase and watch level, the commit pushed, and anything that failed.
