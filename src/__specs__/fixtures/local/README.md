# Fixture: local

The `codex` fixture with a personal level: `tunestra.local.yaml` and `.tunestra.local/` in the
project, and a personal preset `me` with `level: local`. The project already has a
`.claude/settings.local.json` with a setting and an allow rule of the developer.

What this fixture covers:

- the committed files (AGENTS.md, CLAUDE.md, `.claude/settings.json`) are the same as in the
  `codex` fixture: the personal level does not change them;
- the other files follow the chain with the personal level: rules `00-local-…`, a personal
  skill, a rule that overrides one of team, a skill that is excluded;
- `CLAUDE.local.md` lists what the personal level adds, overrides and turns off;
- `AGENTS.override.md` is the whole index with the personal level, for Codex;
- personal env and permissions are added to `.claude/settings.local.json`, and the settings
  of the developer stay;
- `tunestra.local.yaml` and `.tunestra.local/` are in `.gitignore`.
