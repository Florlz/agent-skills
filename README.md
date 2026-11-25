# Agent Skills

Personal collection of custom AI agent skills, plus install commands for the third-party skills I use alongside them.

## Custom Skills (Included in This Repo)

| Skill | Path | What it does |
|---|---|---|
| **wordpress-elementor** | [`skills/wordpress-elementor`](skills/wordpress-elementor/SKILL.md) | Builds, edits, and audits WordPress sites in Elementor (V3 widgets/containers & V4 Atomic) through `wp-admin` in your real Chrome via `chrome-devtools` MCP, with approval gates, responsive verification scripts, and per-site change logs. |
| **manage-chrome** | [`skills/manage-chrome`](skills/manage-chrome/SKILL.md) | Routes non-WordPress browser tasks to your running Chrome via `chrome-devtools` MCP (`--autoConnect`), enforces tab/viewport hygiene and approval gates, and handles connection troubleshooting. |

### Install Custom Skills

Using the [skills CLI](https://github.com/vercel-labs/skills):

```bash
npx skills add Florlz/agent-skills
```

Or clone and copy the folders under `skills/` into your agent's global skills directory:

- **Antigravity / Gemini**: `~/.gemini/config/skills/`
- **Claude Code**: `~/.claude/skills/`
- **Cross-agent**: `~/.agents/skills/`

> **Prerequisite:** Both `wordpress-elementor` and `manage-chrome` expect the Chrome DevTools MCP server configured with `--autoConnect` against your running Chrome browser (with `chrome://inspect/#remote-debugging` enabled).

---

## Companion Third-Party Skills (Install Separately)

These skills are not vendored in this repo — install them directly from their upstream repositories:

### Engineering & Productivity ([Matt Pocock's Skills](https://github.com/mattpocock/skills))

Covers TDD, spec/ticket workflows, code review, codebase design, bug diagnosis, domain modeling, grilling, prototyping, research, and agent-doc authoring (`tdd`, `grill-me`, `grilling`, `code-review`, `codebase-design`, `diagnosing-bugs`, `domain-modeling`, `implement`, `implement-spec`, `improve-codebase-architecture`, `prototype`, `research`, `wayfinder`, `to-spec`, `to-tickets`, `writing-for-agents`, etc.).

```bash
npx skills add mattpocock/skills
```

### Frontend & UI Design

- **Gemini Frontend Design** ([google-gemini/demolab](https://github.com/google-gemini/demolab)) — Official Gemini team skill for layout, opening screen formats, color palettes, typography, custom imagery, copy, and motion:
  ```bash
  npx skills add google-gemini/demolab --skill gemini-frontend-design
  ```
- **Frontend Design** ([Anthropic Skills](https://github.com/anthropics/skills)) — Distinctive visual design, typography, and layout craft:
  ```bash
  npx skills add anthropics/skills --skill frontend-design
  ```
- **Impeccable** ([pbakaus/impeccable](https://github.com/pbakaus/impeccable)) — Full UI design, critique, audit, polish, animation, and design-system workflow:
  ```bash
  npx skills add pbakaus/impeccable
  ```

### Code Quality & Planning Workflows

- **Thermo-Nuclear Code Quality Review** ([Cursor Plugins](https://github.com/cursor/plugins)):
  ```bash
  npx skills add cursor/plugins --skill thermo-nuclear-code-quality-review
  ```
- **Planning & Subagent Workflows** (optional, e.g. [obra/superpowers](https://github.com/obra/superpowers)) — `brainstorming`, `writing-plans`, `executing-plans`, `subagent-driven-development`:
  ```bash
  npx skills add obra/superpowers
  ```
