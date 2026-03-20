import Anthropic from "@anthropic-ai/sdk";
import { fetchRawHtml } from "./html-crawler.js";
import * as cheerio from "cheerio";

const client = new Anthropic();

export interface AnalyzedSelectors {
  row: string;
  title: string;
  link: string;
  linkAttr?: string;
  author?: string;
  postId?: string;
  postIdAttr?: string;
  preview: Array<{ title: string; url: string; author?: string; postId?: string }>;
}

export async function analyzeSelectors(
  url: string
): Promise<AnalyzedSelectors> {
  const html = await fetchRawHtml(url);
  const $ = cheerio.load(html);

  // Simplify HTML: remove scripts, styles, and limit size
  $("script, style, svg, img, video, audio, iframe, noscript").remove();

  // Get a cleaned version of the body, limit to 15000 chars for API
  let simplifiedHtml = $("body").html() || "";
  if (simplifiedHtml.length > 15000) {
    simplifiedHtml = simplifiedHtml.slice(0, 15000);
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Analyze this HTML from a bulletin board / forum / community page and identify the CSS selectors for the post list.

URL: ${url}

HTML (simplified):
\`\`\`html
${simplifiedHtml}
\`\`\`

Return a JSON object with these fields:
- row: CSS selector for each post row/item in the list
- title: CSS selector for the title text (relative to row)
- link: CSS selector for the link element (relative to row)
- linkAttr: attribute name for the URL (usually "href")
- author: CSS selector for the author (relative to row), or null if not found
- postId: CSS selector for the unique post ID/number (relative to row), e.g. a numbered column like "번호" or "No.", or null if not found
- postIdAttr: if the post ID is in an attribute (e.g. data-id), specify it here; otherwise null (text content will be used)

Return ONLY valid JSON, no explanation.
Example: {"row": "table.board-list tbody tr", "title": "td.title a", "link": "td.title a", "linkAttr": "href", "author": "td.author", "postId": "td.no", "postIdAttr": null}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse selector analysis response");
  }

  const selectors = JSON.parse(jsonMatch[0]);

  // Validate by actually trying the selectors
  const preview: Array<{ title: string; url: string; author?: string; postId?: string }> = [];
  $(selectors.row).each((i, el) => {
    if (i >= 5) return false; // limit preview to 5
    const titleText = $(el).find(selectors.title).text().trim();
    const linkHref = $(el)
      .find(selectors.link)
      .attr(selectors.linkAttr || "href");

    if (titleText && linkHref) {
      const item: { title: string; url: string; author?: string; postId?: string } = {
        title: titleText,
        url: new URL(linkHref, url).href,
      };
      if (selectors.author) {
        const author = $(el).find(selectors.author).text().trim();
        if (author) item.author = author;
      }
      if (selectors.postId) {
        const idEl = $(el).find(selectors.postId);
        const postId = selectors.postIdAttr
          ? idEl.attr(selectors.postIdAttr)?.trim()
          : idEl.text().trim();
        if (postId) item.postId = postId;
      }
      preview.push(item);
    }
  });

  return {
    row: selectors.row,
    title: selectors.title,
    link: selectors.link,
    linkAttr: selectors.linkAttr || "href",
    author: selectors.author || undefined,
    postId: selectors.postId || undefined,
    postIdAttr: selectors.postIdAttr || undefined,
    preview,
  };
}
