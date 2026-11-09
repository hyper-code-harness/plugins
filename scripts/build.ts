// Validates plugins/*.json and writes index.json (format 2). The listing says WHICH plugins exist, not which
// version: a release is a semver tag vX.Y.Z in the plugin's own repository, and Hyper installs the newest one
// (bun pins the exact commit in the host's bun.lock). So index.json changes only when a plugin is added or removed.
//
//   bun scripts/build.ts                    regenerate index.json
//   bun scripts/build.ts --check            fail if index.json is stale
//   bun scripts/build.ts --check --remote   also: the repo has a vX.Y.Z tag, and its package.json at the newest
//                                           tag has procs, the listed name, and the tag's version
import { readdir, readFile, writeFile } from 'node:fs/promises';

const NAME = /^[a-z][a-z0-9-]{0,63}$/, SOURCE = /^github:[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;
const KEYS = ['name', 'label', 'icon', 'description', 'source'];
const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;

export function newestTag(lsRemote: string): { tag: string; version: string; commit: string } | null {
    const tags = new Map<string, string>();
    for (const line of lsRemote.split('\n').filter(Boolean)) {
        const [sha, ref] = line.split('\t') as [string, string];
        const m = /^refs\/tags\/(.+?)(\^\{\})?$/.exec(ref);
        if (!m || !SEMVER.test(m[1]!)) continue;
        if (m[2] || !tags.has(m[1]!)) tags.set(m[1]!, sha);   // the peeled ^{} line is the commit of an annotated tag
    }
    const key = (t: string) => SEMVER.exec(t)!.slice(1).map(Number);
    const tag = [...tags.keys()].sort((a, b) => { const x = key(a), y = key(b); return x[0]! - y[0]! || x[1]! - y[1]! || x[2]! - y[2]!; }).at(-1);
    return tag ? { tag, version: tag.slice(1), commit: tags.get(tag)! } : null;
}

if (import.meta.main) {
    const errors: string[] = [], plugins: any[] = [];
    for (const file of (await readdir('plugins')).filter(f => f.endsWith('.json')).sort()) {
        const p = JSON.parse(await readFile('plugins/' + file, 'utf8'));
        const bad = (m: string) => errors.push(`${file}: ${m}`);
        for (const k of Object.keys(p)) if (!KEYS.includes(k)) bad('unknown field ' + k);
        if (!NAME.test(p.name) || file !== p.name + '.json') bad('name must be lowercase and match the file name');
        if (!SOURCE.test(p.source)) bad('source must be github:<owner>/<repo>');
        for (const k of ['label', 'description']) if (typeof p[k] !== 'string' || !p[k]) bad(k + ' required');
        if (p.icon !== undefined && !/^ph-[a-z0-9-]+$/.test(p.icon)) bad('icon must be a ph-* name');
        if (process.argv.includes('--remote') && SOURCE.test(p.source)) {
            const repo = p.source.slice(7);
            const out = Bun.spawnSync(['git', 'ls-remote', '--tags', `https://github.com/${repo}.git`]);
            const latest = out.exitCode ? null : newestTag(out.stdout.toString());
            if (!latest) bad(`no vX.Y.Z tag in ${repo}`);
            else {
                const raw = await fetch(`https://raw.githubusercontent.com/${repo}/${latest.commit}/package.json`);
                const pkg = raw.ok ? await raw.json() : null;
                if (!pkg?.procs) bad(`${latest.tag}: package.json with procs not found`);
                else if (pkg.name !== p.name) bad(`${latest.tag}: package name ${pkg.name} ≠ ${p.name}`);
                else if (pkg.version !== latest.version) bad(`${latest.tag}: package version ${pkg.version} ≠ ${latest.version}`);
                else console.log(`${p.name}: ${latest.tag} ${latest.commit.slice(0, 7)}`);
            }
        }
        plugins.push(Object.fromEntries(KEYS.filter(k => p[k] !== undefined).map(k => [k, p[k]])));
    }
    if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
    const text = JSON.stringify({ format: 2, plugins }, null, 2) + '\n';
    if (process.argv.includes('--check')) {
        const current = await readFile('index.json', 'utf8').catch(() => '');
        if (current !== text) { console.error('index.json is stale: run bun scripts/build.ts'); process.exit(1); }
        console.log(`ok: ${plugins.length} plugins`);
    } else { await writeFile('index.json', text); console.log(`index.json: ${plugins.length} plugins`); }
}
