# Elementor Reference

Contents:
1. Screenshot / mockup → Elementor mapping
2. Elementor editor via chrome-devtools
3. Without SSH (default): wp-admin backups and cache
4. WP-CLI over SSH (only when the user confirms SSH for the site)
5. Elementor MCP (V4 Atomic)
6. chrome-devtools cannot connect

Tool names are short; call them via `call_mcp_tool` with `ServerName: "chrome-devtools"` and `ToolName: "<tool>"` (schemas in `~\.gemini\antigravity\mcp\chrome-devtools\<tool>.json`). Every dangerous change follows the approval gate in SKILL.md.

---

## 1. Screenshot / Mockup → Elementor Mapping

Sources: screenshots or mockups (including Figma exports) pasted in chat, or a file path opened with `read_file`.

| Design element | Elementor equivalent | Implementation note |
| :--- | :--- | :--- |
| Frame / Section | Top-level Container (`Boxed` or `Full Width`) | Set a semantic HTML tag (`section`, `header`, …) |
| Row / Column / Auto Layout | Flexbox Container (`Direction`, `Justify`, `Align`, `Gap`) | Use `Gap` instead of child margins or Spacer widgets |
| Uniform Card Grid | Grid Container (`Columns`, `Rows`, `Gap`) | Reduce columns cleanly on Tablet/Mobile |
| Palette / Type Hierarchy | V3: Site Settings → Global Colors & Global Fonts. V4: Variables (Variables Manager) | Bind tokens first so changes cascade site-wide |
| Repeated styling (V4) | Global Class (Class Manager) | One class per repeated card/button style |
| Repeated Blocks | Saved Template / Global Widget (Pro) / Component (V4) | Keep one canonical version per repeating CTA or card |
| Outer Section Spacing | Container `Padding` (per breakpoint) | Reduce vertical and horizontal padding on Mobile |
| Hero / Card Imagery | Image widget (`object-fit: cover`) or Container background | Container background only for decorative backdrops; Image widget with `alt` for content photos |

### Pre-build checklist
- **Colors**: background, surface/card, primary text, muted text, primary CTA/accent, border.
- **Fonts**: display/heading family and weights, body family, H1–H6 size and line-height scale.
- **Layout**: container max-width (e.g. `1200px` / `1280px`), card border-radius, spacing steps (e.g. `16` / `24` / `48` / `80px`).
- **Breakpoints** (Elementor defaults; check Site Settings for custom ones): Mobile ≤ 767, Mobile Landscape ≤ 880, Tablet ≤ 1024, Tablet Landscape ≤ 1200, Laptop ≤ 1366, Widescreen ≥ 2400. Only Mobile and Tablet are on by default.
- After each major section, compare a `take_screenshot` of the frontend against the reference at Desktop, Tablet and Mobile.

---

## 2. Elementor Editor via chrome-devtools

- **Editor URL**: `https://<site>/wp-admin/post.php?post=<ID>&action=elementor`
- **New draft page**: `https://<site>/wp-admin/post-new.php?post_type=page` → Save Draft → *Edit with Elementor*.
- **Tab**: open it with `new_page`, and pass its `pageId` to every page tool.
- **Timing**: wait for the loading overlay to clear before `take_snapshot`. `wait_for` takes `text` as an **array** of short, distinctive substrings; text whose HTML has line breaks or repeated spaces may not match.
- **Two areas**:
  - **Left panel**: widget drawer, the **Structure** panel (formerly Navigator, toggled with `Ctrl+I`), and the Content / Style / Advanced tabs. Structure is the reliable way to select a nested container without misclicking.
  - **Canvas** (a same-origin iframe): `take_snapshot` includes its content, and `click` and `fill` work on uids inside it. An iframe shown as an empty `IframePresentational` node needs `take_snapshot` with `verbose: true`.
- **Scripts**: `evaluate_script` without `args` runs in the top document, which in the editor is the editor shell, not the page. Pass an iframe element's uid in `args` to run inside the canvas. Run layout checks on the frontend instead.
- **CSS questions**: `get_css_styles` on a uid shows the matched rules, the cascade and CSS variables.
- **Verify outside the editor**: open `?preview=true` or the permalink, then follow SKILL.md step 4.

### Editor scripting

Building by script through Elementor's own editor API is faster and more exact than clicking the panel. Everything below runs with `evaluate_script` in the editor shell (no `args`).

