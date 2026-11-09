# Hyper plugins

The listing Hyper shows on `/plugins/listing`. One file per plugin in `plugins/<name>.json`;
`index.json` is generated from them and is what Hyper reads.

The listing says **which** plugins exist, not which version. A release is a semver tag `vX.Y.Z` in the
plugin's own repository; Hyper offers the newest tag, installs it with `bun add --ignore-scripts
github:<owner>/<repo>#vX.Y.Z` into its plugin host (`~/.hyper/plugins`) after a preview and an explicit
confirm, and bun pins the exact commit and integrity in the host's `bun.lock`. Releasing a plugin never
touches this repository.

## Add a plugin

1. Publish the plugin as its own GitHub repository: `package.json` with `name`, `version` and a `procs`
   block (plugins it needs go to `procs.requires`), `SKILL.md`, `src/<namespace>/…`.
2. Tag a release equal to the version: `git tag v1.0.0 && git push --tags`.
3. Add `plugins/<name>.json`:

   ```json
   { "name": "mermaid", "label": "Mermaid", "icon": "ph-graph", "description": "…",
     "source": "github:hyper-code-harness/mermaid" }
   ```
4. `bun scripts/build.ts` regenerates `index.json`; `bun scripts/build.ts --check --remote` is what CI runs
   (on every push and daily): the repo must have a `vX.Y.Z` tag whose `package.json` has `procs`, the listed
   name and the tag's version.
5. Open a pull request.

## Release a new version

Bump `version` in the plugin's `package.json`, commit, tag `vX.Y.Z`, push. Nothing to change here.
