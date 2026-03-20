import { getDb, saveDb } from "../db/index.js";
import { sendIMessage } from "./imessage.js";
import { sendEmail } from "./email.js";
import { sendSlack } from "./slack.js";

interface PostInfo {
  id: number;
  title: string;
  url: string;
  summary?: string;
  sourceName: string;
}

export async function notifyNewPost(post: PostInfo): Promise<void> {
  const db = await getDb();
  const settings = db.exec("SELECT channel, config, enabled FROM notification_settings WHERE enabled = 1");

  if (!settings[0]) return;

  const message = formatMessage(post);

  for (const row of settings[0].values) {
    const channel = row[0] as string;
    const config = JSON.parse(row[1] as string);

    try {
      switch (channel) {
        case "imessage":
          await sendIMessage(config.recipient, message);
          break;
        case "email":
          await sendEmail(config, `[WebMonitor] ${post.title}`, message);
          break;
        case "slack":
          await sendSlack(config.webhookUrl, message);
          break;
      }

      db.run(
        "INSERT INTO notifications (post_id, channel, status, sent_at) VALUES (?, ?, 'sent', datetime('now'))",
        [post.id, channel]
      );
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      db.run(
        "INSERT INTO notifications (post_id, channel, status, error_message) VALUES (?, ?, 'failed', ?)",
        [post.id, channel, errorMsg]
      );
      console.error(`[Notifier] ${channel} failed:`, errorMsg);
    }
  }

  saveDb();
}

function formatMessage(post: PostInfo): string {
  let msg = `📢 새 게시물 감지 [${post.sourceName}]\n\n`;
  msg += `제목: ${post.title}\n`;
  msg += `링크: ${post.url}\n`;
  if (post.summary) {
    msg += `\n요약: ${post.summary}\n`;
  }
  return msg;
}
