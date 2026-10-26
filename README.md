# tunestra

> Tune your AI agents to play as one orchestra.

> [!WARNING]
> **Early development.** This README is the specification of the first release (v0.1).
> It describes the target behavior; not everything is implemented yet.

tunestra gives Claude Code, Codex and other AI coding agents **one shared source** of rules,
skills, commands and MCP servers, and generates each agent's native configuration from it.

The source is a chain of **presets**, from general to specific:

```
base      — your organization: security, general principles, shared tools
  ↓ extends
team      — your team: conventions, stack, team skills
  ↓ extends
project   — this repository: architecture, domain model, project skills
```

More specific levels **override** general ones by artifact key or **exclude** them.
Agents receive the result from specific to general: when two instructions conflict, the more
specific one wins.

## Quick start

```sh
npx tunestra init     # creates tunestra.yaml and .tunestra/
npx tunestra setup    # generates AGENTS.md, CLAUDE.md, .claude/, .agents/, .mcp.json
```

`tunestra.yaml`:

```yaml
extends:
  - github:<organisation_name>/<presets_repo>/team#v1
agents: [claude]
```

Commit `tunestra.yaml`, `.tunestra/`, `AGENTS.md` and `CLAUDE.md`. Everything else that
tunestra generates is listed in `.gitignore` automatically.

> [!NOTE]
> `init` and git sources are not ready yet. Until then, create `tunestra.yaml` by hand and
> point `extends` to presets with a relative path, for example `../presets/team`.

## Principles

1. **Sources are the only truth.** Presets and `.tunestra/` are edited by people.
   Everything tunestra writes for agents is generated.
2. **Generated files are never edited by hand.** Every `tunestra setup` rebuilds them from
   scratch. A manual edit is overwritten with a warning that tells you which source to change.
