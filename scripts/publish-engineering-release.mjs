// Runs only in the trusted main-branch release workflow. Never overwrites a tag or release.
import assert from 'node:assert/strict';
import { readFileSync,writeFileSync } from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import { execFileSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
const manifest = JSON.parse(readFileSync('release.json', 'utf8'));
const repo = process.env.GITHUB_REPOSITORY;
const sha = process.env.GITHUB_SHA;
assert.equal(repo, 'ArexAiData/arexai-contracts');
assert.equal(process.env.GITHUB_REF, 'refs/heads/main');
assert.match(sha ?? '', /^[a-f0-9]{40}$/);
assert.match(manifest.tag, /^engineering-\d{4}-\d{2}-\d{2}(?:\.\d+)?$/);
assert.equal(manifest.prerelease, true, 'Prototype-containing engineering releases must be marked prerelease');
assert.match(manifest.report, /^reports\/[A-Za-z0-9_-]+\.md$/);
assert(readFileSync(manifest.report, 'utf8').length > 0);
const api = path => JSON.parse(execFileSync('gh', ['api', path], {encoding:'utf8'}));
const required = ['Hardhat 37-test suite', 'Slither 0.11.6'];
let passed = false;
for (let attempt=0; attempt<48; attempt++) {
  const checks = api(`repos/${repo}/commits/${sha}/check-runs?per_page=100&filter=latest`).check_runs;
  const trusted = checks.filter(c => c.app?.slug === 'github-actions');
  const state = required.map(name => trusted.filter(c => c.name === name));
  if (state.every(matches => matches.length > 0 && matches.every(c => c.status === 'completed' && c.conclusion === 'success'))) {passed=true;break;}
  assert(!state.some(matches => matches.some(c => c.status === 'completed' && !['success','neutral','skipped'].includes(c.conclusion))), 'Required CI failed: release withheld');
  console.log(`Waiting for required checks on ${sha} (${attempt+1}/48)`);
  await delay(15_000);
}
assert(passed, 'Required checks did not succeed within the release window');
const tags = api(`repos/${repo}/git/matching-refs/tags/${manifest.tag}`);
const existingTag = tags.find(t => t.ref === `refs/tags/${manifest.tag}`);
if (existingTag) {
  assert.equal(existingTag.object.type, 'commit', 'Existing annotated tag requires separate review; refusing overwrite');
  assert.equal(existingTag.object.sha, sha, 'Tag already belongs to a different commit; refusing overwrite');
}
// Default APIs return up to 100 releases; an old release outside the page is still protected by gh create failing.
const releases = api(`repos/${repo}/releases?per_page=100`);
if (releases.some(r => r.tag_name === manifest.tag)) {console.log('Release already exists; left unchanged.');process.exit(0);}
const directory=join(tmpdir(),`arexai-review-${sha}`);
execFileSync('node',['scripts/build-review-package.mjs',directory],{stdio:'inherit'});
execFileSync('node',['scripts/verify-review-package.mjs',directory,'--commit',sha,'--clean'],{stdio:'inherit'});
assert.equal(JSON.parse(readFileSync(join(directory,'MANIFEST.json'),'utf8')).workingTreeDirty,false,'Refuse a dirty-tree release package');
const archive=join(tmpdir(),`${manifest.tag}.tar.gz`);
execFileSync('tar',['-czf',archive,'-C',directory,'.']);
const checksum=archive+'.sha256';writeFileSync(checksum,createHash('sha256').update(readFileSync(archive)).digest('hex')+'  '+basename(archive)+'\n');
const notes = `${manifest.summary}\n\nSource commit: ${sha}\n\nEvidence: https://github.com/${repo}/blob/${sha}/${manifest.report}\n\nRequired Hardhat and Slither checks passed for this exact commit. Dependency audit, registry/snapshot reproduction and synthetic reference checks are part of the contract CI gate.\n\nAttached review archive contains per-file SHA-256 values and its source commit in MANIFEST.json. Check the archive checksum, extract into an empty directory, then run scripts/verify-review-package.mjs against that directory. Hashes establish integrity, not publisher identity.\n\nNo mainnet deployment, token allocation change, staking activation or independent audit is implied. Staking remains an unreleased prototype. AI product versions are separate.\n`;
execFileSync('gh', ['release','create',manifest.tag,archive,checksum,'--repo',repo,'--target',sha,'--title',manifest.title,'--notes',notes,'--prerelease'], {stdio:'inherit'});
