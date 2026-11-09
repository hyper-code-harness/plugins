# Hyper plugins

The listing Hyper shows on `/plugins/listing`. One file per plugin in `plugins/<name>.json`;
`index.json` is generated from them and is what Hyper reads.

Hyper installs a listed plugin with `bun add --ignore-scripts <source>#<commit>` into its plugin
host (`~/.hyper/plugins`), after a preview of files, dependencies and conflicts and an explicit confirm.

## Add or update a plugin

1. Publish the plugin as its own GitHub repository (`package.json` with `procs`, `SKILL.md`, `src/<namespace>/…`)
   and push a tag equal to the version, e.g. `v1.0.0`.
2. Add or edit `plugins/<name>.json`:

   ```json
   { "name": "mermaid", "label": "Mermaid", "icon": "ph-graph", "description": "…",
     "source": "github:hyper-code-harness/mermaid", "version": "1.0.0", "ref": "v1.0.0",
     "commit": "<full sha the tag points at>" }
   ```
3. `bun scripts/build.ts` regenerates `index.json`; `bun scripts/build.ts --check --remote` is what CI runs:
   the tag must still point at the pinned commit, and the package name and version must match.
4. Open a pull request.
