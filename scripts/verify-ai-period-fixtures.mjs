// Reference fixture consistency only: no application or model execution.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../docs/ai/examples/',import.meta.url);
const fixture=JSON.parse(readFileSync(new URL('period-scenarios.json',root),'utf8'));
assert.equal(fixture.synthetic,true);
assert.equal(fixture.cases.length,5);
assert.equal(new Set(fixture.cases.map(c=>c.name)).size,5);
for(const c of fixture.cases){
  const lines=readFileSync(new URL(c.file,root),'utf8').split(/\r?\n/);
  const headerIndex=lines.findIndex(line=>line.trim());
  const headers=lines[headerIndex].split(',');
  assert.equal(headers[0],c.field);
  assert.deepEqual(headers,[c.field,'category']);
  const rows=lines.slice(headerIndex+1).map((line,i)=>({line,row:headerIndex+i+2})).filter(r=>r.line.trim());
  assert.deepEqual(rows.map(r=>r.row),c.sourceRows);
  assert.deepEqual(rows.map(r=>`A${r.row}`),c.sourceCells);
  const values=rows.map(r=>Number(r.line.split(',')[0]));
  assert(values.every(Number.isFinite));
  assert(['sum','average'].includes(c.operation));
  const calculate=xs=>xs.reduce((sum,v)=>sum+v,0)/(c.operation==='average'?xs.length:1);
  assert.equal(calculate(values),c.expected);
  assert.equal(calculate(c.nextValues),c.nextExpected);
  assert.equal((c.nextExpected-c.expected)/Math.abs(c.expected)*100,c.percentChange);
  assert(!headers.includes(c.nextField),'Renamed header must require a reviewed mapping in the product');
  assert(['seconds','EUR','count','hours'].includes(c.unit));
  console.log(`Verified synthetic ${c.name} reference: ${c.expected} ${c.unit}, next ${c.nextExpected}, source ${c.sourceCells.join(', ')}`);
}
console.log('Five period reference fixtures passed. This does not verify application mapping, UI, uploads/downloads, privacy, model accuracy or browser behavior.');
