import { Router } from "express";
import { getDb } from "../../db/index.js";

const router = Router();

// GET /api/crawl-logs - List crawl history
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const { source_id, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = "1=1";
    const params: (string | number)[] = [];

    if (source_id) {
      where += " AND cl.source_id = ?";
      params.push(Number(source_id));
    }

    const countResult = db.exec(
      `SELECT COUNT(*) FROM crawl_logs cl WHERE ${where}`,
      params
    );
    const total = countResult[0]?.values[0]?.[0] as number;

    const result = db.exec(
      `SELECT cl.id, cl.source_id, s.name as source_name, cl.status,
              cl.total_found, cl.new_posts, cl.matched_posts,
              cl.error_message, cl.crawled_at
       FROM crawl_logs cl
       LEFT JOIN sources s ON s.id = cl.source_id
       WHERE ${where}
       ORDER BY cl.crawled_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const logs = result[0]
      ? result[0].values.map((row) => ({
          id: row[0],
          source_id: row[1],
          source_name: row[2],
          status: row[3],
          total_found: row[4],
          new_posts: row[5],
          matched_posts: row[6],
          error_message: row[7],
          crawled_at: row[8],
        }))
      : [];

    res.json({ logs, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
