// Validates plugins/*.json and writes index.json. `--check` fails if index.json is stale;
// `--remote` also checks that each ref still points at the pinned commit and the package name matches.
import { readdir, readFile, writeFile } from 'node:fs/promises';
const NAME = /^[a-z][a-z0-9-]{0,63}$/, SOURCE = /^github:[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/, COMMIT = /^[0-9a-f]{40}$/;
const KEYS = ['name', 'label', 'icon', 'description', 'source', 'version', 'ref', 'commit'];
const errors: string[] = [], plugins: any[] = [];
for (const file of (await readdir('plugins')).filter(f => f.endsWith('.json')).sort()) {
    const p = JSON.parse(await readFile('plugins/' + file, 'utf8'));
    const bad = (m: string) => errors.push(`${file}: ${m}`);
    for (const k of Object.keys(p)) if (!KEYS.includes(k)) bad('unknown field ' + k);
    if (!NAME.test(p.name) || file !== p.name + '.json') bad('name must be lowercase and match the file name');
    if (!SOURCE.test(p.source)) bad('source must be github:<owner>/<repo>');
    if (!COMMIT.test(p.commit)) bad('commit must be a full 40-hex sha');
    for (const k of ['label', 'description', 'version', 'ref']) if (typeof p[k] !== 'string' || !p[k]) bad(k + ' required');
    if (p.icon !== undefined && !/^ph-[a-z0-9-]+$/.test(p.icon)) bad('icon must be a ph-* name');
    if (process.argv.includes('--remote')) {
        const repo = 'https://github.com/' + p.source.slice(7) + '.git';
        const out = Bun.spawnSync(['git', 'ls-remote', repo, 'refs/tags/' + p.ref + '^{}', 'refs/tags/' + p.ref, 'refs/heads/' + p.ref]).stdout.toString();
        const shas = out.split('\n').filter(Boolean).map(l => l.split('\t')[0]);
        if (!shas.includes(p.commit)) bad(`ref ${p.ref} does not point at ${p.commit}`);
        const raw = await fetch(`https://raw.githubusercontent.com/${p.source.slice(7)}/${p.commit}/package.json`);
        const pkg = raw.ok ? await raw.json() : null;
        if (!pkg?.procs) bad('package.json with procs not found at commit');
        else if (pkg.name !== p.name) bad(`package name ${pkg.name} ≠ ${p.name}`);
        else if (pkg.version !== p.version) bad(`package version ${pkg.version} ≠ ${p.version}`);
    }
    plugins.push(Object.fromEntries(KEYS.filter(k => p[k] !== undefined).map(k => [k, p[k]])));
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const text = JSON.stringify({ format: 1, plugins }, null, 2) + '\n';
if (process.argv.includes('--check')) {
    const current = await readFile('index.json', 'utf8').catch(() => '');
    if (current !== text) { console.error('index.json is stale: run bun scripts/build.ts'); process.exit(1); }
    console.log(`ok: ${plugins.length} plugins`);
} else { await writeFile('index.json', text); console.log(`index.json: ${plugins.length} plugins`); }
