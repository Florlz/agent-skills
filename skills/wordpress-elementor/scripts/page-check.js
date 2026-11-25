// page-check.js: frontend checks for an Elementor page (run on the live page or ?preview=true, not the editor).
// Load once per page load:
//   evaluate_script({ pageId, sourcePath: '<temp>/page-check.js', format: 'script' })
//
//   sectionBg(id)                -> the background a visitor actually sees for a section, and where it is set
//   auditNeighbors(id)           -> the section beside the ones above and below: bg, width, padding, gaps, fonts, headings
//   await shootPrep(sel, offset) -> loads every image, waits for layout to settle, scrolls sel to `offset` px from the top
//   await measureAt(widths, sel) -> per width: scrollsX (real sideways scroll), iw, sw and size/position of every visible `sel` match
//   assetCheck()                 -> { totalImgs, pendingImgs, brokenImgs, loadedFonts, failedFonts }; use before list_network_requests
//
// `id` is an Elementor data-id. Sections are the page's top-level containers.
(() => {
  const byId = id => {
    const e = document.querySelector(`[data-id="${id}"]`);
    if (!e) throw new Error(`page-check: no element data-id="${id}"`);
    return e;
  };
  const visible = e => e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const hasBg = s => s.backgroundColor !== 'rgba(0, 0, 0, 0)' || s.backgroundImage !== 'none';
  const describe = e => {
    const s = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      at: e.dataset.id || e.className.split(' ')[0],
      color: s.backgroundColor,
      image: s.backgroundImage === 'none' ? '' : s.backgroundImage.slice(0, 60),
      width: Math.round(r.width),
      fullWidth: r.width >= document.documentElement.clientWidth - 2,
    };
  };

  // Elementor nests backgrounds: on the section, its .e-con-inner, or a container inside an embedded template.
  // The first visible, painted box covering most of the section is what a visitor sees; fall back to the page.
  window.sectionBg = id => {
    const sec = byId(id);
    const h = sec.getBoundingClientRect().height;
    const boxes = [sec, ...sec.querySelectorAll('.e-con, .e-con-inner, .elementor-widget-template, [data-elementor-type]')];
    const painted = boxes.filter(e => visible(e) && hasBg(getComputedStyle(e)) && e.getBoundingClientRect().height >= h * 0.6);
    if (painted.length) return { ...describe(painted[0]), source: painted[0] === sec ? 'section' : 'inner' };
    for (let p = sec.parentElement; p; p = p.parentElement) {
      if (hasBg(getComputedStyle(p))) return { ...describe(p), source: 'page' };
    }
    return { color: 'rgb(255, 255, 255)', source: 'browser default' };
  };

  const topSections = sec => [...sec.parentElement.children].filter(e => e.dataset.id && visible(e));
  const contentEdges = sec => {
    const leaves = [...sec.querySelectorAll('.elementor-widget')].filter(w => visible(w) && w.getBoundingClientRect().height > 0);
    if (!leaves.length) return null;
    return {
      top: Math.min(...leaves.map(w => w.getBoundingClientRect().top)),
      bottom: Math.max(...leaves.map(w => w.getBoundingClientRect().bottom)),
    };
  };
  const fonts = sec => {
    const count = {};
    sec.querySelectorAll('h1,h2,h3,h4,h5,h6,p,span,a,li,button').forEach(e => {
      if (!visible(e) || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) return;
      const s = getComputedStyle(e);
      const key = `${s.fontFamily.split(',')[0].replace(/"/g, '')} ${s.fontWeight}`;
      count[key] = (count[key] || 0) + 1;
    });
    return count;
  };
  const headings = sec => [...sec.querySelectorAll('h1,h2,h3')].filter(visible).slice(0, 3).map(e => {
    const s = getComputedStyle(e);
    return `${e.tagName} "${e.innerText.trim().slice(0, 30)}" ${s.fontFamily.split(',')[0].replace(/"/g, '')} ${s.fontWeight} ${s.fontSize}`;
  });
  const row = sec => {
    const inner = sec.querySelector(':scope > .e-con-inner') || sec;
    const s = getComputedStyle(inner);
    return {
      id: sec.dataset.id,
      bg: sectionBg(sec.dataset.id),
      contentWidth: Math.round(inner.getBoundingClientRect().width),
      padding: `${s.paddingTop} / ${s.paddingBottom}`,
      fonts: fonts(sec),
      headings: headings(sec),
    };
  };

  // Compare a section with its neighbours. gapAbove / gapBelow = visible space between the last content of one
  // section and the first content of the next, which is what reads as "too much space" when backgrounds match.
  window.auditNeighbors = id => {
    const sec = byId(id);
    const list = topSections(sec);
    const i = list.indexOf(sec);
    const prev = list[i - 1], next = list[i + 1];
    const gap = (a, b) => {
      const ea = a && contentEdges(a), eb = b && contentEdges(b);
      return ea && eb ? Math.round(eb.top - ea.bottom) : null;
    };
    return {
      above: prev ? row(prev) : null,
      section: { ...row(sec), gapAbove: gap(prev, sec), gapBelow: gap(sec, next) },
      below: next ? row(next) : null,
    };
  };

  // Lazy images change page height after a scroll, so a screenshot taken straight after scrollIntoView
  // lands on the wrong spot. Load everything, wait for layout to settle, then scroll.
  window.shootPrep = async (sel, offset = 60) => {
    const target = document.querySelector(sel);
    if (!target) throw new Error(`page-check: no element "${sel}"`);
    const imgs = [...document.images];
    imgs.forEach(img => { img.loading = 'eager'; });
    await Promise.race([
      Promise.all(imgs.map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; }))),
      new Promise(r => setTimeout(r, 6000)),
    ]);
    const go = () => window.scrollTo(0, target.getBoundingClientRect().top + window.scrollY - offset);
    go();
    await new Promise(r => setTimeout(r, 500));
    go();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return { top: Math.round(target.getBoundingClientRect().top), pending: imgs.filter(i => !i.complete).length };
  };

  // Load this page in a hidden same-origin iframe per width and measure every visible match of `sel`, so one call
  // covers all breakpoints without emulate (which reloads, times out and resets). Breakpoints follow the iframe width;
  // the iframe's own scrollbar narrows iw by ~15px, so pick widths at least 20px inside each breakpoint.
  window.measureAt = async (widths, sel, settleMs = 1500) => {
    const out = {};
    for (const w of widths) {
      const f = document.createElement('iframe');
      f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:900px;opacity:0;pointer-events:none;border:0`;
      f.src = location.href;
      document.body.appendChild(f);
      await new Promise(r => { f.onload = r; });
      await new Promise(r => setTimeout(r, settleMs));
      const d = f.contentDocument, win = f.contentWindow;
      // sw alone over-reports: shape dividers run wider than the page under body { overflow-x: hidden }.
      win.scrollTo(99999, 0);
      const scrollsX = win.scrollX > 0;
      out[w] = {
        iw: win.innerWidth,
        sw: d.documentElement.scrollWidth,
        scrollsX,
        items: [...d.querySelectorAll(sel)].filter(visible).map(e => {
          const b = e.getBoundingClientRect();
          return {
            id: e.dataset.id || '',
            label: (e.innerText || '').trim().split('\n')[0].slice(0, 24),
            w: Math.round(b.width * 10) / 10, h: Math.round(b.height), x: Math.round(b.left),
          };
        }),
      };
      f.remove();
    }
    return out;
  };

  // complete + naturalWidth 0 = failed load; incomplete = still lazy or loading.
  window.assetCheck = () => {
    const imgs = [...document.images];
    const fontList = status => [...new Set([...document.fonts].filter(f => f.status === status).map(f => `${f.family.replace(/"/g, '')} ${f.weight}`))];
    return {
      totalImgs: imgs.length,
      pendingImgs: imgs.filter(i => !i.complete).length,
      brokenImgs: imgs.filter(i => i.complete && i.naturalWidth === 0)
        .map(i => ({ src: (i.currentSrc || i.src || '').slice(0, 120), alt: (i.alt || '').slice(0, 40) })),
      loadedFonts: fontList('loaded'),
      failedFonts: fontList('error'),
    };
  };

  // Which Theme Builder documents rendered. A single post without a 'single-post' doc shows body text only.
  window.templateCheck = () => {
    const docs = [...document.querySelectorAll('[data-elementor-type]')]
      .map(e => `${e.dataset.elementorType}:${e.dataset.elementorId}`);
    const isSingle = document.body.classList.contains('single');
    return {
      docs,
      bodyTemplate: document.body.className.match(/(post|page)-template-\S+|elementor-template-\S+/g) || [],
      singleTemplateMissing: isSingle && !docs.some(d => d.startsWith('single-post:') || d.startsWith('single:')),
    };
  };

  return 'page-check loaded: sectionBg, auditNeighbors, shootPrep, measureAt, assetCheck, templateCheck';
})();
