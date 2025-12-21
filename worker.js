// Nav-CF Worker - FINAL SMART AI (OpenAI-first, explicit source)
// KV Binding: CARD_ORDER
// Env:
// - ADMIN_PASSWORD
// - AI_API_KEY (sk-xxxx placeholder supported)

import { SEED_DATA, SEED_USER_ID } from "./db.js";

function cleanDomain(hostname){
  return hostname
    .replace(/^www\./, "")
    .replace(/^cn\./, "")
    .split(".")[0];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ======================================================
       AI GENERATE — FIRST ROUTE, NO AUTH, OPENAI FIRST
       ====================================================== */
    if (url.pathname === "/api/aiGenerate") {
      let targetUrl = "";

      if (request.method === "POST") {
        try {
          const body = await request.json();
          targetUrl = body.url || "";
        } catch {}
      } else if (request.method === "GET") {
        targetUrl = url.searchParams.get("url") || "";
      }

      if (!targetUrl) {
        return Response.json({ name: "", desc: "", source: "none" });
      }

      const hostname = (() => {
        try { return new URL(targetUrl).hostname; }
        catch { return targetUrl; }
      })();

      const domain = cleanDomain(hostname);
      const aiKey = env.AI_API_KEY || "";
      const canUseAI = aiKey.startsWith("sk-") && !aiKey.includes("xxxx");

      /* ---------- OpenAI FIRST ---------- */
      if (canUseAI) {
        try {
          const prompt = `你是一个中文网站导航编辑。
请根据网址生成高质量信息：

要求：
- 名称：完整、自然，不要简称
- 描述：20~40 字，说明网站主要用途

网址：${targetUrl}

仅返回 JSON：{"name":"","desc":""}`;

          const r = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + aiKey
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3
            })
          });

          const j = await r.json();
          const t = j.choices?.[0]?.message?.content;
          if (t) {
            const ai = JSON.parse(t);
            if (ai.name || ai.desc) {
              return Response.json({
                name: ai.name || domain.charAt(0).toUpperCase() + domain.slice(1),
                desc: ai.desc || "",
                source: "openai"
              });
            }
          }
        } catch (e) {
          console.log("OpenAI failed, fallback used");
        }
      }

      /* ---------- CF SMART FALLBACK ---------- */
      let fallbackDesc = "官方网站";
      if (domain === "uptodown") fallbackDesc = "提供安卓与电脑应用的安全下载平台";
      if (domain === "github") fallbackDesc = "面向开发者的开源代码托管与协作平台";
      if (domain === "cloudflare") fallbackDesc = "提供 CDN、网络安全与性能优化服务的平台";

      return Response.json({
        name: domain.charAt(0).toUpperCase() + domain.slice(1),
        desc: fallbackDesc,
        source: "fallback"
      });
    }

    /* ================= PAGE ================= */
    if (url.pathname === "/") {
      return new Response(HTML_CONTENT, {
        headers: { "content-type": "text/html; charset=UTF-8" }
      });
    }

    /* ================= API ================= */
    if (url.pathname === "/api/getLinks") {
      const data = await env.CARD_ORDER.get(SEED_USER_ID, "json") || SEED_DATA;
      return Response.json(data);
    }

    if (url.pathname === "/api/saveOrder") {
      const auth = request.headers.get("Authorization");
      if (auth !== env.ADMIN_PASSWORD) {
        return new Response("Unauthorized", { status: 401 });
      }
      const body = await request.json();
      await env.CARD_ORDER.put(SEED_USER_ID, JSON.stringify(body));
      return Response.json({ ok: true });
    }

    return new Response("Not Found", { status: 404 });
  }
};

const HTML_CONTENT = `<!doctype html>
<!-- 使用你现有的 Nav-CF HTML，不需要改 -->
`;
