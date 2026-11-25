// el-set.js: checked setters for the Elementor editor (V3 widgets and containers).
// Load once per editor tab, then call the helpers from evaluate_script:
//   evaluate_script({ pageId, sourcePath: '<skill>/scripts/el-set.js', format: 'script' })
//
//   elSet(idOrContainer, settings, globals?)   -> { key: { before, after } }
//   elCreate(parentIdOrContainer, model, at?)  -> new container
//   elTree(idOrRoot?, maxDepth = 4)            -> compact { id, type, label?, tag?, children | childCount } tree (read-only)
//   await elAudit()                            -> { version, proVersion, v4Atomic, doc, globals } in one call (read-only)
//
// elSet and elCreate refuse unknown control names (e.g. `object_fit` on an Image widget; the real
// control is `object-fit`) and option values the control does not offer, before
// anything is written. Globals go in the separate `globals` argument and are merged
// into the element's existing `__globals__`, so other global links survive.
// Unlink a global by passing it as '' : elSet(id, { typography_font_size: {...} }, { typography_typography: '' }).
(() => {
  const label = c => `${c.model.get('widgetType') || c.model.get('elType')} ${c.id}`;
  const resolve = t => {
    const c = typeof t === 'string' ? elementor.getContainer(t) : t;
    if (!c) throw new Error(`el-set: no element "${t}" in this document`);
    return c;
  };

  const check = (c, settings, globals) => {
    const controls = c.settings.controls;
    const errors = [];
    if ('__globals__' in settings) errors.push('pass globals as the third argument; el-set merges them into __globals__');
    const test = (key, value, isGlobal) => {
      const ctl = controls[key];
      if (!ctl) return errors.push(`unknown control "${key}" on ${label(c)}`);
      if (isGlobal) {
        if (value !== '' && !/^globals\/(colors|typography)\?id=/.test(value)) errors.push(`global "${key}" = "${value}" is not a globals/colors?id= or globals/typography?id= link`);
        return;
      }
      if (ctl.options && typeof value === 'string' && value !== '' && !(value in ctl.options)) {
        errors.push(`"${key}" = "${value}" on ${label(c)}; options: ${Object.keys(ctl.options).filter(Boolean).join(', ')}`);
      }
    };
    for (const [k, v] of Object.entries(settings)) if (k !== '__globals__') test(k, v, false);
    for (const [k, v] of Object.entries(globals || {})) test(k, v, true);
    if (errors.length) throw new Error('el-set refused, nothing written:\n' + errors.join('\n'));
  };

  window.elSet = (target, settings = {}, globals) => {
    const c = resolve(target);
    check(c, settings, globals);
    const before = Object.fromEntries(Object.keys(settings).map(k => [k, c.settings.get(k)]));
    const oldGlobals = { ...(c.settings.get('__globals__') || {}) };
    const payload = { ...settings };
    if (globals) payload.__globals__ = { ...oldGlobals, ...globals };
    $e.run('document/elements/settings', { container: c, settings: payload });
    const out = {};
    for (const k of Object.keys(settings)) out[k] = { before: before[k], after: c.settings.get(k) };
    if (globals) out.__globals__ = { before: oldGlobals, after: c.settings.get('__globals__') };
    return out;
  };

  window.elCreate = (parent, model, at) => {
    const p = resolve(parent);
    const { settings = {}, ...rest } = model;
    const { __globals__: globals, ...plain } = settings;
    const c = $e.run('document/elements/create', { container: p, model: { ...rest, settings: {} }, options: { at: at ?? p.children.length } });
    try { elSet(c, plain, globals); } catch (e) { $e.run('document/elements/delete', { container: c }); throw e; }
    return c;
  };

  window.elTree = (root, maxDepth = 4) => {
    const walk = (c, d) => {
      const s = c.settings;
      const node = { id: c.id, type: c.model.get('widgetType') || c.model.get('elType') };
      const title = s.get('_title') || s.get('title') || s.get('text') || '';
      if (typeof title === 'string' && title.trim()) node.label = title.replace(/<[^>]+>/g, '').trim().slice(0, 36);
      const tag = s.get('html_tag');
      if (tag) node.tag = tag;
      if (d < maxDepth && c.children?.length) node.children = c.children.map(ch => walk(ch, d + 1));
      else if (c.children?.length) node.childCount = c.children.length;
      return node;
    };
    if (root) return walk(resolve(root), 0);
    const doc = elementor.documents?.getCurrent()?.container;
    return doc ? doc.children.map(ch => walk(ch, 1)) : [];
  };

  window.elAudit = async () => {
    const doc = elementor.config?.document || {};
    let globals;
    try {
      const api = window.wpApiSettings || {};
      const r = await fetch((api.root || '/wp-json/') + 'elementor/v1/globals', { headers: api.nonce ? { 'X-WP-Nonce': api.nonce } : {} });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const g = await r.json();
      const size = v => v?.size ? `${v.size}${v.unit || 'px'}` : '';
      globals = {
        colors: Object.fromEntries(Object.entries(g.colors || {}).map(([k, v]) => [k, `${v.title}: ${v.value}`])),
        typography: Object.fromEntries(Object.entries(g.typography || {}).map(([k, v]) => {
          const t = v.value || {};
          // (resp): the Global Font has its own tablet/mobile sizes, so linking it keeps per-device sizing.
          const resp = t.typography_font_size_tablet?.size || t.typography_font_size_mobile?.size ? ' (resp)' : '';
          return [k, `${v.title}: ${t.typography_font_family || ''} ${t.typography_font_weight || ''} ${size(t.typography_font_size)}`.replace(/\s+/g, ' ').trim() + resp];
        })),
      };
    } catch (e) { globals = { error: `globals fetch failed: ${e.message}` }; }
    return {
      version: elementor.config?.version,
      proVersion: window.elementorPro?.config?.version || null,
      v4Atomic: Boolean(elementor.config?.experimentalFeatures?.e_atomic_elements),
      doc: { id: doc.id, type: doc.type, status: doc.status?.value, preview: doc.urls?.preview },
      globals,
    };
  };

  return 'el-set loaded: elSet, elCreate, elTree, elAudit';
})();
