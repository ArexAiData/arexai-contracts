import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
const {values,positionals}=parseArgs({options:{commit:{type:'string'},clean:{type:'boolean',default:false}},allowPositionals:true});
assert(positionals.length<=1,'Supply one package directory');
const root=resolve(positionals[0]??'/tmp/arexai-review-package');
assert(lstatSync(root).isDirectory()&&!lstatSync(root).isSymbolicLink(),'Package root must be a real directory');
function regularFile(path){
 const parts=path.split('/');
 assert(typeof path==='string'&&parts.every(part=>part!==''&&part!=='.'&&part!=='..')&&!path.includes('\\'),'Noncanonical package path');
 let full=root;
 for(const [index,part]of parts.entries()){
  full=resolve(full,part);const stat=lstatSync(full);
  assert(!stat.isSymbolicLink(),'Symlinked package path');
  assert(index===parts.length-1?stat.isFile():stat.isDirectory(),'Invalid package file path');
 }
 return full;
}
const manifest=JSON.parse(readFileSync(regularFile('MANIFEST.json'),'utf8'));
assert.equal(manifest.formatVersion,1);assert.match(manifest.sourceCommit,/^[0-9a-f]{40}$/);
assert.equal(typeof manifest.workingTreeDirty,'boolean');assert(Array.isArray(manifest.files),'Missing package file list');
if(values.commit){assert.match(values.commit,/^[0-9a-f]{40}$/);assert.equal(manifest.sourceCommit,values.commit,'Package source commit differs from expected commit');}
if(values.clean)assert.equal(manifest.workingTreeDirty,false,'Dirty-tree package is not an exact clean-commit release');
const expected=new Set(['MANIFEST.json']);
for(const entry of manifest.files){
 assert(entry&&typeof entry.path==='string');assert(!expected.has(entry.path),'Duplicate package path');expected.add(entry.path);
 assert(Number.isSafeInteger(entry.size)&&entry.size>=0);assert.match(entry.sha256,/^[0-9a-f]{64}$/);
 const bytes=readFileSync(regularFile(entry.path));assert.equal(bytes.length,entry.size);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.path);
}
function walk(path,prefix=''){for(const child of readdirSync(path)){const rel=prefix+child,full=resolve(path,child);assert(!lstatSync(full).isSymbolicLink());if(lstatSync(full).isDirectory())walk(full,rel+'/');else assert(expected.delete(rel),`Unexpected package file: ${rel}`);}}
walk(root);assert.equal(expected.size,0);console.log(`Verified ${manifest.files.length} package file hashes. Integrity is not proof of publisher authenticity or an audit.`);
