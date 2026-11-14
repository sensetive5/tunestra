---
"tunestra": minor
---

Add a personal level. A developer can tune the setup for themselves with `tunestra.local.yaml`
and `.tunestra.local/`, which are never committed; `tunestra init --local` creates both. The committed files stay the same for the
whole team; Claude Code gets `CLAUDE.local.md` and personal settings in
`.claude/settings.local.json`, and Codex gets `AGENTS.override.md`.
