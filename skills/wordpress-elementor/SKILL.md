---
name: wordpress-elementor
description: Builds, edits and audits WordPress sites in Elementor (V3 widgets and containers, V4 Atomic) through wp-admin in the user's Chrome, and keeps a per-site log of every change and recommendation. Use when creating or changing Elementor pages or templates, recreating a reference screenshot or mockup (including Figma exports) in Elementor, setting Global Colors/Fonts or Variables/Classes, checking responsive layouts, fixing Elementor CSS or cache issues, recommending plugins or settings for a WordPress site, or reviewing what was changed on a site.
---

# WordPress Elementor

Build clean, maintainable, responsive Elementor pages that keep site-wide design tokens, a shallow DOM, accessibility and performance, and leave the user a written record of every change.

- Tools below use short names from the `chrome-devtools` MCP server (invoked via `call_mcp_tool` with `ServerName: "chrome-devtools"` and `ToolName: "<tool>"`; schemas live in `~\.gemini\antigravity\mcp\chrome-devtools\<tool>.json`).
- Mapping tables, Elementor & Classic/Block editor notes, WP-CLI, Elementor MCP and connection troubleshooting: [references/elementor-reference.md](references/elementor-reference.md).
- Layout, styling, accessibility, responsive, performance and data-safety rules (read when building, redesigning or auditing): [references/build-standards.md](references/build-standards.md).

## Browser

| Task | Tool |
|---|---|
| wp-admin, Elementor, logged-in pages, frontend checks (layout, console, network, CSS, viewports, screenshots) | `chrome-devtools` MCP (`ServerName: "chrome-devtools"`) |
| Read-only lookups that need no login (docs, `wordpress.org` plugin pages) | `search_web` or HTTP fetch (or the `browser` subagent if JS rendering is needed) |