- **Load the helper** `scripts/el-set.js` once per editor load: copy both scripts to the OS temp folder once per session (`Copy-Item "~\.gemini\config\skills\wordpress-elementor\scripts\*.js" "$env:TEMP\"`), because `sourcePath` reads only from the session's folders and the temp folder; then `evaluate_script({ pageId, sourcePath: '<temp>/el-set.js', format: 'script' })`. All writes go through `elSet` / `elCreate`.
- **Read (token-efficient)**:
  - Run `await elAudit()` + `elTree()` in **one** `evaluate_script` call (`waitForStableDom: false`) instead of `take_snapshot` on the editor or multiple round-trips. `elAudit()` returns Elementor/Pro versions, V4 status, document info, and compact Global Color/Typography tokens (with `(resp)` flagged if tablet/mobile sizes exist); `elTree(id?, maxDepth?)` returns a compact Navigator-style tree.
  - Lower-level access when needed: `elementor.getContainer(id)` → `.children`, `.settings.get(key)`, `.settings.controls`, `.model.get('widgetType')` / `.model.get('elType')`; `elementor.widgetsCache[type].controls`; `elementor.$preview[0].contentDocument`. Common Advanced controls (`_padding`, `_css_classes`, `_attributes`, `_background_*`, `_border_*`) appear only on a created element's `.settings.controls`.
  - Global link format: `globals/colors?id=<id>` or `globals/typography?id=<id>`.
- **Write** (besides `elSet` / `elCreate`):
  - Move: `$e.run('document/elements/move', { container, target, options: { at } })`. A moved element gets a new id: read it again from `target.children`.
  - Delete: `$e.run('document/elements/delete', { container })`. Undo: `$e.run('document/history/undo')`.
- **Save**: on a draft, `await $e.run('document/save/draft')`, then `elementor.saver.isEditorChanged()` is `false`. On a published document, do **not** run `document/save/default` (or `document/save/draft`, since whether it leaves the live version untouched is unverified): leave the unsaved edit in the open editor tab so the user reviews it and clicks **Publish / Update** themselves.
- **REST audit queries**: when scanning `/wp-json/wp/v2/` inside `evaluate_script`, project only the needed fields (`id`, `slug`, `status`, matched URLs or short context snippets) instead of returning full `content.rendered` HTML blobs.
- **Classic / Block Editor (non-Elementor posts & pages)**:
  - For a published post or page edited in Classic Editor or Gutenberg, open `https://<site>/wp-admin/post.php?post=<ID>&action=edit` in its own tab, switch to Code/Text mode (or the relevant block), apply the edit in the editor field **without clicking Update**, and leave the tab open for the user to review and click **Update** themselves (for major rewrites, duplicate to a Draft first).
  - Never call `POST /wp-json/wp/v2/posts/<id>` or `/pages/<id>` on a published item unless the user explicitly asked you to publish on their behalf in that turn.
- **Gotchas**:
  - The Menu widget with dropdown containers is `mega-menu`; the WordPress Menu widget is `nav-menu`.
  - Attributes (`_attributes`, Elementor Pro) take one `key|value` per line, e.g. `role|button\ntabindex|0`.
  - Widget Background, Border and Padding style `> .elementor-widget-container`, not the widget wrapper.
  - Image Box `image_size` is the width of the image box; a wide icon in a narrow box renders smaller than a tall one. Size icons by height in CSS only after the box is wide enough.
  - Linking a Global Font drops the widget's own per-device sizes. Before linking one, check that the global has tablet and mobile sizes (`(resp)` in `elAudit()`); when it has only a desktop size, keep custom typography with tablet and mobile sizes instead.
  - Media upload: `POST /wp-json/wp/v2/media` with headers `X-WP-Nonce: wpApiSettings.nonce`, `Content-Disposition: attachment; filename="<name>"` and the file's `Content-Type`, then `POST /wp-json/wp/v2/media/<id>` with `{ title, alt_text }`. For local files, build a script in the temp folder that carries them as base64.

### Frontend checks

`scripts/page-check.js` runs on the frontend (permalink or `?preview=true`), loaded the same way as `el-set.js`: copy it to `$env:TEMP`, then `evaluate_script({ pageId, sourcePath: '<temp>/page-check.js', format: 'script' })`, once per page load.

- `sectionBg(id)`: the background a visitor sees for a section and where it is set (`section`, `inner` container, or `page`).
- `auditNeighbors(id)`: the section next to the ones above and below: background, content width, padding, fonts in use, H1–H3 styles, and the visible gap above and below.
- `await shootPrep(selector, offset)`: loads every lazy image, waits for layout to settle, then scrolls the element to `offset` px from the top. Call it right before each section `take_screenshot`.
- `await measureAt(widths, selector, settleMs?)`: loads the page in a hidden same-origin iframe per width and returns `scrollsX` (real sideways scroll), `iw`, `sw`, and size/position of every visible `selector` match in **one** call without `emulate`. Pick widths at least 20 px inside each breakpoint (iframe scrollbar narrows `iw` by ~15 px).
- `assetCheck()`: compact summary of broken/pending images and loaded/failed font families. Run this before calling `list_network_requests` so you avoid dumping 100+ asset URLs into context when everything loaded cleanly.
- `templateCheck()`: `{ docs, bodyTemplate, singleTemplateMissing }`, the Theme Builder documents that rendered (`header:6754`, `single-post:637`, …). Run it on the **published** URL: Elementor previews can omit the single template. `singleTemplateMissing: true` on a post usually means its Post → Template is `Default` while the site's posts use `Elementor Theme`.

