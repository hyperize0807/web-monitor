import Anthropic from "@anthropic-ai/sdk";
import { fetchRawHtml } from "./html-crawler.js";
import { fetchRawHtmlWithBrowser } from "./browser-crawler.js";
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

/**
 * Detect if fetched HTML looks like an access-blocked response
 * (login wall, bot detection, Cloudflare challenge, etc.)
 */
function detectBlocked(html: string): boolean {
  const $ = cheerio.load(html);
  const bodyText = $("body").text().toLowerCase();
  const title = $("title").text().toLowerCase();

  const blockSignals = [
    // Cloudflare / general bot detection
    /just a moment/i,
    /checking your browser/i,
    /enable javascript/i,
    /cf-browser-verification/i,
    // Login walls
    /로그인.*필요/i,
    /로그인.*후.*이용/i,
    /login.*required/i,
    /please.*sign.*in/i,
    /access.*denied/i,
    /403 forbidden/i,
    // Naver specific
    /네이버 로그인/i,
  ];

  const htmlStr = html.toLowerCase();
  return (
    blockSignals.some((re) => re.test(bodyText) || re.test(title) || re.test(htmlStr)) ||
    // Very short body is suspicious (login redirect / empty shell)
    bodyText.trim().length < 200
  );
}

export async function analyzeSelectors(
  url: string,
  rowSelector: string,
  useBrowser = false
): Promise<AnalyzedSelectors> {
  let html: string;

  if (useBrowser) {
    html = await fetchRawHtmlWithBrowser(url);
  } else {
    html = await fetchRawHtml(url);
  }

  // Detect if the page is blocked
  if (detectBlocked(html)) {
    if (!useBrowser) {
      throw new Error(
        "BLOCKED: 이 페이지는 일반 HTTP 요청이 차단되고 있습니다. " +
        "소스 설정에서 '브라우저 렌더링 사용'을 켜고 필요 시 로그인 후 다시 시도해주세요."
      );
    } else {
      throw new Error(
        "BLOCKED: 브라우저로도 접근이 차단되었습니다. " +
        "로그인이 필요한 경우 설정 페이지에서 '브라우저 로그인'을 먼저 진행해주세요."
      );
    }
  }

  const $ = cheerio.load(html);

  // Extract sample rows using the provided row selector
  const rows = $(rowSelector);
  if (rows.length === 0) {
    throw new Error(`"${rowSelector}" 셀렉터와 일치하는 요소를 찾을 수 없습니다.`);
  }

  // Take up to 3 sample rows
  const sampleHtmlParts: string[] = [];
  rows.slice(0, 3).each((_, el) => {
    $(el).find("script, style").remove();
    sampleHtmlParts.push($.html(el));
  });
  const sampleHtml = sampleHtmlParts.join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `아래는 게시판 목록 페이지에서 추출한 게시글 행(row) HTML 샘플입니다.
각 행 안에서 제목, 링크, 작성자, 게시글 ID를 가리키는 CSS 셀렉터를 찾아주세요.
셀렉터는 행(row) 요소를 기준으로 하는 상대 경로여야 합니다.

URL: ${url}
Row selector: ${rowSelector}

샘플 행 HTML:
\`\`\`html
${sampleHtml}
\`\`\`

아래 JSON 형식으로만 응답하세요 (설명 없이):
{
  "title": "제목 텍스트가 있는 요소의 셀렉터",
  "link": "href가 있는 <a> 요소의 셀렉터",
  "linkAttr": "링크 속성명 (보통 href)",
  "author": "작성자 요소 셀렉터 또는 null",
  "postId": "게시글 번호 요소 셀렉터 또는 null",
  "postIdAttr": "게시글 번호를 속성에서 가져올 경우 속성명, 텍스트면 null"
}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude 응답에서 JSON을 파싱할 수 없습니다.");
  }

  const selectors = JSON.parse(jsonMatch[0]);

  // Validate by trying the selectors on the actual page
  const preview: Array<{ title: string; url: string; author?: string; postId?: string }> = [];
  rows.each((i, el) => {
    if (i >= 5) return false;
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
    row: rowSelector,
    title: selectors.title,
    link: selectors.link,
    linkAttr: selectors.linkAttr || "href",
    author: selectors.author || undefined,
    postId: selectors.postId || undefined,
    postIdAttr: selectors.postIdAttr || undefined,
    preview,
  };
}
