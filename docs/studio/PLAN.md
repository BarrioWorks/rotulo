# Studio redesign: plan

The brief is `brief.md`. This round replaces the "Proof" round in `../design/`, which is kept as history.

## Definition of done

Each line is checked on the running app, not on a mockup.

1. The editor has no permanent sidebar at any width. Measured: the visible canvas covers at least 85% of a 1280x800 viewport (baseline in `baseline/`).
2. Pages, website settings, images and version history each open from a visible control in the floating chrome, and from the command palette if one ships.
3. The eight tasks in brief section 15 complete end to end in the browser. Each has a recorded action count against the baseline.
4. `scripts/check.sh` exits 0, `scripts/smoke.sh` passes on the three fixtures, and `frontend/protocol.ts` and `frontend/editor/canvas-policy.ts` keep their checks (any change is reviewed separately).
5. Every text and control colour on a floating surface meets WCAG AA when that surface sits over white, black and a saturated photo, checked by script. Opaque fallbacks exist for `prefers-reduced-transparency`, `prefers-contrast: more` and `forced-colors`.
6. Editor load, selection latency, layout shift and memory are measured before and after.
7. Desktop (1280), tablet (1024 landscape, 834 portrait) and phone (390) screenshots of every screen.

## Rigor

High. The work is reversible in git and needs no backend change, but it rewrites the whole editor shell, where every owner action lives. The preview isolation and the message protocol are a security boundary and stay untouched.

## Phases

| Phase | Work | Owner |
|---|---|---|
| A | Baseline screenshots, task walkthroughs, measurements, feature inventory | Agent D |
| B | HCI research, Apple platform research, visual identity and type evaluation, editor interaction model | Agents A, B, C, D in parallel |
| C | Three browser-rendered directions, critique, selection | Three prototype agents, Agent E, lead |
| D | Foundation: tokens, materials, type, icons, motion | One agent |
| E | Editor overhaul, split into shell (floating chrome, surfaces) and canvas tools (selection, contextual dock) | Two agents, separate files |
| F | Dashboard, import, auth, errors, landing | One agent, in parallel with E |
| G | Independent critique, five worst problems fixed | Agent E plus a fix agent |
| H | Browser end to end, final screenshots, measurements | One agent |

Concurrency stays at five agents. Each implementing agent works in its own git worktree and owns its own files.

## Progress

- A to B done: baseline, research, identity, editor model (`baseline/`, `research/`, `identity/`, `editor/`).
- D done: Studio foundation merged (Onest, ultramarine, materials, motion, icon sizes, glass contrast gate).
- C done: three prototypes, two critiques on different models, pick A with grafts (`direction/README.md`).
- E and F merged: editor shell and caption, agent and canvas fixes (text sessions from the canvas now also need a real click), other screens. `check.sh` exit 0.
- G and H running: one evaluator walks the eight tasks, measures, audits accessibility and ranks the five worst problems (`evaluation/`).