3. **Open standards first.** Rules follow [`AGENTS.md`](https://agents.md), skills follow
   [Agent Skills](https://agentskills.io) (`SKILL.md`), MCP servers use the `.mcp.json` shape.

## Presets

A preset is a directory with a fixed layout. Artifacts are collected from the folders;
the manifest only holds metadata and overrides.

```
<preset>/
  tunestra.preset.yaml      # manifest
  AGENTS.md                 # optional: main instructions of this level
  rules/<key>.md            # rules, one topic per file
  skills/<key>/SKILL.md     # skills (Agent Skills format)
  commands/<key>.md         # slash commands
  mcp/<key>.yaml            # MCP servers
```

### Manifest: `tunestra.preset.yaml`

```yaml
name: team                  # required, unique in the chain
level: team                 # required: base | domain | team
description: Frontend team conventions
extends:                    # optional, from general to specific
  - ../base
exclude:                    # optional: drop inherited artifacts by key
  skills: [code-review]
overrides:                  # optional: patch inherited MCP servers
  mcp:
    tracker:
      env:
        QUEUE: TEAM
```

### Project: `tunestra.yaml`

The project is the most specific level. Its artifacts live in `.tunestra/` with the same layout
as a preset.

```yaml
name: my-service            # optional, defaults to the directory name
extends:
  - ../presets/team
agents: [claude]            # v0.1 supports claude
exclude: {}
overrides: {}
```

### Sources

| Reference | Example |
|---|---|
| Relative path | `../presets/team` (relative to the file that references it) |
| GitHub | `github:<owner>/<repo>/<path>#<ref>` |
| GitLab | `gitlab:<owner>/<repo>/<path>#<ref>` |

Git sources are coming in the next update of v0.1; for now, use relative paths. Pin git
sources to a tag or commit. Lockfiles and npm sources are planned for v0.3.

## Inheritance

The chain is linearized from general to specific: every preset comes after the presets it
extends. Each level is applied on top of the accumulated result.

A level can extend a more general level or a level of the same kind: a `team` preset can
build on another `team` preset. When two presets extend the same preset, it joins the
chain once, before both of them.

### Artifact keys

| Artifact | Key | Same key on a more specific level | Remove |
|---|---|---|---|
| Rule | file name without `.md` | replaces it | `exclude.rules` |
| Level instructions (`AGENTS.md`) | `instructions@<preset name>` | never collides: every level keeps its own | `exclude.rules` |
| Skill | `name` from `SKILL.md`, otherwise the folder name | replaces it | `exclude.skills` |
| Command | file name without `.md` | replaces it | `exclude.commands` |
| MCP server | file name without `.yaml` | replaces it | `exclude.mcp` |

`overrides.mcp.<key>` patches an inherited server instead of replacing it: `env` and `headers`
are merged by key (the specific value wins); `command`, `args` and `url` are replaced.

### Validation

`tunestra setup` stops with an error when:

- a preset extends a more specific level (for example, `base` extends `team`);
- `extends` contains a cycle;
- two levels have the same name;
- a manifest has an unknown field or a missing required field;
- `exclude` or `overrides` refers to a key that is not inherited;
- after a patch, an MCP server has both `command` and `url`, or neither.

All problems are reported at once, in the order of the files, so you can fix them in one pass.

## What gets generated (Claude Code)

| Path | Content | Committed |
|---|---|---|
| `AGENTS.md` | Index: hierarchy, rules, skills, commands, MCP servers | yes |
| `CLAUDE.md` | `@AGENTS.md` | yes |
| `.agents/rules/<NN>-<level>-<key>.md` | Rule texts, ordered from specific to general | no |
| `.agents/skills/<key>/` | Skills | no |
| `.claude/rules/tunestra/<NN>-<level>-<key>.md` | Copies of the rules; Claude Code loads them in every session | no |
| `.claude/skills/<key>` | Symlinks to `.agents/skills/<key>` | no |
| `.claude/commands/<key>.md` | Commands | no |
| `.mcp.json` | MCP servers | no |
| `.tunestra/state/` | What tunestra generated last time | no |
| `.gitignore` | A block between `# >>> tunestra` and `# <<< tunestra` | yes |

`<NN>` orders rules from specific to general: `10` project, `20` team, `30` domain, `40` base.
Level instructions get the key `instructions`, and the preset name when it differs from the
level: `20-team-instructions.md`, but `20-team-instructions-frontend.md` for a `team` preset
named `frontend`.

Every generated rule starts with its origin:

```md
<!-- Generated by tunestra from team:rules/code-style.md. Do not edit. -->
> Level: team, preset: team. Overrides: base.
```

Skills and commands are copied as is: their frontmatter must stay on the first line.

## Running setup again

tunestra keeps a list of what it wrote in `.tunestra/state/outputs.json` and compares every
run with it:

| Situation | What setup does |
|---|---|
| A generated file is still needed | Writes it again |
| A generated file was edited by hand | Writes it again and warns which source file to edit instead |
| A file is no longer generated (for example, a rule was deleted from a preset) | Removes it and the folders it leaves empty; warns if the file was edited by hand |
| A file is in the way, and tunestra did not create it | Stops and asks you to move it away |
| `.tunestra/state/` was deleted | Accepts its own files by their header or content and goes on |

Generated files are never kept because of manual edits: change the sources instead.

## Commands

| Command | What it does | Status |
|---|---|---|
| `tunestra setup` | Resolves the chain and regenerates every output | ready |
| `tunestra setup --dry-run` | Prints what would be written or removed, and the warnings | ready |
| `tunestra init` | Creates `tunestra.yaml` and `.tunestra/`. Moves an existing hand-written `AGENTS.md` to `.tunestra/AGENTS.md` and `CLAUDE.md` to `.tunestra/rules/claude-md.md` | planned |
| `tunestra setup --verbose` | Also prints where every artifact comes from | planned |
| `tunestra uninstall` | Removes everything tunestra generated | planned |

`tunestra setup` refuses to overwrite an `AGENTS.md` or `CLAUDE.md` that it did not generate
and tells you where to move their text.

## Roadmap

| Release | Scope |
|---|---|
| v0.1 | Inheritance for Claude Code (this document) |
| v0.2 | Codex |
| v0.3 | Spaces, npm sources, lockfile |
| v0.4 | `required` / `locked` policies, CI check |
| v0.5 | Hooks |
| v0.6 | LLM gateway, permissions |
| v0.7 | Local plugins |
| v0.8 | Isolated remote plugins |

## License

[MIT](LICENSE)
