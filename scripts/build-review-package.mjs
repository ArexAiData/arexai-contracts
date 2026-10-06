import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,existsSync,lstatSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {execFileSync} from 'node:child_process';
const output=resolve(process.argv[2]??'/tmp/arexai-review-package');
const root=process.cwd();assert(output!==root&&!output.startsWith(root+'/'),'Build package outside the source checkout');
assert(!existsSync(output),'Choose a new empty output directory; no existing package will be overwritten');
const files=[];
function collect(path){
 const stat=lstatSync(path);assert(!stat.isSymbolicLink(),`Unexpected symbolic link: ${path}`);
 if(stat.isDirectory()){for(const child of readdirSync(path).sort())collect(`${path}/${child}`);}else files.push(path);
}
for(const path of ['contracts','test','scripts','docs','reports','verification','deployments','.github','transactions'])collect(path);
for(const path of readdirSync('artifacts').filter(p=>p.endsWith('.json')).sort())files.push(`artifacts/${path}`);
files.push('README.md','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','LICENSE','.gitignore','package.json','package-lock.json','hardhat.config.ts','release.json');
const entries=files.sort().map(path=>({path,size:readFileSync(path).length,sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
for(const {path}of entries){mkdirSync(dirname(resolve(output,path)),{recursive:true});copyFileSync(path,resolve(output,path));}
const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const dirty=execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim().length>0;
const manifest={formatVersion:1,sourceCommit,workingTreeDirty:dirty,compiler:{solc:'0.8.24',evmVersion:'paris',optimizer:{enabled:true,runs:200}},scope:'Contract source and recorded deployment evidence; staking prototype; project-run tests; synthetic AI references. Not a deployment or independent audit.',files:entries};
writeFileSync(resolve(output,'MANIFEST.json'),JSON.stringify(manifest,null,2)+'\n');
// Verify the actual copied bytes, not just the source files.
for(const entry of entries)assert.equal(createHash('sha256').update(readFileSync(resolve(output,entry.path))).digest('hex'),entry.sha256);
console.log(JSON.stringify({output,sourceCommit,workingTreeDirty:dirty,files:entries.length}));
