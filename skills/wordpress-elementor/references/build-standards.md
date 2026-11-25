# Elementor Build Standards (Dos and Don'ts)

Consult when creating or redesigning Elementor pages/templates, styling widgets or containers, checking responsive breakpoints, or auditing performance and data safety.

## Layout & Containers
- **Do** use Flexbox and Grid **Containers** with `Gap` (default 20 px under Site Settings → Layout) and container `Padding` instead of legacy `Section > Column` layouts or Spacer widgets.
- **Do** keep nesting shallow (about 2–3 levels; a heuristic, not an Elementor limit). Put backgrounds, borders and padding on the content container itself instead of wrapping single widgets in extra containers.
- **Do** use `Boxed` width (inheriting the site width) for standard sections, and `Full Width` only when a background or media must run edge to edge.
- **Don't** use Spacer widgets, empty columns, `<br>` tags or negative margins for spacing. Control spacing with container `Gap`, `Padding` and consistent `rem`/`px` steps.
- **Don't** fix sections or cards at `px` heights that clip wrapped text on narrow screens. Use content-driven height or `min-height`.

## Design System & Styling
- **Do** set up and bind the design tokens first: Global Colors and Global Fonts for V3 widgets, Variables and Classes for V4 elements. Sync a Variable to Global Colors/Fonts when V3 widgets must share it.
- **Do** reuse Templates, Saved Sections, Global Widgets and Components for recurring patterns (CTAs, cards, headers, footers).
- **Do** clean pasted copy (strip inline Word, Figma or HTML spans) so the global typography applies.
- **Don't** hardcode hex values or font families on individual widgets when a Global Color, Global Font or Variable fits.
- **Don't** write `!important` overrides of Elementor controls. Fix the value in Site Settings or the Container or Widget Style tab; use Custom CSS only for selectors and states the controls cannot express.
- **Do** build with Elementor controls first, so the user and the client can maintain the page from the panel. Backgrounds, borders, radius, padding, gaps, typography, hover colors and transitions, Object Fit and overflow all have controls (Style tab, or Advanced → Background / Border / Padding on widgets). Set them there, bound to globals where one fits, even when the same value repeats on several cards.
- **Do** keep Custom CSS to what no control can express, and say why in the plan for each rule: states added by JavaScript (`.is-active`), `:focus-visible`, pseudo-elements (`::after` arrows), filters, `aspect-ratio`, and layout fixes inside a widget's own markup. Put one comment at the top of the block naming what lives in the panel instead.
- **Do** target what the control styles: widget Background, Border and Padding apply to `> .elementor-widget-container`, so a state rule that must override them targets that element too.
- **Do** set values by script only through `elSet` / `elCreate` from `scripts/el-set.js`. A wrong control name (`object_fit` instead of `object-fit`) otherwise saves silently and does nothing, and setting `__globals__` directly replaces it and drops the other global links; the helper refuses the first and merges the second.

## Semantics, Accessibility & SEO
- **Do** keep **one `<h1>`** per page (the hero title) and sequential heading order (H1 → H2 → H3). A small label that looks like an H4 keeps a `<p>`, `<span>` or the correct heading tag, with its size set in the Style tab.
- **Do** set semantic HTML tags on top-level containers (Layout → Additional Options → HTML Tag): `header`, `main`, `section`, `article`, `aside`, `nav`, `footer`. Use `a` only on a container with no links inside it.
- **Do** give content images meaningful `alt` text (`alt=""` for decorative ones), keep body text contrast at 4.5:1 or more, and write descriptive button and link text.
- **Don't** put critical headline or CTA text inside flat images, or make non-interactive containers clickable without a real link or button.

## Responsive Discipline
- **Do** finish the **Desktop** layout first, then refine **Tablet** and **Mobile** in that order. Settings cascade down, so override only what changes: direction, wrap, type scale, tighter padding.
- **Do** set the container `Direction` per breakpoint (`Column` / `Column Reverse`) and `Order` on child items so zig-zag rows stack `Image → Text` on mobile.
- **Do** list every child of a row (`elementor.getContainer(rowId).children` or `elTree(rowId, 1)`) before resizing one item in it. Older layouts hold invisible spacer containers that shrink a card's `%` width; to hold an exact width, also set Advanced → Flex Size = None (`_flex_size: 'none'`), then confirm with `measureAt`.
- **Do** keep buttons and links at least 44×44 px, with room between stacked actions.
- **Don't** duplicate sections and toggle `Hide on Desktop / Mobile` to change spacing or direction. Hidden elements stay in the HTML (`elementor-hidden-*`), which bloats the DOM and hurts SEO and LCP.

## Performance & Media
- **Do** upload compressed, right-sized images (WebP/AVIF) and pick the closest WordPress image size rather than `Full` originals in small cards.
- **Do** keep the hero/LCP image eager-loaded and lazy-load media below the fold. Load only the font families and weights used in the tokens.
- **Do** audit Elementor's performance settings and log each needed change as a recommendation (changing them needs approval):
  - Features: Optimized Markup and Inline Font Icons active.
  - Settings → Performance: CSS Print Method External; Optimized Image Loading, Lazy Load Background Images and Element Cache on; Load Google Fonts Locally on.
  - Settings → Advanced: Google Fonts Load set to Swap.
- **Don't** add entrance animations to the hero H1 or above-the-fold LCP media. Animated elements start hidden (`elementor-invisible`), which delays LCP.
- **Don't** add heavy third-party widget packs when native Container, Heading, Image, Button and Loop widgets cover the layout.

## Data Safety & Cache Hygiene
- **Do** duplicate the page or save it as a Draft before a major redesign, and back it up before any bulk change.
- **Do** clear the Elementor cache and any page or CDN cache after structural or bulk changes (with approval), then verify the uncached frontend.
- **Don't** hand-edit raw `_elementor_data` JSON (`id`, `elType`, nested `elements`). Change content through the editor, Elementor MCP or `wp elementor replace-urls`, because corrupted JSON silently breaks rendering.
