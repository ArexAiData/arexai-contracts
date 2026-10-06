// Independent reference-fixture consistency checks; this does not execute the product or an AI model.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = name => {const x=JSON.parse(readFileSync(`docs/ai/examples/${name}.json`,'utf8'));assert.equal(x.synthetic,true);return x;};
const call = read('call-records');
assert.equal(call.durationFormat, 'ms');
const seconds = call.rows.map(r => {assert.match(r.duration,/^\d+:\d{2}$/);const [m,s]=r.duration.split(':').map(Number);assert(s<60);return m*60+s;}).sort((a,b)=>a-b);
assert.equal(call.rows.length,call.expected.recordCount);
assert.equal((seconds[2]+seconds[3])/2,call.expected.medianSeconds);
const rank=(seconds.length-1)*.9, i=Math.floor(rank);
assert.equal(seconds[i]+(seconds[i+1]-seconds[i])*(rank-i),call.expected.percentile90Seconds);
const outcomes={};for(const r of call.rows){const label=call.statusDefinitions[r.status];assert(label);outcomes[label]=(outcomes[label]??0)+1;}
assert.deepEqual(outcomes,call.expected.outcomeCounts);
const companies=read('company-records'), totals={};
assert.equal(companies.rows.length,companies.expected.recordCount);
for(const r of companies.rows){assert(Number.isFinite(r.amount));totals[r.currency]=(totals[r.currency]??0)+r.amount;}
assert.deepEqual(totals,companies.expected.currencyTotals);assert(Object.keys(totals).length>1);assert.equal(companies.expected.mixedCurrencyTotal,null);
const survey=read('survey'), counts={}, cross={};
for(const r of survey.rows){counts[r.answer]=(counts[r.answer]??0)+1;cross[r.channel]??={};cross[r.channel][r.answer]=(cross[r.channel][r.answer]??0)+1;}
const maximum=Math.max(...Object.values(counts));
assert.deepEqual(Object.keys(counts).filter(k=>counts[k]===maximum).sort(),survey.expected.modes);
assert.deepEqual(cross,survey.expected.crossTab);
const lists=read('lists');
const group=rows=>{const map=new Map();for(const r of rows){const key=r.key.trim();assert(key);const bucket=map.get(key)??[];bucket.push(r);map.set(key,bucket);}return map;};
const left=group(lists.left),right=group(lists.right), keys=new Set([...left.keys(),...right.keys()]);
const result={matchedUniquePairs:0,onlyLeft:[],onlyRight:[],changedKeys:[],ambiguousKeys:[]};
for(const key of keys){const a=left.get(key)??[],b=right.get(key)??[];if(a.length>1||b.length>1)result.ambiguousKeys.push(key);if(!b.length)result.onlyLeft.push(key);if(!a.length)result.onlyRight.push(key);if(a.length===1&&b.length===1){result.matchedUniquePairs++;if(a[0].value.trim()!==b[0].value.trim())result.changedKeys.push(key);}}
assert.deepEqual(result,lists.expected);assert(left.has('0001')&&!left.has('1'));
console.log('Four synthetic reference fixtures verified: explicit durations/statuses, separate currencies, categorical analysis and exact-key reconciliation. Not a product/model test.');
