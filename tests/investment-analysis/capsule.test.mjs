import test from 'node:test';
import assert from 'node:assert/strict';
import C from '../../collaboration/investment-analysis/core.js';
import P from '../../collaboration/investment-analysis/capsule.js';
const sections=['Purpose and target','Relevant context and inputs','Working state','Boundaries and human-held decisions','Requested return','Evidence and recovery'];
export function extractState(markdown) {
  const match=markdown.match(/^(`{3,})json\n([\s\S]*?)\n\1$/m);
  assert.ok(match,'one language-tagged state fence');
  assert.equal((markdown.match(/^`{3,}json$/gm)||[]).length,1);
  return JSON.parse(match[2]);
}
test('one six-section document preserves five domains and the exact admitted JSON',()=>{
  const state=C.defaults(); state.inputs.newCustomers=0;state.inputs.incrementalOutcome=null;
  state.extensions['urn:example:context']={zero:0,missing:null,precision:1.2345678901234567};
  const p=C.prepare(state),plain=P.document(C,p),assisted=P.document(C,p,'skill-assisted');
  assert.equal((plain.match(/^# /gm)||[]).length,1);
  let previous=-1;for(const title of sections){const at=plain.indexOf('## '+title+'\n');assert.ok(at>previous);previous=at;}
  for(const [,title] of P.DOMAINS)assert.ok(plain.includes('### '+title+'\n'));
  assert.deepEqual(extractState(plain),p.state);
  assert.equal(C.prepare(extractState(plain)).serialized,p.serialized);
  assert.deepEqual(extractState(assisted),p.state);
  assert.match(plain,/newCustomers\): 0 \[customer\] \| known/);
  assert.match(plain,/calculation\/cac: unavailable/);
  assert.match(plain,/calculation\/expectedNpv: unavailable/);
  assert.match(plain,/IRR per year: inapplicable/);
  assert.equal(plain.includes('.;'),false);
  assert.ok(assisted.includes(P.SKILL_REVISION));
  assert.equal(plain.match(/- Fingerprint: .*/)[0],assisted.match(/- Fingerprint: .*/)[0]);
});
test('source delimiters stay literal and long backtick runs stay inside one JSON block',()=>{
  const s=C.defaults();
  s.inputs.label='\n# injected\n[x](https://example.org) <script> @all **value** ```json ``` ``````';
  s.inputs.evidenceSource='Reason remains literal.;';
  const p=C.prepare(s),text=P.document(C,p);
  assert.equal((text.match(/^# /gm)||[]).length,1);
  assert.ok(text.includes('\\# injected'));assert.ok(text.includes('&lt;script&gt;'));assert.ok(text.includes('\\@all'));
  assert.match(text,/^`{7}json$/m);
  assert.deepEqual(extractState(text),p.state);
  assert.ok(text.includes('Reason remains literal.;'));
  assert.equal(P.inline(' '.repeat(100000)), ' '.repeat(100000));
});
test('explicit currency, reason, capture scope, and decision owner retain their meaning',()=>{
  const s=C.defaults();s.inputs.currency='EUR';s.inputs.period='quarter';s.inputs.owner='Operating owner';
  s.extensions['urn:investment:staffing-reference']={snapshot:{horizon:2},calculation:{currency:'USD',central:10}};
  const text=P.document(C,C.prepare(s));
  assert.match(text,/captured USD staffing reference/);
  assert.match(text,/live calculator controls have their own state/);
  assert.match(text,/EUR\/quarter/);
  assert.match(text,/Owner: Operating owner/);
  assert.equal(extractState(text).extensions['urn:investment:staffing-reference'].calculation.currency,'USD');
});

test('capsule identity recomputes from its encoded projection and preserves numeric absence',()=>{
  const state=C.defaults();state.outcomes[0].probability=' ';state.events[0].period='\t';state.serviceOutcomes[0].baseline=' ';state.serviceOutcomes[0].candidate=0;
  const accepted=C.prepare(state),projection=P.project(C,accepted),prepared=P.prepare(C,accepted),text=P.document(C,accepted);
  const canonical=Object.fromEntries(Object.keys(projection).sort().map(key=>[key,projection[key]]));
  let expected=0x811c9dc5;
  for(const byte of Buffer.from(JSON.stringify(canonical),'utf8'))expected=Math.imul(expected^byte,0x01000193)>>>0;
  assert.equal(prepared.fingerprint,'fnv1a32-utf8:'+expected.toString(16).padStart(8,'0'));
  assert.ok(text.includes('- Fingerprint: '+prepared.fingerprint));
  assert.ok(text.includes('- Analysis fingerprint: '+accepted.fingerprint));
  assert.match(text,/Probability: unavailable/);assert.match(text,/Period: unavailable/);assert.match(text,/Safety: baseline unavailable, candidate 0/);
  assert.equal(extractState(text).outcomes[0].probability,' ');
  assert.notEqual(P.fingerprint({...projection,purpose:projection.purpose+' Changed decision'}),prepared.fingerprint);
});
