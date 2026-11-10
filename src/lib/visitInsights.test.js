import {describe,it} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {join,dirname} from 'node:path';import {fileURLToPath} from 'node:url';
import {londonParts,memberStats,sharingFlags,weekSeries,monthSeries,boardWeekNorm,groupByMember} from './visitInsights.js';
import {SHARING_RULES} from './visitRules.js';
const NOW=new Date('2026-11-10T18:00:00Z');
const v=(...isos)=>isos.map(visited_at=>({visited_at,source:'scan_desk'}));
describe('visit stats',()=>{
  it('London parts handle BST and GMT and Monday weeks',()=>{
    const s=londonParts('2026-07-01T08:05:00Z');assert.equal(s.hour,9);assert.equal(s.day,'2026-07-01');assert.equal(s.week,'2026-06-29');
    const w=londonParts('2026-11-08T23:30:00Z');assert.equal(w.weekday,6);assert.equal(w.week,'2026-11-02');
  });
  it('totals, month, days, first/last, hour and weekday buckets',()=>{
    const s=memberStats(v('2026-10-30T10:00:00Z','2026-11-09T07:15:00Z','2026-11-10T09:00:00Z','2026-11-10T16:00:00Z'),NOW);
    assert.equal(s.total,4);assert.equal(s.days,3);assert.equal(s.monthVisits,3);assert.equal(s.monthDays,2);
    assert.equal(s.first,'2026-10-30T10:00:00Z');assert.equal(s.last,'2026-11-10T16:00:00Z');
    assert.equal(s.hours[9],1);assert.equal(s.hours[7],1);assert.equal(s.weekdays[0],1);assert.equal(s.weekdays[1],2);
    assert.deepEqual(weekSeries(s.byWeek,3,NOW).map(x=>x.value),[1,0,3]);
    assert.deepEqual(monthSeries(s.byMonth,2,NOW).map(x=>[x.key,x.value]),[['2026-10',1],['2026-11',3]]);
  });
  it('board norm is the median member week',()=>{
    const a=memberStats(v('2026-11-09T10:00:00Z'),NOW),b=memberStats(v('2026-11-09T10:00:00Z','2026-11-10T10:00:00Z','2026-11-11T10:00:00Z'),NOW);
    assert.equal(boardWeekNorm([a,b]),2);
    assert.equal(groupByMember([{member_id:'x'},{member_id:'y'},{member_id:'x'}]).get('x').length,2);
  });
});
describe('card-sharing hints (cautious)',()=>{
  it('ordinary member: no flag',()=>{
    const f=sharingFlags(memberStats(v('2026-11-02T10:00:00Z','2026-11-04T17:00:00Z','2026-11-09T09:00:00Z'),NOW),{norm:2});
    assert.equal(f.severity,'none');assert.equal(f.reasons.length,0);
  });
  it('two counted check-ins far apart on one day = check; three = look closer',()=>{
    const two=sharingFlags(memberStats(v('2026-11-10T09:05:00Z','2026-11-10T17:40:00Z'),NOW));
    assert.equal(two.severity,'check');assert.match(two.reasons[0].text,/2 check-ins on Tue 10 Nov \(09:05, 17:40\), 9 hours apart\. Could be a return visit/);
    const three=sharingFlags(memberStats(v('2026-11-10T07:00:00Z','2026-11-10T11:00:00Z','2026-11-10T16:00:00Z'),NOW));
    assert.equal(three.severity,'high');
  });
  it('raw scans 5 to 90 minutes apart (if ever stored) are flagged; under 5 min are not',()=>{
    assert.ok(sharingFlags(memberStats(v('2026-11-10T09:00:00Z','2026-11-10T09:40:00Z'),NOW)).reasons.some(r=>r.code==='close'));
    assert.ok(!sharingFlags(memberStats(v('2026-11-10T09:00:00Z','2026-11-10T09:02:00Z'),NOW)).reasons.some(r=>r.code==='close'));
  });
  it('outside opening hours',()=>{
    const f=sharingFlags(memberStats(v('2026-11-03T23:30:00Z'),NOW));
    assert.equal(f.reasons[0].code,'hours');assert.match(f.reasons[0].text,/outside usual opening hours \(06:00 to 22:00\)/);
  });
  it('busy week, spike vs own average, and far above board norm',()=>{
    const wk=[];for(let d=9;d<=13;d++){const dd=String(d).padStart(2,"0");wk.push(`2026-11-${dd}T08:00:00Z`,`2026-11-${dd}T15:00:00Z`);} // 10 in one week
    const f=sharingFlags(memberStats(v(...wk),NOW),{norm:2});assert.equal(f.severity,'high');assert.ok(f.reasons.some(r=>r.code==='week'&&/10 check-ins in the week of Mon 9 Nov/.test(r.text)));
    const hist=v('2026-10-12T10:00:00Z','2026-10-19T10:00:00Z','2026-10-26T10:00:00Z','2026-11-09T08:00:00Z','2026-11-10T08:00:00Z','2026-11-11T08:00:00Z','2026-11-12T08:00:00Z','2026-11-13T08:00:00Z');
    const s=sharingFlags(memberStats(hist,NOW),{norm:1});assert.ok(s.reasons.some(r=>r.code==='spike'));assert.ok(s.reasons.some(r=>r.code==='norm'));
  });
  it('wording is cautious, thresholds live in one file',()=>{
    const src=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'visitInsights.js'),'utf8');
    assert.doesNotMatch(src,/fraud|cheat|abuse|lied|guilty/i);
    for(const k of ['closeScanMinMinutes','closeScanMaxMinutes','sameDayCheck','openHour','closeHour','weekCheck','weekHigh','spikeFactor','normFactor'])assert.ok(k in SHARING_RULES,k);
  });
});
describe('visits board + profile UI',()=>{
  const root=join(dirname(fileURLToPath(import.meta.url)),'..');const vp=readFileSync(join(root,'components/VisitsPanel.jsx'),'utf8'),pr=readFileSync(join(root,'components/VisitProfile.jsx'),'utf8'),bits=readFileSync(join(root,'components/VisitBits.jsx'),'utf8');
  it('board: columns, top 3, search, sort, flagged filter, rows open profile, email shown as name without (email)',()=>{
    for(const t of ['>#<','>Member<','>Days<','>Check-ins<','>Last visit<'])assert.ok(vp.includes(t),t);
    assert.match(vp,/' top top'\+r\.rank/);assert.match(vp,/Find on the board by name or email/);assert.match(vp,/Flagged \(\{flaggedN\}\)/);
    assert.match(vp,/onClick=\{\(\)=>setSel\(r\)\}/);assert.match(vp,/vis-name vis-name-email">\{r\.email\|\|'Member'\}/);assert.doesNotMatch(vp,/\(\$\{?r\.email/);
    assert.match(bits,/Worth checking/);assert.match(bits,/Possible card sharing/);
  });
  it('profile: back, every check-in, stats, 4 charts, on-file details, hints copy',()=>{
    assert.match(pr,/className="btn-back"/);assert.match(pr,/Every check-in/);
    for(const t of ['Check-ins per week','Check-ins per month','Time of day','Day of week','LCL number','Card number','Card linked','Renewal','Source','First seen','Last seen','Days this month','Days all time'])assert.ok(pr.includes(t),t);
    assert.match(pr,/They are hints, not proof/);assert.doesNotMatch(pr+vp+bits,/\u2014/);
  });
  it('read-only migration: only stable select functions',()=>{
    const sql=readFileSync(join(root,'../supabase/migrations/20261110160000_visits_raw_readonly.sql'),'utf8');
    assert.doesNotMatch(sql,/\b(insert|update|delete|alter table|drop)\b/i);assert.equal((sql.match(/\bstable\b/g)||[]).length,2);
  });
});
