# HoYo Dashboard

A live resource-tracking dashboard for Genshin Impact, Honkai: Star Rail,
Zenless Zone Zero, and Wuthering Waves. The HoYoverse games run on the
(undocumented) HoYoLAB Battle Chronicle API; Wuthering Waves runs on Kuro
Games' equally undocumented game-account API. Server-side Next.js route
handlers sign and fire the requests, then normalize the results into the
cards defined in [`requirement.md`](./requirement.md) (Wuthering Waves came
later, by request — see "Wuthering Waves" below for its own notes).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `HOYOLAB_LTUID` / `HOYOLAB_LTOKEN` — your HoYoLAB session cookie (`ltuid_v2`
     / `ltoken_v2`). Log into hoyolab.com in a browser, open devtools →
     Application → Cookies, and copy the values. These are long-lived — treat
     them like a password, never commit `.env.local`.
   - Each HoYoverse game's role UID and server region.
   - `WUWA_EMAIL` / `WUWA_PASSWORD` — your Wuthering Waves account login
     (the game client login, not KuroBBS's website — no Chinese phone number
     needed). Treat like a password.
   - `WUWA_DEVICE_ID` — generate **once** with
     `node -e "console.log(require('crypto').randomUUID().toUpperCase())"`
     and never change it afterward. This is a stand-in for a real device's
     hardware ID; keeping it fixed is what makes repeated logins look like
     the same device reconnecting instead of a new one each time — see
     "Wuthering Waves" below for why that matters.
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

## Wuthering Waves

Added after the original spec, by request — same "find a real data source,
verify it live, then build the cards" approach as everything else here, but
this one has a different shape worth understanding before you touch it.

**Data source.** Kuro Games' KuroBBS platform has a rich widget endpoint
(Waveplates, Tower of Adversity, weekly modes, battle pass, all in one call)
— but it's only reachable via a KuroBBS *website* login, which is
Chinese-phone-number-only. Since this account doesn't have one, the
dashboard instead uses Kuro's **game-client login** (email/password) walked
through a short chain — game login → game token → OAuth code → player info
→ player role — implemented in `src/lib/kurobbs/`. This gets the daily
resources (Waveplates, reserve energy, daily activity, weekly challenges
left) but **not** Tower of Adversity or other endgame-mode clears — those
are still locked behind the phone-gated endpoint.

**Account safety — read this before changing `wuwa.ts`.** The first version
of this logged in from scratch (full password + a brand-new random device
ID) on every single dashboard refresh — roughly 1,440 times a day. That's
the same shape of traffic as credential-stuffing as far as an anti-fraud
system is concerned. The current version:

- Caches the login session and only re-authenticates when it actually
  expires (Kuro's server reports its own token lifetime; observed to be
  ~3 days) — every refresh in between reuses the cached session for one
  cheap read (`getPlayerRole`), the same way the HoYoLAB side reuses its
  long-lived cookie instead of re-logging in.
- Uses one **fixed** `WUWA_DEVICE_ID` (see Setup) instead of a fresh random
  one per request, so the rare real logins all look like the same device
  reconnecting.
- Logs every real login to stdout (`pm2 logs hoyo-dashboard | grep kurobbs`)
  with a running count, specifically so this claim is checkable, not just
  asserted — you should only see one every few days.

If you ever touch the login/session logic in `src/lib/kurobbs/wuwa.ts`,
keep both of those properties. "It fetches the right data" is not enough by
itself — a working version that logs in every poll cycle is a regression
even if the numbers on screen are correct.

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
- `src/lib/kurobbs/` — Wuthering Waves' request signing (`crypto.ts`) and the
  cached login chain + data fetcher (`wuwa.ts`); see "Wuthering Waves" above
  before changing the session-caching logic.
- `src/lib/dashboard.ts` — fetches everything, applies the color/status rules
  from `requirement.md`, and normalizes it into the `Metric` shape in
  `src/lib/metrics.ts`.
- `src/app/api/dashboard/route.ts` — the one route the frontend calls.
- `src/components/` — `Dashboard` (SWR polling shell) → `GameSection` →
  `MetricCard` (one component, one branch per card variant).
