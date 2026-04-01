import { Router } from "express";
import { openLoginBrowser } from "../../crawler/browser-crawler.js";

const router = Router();

// POST /api/browser/login - Open headful browser for manual login
router.post("/login", async (req, res) => {
  const { url } = req.body;
  if (!url) {
    res.status(400).json({ error: "url이 필요합니다." });
    return;
  }

  // Respond immediately; browser opens in background
  res.json({ message: "브라우저가 열렸습니다. 로그인 후 창을 닫아주세요." });

  openLoginBrowser(url).catch((err) => {
    console.error("[Browser] Login session error:", err.message);
  });
});

export default router;
