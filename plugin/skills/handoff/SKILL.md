---
name: handoff
description: Rewrite docs/planning/HANDOFF.md so the next session starts with the current state, evidence and the next action.
disable-model-invocation: true
---

# /pilot:handoff

Rewrite `docs/planning/HANDOFF.md`. Keep the three-line header. Keep it under 8,000 characters; the session-start hook loads it every session.

Sections:
1. **Current step:** number and title from ROADMAP.md, and its status.
2. **Last result:** what was done this session, with evidence (the command run and its exit code, or the review file). Say plainly what failed, what was skipped and what is unverified.
3. **Next action:** one concrete thing, for example `/pilot:step 4` or "owner to decide #12".
4. **Open questions** for the owner.
5. **Files touched this session**, from `git status` / `git diff --stat`.

Do not copy content from other docs; point to them by path or ID.
