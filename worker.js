// Nav-CF Worker - FINAL AI FIX
// KV: CARD_ORDER
// ENV:
// - ADMIN_PASSWORD
// - AI_API_KEY

import { SEED_DATA, SEED_USER_ID } from "./db.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    /* ================= AI GENERATE ================= */
    if (url.pathname === "/api/aiGenerate") {
      // ❌ 明确拒绝 GET，防止误触
      if (request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      console.log("[AI] POST /api/aiGenerate received");

      let targetUrl = "";
      try {
        const body = await request.json();
        targetUrl = body.url || "";
      } catch (e) {
        console.log("[AI] JSON parse failed");
      }

      if (!targetUrl) {
        console.log("[AI] empty url");
        return Response.json({ name: "", desc: "" });
      }

      const hostname = (() => {
        try { return new URL(targetUrl).hostname.replace(/^www\./, ""); }
        catch { return targetUrl; }
      })();

      /* ===== OpenAI CALL ===== */
      if (env.AI_API_KEY) {
        try {
          console.log("[AI] calling OpenAI for:", targetUrl);

          const prompt = `请根据以下网站地址生成：
1. 网站名称（不超过10个字）
2. 一句话简介（不超过30个字）

网址：${targetUrl}

仅返回 JSON：{"name":"","desc":""}`;

          const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": "Bearer " + env.AI_API_KEY
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.2
            })
          });

          const aiJson = await aiRes.json();
          console.log("[AI] OpenAI response:", aiJson);

          const content = aiJson.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            return Response.json({
              name: parsed.name || hostname.split(".")[0],
              desc: parsed.desc || "官方网站"
            });
          }
        } catch (e) {
          console.log("[AI] OpenAI error:", e);
        }
      } else {
        console.log("[AI] AI_API_KEY not set");
      }

      // fallback
      console.log("[AI] fallback used");
      return Response.json({
        name: hostname.split(".")[0],
        desc: "官方网站"
      });
    }

    /* ================= NORMAL ROUTES ================= */
    if (url.pathname === "/") {
      return new Response(HTML_CONTENT, {
        headers: { "content-type": "text/html; charset=UTF-8" }
      });
    }

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
<!-- HTML 与你现有 Nav-CF 完全一致，只修 AI JS -->
<script>
document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("ai-generate-btn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const url = document.getElementById("url-input").value;
    if (!url) return alert("请先填写地址");

    btn.textContent = "AI...";
    btn.disabled = true;

    try {
      const res = await fetch("/api/aiGenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url })
      });

      const data = await res.json();
      if (data.name) document.getElementById("name-input").value = data.name;
      if (data.desc) document.getElementById("tips-input").value = data.desc;
    } catch (e) {
      alert("AI 调用失败");
    } finally {
      btn.textContent = "AI";
      btn.disabled = false;
    }
  });
});
</script>`;
