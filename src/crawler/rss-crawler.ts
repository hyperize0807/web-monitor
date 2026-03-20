import RssParser from "rss-parser";
import type { CrawledPost } from "./html-crawler.js";

const parser = new RssParser({
  timeout: 15000,
  headers: {
    "User-Agent": "WebMonitor/1.0",
  },
});

export async function crawlRss(feedUrl: string): Promise<CrawledPost[]> {
  const feed = await parser.parseURL(feedUrl);
  const posts: CrawledPost[] = [];

  for (const item of feed.items) {
    if (!item.title || !item.link) continue;

    posts.push({
      title: item.title.trim(),
      url: item.link,
      author: item.creator || item.author,
    });
  }

  return posts;
}
