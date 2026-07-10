import sanitizeHtml from "sanitize-html";
import {
  trySanitizeEditorLinkUrl,
  trySanitizePublicImageUrl,
} from "@/lib/url-security";

const allowedTextAlign = [/^left$/u, /^center$/u, /^right$/u, /^justify$/u];
const allowedCssLength = [
  /^auto$/u,
  /^\d{1,5}(?:\.\d+)?px$/u,
  /^\d{1,3}(?:\.\d+)?%$/u,
];

export function sanitizeMagazineHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
      "col",
      "colgroup",
      "em",
      "figcaption",
      "figure",
      "h1",
      "h2",
      "h3",
      "h4",
      "hr",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      a: ["href", "name", "target", "rel"],
      col: ["style", "width"],
      img: ["alt", "src", "title", "width"],
      table: ["style"],
      td: ["align", "colspan", "colwidth", "data-colwidth", "rowspan", "style"],
      th: ["align", "colspan", "colwidth", "data-colwidth", "rowspan", "style"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["https"],
    },
    allowProtocolRelative: false,
    allowedStyles: {
      "*": {
        "text-align": allowedTextAlign,
      },
      col: {
        "min-width": allowedCssLength,
        width: allowedCssLength,
      },
      table: {
        "min-width": allowedCssLength,
        width: allowedCssLength,
      },
      td: {
        "min-width": allowedCssLength,
        "text-align": allowedTextAlign,
        width: allowedCssLength,
      },
      th: {
        "min-width": allowedCssLength,
        "text-align": allowedTextAlign,
        width: allowedCssLength,
      },
    },
    transformTags: {
      a: sanitizeLink,
      col: sanitizeTableColumn,
      img: (tagName, attribs) => {
        const width = sanitizeImageWidth(
          attribs.width ?? parseStyleWidth(attribs.style),
        );
        const src = trySanitizePublicImageUrl(attribs.src ?? "", {
          allowRelative: true,
        });
        const nextAttribs: Record<string, string> = {};

        if (src) nextAttribs.src = src;
        if (attribs.alt) nextAttribs.alt = attribs.alt.slice(0, 200);
        if (attribs.title) nextAttribs.title = attribs.title.slice(0, 200);

        if (width) {
          nextAttribs.width = String(width);
        }

        return {
          attribs: nextAttribs,
          tagName,
        };
      },
      td: sanitizeTableCell,
      th: sanitizeTableCell,
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !frame.attribs.src,
  }).trim();
}

export function excerptFromHtml(html: string, maxLength = 140): string {
  const text = stripHtmlText(html);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

export function hasMagazineContent(html: string): boolean {
  return stripHtmlText(html).length > 0 || /<img\s/i.test(html);
}

export function normalizeMagazineSlug(input: string): string {
  const slug = input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['"]/gu, "")
    .replace(/[^a-z0-9가-힣._-]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 96);

  return slug || `magazine-${Date.now()}`;
}

export function stripHtmlText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/gu, " ")
    .trim();
}

function sanitizeImageWidth(value: string | undefined): number | null {
  if (!value) return null;
  const width = Number(value.replace(/px$/iu, ""));
  if (!Number.isFinite(width)) return null;
  return Math.round(Math.max(120, Math.min(width, 1200)));
}

function parseStyleWidth(style: string | undefined): string | undefined {
  if (!style) return undefined;
  return style.match(/(?:^|;)\s*width\s*:\s*(\d{1,4})(?:px)?\s*(?:;|$)/iu)?.[1];
}

function sanitizeLink(
  tagName: string,
  attribs: Record<string, string>,
): sanitizeHtml.Tag {
  const href = trySanitizeEditorLinkUrl(attribs.href ?? "", {
    allowRelative: true,
  });
  const name = sanitizeAnchorName(attribs.name);
  const nextAttribs: Record<string, string> = {};

  if (href) {
    nextAttribs.href = href;
    nextAttribs.rel = "noopener noreferrer";
    nextAttribs.target = "_blank";
  }

  if (name) {
    nextAttribs.name = name;
  }

  return {
    attribs: nextAttribs,
    tagName,
  };
}

function sanitizeAnchorName(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const name = value
    .normalize("NFKC")
    .replace(/[^a-z0-9_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 80);

  return name || undefined;
}

function sanitizeTableCell(
  tagName: string,
  attribs: Record<string, string>,
): sanitizeHtml.Tag {
  const nextAttribs = { ...attribs };
  const colspan = sanitizeSpanAttribute(attribs.colspan);
  const rowspan = sanitizeSpanAttribute(attribs.rowspan);
  const colwidth = sanitizeColWidthAttribute(
    attribs.colwidth ?? attribs["data-colwidth"],
  );

  if (colspan) {
    nextAttribs.colspan = colspan;
  } else {
    delete nextAttribs.colspan;
  }

  if (rowspan) {
    nextAttribs.rowspan = rowspan;
  } else {
    delete nextAttribs.rowspan;
  }

  if (colwidth) {
    nextAttribs.colwidth = colwidth;
    nextAttribs["data-colwidth"] = colwidth;
  } else {
    delete nextAttribs.colwidth;
    delete nextAttribs["data-colwidth"];
  }

  return {
    attribs: nextAttribs,
    tagName,
  };
}

function sanitizeTableColumn(
  tagName: string,
  attribs: Record<string, string>,
): sanitizeHtml.Tag {
  const nextAttribs = { ...attribs };
  const width = sanitizeCssLength(attribs.width);

  if (width) {
    nextAttribs.width = width;
  } else {
    delete nextAttribs.width;
  }

  return {
    attribs: nextAttribs,
    tagName,
  };
}

function sanitizeSpanAttribute(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const span = Number(value);
  if (!Number.isInteger(span)) return undefined;

  return String(Math.max(1, Math.min(span, 20)));
}

function sanitizeColWidthAttribute(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const widths = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isInteger(item) && item >= 25 && item <= 2000)
    .slice(0, 20);

  return widths.length > 0 ? widths.join(",") : undefined;
}

function sanitizeCssLength(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return allowedCssLength.some((pattern) => pattern.test(value)) ? value : undefined;
}
