<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## NUVIO Figma implementation rule

Figma designs for this project are authored at a 1440px desktop width. When translating Figma screens into the app, treat 1440px as the base design width, but make desktop layouts scale proportionally up to a 1920px max width. Do not copy 1440px measurements as permanently fixed desktop widths unless the element is intentionally fixed-size.

- At 1920px, 1440-based measurements should expand by 4/3 where appropriate.
- Use responsive constraints such as `max-width: 1920px`, `clamp(...)`, proportional grid tracks, or equivalent Tailwind/CSS patterns.
- Verify key Figma-derived layouts at both 1440px and 1920px before considering the implementation complete.
