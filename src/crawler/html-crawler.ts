import axios from "axios";
import * as cheerio from "cheerio";

export interface CrawledPost {
  title: string;
  url: string;
  author?: string;
  externalId?: string;
}

export interface Selectors {
  row: string; // 게시글 행 셀렉터 (예: .board-list tr)
  title: string; // 제목 셀렉터 (예: .title a)
  link: string; // 링크 셀렉터 (예: .title a)
  linkAttr?: string; // 링크 속성 (기본: href)
  author?: string; // 작성자 셀렉터
  postId?: string; // 게시글 고유 ID 셀렉터 (예: td.no)
  postIdAttr?: string; // ID를 가져올 속성 (없으면 텍스트 사용)
}

export async function crawlHtml(
  pageUrl: string,
  selectors: Selectors
): Promise<CrawledPost[]> {
  const { data: html } = await axios.get(pageUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);
  const posts: CrawledPost[] = [];

  $(selectors.row).each((_, el) => {
    const titleEl = $(el).find(selectors.title);
    const linkEl = $(el).find(selectors.link);
    const title = titleEl.text().trim();
    const linkAttr = selectors.linkAttr || "href";
    const rawHref = linkEl.attr(linkAttr);

    if (!title || !rawHref) return;

    const url = new URL(rawHref, pageUrl).href;

    const post: CrawledPost = { title, url };

    if (selectors.postId) {
      const idEl = $(el).find(selectors.postId);
      const externalId = selectors.postIdAttr
        ? idEl.attr(selectors.postIdAttr)?.trim()
        : idEl.text().trim();
      if (externalId) post.externalId = externalId;
    }

    if (selectors.author) {
      const author = $(el).find(selectors.author).text().trim();
      if (author) post.author = author;
    }

    posts.push(post);
  });

  return posts;
}

export async function fetchPageContent(url: string): Promise<string> {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);

  // Remove scripts, styles, nav, footer
  $("script, style, nav, footer, header, aside, .ad, .ads, .advertisement").remove();

  // Try common content selectors
  const contentSelectors = [
    "article",
    ".article-body",
    ".post-content",
    ".content",
    ".view-content",
    ".board-view",
    "#content",
    "main",
  ];

  for (const sel of contentSelectors) {
    const content = $(sel).text().trim();
    if (content && content.length > 50) {
      return content.slice(0, 5000);
    }
  }

  // Fallback: body text
  return $("body").text().trim().slice(0, 5000);
}

export async function fetchRawHtml(url: string): Promise<string> {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    },
    timeout: 15000,
  });
  return html;
}
