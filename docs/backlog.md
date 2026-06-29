# Backlog / Open Points

Grounded against the current code + schema. Each item lists what it takes, the
decision still needed, and rough size. Suggested order: **#3 → #4 → #6 → #5**
(cheapest/most-isolated first; #5 is a whole subsystem).

## Current model (reference)
- `history` table is flat: `{type, exercise, setNumber, weight, reps, timestamp}`,
  append-only, PK `(exercise, setNumber, timestamp)`.
- Tables today: `history`, `exercise_names` — **no gyms/rack/days tables yet.**
- Timestamp is set client-side at log time (`+page.svelte`), stored verbatim.
- Plate math (`plates.ts` → `buildPlateBreakdown`) assumes a barbell:
  `perSide = (total − bar) / 2`. No per-exercise loading mode.
- Exercises are plain strings; no variation/modifier concept.
- Schema migrations are additive + lightweight (see the `type` column added via
  `ALTER TABLE … ADD COLUMN` with a default).

---

## #3 — Equipment / load type per exercise  ·  size: S  ·  no schema change
Generalize the one-sided lever row into a single `equipment` field on the
exercise. One value drives both the plate-breakdown rendering and what the
entered `weight` means. Additive property on `SessionExercise` (template-level,
not logged per set), default `barbell` so nothing else changes.

`buildPlateBreakdown(weight, { equipment })`: `barbell` ÷2, `one-sided` ÷1,
everything else → "no breakdown".

### Equipment types
| Equipment | `weight` means | Plate breakdown |
|---|---|---|
| `barbell` | total bar load | yes — `(total − bar) / 2` per side (current) |
| `one-sided` (landmine / T-bar / lever) | load on the one end | yes — `÷1`, not `÷2` |
| `dumbbell` | per hand | no |
| `machine` (stack / cable) | stack setting | no |
| `bodyweight` | none / 0 | no |
| `weighted` (vest / dip belt / weighted chin-up) | **added** load on top of bodyweight | no (could add later) |

### Exercise → equipment
| Exercise | Equipment |
|---|---|
| Deadlifts | `barbell` |
| Squats | `barbell` |
| Shoulder Press | `barbell` |
| Bench Press | `barbell` |
| Bent Over Rows | `barbell` |
| Chin Up | `weighted` |
| Lateral Raises | `dumbbell` |
| Y-Raises | `dumbbell` |
| Face Pulls | `machine` (cable) |
| Ab Rollout | `bodyweight` |
| Weighted Knee Raises | `weighted` |
| Lever Row *(new?)* | `one-sided` |

**Decision needed:**
- Lever Row: new exercise, or rename/replace "Bent Over Rows"?
- Confirm logged weight for `one-sided` = load on the single end.
- `weighted` plate breakdown: plain number for now, or show loaded discs later?

---

## #4 — Exercise variations & modifiers  ·  size: M  ·  additive migration
- **Modifiers** (ROM, ATG, Stopped/Paused): add a nullable `modifier` field on
  `SetEntry` + `history`, plus a per-set picker. Field (not separate exercises)
  is preferred for analytics.
- **Variations** (Chest-Supported Lever Row, Seal Row, …): TBD.

**Decision needed:**
- Variations: same treatment as modifiers (a `variation` field), or just model
  them as distinct exercises?

---

## #5 — Rack settings by gym & day  ·  size: L  ·  new subsystem
Auto-show the day's exercises and show J-Hook / Safety height per exercise per gym.

- Greenfield — needs new tables: `gyms`, `rack_settings`, `training_days`,
  `training_day_exercises`, plus store methods, API, and UI.
- Design the schema first for sign-off before building.

**Decision needed:**
- Schema design review before implementation.

---

## #6 — After-midnight carry-over  ·  size: S–M  ·  cross-app
Late entries logged after midnight should attribute to the previous day.

- Remap such entries to `23:59:59` of the previous day + a `carry_over: true` flag.
- Also affects **mobility-logger** and **action-logger** (separate repos) —
  do gym-logger first, then port the shared rule.

**Decision needed:**
- The cutoff rule. "After midnight" needs a boundary (e.g. anything logged before
  ~04:00 counts as the prior day). What's the cutoff?
