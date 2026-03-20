import cron from "node-cron";
import { getDb, saveDb } from "../db/index.js";
import { crawlHtml, type Selectors } from "../crawler/html-crawler.js";
import { crawlRss } from "../crawler/rss-crawler.js";
import { summarizePost } from "../crawler/content-summarizer.js";
import { notifyNewPost } from "../notifier/index.js";

const activeTasks = new Map<number, cron.ScheduledTask>();

export async function startScheduler(): Promise<void> {
  const db = await getDb();
  const result = db.exec("SELECT id, interval_minutes FROM sources WHERE enabled = 1");
  if (!result[0]) return;

  for (const row of result[0].values) {
    const id = row[0] as number;
    const interval = row[1] as number;
    scheduleSource(id, interval);
  }

  console.log(`[Scheduler] Started with ${activeTasks.size} source(s)`);
}

export function scheduleSource(sourceId: number, intervalMinutes: number): void {
  // Stop existing task if any
  stopSource(sourceId);

  // Run immediately on first schedule
  crawlSource(sourceId).catch((err) =>
    console.error(`[Scheduler] Error on initial crawl for source ${sourceId}:`, err.message)
  );

  const cronExpr = `*/${intervalMinutes} * * * *`;
  const task = cron.schedule(cronExpr, () => {
    crawlSource(sourceId).catch((err) =>
      console.error(`[Scheduler] Error crawling source ${sourceId}:`, err.message)
    );
  });

  activeTasks.set(sourceId, task);
  console.log(`[Scheduler] Source ${sourceId} scheduled every ${intervalMinutes}min`);
}

export function stopSource(sourceId: number): void {
  const existing = activeTasks.get(sourceId);
  if (existing) {
    existing.stop();
    activeTasks.delete(sourceId);
  }
}

export function stopAll(): void {
  for (const [id, task] of activeTasks) {
    task.stop();
  }
  activeTasks.clear();
}

async function crawlSource(sourceId: number): Promise<void> {
  const db = await getDb();
  const result = db.exec(
    "SELECT id, name, url, type, selectors, keywords FROM sources WHERE id = ? AND enabled = 1",
    [sourceId]
  );

  if (!result[0]?.values[0]) return;

  const [id, name, url, type, selectorsJson, keywordsJson] = result[0].values[0] as [
    number, string, string, string, string, string
  ];

  const keywords: string[] = JSON.parse(keywordsJson || "[]");

  console.log(`[Crawler] Crawling: ${name} (${url})`);

  try {
    let posts;
    if (type === "rss") {
      posts = await crawlRss(url);
    } else {
      const selectors: Selectors = JSON.parse(selectorsJson || "{}");
      if (!selectors.row || !selectors.title || !selectors.link) {
        const errMsg = "Incomplete selectors, skipping";
        console.warn(`[Crawler] Source ${name}: ${errMsg}`);
        db.run(
          "INSERT INTO crawl_logs (source_id, status, error_message) VALUES (?, 'error', ?)",
          [id, errMsg]
        );
        saveDb();
        return;
      }
      posts = await crawlHtml(url, selectors);
    }

    let newCount = 0;
    let matchedCount = 0;

    for (const post of posts) {
      // Check if post already exists (by external_id first, then by url)
      let existing;
      if (post.externalId) {
        existing = db.exec(
          "SELECT id FROM posts WHERE source_id = ? AND external_id = ?",
          [id, post.externalId]
        );
      }
      if (!existing?.[0]?.values.length) {
        existing = db.exec(
          "SELECT id FROM posts WHERE source_id = ? AND url = ?",
          [id, post.url]
        );
      }

      if (existing[0]?.values.length) continue;

      newCount++;

      // Check keyword match (if keywords defined, at least one must match)
      if (keywords.length > 0) {
        const titleLower = post.title.toLowerCase();
        const matched = keywords.some((kw) =>
          titleLower.includes(kw.toLowerCase())
        );
        if (!matched) {
          // Still save the post but don't notify
          db.run(
            "INSERT OR IGNORE INTO posts (source_id, external_id, title, url, author) VALUES (?, ?, ?, ?, ?)",
            [id, post.externalId || null, post.title, post.url, post.author || null]
          );
          continue;
        }
      }

      matchedCount++;

      // Insert new post
      db.run(
        "INSERT OR IGNORE INTO posts (source_id, external_id, title, url, author) VALUES (?, ?, ?, ?, ?)",
        [id, post.externalId || null, post.title, post.url, post.author || null]
      );

      // Get the inserted post ID
      const inserted = post.externalId
        ? db.exec("SELECT id FROM posts WHERE source_id = ? AND external_id = ?", [id, post.externalId])
        : db.exec("SELECT id FROM posts WHERE source_id = ? AND url = ?", [id, post.url]);
      const postId = inserted[0]?.values[0]?.[0] as number;

      // Summarize content
      let summary: string | undefined;
      try {
        summary = await summarizePost(post.url);
        if (summary) {
          db.run("UPDATE posts SET summary = ? WHERE id = ?", [summary, postId]);
        }
      } catch (err) {
        console.error(`[Summarizer] Failed for ${post.url}:`, (err as Error).message);
      }

      // Send notification
      await notifyNewPost({
        id: postId,
        title: post.title,
        url: post.url,
        summary,
        sourceName: name,
      });
    }

    // Log crawl result
    db.run(
      "INSERT INTO crawl_logs (source_id, status, total_found, new_posts, matched_posts) VALUES (?, 'success', ?, ?, ?)",
      [id, posts.length, newCount, matchedCount]
    );

    saveDb();

    console.log(
      `[Crawler] ${name}: found ${posts.length}, new ${newCount}, matched ${matchedCount}`
    );
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`[Crawler] Failed to crawl ${name}:`, errMsg);

    // Log error
    db.run(
      "INSERT INTO crawl_logs (source_id, status, error_message) VALUES (?, 'error', ?)",
      [id, errMsg]
    );
    saveDb();
  }
}

// Trigger a manual crawl for a source
export { crawlSource };
