import { Router } from "express";
import { getDb, saveDb } from "../../db/index.js";

const router = Router();

// GET /api/notifications - List notification history
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const { page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const countResult = db.exec("SELECT COUNT(*) FROM notifications");
    const total = countResult[0]?.values[0]?.[0] as number;

    const result = db.exec(
      `SELECT n.id, n.post_id, p.title, p.url, s.name as source_name,
              n.channel, n.status, n.error_message, n.sent_at
       FROM notifications n
       LEFT JOIN posts p ON p.id = n.post_id
       LEFT JOIN sources s ON s.id = p.source_id
       ORDER BY n.id DESC
       LIMIT ? OFFSET ?`,
      [Number(limit), offset]
    );

    const notifications = result[0]
      ? result[0].values.map((row) => ({
          id: row[0],
          post_id: row[1],
          title: row[2],
          url: row[3],
          source_name: row[4],
          channel: row[5],
          status: row[6],
          error_message: row[7],
          sent_at: row[8],
        }))
      : [];

    res.json({ notifications, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/notifications/settings - Get notification settings
router.get("/settings", async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      "SELECT id, channel, config, enabled FROM notification_settings"
    );

    const settings = result[0]
      ? result[0].values.map((row) => ({
          id: row[0],
          channel: row[1],
          config: JSON.parse(row[2] as string),
          enabled: !!row[3],
        }))
      : [];

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/notifications/settings/:channel - Update notification setting
router.put("/settings/:channel", async (req, res) => {
  try {
    const { channel } = req.params;
    const { config, enabled } = req.body;
    const db = await getDb();

    db.run(
      "UPDATE notification_settings SET config = ?, enabled = ? WHERE channel = ?",
      [JSON.stringify(config), enabled ? 1 : 0, channel]
    );

    saveDb();
    res.json({ message: "Settings updated" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
