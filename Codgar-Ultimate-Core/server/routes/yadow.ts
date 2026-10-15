import { Router } from "express";

const router = Router();

// اندپوینت پایش سلامت سرور
router.get("/api/status", (req, res) => {
  res.json({ status: "ok", server: "Codgar Universal Backend", port: 3000 });
});

// NOTE: The MCP endpoints /api/mcp/ping, /api/mcp/action and /api/mcp/shell are
// intentionally NOT defined here. This router is mounted inside startServer()
// (server.ts) BEFORE the real "UNIVERSAL MACOS MCP & LIVE TERMINAL ENGINE"
// routes registered later in server.ts, so any handler declared here would
// permanently shadow the real engine and return a hardcoded fake response
// instead of actually executing shell commands. The real implementations live
// in server.ts.

// هندلر هوشمند چت و پردازش داینامیک تصاویر FLUX
const handleChat = async (req: any, res: any) => {
  try {
    const body = req.body || {};
    const text = body.message || body.prompt || "";

    if (
      text.includes("Image Generation Request") ||
      text.includes("image") ||
      text.includes("عکس") ||
      text.includes("تصویر") ||
      text.includes("sunflower") ||
      text.includes("طراحی")
    ) {
      let promptDesc = "";
      const descMatch = text.match(/Prompt Description:\s*([^\n]+)/i);
      if (descMatch) {
        promptDesc = descMatch.trim();
      } else {
        promptDesc = text.replace(/\[.*?\]/g, "").replace(/(?:عکس|تصویر|بساز|طراحی کن|یک|برام)/gi, "").trim();
      }
      if (!promptDesc) promptDesc = "design a sunflower with rich golden petals in cinematic morning sunlight";

      let artStyle = "cinematic";
      const styleMatch = text.match(/Art Style:\s*([^\n]+)/i);
      if (styleMatch) artStyle = styleMatch.trim();

      let width = 1024, height = 576;
      const ratioMatch = text.match(/Aspect Ratio:\s*([^\n]+)/i);
      if (ratioMatch) {
        const r = ratioMatch.trim();
        if (r.includes("1:1")) { width = 1024; height = 1024; }
        else if (r.includes("9:16")) { width = 576; height = 1024; }
      }

      const fullPrompt = `${promptDesc}, ${artStyle}, highly detailed, 8k resolution, cinematic lighting, masterpiece`;
      const encoded = encodeURIComponent(fullPrompt);
      const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=1280&height=720&nologo=true&model=flux&seed=${Date.now()}`;

      return res.json({
        reply: imageUrl,
        response: imageUrl,
        imageUrl: imageUrl,
        source: "flux_image_engine"
      });
    }

    res.json({
      reply: `درخواست شما با موفقیت دریافت شد: ${text}`,
      response: `درخواست شما با موفقیت دریافت شد: ${text}`
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error processing request" });
  }
};

router.post("/api/companion/chat", handleChat);
router.post("/api/chat", handleChat);

const yadowRouterExport: any = function() {
  return router;
};
Object.setPrototypeOf(yadowRouterExport, router);






export function createYadowRouter() {
  return router;
}
export { router };
export default router;
