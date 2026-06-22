# NUVIO Figma To Web Implementation Guide

This guide exists so Figma-to-web work is repeatable instead of trial and
error. Every Figma-derived screen must follow the same translation method,
verification steps, and commit discipline.

## Core Rule

NUVIO desktop Figma frames are designed at 1440px. Implement the 1440px frame
first, then scale the same layout proportionally up to 1920px.

- 1440px is the source of truth for coordinates, widths, heights, typography,
  icon sizes, borders, radii, and spacing.
- 1920px must be the same frame scaled by `4 / 3`.
- Between 1440px and 1920px, values should scale smoothly.
- Above 1920px, keep the 1920px frame centered or extend only backgrounds.
- Do not make a layout look right at 1920px by sacrificing 1440px fidelity.

Preferred token pattern:

```css
--figma-scale: clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333);
--x-16: clamp(16px, 1.111vw, 21.333px);
```

For a Figma value `Bpx`, the scalable token is:

```css
--token: clamp(Bpx, calc(B / 1440 * 100vw), calc(B * 1920 / 1440 * 1px));
```

When using a CSS variable for font size in Tailwind, always use the arbitrary
font-size form with a `length:` type hint before the CSS variable.

Do not write literal Tailwind arbitrary-value class examples in markdown.
Tailwind scans project markdown during dev, and documentation-only placeholder
examples can still generate broken CSS.

## Required Workflow

1. Open or inspect the exact Figma frame before coding.
2. Record the frame name, route, base width, important x/y positions, font
   sizes, colors, icon sources, and scroll behavior.
3. Implement the 1440px frame with scale tokens.
4. Use existing exported assets from `public/icons/nuvio` through
   `src/components/icons/nuvio-icons.ts`.
5. If the needed icon is missing, export it first, place it in
   `public/icons/nuvio`, then register it in `nuvio-icons.ts`.
6. Verify at both 1440px and 1920px in a real browser.
7. Fix shared infrastructure when the mismatch can recur on other routes.
8. Commit, push, and leave the worktree clean.

## Non-Negotiable Fidelity Checks

These items are failure conditions. Do not call a frame done while any of them
remain.

- No Figma frame names such as `Channel Manager - Menu Settings` may be visible
  in product UI.
- No developer-only helper titles, debug labels, or explanatory boxes may be
  visible unless the Figma frame includes them.
- No browser horizontal scrollbar may appear on desktop pages unless the Figma
  frame explicitly designs a horizontal scrolling canvas.
- No nested body/main horizontal scrollbars may appear.
- No duplicated scroll ownership: choose the browser or one designed inner
  panel, not both.
- Host and channel manager must share the same sidebar shell; switch only the
  menu set and active tab.
- The shared host/channel top tabs are `host` and `channel` only unless the
  user explicitly changes that model.
- Icons must come from Figma-exported assets when the Figma frame has an icon.
- Do not use lucide or hand-written SVGs as final icons for Figma-matched UI
  when the Figma asset exists or can be exported.
- Do not use text characters such as `+`, `::`, or emoji as icon substitutes
  for Figma-matched UI.
- Use Pretendard for Figma-derived NUVIO product screens unless the frame says
  otherwise.
- Use exact Figma colors or page tokens, not approximate Tailwind palette
  colors.
- Grey boxes must be interpreted correctly: content container, image
  placeholder, empty state, or editable canvas.
- Active tab underline, inactive tab color, divider color, and text weight must
  match the frame.

## Per-Frame Protocol

For each Figma frame, do the work as a small, complete unit.

1. Map the Figma frame to the route and component.
2. Screenshot or inspect the Figma frame at 1440px.
3. Implement only that frame's scope.
4. Confirm shared shell behavior if the frame uses host/channel/program
   navigation.
5. Check icons through `nuvioIcons`.
6. Run a browser check at 1440px.
7. Run a browser check at 1920px.
8. Verify `document.documentElement.scrollWidth <= document.documentElement.clientWidth`.
9. Run `git diff --check`.
10. Run `npm.cmd run lint`.
11. Run `npm.cmd run build` when the change touches routed pages, shared
    layout, data fetching, or TypeScript types.
12. Commit with a focused message.
13. Push `main`.
14. Confirm `git status -sb` is clean.

## Browser Verification Snippet

Use this in Playwright or the browser console after setting the viewport:

```js
(() => {
  const main = document.querySelector("main");
  return {
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    mainClientWidth: main?.clientWidth ?? null,
    mainScrollWidth: main?.scrollWidth ?? null,
    hasHorizontalOverflow:
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    mainHasHorizontalOverflow:
      main ? main.scrollWidth > main.clientWidth : false,
  };
})();
```

Both overflow booleans should normally be `false`.

## Layout Patterns

### Preferred: Token Scale Layout