---

## 3. Without SSH (default): wp-admin Backups and Cache

- **Backup before edits**: duplicate the page, or save it as a template (*Save as Template*, export from Templates → Saved Templates). Roll back with the editor's **Revisions** panel.
- **Clear the cache** (dangerous, needs approval): Elementor → Tools → General → Elementor Cache → **Clear Files & Data**. Clear any page or CDN cache afterwards, then check the uncached frontend.
- **Change URLs** (dangerous, needs approval): Elementor → Tools → Replace URL. It has no preview, so back up first.

---

## 4. WP-CLI over SSH (only when the user confirms SSH for the site)

- **Approvals**: reads, backups and `--dry-run` runs need none. Every write (search-replace without `--dry-run`, `replace-urls`, meta updates, `flush-css`, restores) is a dangerous change and needs approval.
- **Running it**: the user gives the host and path. Use `wp --ssh=<user>@<host><path> <command>`, or `ssh <host> "cd <path> && wp <command>"`. Run redirects such as `> backup.json` from Git Bash, not Windows PowerShell 5.1, so the file keeps its encoding.

```bash
# Table prefix: never assume wp_
wp db prefix

# Elementor-built pages, posts and templates
wp post list --post_type=page,post,elementor_library --meta_key=_elementor_edit_mode \
  --meta_value=builder --fields=ID,post_title,post_name,post_status,post_type

# Backups (reads, no approval needed)
wp db export pre-change.sql
wp post meta get <POST_ID> _elementor_data > elementor-backup-<POST_ID>.json

# URL change (write: approval). No dry-run, so run db export first. It also clears the Elementor cache.
wp elementor replace-urls https://old.example https://new.example

# Text change: dry-run first, review the rows, then rerun without --dry-run (write: approval)
wp search-replace "Old Copy" "New Copy" <prefix>postmeta \
  --include-columns=meta_value --dry-run --report-changed-only

# Regenerate Elementor CSS (write: approval)
wp elementor flush-css --regenerate
```

- **Why not search-replace for URLs**: `_elementor_data` is JSON with escaped slashes (`https:\/\/…`) and escaped non-ASCII (`ñ` → `\u00f1`). Stable WP-CLI 2.12.0 bundles search-replace 2.1.8, which does not match those forms; only search-replace 3.0.x does. Check with `wp cli version`.
- **`--include-columns=meta_value`** touches every meta row of every plugin, because search-replace cannot filter by `meta_key`.
- **Restore**: `wp post meta update … < backup.json` corrupts the JSON (WordPress unslashes it). Prefer the Revisions panel. Otherwise run (write: approval; untested): `wp eval 'update_post_meta(<ID>, "_elementor_data", wp_slash(file_get_contents("elementor-backup-<ID>.json")));'`, then `wp elementor flush-css --regenerate`.
- **If the Elementor CLI fails**: `wp eval '\Elementor\Plugin::$instance->files_manager->clear_cache();'` (write: approval; untested), or use the wp-admin route in §3.

### Safe vs risky for search-replace
- **Low risk**: plain ASCII heading or paragraph copy with no quotes, slashes or HTML; phone, email and address swaps.
- **Avoid**: URLs (use `replace-urls`), widget IDs, JSON keys or structure, layout properties, `elType`/`widgetType`, and shared Global Widgets before checking every page that uses them.

---

## 5. Elementor MCP (V4 Atomic)

- **Requirements**: WordPress 6.8+ and Elementor Core and Pro 4.3.0+. It builds only V4 Atomic elements; V3 widget layouts still go through the editor.
- **Setup is the user's job**: Elementor → Elementor MCP → **Enable MCP access** → **Claude Code** tab → **Generate Prompt**. This creates an application password, which the user handles. Access is revoked under Users → Profile → Application Passwords, or with *Turn off MCP access*.
- **What it does**: creates and assigns Global Classes, reads and updates design tokens, uploads media, clears the cache, and undoes through revisions.
- **Writes**: list the planned writes first (page, elements, classes, variables) and get approval. A write outside the approved list asks again. Token updates count as site-wide design changes.

---

## 6. chrome-devtools Cannot Connect

Symptoms: `list_pages` or `new_page` fails (`Could not find DevToolsActivePort`, `Network.enable timed out`), or a blank Chrome with none of the user's tabs appears. Stop and ask the user to check:

1. Chrome (stable) is running.
2. `chrome://inspect/#remote-debugging` has remote debugging enabled.
3. The **Allow** prompt Chrome shows on each new connection was clicked.
4. Claude Code or any other DevTools client is detached from this Chrome (one client per Chrome is the safe assumption).

Then retry with `list_pages` alone. Still failing: follow the `troubleshooting` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\troubleshooting\SKILL.md`).
