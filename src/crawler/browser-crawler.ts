import { chromium, type BrowserContext, type Page } from "playwright";
import * as cheerio from "cheerio";
import * as path from "path";
import * as url from "url";
import type { CrawledPost, Selectors } from "./html-crawler.js";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const PROFILE_DIR = path.resolve(__dirname, "../../data/browser-profile");

const REAL_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/** Stealth args: disable automation flags that sites detect */
const STEALTH_ARGS = [
  "--no-sandbox",
  "--disable-blink-features=AutomationControlled",
  "--disable-features=AutomationControlled",
  "--disable-infobars",
  "--disable-dev-shm-usage",
  "--disable-background-timer-throttling",
  "--disable-renderer-backgrounding",
  "--window-size=1280,900",
];

let _context: BrowserContext | null = null;
let _contextHeadful: BrowserContext | null = null;

/**
 * Inject stealth scripts into every new page to mask automation signals.
 */
async function applyStealthScripts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Hide webdriver flag
    Object.defineProperty(navigator, "webdriver", { get: () => false });

    // Fake plugins array (real Chrome has at least a few)
    Object.defineProperty(navigator, "plugins", {
      get: () => [
        { name: "Chrome PDF Plugin", filename: "internal-pdf-viewer" },
        { name: "Chrome PDF Viewer", filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai" },
        { name: "Native Client", filename: "internal-nacl-plugin" },
      ],
    });

    // Fake languages
    Object.defineProperty(navigator, "languages", {
      get: () => ["ko-KR", "ko", "en-US", "en"],
    });

    // Remove Playwright/headless signals from window.chrome
    if (!(window as any).chrome) {
      (window as any).chrome = { runtime: {}, loadTimes: () => ({}), csi: () => ({}) };
    }

    // Mask permissions API inconsistency
    const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
    window.navigator.permissions.query = (params: any) => {
      if (params.name === "notifications") {
        return Promise.resolve({ state: "denied", onchange: null } as PermissionStatus);
      }
      return originalQuery(params);
    };
  });
}

async function getContext(headless = true): Promise<BrowserContext> {
  if (headless) {
    if (!_context) {
      _context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: true,
        args: STEALTH_ARGS,
        userAgent: REAL_UA,
        locale: "ko-KR",
        viewport: { width: 1280, height: 800 },
        extraHTTPHeaders: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache",
          "Pragma": "no-cache",
          "Sec-CH-UA": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
          "Sec-CH-UA-Mobile": "?0",
          "Sec-CH-UA-Platform": '"macOS"',
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1",
          "Upgrade-Insecure-Requests": "1",
        },
      });
    }
    return _context;
  } else {
    // Headful context for manual login — uses same profile dir
    if (_context) {
      await _context.close();
      _context = null;
    }
    _contextHeadful = await chromium.launchPersistentContext(PROFILE_DIR, {
      headless: false,
      args: STEALTH_ARGS,
      userAgent: REAL_UA,
      locale: "ko-KR",
      viewport: { width: 1280, height: 900 },
    });
    return _contextHeadful;
  }
}

export async function closeBrowser(): Promise<void> {
  if (_context) {
    await _context.close();
    _context = null;
  }
}

/** Random delay between min and max ms, to mimic human timing */
function sleep(minMs: number, maxMs?: number): Promise<void> {
  const ms = maxMs ? minMs + Math.random() * (maxMs - minMs) : minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Opens a visible browser window for the user to log in manually.
 * The session is saved to the persistent profile directory.
 * Resolves when the browser is closed by the user.
 */
export async function openLoginBrowser(targetUrl: string): Promise<void> {
  const ctx = await getContext(false);
  const page = await ctx.newPage();
  await page.goto(targetUrl, { waitUntil: "domcontentloaded" });

  // Wait until the user closes the page/browser
  await new Promise<void>((resolve) => {
    page.once("close", () => resolve());
    ctx.once("close", () => resolve());
  });

  await ctx.close();
  _contextHeadful = null;
  // Re-open headless context to pick up new session
  _context = null;
}

/**
 * Fetch fully-rendered HTML via browser (after JS execution).
 */
export async function fetchRawHtmlWithBrowser(targetUrl: string): Promise<string> {
  const ctx = await getContext(true);
  const page = await ctx.newPage();
  try {
    await applyStealthScripts(page);
    await sleep(800, 1500);
    await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
    await sleep(1000, 2000);
    // Simulate a small scroll to trigger lazy-loaded content
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(500, 1000);
    return await page.content();
  } finally {
    await page.close();
  }
}

/**
 * Crawl a page using the browser, then parse with cheerio like crawlHtml does.
 */
export async function crawlWithBrowser(
  pageUrl: string,
  selectors: Selectors
): Promise<CrawledPost[]> {
  const ctx = await getContext(true);
  const page = await ctx.newPage();
  try {
    await applyStealthScripts(page);

    // Random pre-navigation delay
    await sleep(800, 1500);

    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 30000 });

    // Post-load delay to let dynamic content render
    await sleep(1000, 2000);

    // Simulate scroll to trigger lazy content
    await page.evaluate(() => window.scrollBy(0, 300));
    await sleep(500, 1000);

    // Wait for the row selector to appear
    try {
      await page.waitForSelector(selectors.row, { timeout: 10000 });
    } catch {
      // Row not found — proceed anyway (cheerio will return empty)
    }

    const html = await page.content();
    const $ = cheerio.load(html);
    const posts: CrawledPost[] = [];

    $(selectors.row).each((_, el) => {
      const titleEl = $(el).find(selectors.title);
      const linkEl = $(el).find(selectors.link);
      const title = titleEl.text().trim();
      const linkAttr = selectors.linkAttr || "href";
      const rawHref = linkEl.attr(linkAttr);

      if (!title || !rawHref) return;

      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(rawHref, pageUrl).href;
      } catch {
        return;
      }

      const post: CrawledPost = { title, url: resolvedUrl };

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
  } finally {
    await page.close();
  }
}
