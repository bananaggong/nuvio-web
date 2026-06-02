import sanitizeHtml from "sanitize-html";

const allowedTextAlign = [/^left$/u, /^center$/u, /^right$/u, /^justify$/u];

export function sanitizeMagazineHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [
      "a",
      "blockquote",
      "br",
      "code",
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
      img: ["alt", "height", "src", "title", "width"],
      "*": ["style"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesByTag: {
      img: ["http", "https"],
    },
    allowedStyles: {
      "*": {
        "text-align": allowedTextAlign,
      },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer",
        target: "_blank",
      }),
    },
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
