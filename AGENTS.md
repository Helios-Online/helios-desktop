# HeliOS (赫力) Desktop

OpenSpec-driven project for the Helios AI Agent system.

## Project Overview

Helios (赫力): your always-on AI agent for file operations, multi-step tasks, 24/7 automation, and remote control.

## OpenSpec Workflow

This repo uses OpenSpec for change management. All changes go through artifacts before implementation.

| Command | Purpose |
|---------|---------|
| `/opsx-propose <name>` | Create new change with proposal, design, specs, tasks |
| `/opsx-apply <name>` | Implement tasks from a change |
| `/opsx-archive <name>` | Archive completed change |
| `/opsx-explore` | Explore ideas before proposing |

Changes live in `openspec/changes/<name>/`.

## Verification Commands

```bash
openspec status --change "<name>"          # Check artifact status
openspec status --change "<name>" --json  # JSON output with dependencies
openspec instructions <artifact> --change "<name>" --json  # Get artifact template
```

## Artifact Dependencies (spec-driven schema)

1. `proposal.md` - What & why (unlocks: design, specs)
2. `design.md` - Technical architecture (unlocks: tasks)
3. `specs/**/*.md` - Capability specifications (unlocks: tasks)
4. `tasks.md` - Implementation checklist (apply-ready)

Implementation begins when all `applyRequires` artifacts are done.

## Development

- The actual Helios implementation code is not yet present in this repo
- This repo manages changes/specs only at this stage
- Desktop app (Electron-based) is planned per `helios-desktop-hermes-installer` change

## 技术栈
1. 采用跨平台技术栈Tauri2.0