---
name: manage-chrome
description: >-
  Picks the browser tool and drives the user's real Chrome safely for browser
  tasks outside WordPress (opening a tab or URL, checking a live site's layout,
  console, network, CSS or responsive viewports, comparing a page with a
  reference screenshot) and when chrome-devtools cannot connect during them.
  WordPress and Elementor tasks must use wordpress-elementor instead, which
  carries its own browser rules.
---

# Manage Chrome

**WordPress / Elementor work**: if the task involves a WordPress site, `wp-admin`, or Elementor, do **not** use this skill — load `wordpress-elementor` (`~\.gemini\config\skills\wordpress-elementor\SKILL.md`), which owns all WordPress browser, approval, and logging rules.

## Pick the browser (non-WordPress)

| Task | Tool |
|---|---|
| Anything in the user's running Chrome: logged-in sites, tab management, live-site checks (layout, console, network, CSS, viewports, screenshot comparison) | `chrome-devtools` MCP (`ServerName: "chrome-devtools"` via `call_mcp_tool`) |
| Read-only lookups that need no login (docs, references, public pages) | `search_web` or HTTP fetch (or the built-in `browser` subagent if JS rendering is needed without the user's logins) |

Reach Chrome only through `chrome-devtools` MCP. Never launch `chrome.exe` via `run_command` (e.g., `Start-Process chrome.exe`): shell commands execute in an isolated desktop / separate profile without the user's logins (and fail with exit code `21`), so starting Chrome is always the user's job.

Read a tool's schema JSON under `~\.gemini\antigravity\mcp\chrome-devtools\<tool>.json` before calling any unfamiliar tool.

## How chrome-devtools connects

- It attaches (`--autoConnect`) to the Chrome the user already runs: the default profile, with all its windows, tabs and cookies. It does not launch its own browser, whatever generic skills say.
- autoConnect is set in `%LOCALAPPDATA%\Google\cd4a\config.json` and `~\.gemini\config\mcp_config.json`. The user owns both files: read them only when diagnosing, never modify them directly, and put any change to the user as a proposal in chat.
- Chrome shows an **Allow** prompt on each new connection; the user clicks it.
- One DevTools client per Chrome. Claude Code or any other DevTools client must be detached while Antigravity uses Chrome.
- Generic tool workflow (navigate → `wait_for` → `take_snapshot` → act by `uid`, `pageId` on every page tool): `chrome-devtools` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\chrome-devtools\SKILL.md`).

## Tabs

- Start each job with `new_page`, keep its `pageId`, and reuse that tab for the whole job.
- The user's own tabs are read-only to you (`list_pages`, `take_snapshot`): navigate and close only tabs this job opened, unless the user points you at one of theirs.
- Leave the job's tab open at the end so the user can review it.

## Viewports

- Use `emulate` with `viewport`, e.g. `1440x900x1`, `768x1024x2,mobile,touch`, `390x844x3,mobile,touch`. It changes only the page (`resize_page` resizes the user's real window).
- Each `emulate` call replaces all emulation settings (except `extraHttpHeaders`). When checks are done, call `emulate` without `viewport` to reset the tab.

## Approval

Before any click or call that publishes, deletes, submits a form, or changes a site's settings, describe the exact change and wait for the user's approval in chat.

## Cannot connect

When `list_pages` or `new_page` fails (`Could not find DevToolsActivePort`, `Network.enable timed out`), or a blank Chrome with none of the user's tabs appears, stop and ask the user to check:

1. Chrome (stable) is running.
2. `chrome://inspect/#remote-debugging` has remote debugging enabled.
3. The **Allow** prompt was clicked.
4. Claude Code or any other DevTools client is detached from this Chrome.

Then retry with `list_pages` alone. Still failing: follow the `troubleshooting` skill (`~\.gemini\config\plugins\chrome-devtools-plugin\skills\troubleshooting\SKILL.md`).
