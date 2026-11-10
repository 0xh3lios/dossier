// Scoped review freshness is independent of solver freshness and exact owner decisions.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAll } from '../../src/commands/verify.ts';
import { requiredReviewBasis } from '../../src/behaviors/dependencies.ts';
import { reviewCoverageItems } from '../../src/behaviors/records.ts';
import type { ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';
const fixture=join(fileURLToPath(new URL('../../',import.meta.url)),'qualification/fixture');

// These temporary copies supply synthetic judgments; real Harbor reviews stay intact.
test('a full current review clears dossier debt; a changed explanation owes the review again, keeps the assessments and leaves formal evidence intact',t=>{
 const work=mkdtempSync(join(tmpdir(),'dossier-review-'));t.after(()=>rmSync(work,{recursive:true,force:true}));cpSync(fixture,work,{recursive:true,filter:path=>basename(path)!=='reviews'});
 const root=join(work,'dossiers');
 let v=verifyAll({root,version:'0.2.0'}), a=v.compositions.find(a=>a.id==='control')!;
 const collection=a.behaviorCollection!;
 const subject:ReviewSubject={kind:'dossier',dossier:a.ref,behaviors:collection.collection!.record.behaviors};
 const basis=requiredReviewBasis(subject,{root,analysis:a,analyses:Object.fromEntries([...v.parts,...v.compositions].map(a=>[a.ref,a])),knowledge:v.knowledge,collection});
 assert.deepEqual(basis.issues,[]);
 const review:ReviewRecord={format:'dossier-review@0.2.0',subject,basis:basis.files,coverage:{examined:reviewCoverageItems(subject),unexamined:[]},replaces:[],assessments:collection.behaviors.flatMap(b=>b.record.claims.flatMap(c=>c.mappings.map(m=>({mapping:`${b.record.id}/${c.id}/${m.id}`,result:'too-broad' as const,rationale:'This synthetic assessment checks debt discharge, not positive support.',limitations:[]}))))};
 mkdirSync(join(a.dir,'reviews'),{recursive:true});writeFileSync(join(a.dir,'reviews','binding.md'),'```json\n'+JSON.stringify(review,null,2)+'\n```\n\nThe independent semantic judgments are outside this mechanical fixture.\n');
 v=verifyAll({root,version:'0.2.0'});a=v.compositions.find(a=>a.id==='control')!;
 assert.equal(a.reviewOwed,null);assert.equal(a.route.pass,'Report');
 const cells=JSON.stringify(a.cells), first=subject.behaviors[0];
 appendFileSync(join(a.dir,'behaviors',`${first}.md`),'\nA changed explanation.\n');
 a=verifyAll({root,version:'0.2.0'}).compositions.find(a=>a.id==='control')!;
 assert.ok(a.reviewOwed);assert.equal(JSON.stringify(a.cells),cells);
 assert.equal(a.reviews[0].status,'current');assert.deepEqual(a.reviews[0].changed,{claims:[],explanations:[first]});
 assert.ok(a.behaviors!.behaviors.find(b=>b.id===first)!.claims.every(c=>c.mappings.every(m=>m.assessment.state==='assessed')),'every assessment stays in effect');
});
test('a prose hash is not a review format and cannot clear review debt',t=>{
 const work=mkdtempSync(join(tmpdir(),'dossier-review-invalid-'));t.after(()=>rmSync(work,{recursive:true,force:true}));cpSync(fixture,work,{recursive:true,filter:path=>basename(path)!=='reviews'});const root=join(work,'dossiers'),dir=join(root,'compositions/control');
 mkdirSync(join(dir,'reviews'),{recursive:true});writeFileSync(join(dir,'reviews','old.md'),'prose@abcdef\n\nNo findings.\n');
 const a=verifyAll({root,version:'0.2.0'}).compositions.find(a=>a.id==='control')!;
 assert.ok(a.reviewOwed);assert.equal(a.reviews.find(r=>r.file==='reviews/old.md')?.status,'invalid');assert.ok(a.tripwires.some(t=>t.name==='invalid review'));
});

test('a focused review binds the authored model and configuration its mapped answer executed',()=>{
 const root=join(fixture,'dossiers'),v=verifyAll({root,version:'0.2.0'}),a=v.parts.find(p=>p.id==='timelock')!;
 const subject:ReviewSubject={kind:'behavior',dossier:a.ref,behaviors:['cancel-plan']};
 const basis=requiredReviewBasis(subject,{root,analysis:a,analyses:Object.fromEntries([...v.parts,...v.compositions].map(a=>[a.ref,a])),knowledge:v.knowledge,collection:a.behaviorCollection!});
 assert.deepEqual(basis.issues,[]);
 assert.ok(basis.files.some(f=>f.path==='parts/timelock/model/Timelock.tla'));
 assert.ok(basis.files.some(f=>f.path.startsWith('parts/timelock/model/') && f.path.endsWith('.cfg')));
});

test('a current but wholly unexamined dossier review leaves review debt visible',t=>{
 const work=mkdtempSync(join(tmpdir(),'dossier-review-partial-'));t.after(()=>rmSync(work,{recursive:true,force:true}));cpSync(fixture,work,{recursive:true,filter:path=>basename(path)!=='reviews'});
 const root=join(work,'dossiers'),v=verifyAll({root,version:'0.2.0'}),a=v.parts.find(p=>p.id==='timelock')!,collection=a.behaviorCollection!;
 const subject:ReviewSubject={kind:'dossier',dossier:a.ref,behaviors:collection.collection!.record.behaviors};
 const basis=requiredReviewBasis(subject,{root,analysis:a,analyses:Object.fromEntries([...v.parts,...v.compositions].map(a=>[a.ref,a])),knowledge:v.knowledge,collection});
 const review:ReviewRecord={format:'dossier-review@0.2.0',subject,basis:basis.files,coverage:{examined:[],unexamined:reviewCoverageItems(subject).map(item=>({item,reason:'Not examined.'}))},replaces:[],assessments:collection.behaviors.flatMap(b=>b.record.claims.flatMap(c=>c.mappings.map(m=>({mapping:`${b.record.id}/${c.id}/${m.id}`,result:'inconclusive' as const,rationale:'Not examined.',limitations:[]}))))};
 mkdirSync(join(a.dir,'reviews'),{recursive:true});writeFileSync(join(a.dir,'reviews','partial.md'),'```json\n'+JSON.stringify(review,null,2)+'\n```\n\nNo semantic examination has been performed.\n');
 const after=verifyAll({root,version:'0.2.0'}).parts.find(p=>p.id==='timelock')!;
 assert.equal(after.reviews.find(r=>r.file==='reviews/partial.md')?.status,'current');assert.ok(after.reviewOwed);
});
