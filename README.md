# tunestra

[![CI](https://github.com/sensetive5/tunestra/actions/workflows/ci.yml/badge.svg)](https://github.com/sensetive5/tunestra/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/sensetive5/tunestra/graph/badge.svg)](https://codecov.io/gh/sensetive5/tunestra)
[![npm](https://img.shields.io/npm/v/tunestra)](https://www.npmjs.com/package/tunestra)
[![Node](https://img.shields.io/node/v/tunestra)](package.json)
[![License: MIT](https://img.shields.io/github/license/sensetive5/tunestra)](LICENSE)

> Tune your AI agents to play as one orchestra.

> [!WARNING]
> **Early version.** tunestra supports Claude Code and Codex. The formats may still change
> before v1.0.

tunestra gives Claude Code, Codex and other AI coding agents **one shared source** of rules,
skills, commands, MCP servers and environment variables, and generates each agent's native
configuration from it.

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
npx tunestra init --extends github:<organisation_name>/<presets_repo>/team#v1
npx tunestra setup    # generates AGENTS.md and the configuration of every agent
```

`init` creates `tunestra.yaml`:

```yaml
extends:
  - github:<organisation_name>/<presets_repo>/team#v1
agents: [claude]            # add codex: [claude, codex]
```

Commit `tunestra.yaml`, `.tunestra/`, `AGENTS.md`, `CLAUDE.md` and, when presets set `env`,
`.claude/settings.json`. Everything else that tunestra generates is listed in `.gitignore`
automatically.

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
env:                        # optional: environment variables of the agents
  MCP_TIMEOUT: 120000
```

### Project: `tunestra.yaml`

The project is the most specific level. Its artifacts live in `.tunestra/` with the same layout
as a preset.

```yaml
name: my-service            # optional, defaults to the directory name
extends:
  - ../presets/team
agents: [claude, codex]     # claude, codex; defaults to [claude]
exclude: {}
overrides: {}
```

### Sources

| Reference | Example |
|---|---|
| Relative path | `../presets/team` (relative to the file that references it) |
| GitHub | `github:<owner>/<repo>/<path>#<ref>` |
| GitLab | `gitlab:<owner>/<repo>/<path>#<ref>` |

Pin git sources to a tag or commit. tunestra downloads the whole repository at that ref
into `.tunestra/state/sources/` on every setup, so a preset can extend other presets of its
repository with a relative path, like `../base`. A relative path cannot leave the repository.
Git is not needed: repositories are downloaded as archives over HTTPS.

For a private repository, set the `TUNESTRA_GIT_TOKEN` environment variable to a token with
read access. Lockfiles and npm sources are planned for v0.4.

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
| Environment variable | name in `env` | replaces it | `exclude.env` |

`overrides.mcp.<key>` patches an inherited server instead of replacing it: `env` and `headers`
are merged by key (the specific value wins); `command`, `args` and `url` are replaced.

### Validation

`tunestra setup` stops with an error when:

- a preset extends a more specific level (for example, `base` extends `team`);
- `extends` contains a cycle;
- two levels have the same name;
- a manifest has an unknown field or a missing required field;
- `exclude` or `overrides` refers to a key that is not inherited;
- after a patch, an MCP server has both `command` and `url`, or neither;
- an `env` value refers to another variable, like `${TOKEN}`: agents do not expand it in
  their settings, so write the value itself and keep secrets out of presets;
- `env` sets a variable that Claude Code ignores in project settings (see below).

All problems are reported at once, in the order of the files, so you can fix them in one pass.

## What gets generated

For every agent:

| Path | Content | Committed |
|---|---|---|
| `AGENTS.md` | Index: hierarchy, rules, skills, commands, MCP servers | yes |
| `.agents/rules/<NN>-<level>-<key>.md` | Rule texts, ordered from specific to general | no |
| `.agents/skills/<key>/` | Skills | no |
| `.tunestra/state/` | What tunestra generated last time | no |
| `.gitignore` | A block between `# >>> tunestra` and `# <<< tunestra` | yes |

### Claude Code

| Path | Content | Committed |
|---|---|---|
| `CLAUDE.md` | `@AGENTS.md` | yes |
| `.claude/rules/tunestra/<NN>-<level>-<key>.md` | Copies of the rules; Claude Code loads them in every session | no |
| `.claude/skills/<key>` | Symlinks to `.agents/skills/<key>` | no |
| `.claude/commands/<key>.md` | Commands | no |
| `.mcp.json` | MCP servers | no |
| `.claude/settings.json` | `env`, when presets set it | yes |

`.claude/settings.json` is shared by the team, so tunestra writes it and you commit it. Keep
your personal settings in `.claude/settings.local.json` or `~/.claude/settings.json`. A
`.claude/settings.json` with other keys, like `hooks` or `model`, stops setup and asks you to
move them; a file with only `$schema` and `env` is replaced with a warning, for example in a
fresh clone where `.tunestra/state/` does not exist yet.

Claude Code applies project `env` after you trust the folder. It ignores some variables in
project settings: the ones that turn telemetry on or choose where it goes
(`CLAUDE_CODE_ENABLE_TELEMETRY`, `OTEL_*_EXPORTER`, `OTEL_EXPORTER_OTLP_*` and others), and
the ones that choose its own directories (`HOME`, `XDG_*`, `CLAUDE_CONFIG_DIR`). setup stops
on them, because they would not work; set them in managed settings, `~/.claude/settings.json`
or your shell. Values that turn telemetry off, like `OTEL_LOGS_EXPORTER: none`, are allowed.

### Codex

Codex reads `AGENTS.md` and `.agents/skills/` by itself. It does not follow the links in
`AGENTS.md`, so tunestra gives it the rule texts in its config.

| Path | Content | Committed |
|---|---|---|
| `.codex/config.toml` | `developer_instructions` with every rule, from specific to general, `[shell_environment_policy] set` with `env`, and `[mcp_servers]` | no |
| `.agents/skills/<command>/` | Each command as a skill that runs only when you call it: `$release-notes` | no |

Codex reads `.codex/config.toml` only in a trusted project: trust the project when Codex asks.
Codex gets `env` as the environment of the commands it runs; it does not change how Codex
itself works, and Codex ignores telemetry settings in a project.
Codex has no `type` for MCP servers and does not support SSE: an SSE server is skipped with a
note, and `headers` become `http_headers`. tunestra owns the whole `.codex/config.toml`; keep
your personal Codex settings in `~/.codex/config.toml`.

`<NN>` orders rules from specific to general: `10` project, `20` team, `30` domain, `40` base.
Level instructions get the key `instructions`, and the preset name when it differs from the
level: `20-team-instructions.md`, but `20-team-instructions-frontend.md` for a `team` preset
named `frontend`.

Every generated rule starts with its origin:

```md
<!-- Generated by tunestra from team:rules/code-style.md. Do not edit. -->
> Level: team, preset: team. Overrides: base.
```

Skills and commands are copied as is: their frontmatter must stay on the first line. For
Codex, a command gets only `name` and `description` in its frontmatter; other fields, like
`argument-hint`, are for Claude Code.

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

| Command | What it does |
|---|---|
| `tunestra init` | Creates `tunestra.yaml`; `--extends <presets...>` fills `extends`. Moves a hand-written `AGENTS.md` to `.tunestra/AGENTS.md` and a `CLAUDE.md` with its own text to `.tunestra/rules/claude-md.md`; a `CLAUDE.md` that only imports `AGENTS.md` is removed |
| `tunestra setup` | Resolves the chain and regenerates every output |
| `tunestra setup --dry-run` | Prints what would be written or removed, and the warnings |
| `tunestra setup --verbose` | Also prints where every artifact comes from and what it overrides |
| `tunestra uninstall` | Removes everything tunestra generated and its block in `.gitignore`; `tunestra.yaml` and `.tunestra/` stay. `--dry-run` shows the list first |

`tunestra setup` refuses to overwrite an `AGENTS.md` or `CLAUDE.md` that it did not generate
and tells you where to move their text.

## Roadmap

| Release | Scope |
|---|---|
| v0.1 | Inheritance for Claude Code |
| v0.2 | Codex (this document) |
| v0.3 | `env`, then permissions, subagents and a personal `local` level |
| v0.4 | Spaces, npm sources, lockfile |
| v0.5 | `required` / `locked` policies, CI check |
| v0.6 | Hooks |
| v0.7 | LLM gateway |
| v0.8 | Local plugins |
| v0.9 | Isolated remote plugins |

## License

[MIT](LICENSE)
