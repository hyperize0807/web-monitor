import { Router } from "express";
import { getDb } from "../../db/index.js";

const router = Router();

// GET /api/posts - List posts with pagination and filters
router.get("/", async (req, res) => {
  try {
    const db = await getDb();
    const { source_id, keyword, page = "1", limit = "50" } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let where = "1=1";
    const params: (string | number)[] = [];

    if (source_id) {
      where += " AND p.source_id = ?";
      params.push(Number(source_id));
    }

    if (keyword) {
      where += " AND (p.title LIKE ? OR p.content LIKE ?)";
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const countResult = db.exec(
      `SELECT COUNT(*) FROM posts p WHERE ${where}`,
      params
    );
    const total = countResult[0]?.values[0]?.[0] as number;

    const result = db.exec(
      `SELECT p.id, p.source_id, s.name as source_name, p.title, p.url, p.author, p.summary, p.detected_at
       FROM posts p
       LEFT JOIN sources s ON s.id = p.source_id
       WHERE ${where}
       ORDER BY p.detected_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(limit), offset]
    );

    const posts = result[0]
      ? result[0].values.map((row) => ({
          id: row[0],
          source_id: row[1],
          source_name: row[2],
          title: row[3],
          url: row[4],
          author: row[5],
          summary: row[6],
          detected_at: row[7],
        }))
      : [];

    res.json({ posts, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
