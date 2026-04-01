import { Router } from "express";
import { getDb, saveDb } from "../../db/index.js";
import { analyzeSelectors } from "../../crawler/selector-analyzer.js";
import { scheduleSource, stopSource, crawlSource } from "../../scheduler/index.js";

const router = Router();

// GET /api/sources - List all sources
router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      "SELECT id, name, url, type, interval_minutes, selectors, keywords, enabled, created_at, updated_at FROM sources ORDER BY created_at DESC"
    );

    if (!result[0]) {
      res.json([]);
      return;
    }

    const sources = result[0].values.map((row) => ({
      id: row[0],
      name: row[1],
      url: row[2],
      type: row[3],
      interval_minutes: row[4],
      selectors: JSON.parse(row[5] as string),
      keywords: JSON.parse(row[6] as string),
      enabled: !!row[7],
      created_at: row[8],
      updated_at: row[9],
    }));

    res.json(sources);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/sources - Create a new source
router.post("/", async (req, res) => {
  try {
    const { name, url, type, interval_minutes, selectors, keywords } = req.body;
    const db = await getDb();

    db.run(
      `INSERT INTO sources (name, url, type, interval_minutes, selectors, keywords)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name,
        url,
        type || "html",
        interval_minutes || 5,
        JSON.stringify(selectors || {}),
        JSON.stringify(keywords || []),
      ]
    );

    saveDb();

    const result = db.exec("SELECT last_insert_rowid()");
    const id = result[0]?.values[0]?.[0] as number;

    // Start scheduling
    scheduleSource(id, interval_minutes || 5);

    res.status(201).json({ id, message: "Source created" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// PUT /api/sources/:id - Update a source
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, url, type, interval_minutes, selectors, keywords, enabled } = req.body;
    const db = await getDb();

    db.run(
      `UPDATE sources SET name=?, url=?, type=?, interval_minutes=?, selectors=?, keywords=?, enabled=?, updated_at=datetime('now')
       WHERE id=?`,
      [
        name,
        url,
        type,
        interval_minutes,
        JSON.stringify(selectors),
        JSON.stringify(keywords),
        enabled ? 1 : 0,
        Number(id),
      ]
    );

    saveDb();

    if (enabled) {
      scheduleSource(Number(id), interval_minutes);
    } else {
      stopSource(Number(id));
    }

    res.json({ message: "Source updated" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/sources/:id - Delete a source
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const db = await getDb();

    stopSource(Number(id));
    db.run("DELETE FROM posts WHERE source_id = ?", [Number(id)]);
    db.run("DELETE FROM sources WHERE id = ?", [Number(id)]);
    saveDb();

    res.json({ message: "Source deleted" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/sources/analyze - Auto-detect CSS selectors
router.post("/analyze", async (req, res) => {
  try {
    const { url, rowSelector, useBrowser } = req.body;
    if (!url || !rowSelector) {
      res.status(400).json({ error: "url과 rowSelector가 필요합니다." });
      return;
    }

    const result = await analyzeSelectors(url, rowSelector, !!useBrowser);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/sources/:id/crawl - Trigger manual crawl
router.post("/:id/crawl", async (req, res) => {
  try {
    const { id } = req.params;
    await crawlSource(Number(id));
    res.json({ message: "Crawl triggered" });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