- `chrome-devtools` attaches (`--autoConnect`) to the Chrome the user already runs: the default profile with its tabs and logins. It launches no browser of its own, whatever generic skills say. Starting Chrome is the user's job: reach it only through `chrome-devtools`, because a `chrome.exe` started from PowerShell or Bash opens a separate profile without the user's logins (and runs isolated from the user's active desktop session). Do not use the `browser` subagent for wp-admin, Elementor, or any task needing the user's Chrome session or logins.
- autoConnect is configured in `%LOCALAPPDATA%\Google\cd4a\config.json` and `~\.gemini\config\mcp_config.json`. The user owns both files: read them only when diagnosing, never modify them directly, and put any change to the user as a proposal in chat.
- **Tabs**: start each job with `list_pages`. When an open tab already shows the URL the step needs (the editor, the draft preview, the page), work in that tab: pass its `pageId` to every page tool, reload it when needed, keep it on its URL, and reset `emulate` when done. When no open tab shows that URL, open one with `new_page` (pass `background: true` for read-only audits and screenshot passes so the user's active tab stays undisturbed) and leave it open at the end. Every other tab of the user's is read-only (`list_pages`, `take_snapshot`).
- **Viewports**: `emulate` with `viewport` (`1440x900x1`, `768x1024x1,mobile,touch`, `390x844x1,mobile,touch` — keep `1x` for full-page screenshots so tall pages don't hit Chrome's 16,384 px texture limit). Batch all Desktop checks before switching once to Mobile, and call `emulate` without `viewport` immediately afterwards to reset. (`resize_page` resizes the user's real window.)
- When `list_pages` or `new_page` fails, or a blank Chrome without the user's tabs appears, stop and follow reference §6.
- Generic tool workflow (navigate → `wait_for` → `take_snapshot` → act by `uid`): `chrome-devtools` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\chrome-devtools\SKILL.md`).

## Token & speed hygiene

- **Avoid `take_snapshot` on the Elementor editor**: editor/WP-Admin a11y trees easily burn 15k–40k tokens per call. Inspect Elementor structure and tokens with `elAudit()` / `elTree()` via `evaluate_script` (`waitForStableDom: false` for reads). When `take_snapshot` is needed on WP-Admin, pass `filePath: "$env:TEMP\\snap.txt"` and search only matching lines instead of dumping the full tree into context.
- **Screenshots to disk, not inline**: always pass `filePath` to `take_screenshot`, and `read_file` only the specific shots you need to inspect visually. During iterative layout fixes, use `measureAt()` + `auditNeighbors()` and viewport section shots (`format: "webp"`, `quality: 80`) rather than repeated `fullPage: true` PNGs; save `fullPage: true` PNGs only for before/after archival.
- **Partial site-log reads & archiving**: logs are newest-first. Read only `## Recommendations` and the top 2–3 `## Changes` entries (e.g. `StartLine: 1, EndLine: 120`) instead of loading a 40 KB+ file. When a site log crosses ~300 lines, move older `## Changes` entries to `~\wordpress-sites\<site-key>-archive-<year>.md` and leave a link to the archive at the bottom of `## Changes`.
- **Batch `evaluate_script` calls**: combine read-only checks into one call, and batch a section's `elSet` / `elCreate` writes into one call returning a compact summary. On the frontend, run `assetCheck()` first and call `list_network_requests` only if `assetCheck()` flags broken assets or you need HTTP status codes.
- **Narrow REST fields**: request only the fields you need from `/wp-json/wp/v2/` (`?_fields=id,title,status,link`), and name meta keys one by one (`_fields=id,template,meta.footnotes`): a bare `meta` on an Elementor post returns the whole `_elementor_data`.

## Plan first: no edit before the user approves the plan

Every request that would change a site (editor changes included, even unsaved ones) starts read-only. Do not create, move, restyle or delete anything until the user says go in chat.

1. **Gather context (read-only)**: find the exact elements involved (template or page name and ID, widget type, element IDs, Navigator path), their current settings, and the pattern the site already uses for similar things (for example, how a sibling dropdown is built). Note publish status: a published template goes live on the next Publish.
2. **Blast radius**: list everything the change touches or could affect: every copy of the element (duplicate menus, desktop and mobile variants), shared WordPress menus, global styles or classes, other pages using the template, links that must survive, and responsive breakpoints. Also say what stays untouched.
3. **Show the plan and stop**: post the plan in the format below, then end the turn and wait. A plan approved for one change does not cover follow-up tweaks: each new change gets its own short plan. Read-only checks (snapshots, reading settings) need no approval.

Plan and change-report format: written so the user can do it by hand in the Elementor editor without the agent.

```markdown
**Target:** <site> · <template/page (ID)> · <published/draft>
**Reference spec:** <the measured table from Workflow step 2, when there is a reference image>
**Blast radius:** <what is affected, every copy, what stays untouched>

**Steps** (for each element copy):
1. Navigator → <path, e.g. Menu → Products → Container → right Container>
2. <Tab: Content/Style/Advanced> → <section> → <control> = <value> (device: Desktop/Tablet/Mobile)
3. Add <widget> at <position>: <every non-default setting with exact values>
4. Custom CSS (Advanced → Custom CSS), only for what no control can do, with the reason per rule: <the full CSS in a code block>

**Check:** <what to look at afterwards, on which devices>
**Not changed / risks:** <links, menus, publish state, anything unverified>
```

After an approved change, the change report repeats these steps with the values actually used, so the user can reproduce or undo the change by hand.

## Approval gate

**Publishing is always the user's action.** Never click **Publish / Update**, run `document/save/default`, or push a REST/WP-CLI update directly to a published page, post or template. Instead, prepare the change in the open Elementor or WordPress editor (or on a saved Draft/duplicate), leave the editor tab open to the changed element for review, and hand over so **the user clicks Publish / Update themselves** (only publish on their behalf if they explicitly ask you to click Publish in chat).

Saving drafts and editing a draft or duplicated page need no approval. Every other item below is a **dangerous change**: describe exactly what will change (site, environment, page or setting, before → after) and wait for the user's explicit approval in chat. This holds on staging and production alike.

- **Unpublish / delete**: unpublish any page, post or template; delete or trash pages, posts, templates or media.
- **Site-wide design**: Site Settings, Global Colors/Fonts, V4 Variables/Classes, Theme Builder header/footer, Global Widgets/Components.
- **Plugins / settings**: install, update or activate plugins or themes; Elementor Settings or Experiments; WordPress settings such as permalinks, users and roles.
- **Bulk / tool writes**: any WP-CLI write, any Elementor MCP write, any Elementor Tools action (Clear Files & Data, Replace URL).

One approval covers the one change described. The next dangerous change asks again.

## Site log

One Markdown file per site: `~\wordpress-sites\<site-key>.md`, where `<site-key>` is the host without `www.` — or `<domain>-<subfolder>` when a shared staging host serves multiple sites under subfolders (e.g. `staging.example.com-site.md`). Staging and production get separate files. Screenshots go in `~\wordpress-sites\<site-key>\`. Create both on the first change (`New-Item -ItemType Directory -Force -Path "~\wordpress-sites\<site-key>"`), starting the file from this template. Newest entries go first in each section. Claude Code writes to the same site logs: add your entries in the exact same format, and never rewrite or reformat entries that are already there.

```markdown
# <site-key>

## Recommendations

### R1 · Install <plugin> · proposed
- What: <the exact action>
- Why: <the problem it solves; what is already installed and why it falls short>
- Risk / impact: <conflicts, performance, data it touches, effect on the live site>
- Cost / license: <free / paid, price, license>
- Undo: <how to reverse it>
- History: proposed 2026-11-14

## Changes

### 2026-11-14 · <job title> · <staging|production>
| Page or setting | Before | After | Link |
|---|---|---|---|
| Home (ID 12), hero H1 | "Old copy" | "New copy" | [preview](https://…/?p=12&preview=true) |

- Approval: <not needed (draft) / approved in chat: "<user's words>">
- Screenshots: [desktop before](<site-key>/2026-11-14-home-desktop-before.png) · [desktop after](<site-key>/2026-11-14-home-desktop-after.png) · [mobile before](…) · [mobile after](…)
- Recommendations: <R-IDs added or updated, or none>
```

## Change report

Every change to a site gets reported, drafts included. Report at the end of every turn in which anything on a site changed, and right after each approved dangerous change.

1. **Before the first edit** of a change set, note each before value (copy, setting, plugin version, page status). For a **visual or layout change**, take frontend screenshots at Desktop and Mobile with `fullPage: true` and `filePath` set to the OS temp folder (`$env:TEMP\<site-key>-<date>-<page>-<viewport>-before.png`); `chrome-devtools-mcp` writes files only inside workspace folders and the OS temp folder (`$env:TEMP`). Skip screenshots for purely non-visual edits (link `href`, SEO meta, alt text, backend settings) and verify those via DOM + HTTP status instead.
2. **After the change**, take the matching `-after` screenshots (when visual), then move them with PowerShell:
   ```powershell
   $siteDir = "~\wordpress-sites\<site-key>"
   New-Item -ItemType Directory -Force -Path $siteDir | Out-Null
   Move-Item "$env:TEMP\<site-key>-<date>-*" $siteDir
   ```
3. **Show the table in chat**: site and environment, page or setting, before → after, and a link (draft preview, permalink, Revisions panel or the wp-admin screen). Under it, the manual steps in the "Plan first" format with the values actually used. List the saved screenshot paths below that. Include failed or reverted changes, marked as such.
4. **Add the same entry** to the site log under `## Changes` (newest entries first, preserving all existing entries as-is).

Done when: every change made this turn has a row in chat and in the log, and every visual/layout change has before and after screenshots in `~\wordpress-sites\<site-key>\`.

## Recommendations

Anything you suggest that needs the user's decision is a **recommendation**: installing, replacing or removing a plugin or theme, changing an Elementor or WordPress setting (including the performance audit below), a caching, hosting or CDN change.

- Check the log's open recommendations first, and update an existing one instead of adding a duplicate.
- For a plugin, check its `wordpress.org` or vendor page (`search_web`, HTTP fetch, or the `browser` subagent if JS rendering is needed): last update, tested-up-to WordPress version, active installs, and whether a plugin already on the site covers the need.
- Add it to the log with status **proposed**, filling every field of the template (newest first, leaving existing entries untouched), and show it in chat with the same fields.
- Acting on it follows the approval gate. Update its status and `History` line as it moves: **approved** (with the date), **done** (with a link to its Changes entry), or **rejected** (with the user's reason).

## Workflow

1. **Start the job**
   - Ask whether the site is **staging or production**, and name it in every approval request.
   - Ask whether this site has SSH with WP-CLI. Default: no SSH, wp-admin only.
   - Read the top of `~\wordpress-sites\<site-key>.md` if it exists (`## Recommendations` + top 2–3 `## Changes` entries). Mention open recommendations that bear on this job.
   - Check Elementor/Pro versions, V4 Atomic status, Elementor MCP status, and site tokens (V3 Global Colors/Fonts/Layout/Breakpoints; V4 Variables/Classes) — in an open Elementor editor tab, load `scripts/el-set.js` and run `await elAudit()` + `elTree()` in one `evaluate_script` call.
   - Work on a **Draft** or a duplicated page. Back it up first: duplicate the page or save it as a template; with SSH, also back up `_elementor_data` (reference §4).
   - Done when: environment, SSH status, V3/V4 and MCP status, the token list and open recommendations are known, and the target is a backed-up draft or duplicate.

2. **Map structure before styling**
   - Read the reference screenshots or mockups (images pasted in chat, or a file path opened with `read_file`).
   - Measure them into a **reference spec** table before planning:
     - Colors: sample every background, card, border, text and accent color from the image's pixels (Pillow `Image.open(path).convert('RGB').getpixel((x, y))`).
     - Sizes: measure font sizes, gaps, padding, card and image heights in the image, then scale by (real content width ÷ content width in the image), e.g. 1140 ÷ 1010.
     - Type: name the font family (or the closest Google Font), weights, case (uppercase or not) and text alignment of every text style.
     - Layout: columns per breakpoint, and which parts are boxes (border or fill) versus bare.
   - Break the design into top-level Containers with semantic HTML tags, in reading order. Use reference §1.
   - **Neighbour audit**, when a section or template goes into an existing page: load `scripts/page-check.js` on the frontend (reference §2, "Frontend checks") and run `auditNeighbors(<section id>)`. Add each row to the reference spec as *match* or *intentional difference*: section background and width, font families and weights, card background and border, title size per device, and the visible gap above and below.
   - Done when: every section is listed with its container type, HTML tag and columns per breakpoint, every color, size and font it uses comes from the reference spec table, and every neighbour-audit row is marked; the table goes into the plan.

3. **Build through the right channel**
   - Only after the user approved the plan (see "Plan first"). Read [references/build-standards.md](references/build-standards.md) before creating or restyling layouts.
   - Take the before values (and before screenshots for visual changes) first (Change report step 1).
   - V4 page with Elementor MCP connected: build atomic elements, classes and variables through Elementor MCP. List the planned writes first and get approval (reference §5).
   - Elementor V3 page: build in the Elementor editor with `chrome-devtools` (reference §2). Create and change elements by script only through `scripts/el-set.js` (reference §2, "Editor scripting").
   - Classic / Block Editor post or page: stage the edit in the open `post.php?post=<ID>&action=edit` tab without clicking Update (reference §2).
   - Bind every color and font to a Global Color/Font (V3) or a Variable (V4).
   - Save Draft after each section (never save/publish a published document yourself).
   - Done when: every mapped section exists on the draft or is staged cleanly in the open editor tab.

4. **Verify on the frontend**
   - Open the draft preview (`?preview=true`) or the permalink in the job's tab. The editor is a different document, so checks there prove nothing.
   - When a page/CDN cache (WP Rocket, Sucuri, Cloudflare) is active and not purged, verify with a cache-busting query string (e.g. `?nocache=1`) and report in handover if the un-parameterized URL is still serving cached HTML.
   - On a single post, run `templateCheck()` on the **published** URL after the user publishes: `singleTemplateMissing: false` means the site's single-post template rendered (previews can omit it).
   - Every statement about how the page looks (a background, a color, a gap) rests on a screenshot of that spot; read backgrounds with `sectionBg(id)`, since Elementor often paints them on an inner container.
   - Measure every breakpoint and check assets in one `evaluate_script` pass using `scripts/page-check.js`: `await measureAt([1440, 1280, 900, 390], <selector>)` (one width inside each of the site's breakpoints) + `assetCheck()`. `measureAt` returns `scrollsX` (real sideways scroll) and each match's size per width without `emulate`.
   - For visual changes, screenshot each viewport (`1440x900x1`, `768x1024x1,mobile,touch`, `390x844x1,mobile,touch`): `emulate`, `await shootPrep(<selector>)`, `take_screenshot` (to `filePath`), `list_console_messages`. Reset `emulate` immediately afterwards.
   - Compare each section with the reference by eye, section by section. List concrete differences (spacing, color, type, alignment, order), fix them, and check again.
   - Confirm that fonts and images load (`assetCheck()` first; call `list_network_requests` only if `assetCheck()` flags broken assets or you need HTTP status codes) and that links and forms work.
   - For accessibility and SEO, use the `a11y-debugging` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\a11y-debugging\SKILL.md`) or `lighthouse_audit`. For LCP, use the `debug-optimize-lcp` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\debug-optimize-lcp\SKILL.md`).
   - If the frontend shows stale CSS, ask approval to clear the Elementor cache (reference §3 or §4).
   - Done when: every width has `scrollsX: false`, there are no new console errors and no broken assets/404s, and no difference from the reference is left open (or each remaining one is reported to the user).

5. **Report and hand over**
   - Run the Change report and log any recommendations that came up.
   - Leave the Elementor or WordPress editor tab open to the staged change and hand over for the user to review and click **Publish / Update** themselves.
   - Done when: the log matches what was done, the editor tab is open for the user to publish, and the user has the chat table.
