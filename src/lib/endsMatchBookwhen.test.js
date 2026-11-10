import {describe,it} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const sql=readFileSync(join(dirname(fileURLToPath(import.meta.url)),'../../supabase/migrations/20261110093000_ends_match_bookwhen.sql'),'utf8');
describe('membership end date follows Bookwhen',()=>{
  it('card link prefers bw_renews_at over +12 months',()=>{
    assert.match(sql,/when bw_renews_at is not null then bw_renews_at/);
    assert.match(sql,/membership_ends_at is distinct from bw_renews_at/);
  });
  it('Bookwhen check overwrites stored end',()=>{
    assert.match(sql,/membership_ends_at=coalesce\(p_renews_at,m\.membership_ends_at\)/);
  });
  it('email ingest no longer invents +12 months',()=>{
    const ing=sql.slice(sql.indexOf('ingest_bookwhen_email'),sql.indexOf('add_member_with_card'));
    assert.doesNotMatch(ing,/interval '12 months'/);
  });
  it('manual add uses Bookwhen date first; scan validity uses coalesce(bw_renews_at, ends)',()=>{
    assert.match(sql,/ends := coalesce\(v_bw,/);
    assert.match(sql,/coalesce\(p_member\.bw_renews_at, p_member\.membership_ends_at\)/);
    assert.match(sql,/coalesce\(m\.bw_renews_at,m\.membership_ends_at\)<current_date/);
  });
});
