# HoYo Dashboard

A live resource-tracking dashboard for Genshin Impact, Honkai: Star Rail, and
Zenless Zone Zero, built on the (undocumented) HoYoLAB Battle Chronicle API.
Server-side Next.js route handlers sign and fire the HoYoLAB requests, then
normalize the results into the cards defined in [`requirement.md`](./requirement.md).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `HOYOLAB_LTUID` / `HOYOLAB_LTOKEN` — your HoYoLAB session cookie (`ltuid_v2`
     / `ltoken_v2`). Log into hoyolab.com in a browser, open devtools →
     Application → Cookies, and copy the values. These are long-lived — treat
     them like a password, never commit `.env.local`.
   - Each game's role UID and server region.
3. `npm run dev` and open http://localhost:3000.

The dashboard polls `GET /api/dashboard` every 60s (SWR) and also has a manual
Refresh button. That route re-signs and re-fires every underlying HoYoLAB call
on each request — nothing is cached, so what you see is live.

## How the requirements map to data

| Card | Source endpoint | Field(s) |
|---|---|---|
| Genshin commissions / resin / expeditions / jar of riches / enemies of note / transformer | `genshin/api/dailyNote` | `finished_task_num`, `current_resin`, `expeditions`, `current_home_coin`, `remain_resin_discount_num`, `transformer` |
| Spiral Abyss | `genshin/api/spiralAbyss` | `total_star` (out of a fixed 36) |
| Imaginarium Theater | `genshin/api/role_combat` | `stat.medal_num` (out of a fixed 12) |
| Stygian Onslaught | `genshin/api/hard_challenge` | `single.best.{difficulty,second}` |
| Disturbance outbreak (Dire Prestige) | `genshin/api/act_calendar` | the Stygian Onslaught event's `hard_challenge_detail.sub.{x,y,seconds}` — undocumented, found by inspecting the live response |
| HSR daily training / trailblaze power / echo of war / Simulated Universe | `hkrpg/api/note` | `current_train_score`, `current_stamina`, `weekly_cocoon_cnt`, `current_rogue_score` |
| Forgotten Hall / Pure Fiction / Apocalyptic Shadow | `hkrpg/api/challenge`, `challenge_story`, `challenge_boss` | `star_num` |
| Anomaly Arbitration (Knight stage / King in Check) | `hkrpg/api/challenge_peak` | `mob_stars` (/9), `boss_stars` (/3, plus a real `challenge_peak_rank_icon` image) |
| ZZZ battery / engagement / bounty commission / weekly point | `zzz/note` | `energy`, `vitality`, `bounty_commission`, `weekly_task` |
| Shiyu Defense | `zzz/hadal_info_v2` | `brief.{score,rating,max_score}` |
| Deadly Assault | `zzz/hadal_mem_detail_v2` | `total_star` (/9), `total_score` |
| Player name / level / server (all three headers) | `game_record/card/wapi/getGameRecordCard` | one call returns every linked game's card |

## Notes / deliberate deviations from the literal spec

- **Jar of riches progress bar** is `current / max_home_coin` (the real cap
  HoYoLAB returns, e.g. 2400 at high Adventure Rank) rather than the spec's
  literal "0-1200" — the example values in the requirement (up to 2400) only
  make sense against the real cap, so 1200 looks like a typo.
- **Icons**: HoYoLAB's note/challenge endpoints don't return an image URL for
  most of the fixed UI counters (resin, commissions, transformer, the "star"
  motif shared by every ranked mode, rank letters, etc.) — those are internal
  sprite-atlas names, not fetchable URLs. Those cards use a small hand-built
  SVG icon set (`src/components/icons/Glyphs.tsx`) instead, kept visually
  consistent across the whole dashboard. Everywhere the API *does* return a
  real image — expedition character portraits, the Stygian Onslaught
  "Disturbance outbreak" reward icon, the Anomaly Arbitration King-in-Check
  rank medal — that real image is used directly.
- A couple of the color rules as literally written are unusual (Anomaly
  Arbitration's King in Check is specified as "green only when *exactly*
  1/3", and the Knight stage rule references a `/12` denominator against a
  `/9` value). Both are implemented exactly as specified in `requirement.md`;
  the logic lives in one small, clearly-named branch per card in
  `src/lib/dashboard.ts` if you want to change either.
- Countdowns are shown even on a couple of rows marked `-` for "show time
  remaining" in the spec (resin/jar of riches/battery, once not full) — pure
  addition, doesn't change anything the spec asked for.

## Project layout

- `src/lib/hoyolab/` — DS-header signing, the fetch client, and one typed
  fetcher module per game (+ `card.ts` for the cross-game profile card).
- `src/lib/dashboard.ts` — fetches everything, applies the color/status rules
  from `requirement.md`, and normalizes it into the `Metric` shape in
  `src/lib/metrics.ts`.
- `src/app/api/dashboard/route.ts` — the one route the frontend calls.
- `src/components/` — `Dashboard` (SWR polling shell) → `GameSection` →
  `MetricCard` (one component, one branch per card variant).
