import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {test} from 'node:test';
const verifier=new URL('./verify-review-package.mjs',import.meta.url);
const builder=new URL('./build-review-package.mjs',import.meta.url);
const sha='a'.repeat(40);
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'arexai-package-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const directory=join(root,'package');mkdirSync(join(directory,'contracts'),{recursive:true});
 const content='// synthetic reviewer fixture\n';writeFileSync(join(directory,'contracts','fixture.sol'),content);
 const manifest={formatVersion:1,sourceCommit:sha,workingTreeDirty:false,files:[{path:'contracts/fixture.sol',size:Buffer.byteLength(content),sha256:createHash('sha256').update(content).digest('hex')}]};
 const save=()=>writeFileSync(join(directory,'MANIFEST.json'),JSON.stringify(manifest));save();
 return {root,directory,manifest,save};
}
function run(directory,...args){return spawnSync(process.execPath,[verifier.pathname,directory,...args],{encoding:'utf8'});}
test('reviewer package accepts exact bytes and the expected clean commit',t=>{const f=fixture(t);assert.equal(run(f.directory,'--commit',sha,'--clean').status,0);});
for(const [name,mutate]of [
 ['altered bytes',f=>writeFileSync(join(f.directory,'contracts','fixture.sol'),'tampered')],
 ['missing file',f=>rmSync(join(f.directory,'contracts','fixture.sol'))],
 ['unexpected file',f=>writeFileSync(join(f.directory,'extra.txt'),'extra')],
 ['duplicate manifest path',f=>{f.manifest.files.push(f.manifest.files[0]);f.save();}],
 ['path traversal',f=>{f.manifest.files[0].path='../outside.txt';f.save();}],
 ['absolute path',f=>{f.manifest.files[0].path=join(f.directory,'contracts','fixture.sol');f.save();}],
 ['noncanonical path',f=>{f.manifest.files[0].path='contracts/./fixture.sol';f.save();}],
 ['file symlink',f=>{rmSync(join(f.directory,'contracts','fixture.sol'));writeFileSync(join(f.root,'outside.sol'),'// synthetic reviewer fixture\n');symlinkSync(join(f.root,'outside.sol'),join(f.directory,'contracts','fixture.sol'));}],
 ['parent directory symlink',f=>{rmSync(join(f.directory,'contracts'),{recursive:true});mkdirSync(join(f.root,'outside'));writeFileSync(join(f.root,'outside','fixture.sol'),'// synthetic reviewer fixture\n');symlinkSync(join(f.root,'outside'),join(f.directory,'contracts'));}],
 ['invalid hash',f=>{f.manifest.files[0].sha256='not-a-hash';f.save();}],
 ['invalid size',f=>{f.manifest.files[0].size=-1;f.save();}],
 ['missing dirty-tree flag',f=>{delete f.manifest.workingTreeDirty;f.save();}],
])test(`reviewer package rejects ${name}`,t=>{const f=fixture(t);mutate(f);assert.notEqual(run(f.directory).status,0);});
test('reviewer package rejects a different expected commit',t=>{const f=fixture(t);assert.notEqual(run(f.directory,'--commit','b'.repeat(40)).status,0);});
test('dirty packages remain inspectable but cannot pass the clean release gate',t=>{const f=fixture(t);f.manifest.workingTreeDirty=true;f.save();assert.equal(run(f.directory).status,0);assert.notEqual(run(f.directory,'--clean').status,0);});
test('actual package builder produces verifiable hashes and refuses overwrite',t=>{
 const root=mkdtempSync(join(tmpdir(),'arexai-builder-test-'));t.after(()=>rmSync(root,{recursive:true,force:true}));const out=join(root,'review');
 execFileSync(process.execPath,[builder.pathname,out],{stdio:'pipe'});
 const manifest=JSON.parse(readFileSync(join(out,'MANIFEST.json'),'utf8'));assert(manifest.files.length>50);
 assert.equal(run(out,'--commit',execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()).status,0);
 assert.throws(()=>execFileSync(process.execPath,[builder.pathname,out],{stdio:'pipe'}));
});
