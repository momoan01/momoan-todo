const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Small Obsidian/Vault test doubles. Production functions run unchanged in a
// fresh VM per test; no personal Vault or plugin data is opened.
class Element {
  constructor(tag = 'div', options = {}) {
    this.tag = tag; this.children = []; this.events = new Map();
    this.classes = new Set((options.cls || '').split(' ').filter(Boolean));
    this.classList = {
      add: (...names) => names.forEach(n => this.classes.add(n)),
      remove: (...names) => names.forEach(n => this.classes.delete(n)),
      contains: n => this.classes.has(n),
      toggle: (n, value) => value ? this.classes.add(n) : this.classes.delete(n)
    };
    this.style = { setProperty() {} }; this.dataset = {}; this.attrs = options.attr || {};
    this.text = options.text || ''; this.isConnected = true; this.scrollTop = 0;
  }
  createEl(tag, options) { const child = new Element(tag, options); this.appendChild(child); return child; }
  createDiv(options) { return this.createEl('div', options); }
  createSpan(options) { return this.createEl('span', options); }
  appendChild(child) { this.children.push(child); child.parentElement = this; }
  empty() { this.children.forEach(c => c.isConnected = false); this.children = []; }
  addClass(...names) { this.classList.add(...names); }
  removeClass(...names) { this.classList.remove(...names); }
  setText(value) { this.text = value; }
  setAttribute(key, value) { this.attrs[key] = value; }
  setAttr(key, value) { this.setAttribute(key, value); }
  removeAttribute(key) { delete this.attrs[key]; }
  addEventListener(name, fn) { if (!this.events.has(name)) this.events.set(name, new Set()); this.events.get(name).add(fn); }
  removeEventListener(name, fn) { this.events.get(name)?.delete(fn); }
  async emit(name, event) { for (const fn of [...(this.events.get(name) || [])]) await fn(event); }
  setPointerCapture(id) { this.capture = id; this.captureCount = (this.captureCount || 0) + 1; }
  hasPointerCapture(id) { return this.capture === id; }
  releasePointerCapture() { this.capture = null; }
  getBoundingClientRect() { return { top: 10, left: 10, height: 30, width: 300 }; }
  cloneNode() { return new Element(); }
  remove() { this.isConnected = false; }
  find(cls) { return this.all().find(el => el.classes.has(cls)); }
  all() { return [this, ...this.children.flatMap(c => c.all())]; }
}

function harness() {
  const timers = new Map(); let nextTimer = 1;
  const window = new Element();
  window.setTimeout = (fn, delay) => { const id = nextTimer++; timers.set(id, { fn, delay }); return id; };
  window.clearTimeout = id => timers.delete(id);
  window.matchMedia = () => ({ matches: false });
  const modals = [];
  class Modal {
    constructor(app) { this.app = app; this.contentEl = new Element(); this.modalEl = { isConnected: false }; modals.push(this); }
    open() { this.onOpen?.(); }
    close() { this.onClose?.(); }
  }
  const storage = new Map();
  const context = vm.createContext({
    module: { exports: {} }, console, window, document: { body: new Element(), documentElement: {} },
    navigator: {}, setTimeout: window.setTimeout, clearTimeout: window.clearTimeout,
    requestAnimationFrame: fn => fn(),
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k,v) => storage.set(k,v), removeItem: k => storage.delete(k) },
    require: name => {
      assert.equal(name, 'obsidian');
      return { Plugin: class {}, ItemView: class {}, Notice: class {}, PluginSettingTab: class {}, Setting: class {}, Modal, setIcon() {} };
    }
  });
  const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
  vm.runInContext(source + '\nthis.api = { Plugin:module.exports, MomoTodoMateView, openMultiDateChoiceModal, parseMonthFile, rememberGroupLocal, ensureCategoryRuntime, GROUP_PRESETS, CATEGORIES, DATA_FOLDER, ROUTINE_PATH, TASK_HUB_PATH, momoLocalGet, momoLocalSet };', context);
  const api = context.api;
  const files = new Map(); const texts = new Map(); let mutations = 0;
  function put(filePath, text) { const file = { path:filePath, stat: { mtime: 1 } }; files.set(filePath, file); texts.set(filePath, text); return file; }
  const vault = {
    getFiles: () => [...files.values()], getAbstractFileByPath: p => files.get(p),
    read: async f => texts.get(f.path), cachedRead: async f => texts.get(f.path),
    process: async (f, fn) => { texts.set(f.path, fn(texts.get(f.path))); mutations++; await vault.onWrite?.(f); },
    createFolder: async () => {}, create: async (p, text) => { mutations++; return put(p, text); }
  };
  const plugin = new api.Plugin(); plugin.app = { vault, workspace: { getLeavesOfType: () => [] } };
  plugin.monthCache = new Map(); plugin.inactiveGroups = {}; plugin.inactiveCategories = new Set();
  plugin.selectedDate = '2026-09-29'; plugin.runUndoableAction = async (_, fn) => fn();
  plugin.loadData = async () => ({}); plugin.saveData = async data => { plugin.saved = data; };
  const view = new api.MomoTodoMateView(null, plugin); view.app = plugin.app; view.contentEl = new Element();
  const runTimers = delay => { for (const [id, timer] of [...timers]) if (timer.delay === delay) { timers.delete(id); timer.fn(); } };
  return { api, plugin, view, vault, put, texts, window, modals, runTimers, timers, mutations: () => mutations };
}
const ev = (target = { closest: () => null }) => ({ pointerId:1, button:0, clientX:20, clientY:20, target, preventDefault() {}, stopPropagation() {} });
const plain = value => JSON.parse(JSON.stringify(value));

