import { expect, test } from 'bun:test';
import { newestTag } from './build';

test('newest semver tag wins numerically, annotated tags use the peeled commit, other tags are ignored', () => {
    const out = [
        'a'.repeat(40) + '\trefs/tags/v1.9.0',
        'b'.repeat(40) + '\trefs/tags/v1.10.0',
        'c'.repeat(40) + '\trefs/tags/v1.10.0^{}',
        'd'.repeat(40) + '\trefs/tags/latest',
        'e'.repeat(40) + '\trefs/tags/v2.0.0-beta',
    ].join('\n');
    expect(newestTag(out)).toEqual({ tag: 'v1.10.0', version: '1.10.0', commit: 'c'.repeat(40) });
    expect(newestTag('')).toBeNull();
});
