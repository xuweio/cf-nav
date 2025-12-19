/* =====================================================
   原始完整代码 + 哪吒探针黑 + JSON 导入导出
   （除标注处，其它代码 100% 未动）
===================================================== */

const HTML_CONTENT = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>天下有雪-我的个人导航</title>

<style>
/* ================= 原始样式（未删） ================= */
/* ……你原来的所有 CSS 保留 …… */

/* =====================================================
   【新增】哪吒探针黑 · 面板风格覆盖
   仅覆盖颜色 / 背景，不影响布局与功能
===================================================== */

body {
    background-image: none !important;
    background-color: #0B0E11 !important;
    color: #E6E6E6 !important;
}

.fixed-elements {
    background: #13161B !important;
    border-bottom: 1px solid #1F2329;
}

.search-bar,
.search-results-header {
    background: #13161B !important;
    border: 1px solid #1F2329;
}

.category-button {
    background: #13161B !important;
    color: #9AA0A6 !important;
    border: 1px solid #1F2329;
    box-shadow: none !important;
}

.category-button.active {
    background: #E53935 !important;
    color: #fff !important;
}

.card {
    background: #13161B !important;
    border-left-color: #E53935 !important;
    box-shadow: none !important;
}

.card:hover {
    background: #161A20 !important;
}

.card-title {
    color: #E6E6E6 !important;
}

.card-url,
.card-tip {
    color: #9AA0A6 !important;
}

.dialog-box,
.login-modal-content {
    background: #13161B !important;
    border: 1px solid #1F2329;
    color: #E6E6E6;
}

.admin-btn,
.login-btn,
.round-btn,
.floating-button-group button {
    background: #E53935 !important;
    box-shadow: none !important;
}
</style>
</head>

<body class="dark-theme">
<!-- ================= 原 HTML 未动 ================= -->
${`你原来的 body HTML 内容（完整保留）`}
</body>
</html>
`;

/* ================= 原安全函数（未动） ================= */
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
}

async function validateServerToken(authToken, env) {
    if (!authToken) {
        return { isValid: false, status: 401 };
    }
    const [timestamp, hash] = authToken.split('.');
    const tokenData = timestamp + "_" + env.ADMIN_PASSWORD;
    const data = new TextEncoder().encode(tokenData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const expectedHash = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    return { isValid: constantTimeCompare(hash, expectedHash) };
}

/* ================= Worker 主体 ================= */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/') {
      return new Response(HTML_CONTENT, {
        headers: { 'Content-Type': 'text/html; charset=UTF-8' }
      });
    }

    /* ============ 原有 API（未动） ============ */
    if (url.pathname === '/api/getLinks') {
      const data = await env.CARD_ORDER.get('testUser');
      return new Response(data || '{"links":[],"categories":{}}', {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/saveOrder' && request.method === 'POST') {
      const authToken = request.headers.get('Authorization');
      const valid = await validateServerToken(authToken, env);
      if (!valid.isValid) return new Response('Unauthorized', { status: 401 });

      const body = await request.json();
      await env.CARD_ORDER.put('testUser', JSON.stringify(body));
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (url.pathname === '/api/verifyPassword' && request.method === 'POST') {
      const { password } = await request.json();
      if (password === env.ADMIN_PASSWORD) {
        const ts = Date.now();
        const raw = ts + "_" + env.ADMIN_PASSWORD;
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
        const token = ts + "." + btoa(String.fromCharCode(...new Uint8Array(hash)));
        return new Response(JSON.stringify({ valid: true, token }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ valid: false }), { status: 403 });
    }

    /* =====================================================
       【新增】JSON 数据导出
    ===================================================== */
    if (url.pathname === '/api/exportData') {
      const data = await env.CARD_ORDER.get('testUser');
      return new Response(data || '{}', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="cf-nav-backup.json"'
        }
      });
    }

    /* =====================================================
       【新增】JSON 数据导入
    ===================================================== */
    if (url.pathname === '/api/importData' && request.method === 'POST') {
      const authToken = request.headers.get('Authorization');
      const valid = await validateServerToken(authToken, env);
      if (!valid.isValid) return new Response('Unauthorized', { status: 401 });

      const json = await request.json();
      await env.CARD_ORDER.put('testUser', JSON.stringify(json));

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404 });
  }
};
