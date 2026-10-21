# Fixture: basic

Three levels: `base` → `team` → `project`.

- `input/` — sources. Run `tunestra setup` in `input/project`.
- `expected/` — every file `tunestra setup` must generate in the project, byte for byte.
  `_gitignore` stands for `.gitignore` (a real `.gitignore` here would hide the fixture from git).
- `symlinks.json` — symlinks that must be created, with their targets.
- `.tunestra/state/` is not compared.

What this fixture covers:

- a rule overridden by key (`code-style`: team replaces base);
- level instructions (`AGENTS.md`) kept on every level;
- a skill excluded by a more specific level (`code-review`);
- an MCP server patched by a more specific level (`tracker`: `QUEUE` from team);
- ordering from specific to general.