test('partial title/location search includes completed tasks and sorts dates across years', async () => {
  const h = harness(); const root = h.api.DATA_FOLDER;
  h.plugin.hideCompleted = true;
  h.put(`${root}/2027-01.md`, '## 2027-01-02\n- [ ] Alpha planning #개인\n');
  h.put(`${root}/2026-09.md`, '## 2026-09-30\n- [ ] Other #개인 [location:: Alpha cafe]\n## 2026-09-29\n- [x] ALPHABET #개인\n- [ ] Alpha preview #개인 [momoPreview:: true]\n- [ ] Alpha moved #개인 [momoSuppressed:: true]\n- [ ] Alpha skipped #개인 [momoSkipped:: true]\n');
  h.put('unrelated/2025-01.md', '## 2025-01-01\n- [ ] Alpha private\n');
  const result = await h.plugin.searchTasks('  alpHa ');
  assert.deepEqual(plain(result.map(x => x.date)), ['2026-09-29', '2026-09-30', '2027-01-02']);
  assert.equal(result[0].done, true);
  assert.equal((await h.plugin.searchTasks('cafe'))[0].title, 'Other');
  assert.equal((await h.plugin.searchTasks('missing')).length, 0);
  assert.equal((await h.plugin.searchTasks(' ')).length, 0);
  assert.equal(h.mutations(), 0);
});

test('search UI groups by date and clear restores the daily list', async () => {
  const h = harness();
  const file = `${h.api.DATA_FOLDER}/2026-09.md`;
  h.put(file, '## 2026-09-29\n- [x] Find first #개인\n- [ ] Find second #개인\n## 2026-09-30\n- [ ] Find third #개인\n');
  h.plugin.getItemsForDate = async () => [];
  h.plugin.recoverLegacyRuntimeFromItems = async () => false;
  h.plugin.canUndo = h.plugin.canRedo = () => false;
  h.view.searchQuery = 'Find';
  const parent = new Element();
  await h.view.renderTaskPanel(parent, h.plugin.selectedDate);
  const results = parent.find('momo-td-search-results');
  assert.equal(results.children.filter(x => x.classes.has('momo-td-search-date')).length, 2);
  assert.equal(results.all().filter(x => x.classes.has('momo-td-item')).length, 3);
  assert.equal(parent.find('momo-td-body').hidden, true);
  const input = parent.find('momo-td-search').children[0];
  input.value = ''; await input.oninput();
  assert.equal(parent.find('momo-td-body').hidden, false);
  assert.equal(results.hidden, true);
});

test('newly rendered task keeps native single/double click; capture starts only after hold', async () => {
  const h = harness(); let opened = 0; let edited = 0;
  h.view.openItemActions = () => opened++;
  h.view.openTaskTitleEditor = () => edited++;
  const parent = new Element();
  h.view.renderItem(parent, { title:'New task', date:'2026-09-29', category:'개인' });
  const row = parent.children[0], title = row.find('momo-td-item-title');
  await row.emit('pointerdown', ev());
  assert.equal(row.captureCount || 0, 0);
  await h.window.emit('pointerup', ev());
  title.onclick(ev()); h.runTimers(285);
  assert.equal(opened, 1);
  title.onclick(ev()); title.onclick(ev()); h.runTimers(285);
  assert.equal(edited, 1); assert.equal(opened, 1);
  await row.emit('pointerdown', ev()); h.runTimers(340);
  assert.equal(row.captureCount, 1);
  await h.window.emit('pointerup', ev());
  title.onclick(ev()); h.runTimers(285);
  assert.equal(opened, 1);
  assert.equal(h.window.events.get('pointerup').size, 0);
});

test('leaving or cancelling before hold never starts drag or leaves a timer', async () => {
  for (const kind of ['pointerleave', 'pointercancel', 'pointermove']) {
    const h = harness(); const parent = new Element(); const row = parent.createDiv();
    h.view.enableTaskLongPressReorder(row, {});
    await row.emit('pointerdown', ev());
    if (kind === 'pointercancel') await h.window.emit(kind, ev());
    else await row.emit(kind, { ...ev(), clientX:60 });
    h.runTimers(340);
    assert.equal(row.captureCount || 0, 0);
    await h.window.emit('pointerup', ev());
    assert.equal(h.timers.size, 0);
  }
});