Use scalable CSS variables on the route root or component root:

```tsx
const figmaScaleStyle = {
  "--screen-scale": "clamp(1, calc(min(100vw, 1920px) / 1440), 1.333333)",
  "--screen-16": "clamp(16px, 1.111vw, 21.333px)",
  "--screen-144": "clamp(144px, 10vw, 192px)",
} as CSSProperties;
```

Then consume them directly in source code with real Tailwind classes. Keep the
literal arbitrary-value class in `.tsx` source, not in this markdown guide:

```tsx
<section style={figmaScaleStyle} />
```

This is the default method for new Figma-derived product screens.

### Exception: Full Frame Scaling

For a highly visual frame that must behave as one exact canvas, a 1440px base
frame can be scaled as a unit with `zoom` or `transform`. This is an exception
because it can break sticky behavior, hit areas, and responsive interaction.
Use it only when a token layout is clearly worse.

### Legacy: Fixed 1440 Layout

Hard-coded `w-[1440px]`, `max-w-[1440px]`, and fixed absolute desktop positions
are legacy patterns. Do not introduce new fixed 1440 layouts unless the screen
is intentionally a non-responsive preview canvas.

## Scroll And Overflow

Desktop Figma pages should generally have one vertical scroll owner: the page
itself. Inner scrolling is allowed only for designed panels such as message
lists, tables, or modal lists.

- Root workspace wrappers should avoid `100vw`/`100dvw` width caps on normal
  document pages. These units include scrollbar width in some browser states and
  can create a bottom scrollbar that Figma does not have. Prefer `w-full`,
  `max-w-full`, `min-w-0`, and `overflow-x: clip`.
- Main content containers should use `min-w-0`.
- Repeated rows and dividers should be `w-full`, not fixed-width, unless Figma
  explicitly requires a fixed measurement.
- A `sidebar + content` sum that exceeds viewport width by even a few pixels
  creates an unwanted bottom scrollbar.
- If a page has a browser scrollbar and an inner horizontal scrollbar at the
  same time, the layout is not done.

## Typography

- Match font family, size, line-height, weight, and color from Figma.
- Font size scales with the 1440-to-1920 rule.
- Do not apply negative letter spacing unless Figma explicitly does.
- Button and tab text must not wrap unless the Figma frame wraps it.

## Colors

Use exact Figma colors or NUVIO tokens. Repeated product colors include:

- Primary orange: `#FE701E`
- Accent orange: `#FF9A3D`
- Text ink: `#0D0D0C`
- Brown text: `#5B3A29`
- Muted text: `#6D7A8A`
- Soft line: `#F3E2D5`

## Icons

Source order:

1. `public/icons/nuvio` through `nuvioIcons`
2. Newly exported Figma SVG added to `public/icons/nuvio`
3. Temporary custom SVG only for non-Figma internal tooling
4. Icon library only for generic legacy/admin screens

If the user points out that an icon does not match Figma, export/register the
Figma icon instead of styling the wrong icon.

## Images And Placeholders

Before replacing a grey Figma block with an image, decide what it means:

- image placeholder
- content/body container
- empty state
- editable canvas
- skeleton/loading state

If it represents text/body content, render real structured content rather than
a large image box.

## Current Implementation Audit

| Area | Current Pattern | Status |
| --- | --- | --- |
| `src/components/host-workspace-ui.tsx` | shared host/channel shell with scale tokens | canonical shared shell |
| `src/components/host-channel-menu-settings.tsx` | Figma-like channel menu settings | keep as channel manager baseline |
| `src/components/host-channel-home.tsx` | shared channel profile header | reuse for channel frames |
| `src/components/host-channel-programs.tsx` | channel programs frame | implemented frame unit |
| `src/components/host-channel-reviews.tsx` | channel reviews frame | implemented frame unit |
| `src/components/program-detail-scale.tsx` | whole-frame scale helper | exception pattern, verify carefully |
| `src/app/programs/[id]/page.tsx` | mixed fixed and scaled layout | refactor candidate |
| `src/components/mypage.tsx` | mostly working legacy layout | refactor when touched |
| `src/components/boseong-figma-site.tsx` | fixed 1440 preview style | refactor later if public pages need exact scale |

## Definition Of Done

A Figma-derived page is done only when:

- It uses the 1440-to-1920 scale rule.
- Figma labels and debug text are absent from UI.
- Figma icons are exported and registered, not approximated.
- 1440px and 1920px browser checks pass.
- There is no unwanted horizontal overflow.
- For routes that use the shared host/channel workspace shell, run
  `npm.cmd run verify:overflow -- /target/route` before committing. The default
  route is `/host/channels/settings`.
- Shared layout mismatches are fixed in shared components.
- Lint, diff check, and required build checks pass.
- Changes are committed, pushed, and the worktree is clean.
