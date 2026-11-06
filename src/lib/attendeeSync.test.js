import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  syncEventAllowlist,assertAllowlistedIds,mergeSnapshots,flattenAttendees,
  searchQueryFromAttendeeName,snapshotSummary,
} from './attendeeSync.js';
import {parseAttendancesHtml,parseAttendedMarker,eventIdFromHref} from '../../extension/parseAttendances.js';

const fix=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../../extension/fixtures/attendances-anonymized.html'),'utf8');
const href='https://atlanticreach.bookwhen.com/events/ev-srg2i-20261106140000/attendances';

describe('attendeeSync allowlist',()=>{
  it('builds only current + shown upcoming with register urls',()=>{
    const list=syncEventAllowlist(
      [{id:'ev-aaa-20261106120000',title:'Now'}],
      [{id:'ev-bbb-20261106150000',title:'Soon'}]
    );
    assert.equal(list.length,2);
    assert.match(list[0].register_url,/\/events\/ev-aaa-20261106120000\/attendances/);
  });
  it('rejects ids outside allowlist',()=>{
    const allow=syncEventAllowlist([{id:'ev-aaa-20261106120000',title:'A'}],[]);
    assert.throws(()=>assertAllowlistedIds(['ev-zzz-20261106120000'],allow));
    assert.deepEqual(assertAllowlistedIds(['ev-aaa-20261106120000'],allow),['ev-aaa-20261106120000']);
  });
});

describe('parseAttendancesHtml',()=>{
  it('reads names and shared booking ids — no customer/email',()=>{
    const r=parseAttendancesHtml(fix,href);
    assert.equal(r.event_id,'ev-srg2i-20261106140000');
    assert.equal(r.row_count,5);
    assert.equal(r.footer_count,5);
    assert.equal(r.incomplete,false);
    assert.equal(r.attendees[0].name,'Alex Example');
    assert.equal(r.attendees[0].booking_id,'bk111aaa');
    assert.equal(r.attendees[1].booking_id,'bk111aaa'); // family share
    assert.equal(r.attendees[0].bookwhen_customer_id,null);
    assert.equal(r.attendees[0].email,null);
    assert.equal(r.attendees[0].identity,'name_only');
  });
  it('attended yes/no/unknown from aria; attending class alone is unknown',()=>{
    assert.equal(parseAttendedMarker('<img alt="Attended: yes"/>'),'yes');
    assert.equal(parseAttendedMarker('<img alt="Attended: no"/>'),'no');
    assert.equal(parseAttendedMarker('<td class="attendance_marker attending"></td>'),'unknown');
  });
  it('eventIdFromHref validates path',()=>{
    assert.equal(eventIdFromHref(href),'ev-srg2i-20261106140000');
    assert.equal(eventIdFromHref('https://example.com/x'),null);
  });
});

describe('snapshots',()=>{
  it('replace not append on same event',()=>{
    const a={event_id:'ev-aaa-20261106120000',attendees:[{name:'A'}],status:'ok'};
    const b={event_id:'ev-aaa-20261106120000',attendees:[{name:'B'}],status:'ok'};
    const out=mergeSnapshots([a],b);
    assert.equal(out.length,1);
    assert.equal(out[0].attendees[0].name,'B');
  });
  it('flatten keeps session meta; search query from name',()=>{
    const rows=flattenAttendees([{event_id:'ev-aaa-20261106120000',event_title:'Swim',status:'ok',attendees:[{name:'Alex Example',identity:'name_only'}]}]);
    assert.equal(rows[0].event_title,'Swim');
    assert.equal(searchQueryFromAttendeeName('Alex Example'),'Alex Example');
    assert.equal(searchQueryFromAttendeeName('x'),'');
  });
  it('summary counts',()=>{
    assert.deepEqual(snapshotSummary([
      {status:'ok',attendees:[{},{}]},
      {status:'failed',attendees:[]},
      {status:'partial',attendees:[{}]},
    ]),{events:3,ok:2,failed:1,partial:1,people:3});
  });
});

describe('Registration excluded from sync allowlist',()=>{
  it('drops exact Registration from targets',()=>{
    const list=syncEventAllowlist(
      [{id:'ev-aaa-20261106120000',title:'Registration'},{id:'ev-bbb-20261106130000',title:'Indoor swim'}],
      [{id:'ev-ccc-20261106140000',title:'Course registration day'}]
    );
    assert.deepEqual(list.map(e=>e.title),['Indoor swim','Course registration day']);
  });
});