test('double click immediately chooses only that date; multi-select and cancel still work', async () => {
  const h = harness();
  let promise = h.api.openMultiDateChoiceModal({}, '2026-09-29');
  let modal = h.modals.at(-1), grid = modal.contentEl.find('momo-date-grid');
  const date = grid.children.find(x => x.text === '15');
  date.onclick(); date.onclick();
  assert.equal(grid.children.includes(date), true);
  date.ondblclick(ev());
  assert.deepEqual(plain(await promise), ['2026-09-15']);
  promise = h.api.openMultiDateChoiceModal({}, '2026-09-29');
  modal = h.modals.at(-1); grid = modal.contentEl.find('momo-date-grid');
  grid.children.find(x => x.text === '20').onclick();
  grid.children.find(x => x.text === '10').onclick();
  modal.contentEl.find('momo-multi-date-confirm').onclick();
  assert.deepEqual(plain(await promise), ['2026-09-10', '2026-09-20']);
  promise = h.api.openMultiDateChoiceModal({}, '2026-09-29');
  h.modals.at(-1).close(); assert.equal(await promise, null);
});

test('copy from ordinary and routine actions writes the target while staying on source date', async () => {
  for (const routineId of [null, 'routine-1']) {
    const h = harness(); let renders = 0; h.view.render = async () => renders++;
    await h.view.openItemActions({ title:'Copy me', date:'2026-09-29', category:'개인', done:true, routineId });
    const button = h.modals.at(-1).contentEl.all().find(x => x.tag === 'button' && x.text === '복사 생성');
    const pending = button.onclick();
    const dateModal = h.modals.at(-1);
    const date = dateModal.contentEl.find('momo-date-grid').children.find(x => x.text === '15');
    date.onclick(); date.onclick(); date.ondblclick(ev());
    await pending;
    assert.equal(h.plugin.selectedDate, '2026-09-29'); assert.equal(renders, 1);
    const text = [...h.texts.values()].find(x => x.includes('Copy me'));
    assert.match(text, /- \[ \] Copy me/); assert.doesNotMatch(text, /routineId::/);
  }
});

test('rename preserves ID, order and inactive state even when parsing replaces runtime array', async () => {
  const h = harness(); const { api, plugin } = h;
  api.GROUP_PRESETS['개인'] = ['Before', 'Old', '기타'];
  plugin.loadTaxonomyIdentities({ taxonomy:{ categories:[{ name:'개인', id:'cat-personal', groups:[{ name:'Old', id:'stable-id' }] }] } });
  plugin.inactiveGroups['개인'] = new Set(['Old']);
  const file = h.put(`${api.DATA_FOLDER}/2026-09.md`, '## 2026-09-29\n- [x] Task #개인 [sourceGroup:: Old]\n');
  h.put(api.ROUTINE_PATH, '%% momo-routine: {"id":"r1","title":"Routine","category":"개인","group":"Old"} %%');
  api.momoLocalSet('momo.todo.lastGroup.개인', 'Old');
  plugin.saveRoutines = async routines => { h.texts.set(api.ROUTINE_PATH, routines.map(r => `%% momo-routine: ${JSON.stringify(r)} %%`).join('\n')); };
  plugin.syncRoutineOverview = async () => {};
  h.vault.onWrite = async f => {
    api.parseMonthFile(h.texts.get(f.path), f.path);
    api.ensureCategoryRuntime('개인');
    api.rememberGroupLocal('개인', 'Old', { persistDiscovery:true });
  };
  await plugin.renameGroup('개인', 'Old', 'New');
  assert.deepEqual(plain(api.GROUP_PRESETS['개인']), ['Before', 'New', '기타']);
  assert.equal(plugin.groupIds.get(plugin.taxonomyGroupKey('개인','New')), 'stable-id');
  assert.equal(plugin.groupIds.has(plugin.taxonomyGroupKey('개인','Old')), false);
  assert.equal(plugin.inactiveGroups['개인'].has('New'), true);
  assert.equal(api.momoLocalGet('momo.todo.lastGroup.개인'), 'New');
  assert.match(h.texts.get(file.path), /sourceGroup:: New/);
  assert.equal((await plugin.loadRoutines())[0].group, 'New');
  const savedGroups = plugin.saved.taxonomy.categories.find(c => c.name === '개인').groups;
  assert.equal(savedGroups.find(g => g.name === 'New').id, 'stable-id');
  assert.equal(savedGroups.some(g => g.name === 'Old'), false);
  api.parseMonthFile(h.texts.get(file.path), file.path);
  assert.equal(api.GROUP_PRESETS['개인'].includes('Old'), false);
});

test('failed group migration releases discovery guard and duplicate names do nothing', async () => {
  const h = harness();
  h.api.GROUP_PRESETS['개인'] = ['Old', 'Taken', '기타'];
  h.plugin.migrateGroupReferences = async () => { throw new Error('write failed'); };
  await h.plugin.renameGroup('개인', 'Old', 'Taken');
  await assert.rejects(h.plugin.renameGroup('개인', 'Old', 'New'), /write failed/);
  assert.equal(h.api.GROUP_PRESETS['개인'].includes('Old'), true);
  assert.equal(h.api.rememberGroupLocal('개인', 'Discovered', { persistDiscovery:true }), true);
});

test('manifest declares 0.9.62', () => {
  assert.equal(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8')).version, '0.9.62');
});
