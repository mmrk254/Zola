const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
function route(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] || require(name), Date, Map, process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test' } } });
  return module.exports;
}
function fixture() {
  const state = {
    hospitals: [{ id: 'hospital-1', name: 'Test Hospital', latitude: -1.3, longitude: 36.8, address: 'Nairobi' }],
    hospital_capacity: ['ICU','HDU','NICU'].map(care_level => ({ hospital_id: 'hospital-1', care_level, available_beds: 3, facility_status: 'open', updated_at: new Date().toISOString() })),
  };
  const client = { from(table) {
    const filters = []; let changes;
    const query = {
      select() { return this; }, eq(k,v) { filters.push(row => row[k] === v); return this; },
      gt(k,v) { filters.push(row => row[k] > v); return this; }, not(k,op,v) { filters.push(row => row[k] !== v); return this; },
      upsert(rows) { changes = rows; return this; },
      then(resolve) { if(changes) state[table] = changes; return Promise.resolve({ data: state[table].filter(row => filters.every(fn => fn(row))), error: null }).then(resolve); },
    }; return query;
  } };
  const mocks = {
    '@/lib/supabase/server': { getServiceClient: () => client },
    '@/lib/auth': { requireAuthenticatedUser: async () => ({}), resolveActingHospital: (_, id) => { if(id !== 'hospital-1') throw Error('Forbidden'); } },
    '@/lib/geolocation': { haversineKm: () => 2.5 },
    '@/lib/demo-data': { demoHospitals: [], demoCapacity: [] },
  };
  return { state, capacity: route('app/api/hospitals/[id]/capacity/route.ts', mocks), nearby: route('app/api/hospitals/nearby/route.ts', mocks) };
}
const near = () => new NextRequest('https://zola.example/api/hospitals/nearby?lat=-1.29&lng=36.82&care_level=ICU');
const put = rows => new NextRequest('https://zola.example/api/hospitals/hospital-1/capacity', { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ capacity: rows }) });
const params = { params: Promise.resolve({ id: 'hospital-1' }) };
test('saving 5 ICU beds replaces 3 in the map API, without caching', async () => {
  const f = fixture();
  assert.equal((await (await f.nearby.GET(near())).json()).hospitals[0].available_beds, 3);
  const rows = f.state.hospital_capacity.map(row => ({ ...row, available_beds: row.care_level === 'ICU' ? 5 : row.available_beds }));
  const saved = await f.capacity.PUT(put(rows), params);
  assert.equal(saved.status, 200);
  const response = await f.nearby.GET(near());
  assert.equal((await response.json()).hospitals[0].available_beds, 5);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('zero beds and closed facilities disappear from available destinations', async () => {
  const f=fixture(); f.state.hospital_capacity[0].available_beds=0;
  assert.equal((await (await f.nearby.GET(near())).json()).hospitals.length,0);
  f.state.hospital_capacity[0].available_beds=5; f.state.hospital_capacity[0].facility_status='closed';
  assert.equal((await (await f.nearby.GET(near())).json()).hospitals.length,0);
});
test('partial, fractional, and wrong-hospital capacity updates cannot overwrite saved data', async () => {
  for (const modify of [rows => rows.slice(0,1), rows => rows.map(r=>({...r,available_beds:1.5})), rows=>rows.map(r=>({...r,hospital_id:'other'}))]) {
    const f=fixture(); const response=await f.capacity.PUT(put(modify(f.state.hospital_capacity)),params);
    assert.equal(response.status,400);assert.equal(f.state.hospital_capacity[0].available_beds,3);
  }
});
test('invalid pickup coordinates are rejected', async () => {
  const f=fixture(); assert.equal((await f.nearby.GET(new NextRequest('https://zola.example/api/hospitals/nearby?lat=999&lng=36&care_level=ICU'))).status,400);
});
