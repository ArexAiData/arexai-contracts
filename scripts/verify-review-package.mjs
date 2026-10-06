import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]??'/tmp/arexai-review-package');
const manifest=JSON.parse(readFileSync(resolve(root,'MANIFEST.json'),'utf8'));
assert.equal(manifest.formatVersion,1);assert.match(manifest.sourceCommit,/^[0-9a-f]{40}$/);
const expected=new Set(['MANIFEST.json']);
for(const entry of manifest.files){
 assert(typeof entry.path==='string'&&!entry.path.startsWith('/')&&!entry.path.split('/').includes('..'));assert(!expected.has(entry.path),'Duplicate package path');expected.add(entry.path);
 const path=resolve(root,entry.path);assert(lstatSync(path).isFile()&&!lstatSync(path).isSymbolicLink());
 const bytes=readFileSync(path);assert.equal(bytes.length,entry.size);assert.equal(createHash('sha256').update(bytes).digest('hex'),entry.sha256,entry.path);
}
function walk(path,prefix=''){for(const child of readdirSync(path)){const rel=prefix+child,full=resolve(path,child);assert(!lstatSync(full).isSymbolicLink());if(lstatSync(full).isDirectory())walk(full,rel+'/');else assert(expected.delete(rel),`Unexpected package file: ${rel}`);}}
walk(root);assert.equal(expected.size,0);console.log(`Verified ${manifest.files.length} package file hashes. Integrity is not proof of publisher authenticity or an audit.`);
