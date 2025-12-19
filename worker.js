/**
 * cf-nav2 worker.js
 * 完整版本：包含
 * - 页面渲染
 * - 登录鉴权
 * - KV 读写
 * - 自动备份
 * - 数据导出 / 导入
 */

/* =========================
   HTML 页面（前端）
========================= */
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Card Tab</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto;background:#f8f6f2;color:#222}
.fixed-elements{position:fixed;top:0;width:100%;background:#f8f6f2;padding:12px 16px;z-index:1000}
.fixed-elements h3{margin:0;font-size:22px}
.search-container{margin-top:10px;display:flex;justify-content:center}
.search-bar{display:flex;max-width:600px;width:100%;border-radius:8px;overflow:hidden;border:1px solid #ddd}
.search-bar select{border:none;padding:10px;background:#eef2ff;color:#4A6CF7}
.search-bar input{flex:1;border:none;padding:10px}
.search-bar button{border:none;background:#4A6CF7;color:#fff;padding:0 16px}
.category-buttons-container{margin-top:8px;display:flex;gap:6px;justify-content:center;flex-wrap:wrap}
.category-button{border:none;background:#eef2ff;color:#4A6CF7;padding:5px 12px;border-radius:14px;cursor:pointer}
.category-button.active,.category-button:hover{background:#4A6CF7;color:#fff}
.content{margin-top:150px;padding-bottom:100px}
.section-title{font-size:20px;font-weight:600;padding-left:10px;border-left:4px solid #4A6CF7}
.card-container{display:grid;grid-template-columns:repeat(auto-fit,150px);gap:20px;padding:16px}
.card{background:#fff;padding:12px;border-radius:8px;border-left:3px solid #4A6CF7;cursor:pointer}
.floating-admin{position:fixed;right:16px;bottom:80px;display:none;flex-direction:column;gap:10px}
.floating-admin button{width:40px;height:40px;border-radius:50%;border:none;background:#4A6CF7;color:#fff;font-size:18px;cursor:pointer}
.login-bar{position:fixed;top:12px;right:16px}
</style>
</head>
<body>

<div class="fixed-elements">
  <h3>我的导航</h3>

  <div class="search-container">
    <div class="search-bar">
      <select><option>百度</option></select>
      <input placeholder="搜索...">
      <button>🔍</button>
    </div>
  </div>

  <div id="category-buttons-container" class="category-buttons-container"></div>
</div>

<div class="login-bar">
  <button onclick="login()">登录</button>
  <button onclick="logout()">退出</button>
  <button onclick="toggleAdmin()">设置</button>
</div>

<div class="content" id="sections-container"></div>

<div class="floating-admin" id="admin-tools">
  <button title="导出" onclick="exportData()">📦</button>
  <button title="导入" onclick="triggerImport()">📥</button>
</div>

<input type="file" id="import-file" accept="application/json" style="display:none">

<script>
let isAdmin=false
let token=null

function updateAdminUI(){
  document.getElementById('admin-tools').style.display=isAdmin?'flex':'none'
}

async function login(){
  const pwd=prompt('输入管理员密码')
  if(!pwd)return
  const res=await fetch('/api/verifyPassword',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:pwd})})
  const data=await res.json()
  if(data.valid){
    token=data.token
    localStorage.setItem('authToken',token)
    alert('登录成功')
  }else alert('密码错误')
}

function logout(){
  localStorage.removeItem('authToken')
  token=null
  isAdmin=false
  updateAdminUI()
  alert('已退出')
}

async function toggleAdmin(){
  token=localStorage.getItem('authToken')
  if(!token)return alert('请先登录')
  isAdmin=!isAdmin
  updateAdminUI()
}

async function exportData(){
  token=localStorage.getItem('authToken')
  if(!token)return alert('未登录')
  const res=await fetch('/api/exportData',{headers:{Authorization:token}})
  if(!res.ok)return alert('导出失败')
  const blob=await res.blob()
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a')
  a.href=url
  a.download='card-tab-backup.json'
  a.click()
  URL.revokeObjectURL(url)
}

function triggerImport(){
  document.getElementById('import-file').click()
}

document.getElementById('import-file').addEventListener('change',async e=>{
  const file=e.target.files[0]
  if(!file)return
  if(!confirm('导入会覆盖当前数据，已自动备份，继续？'))return
  const text=await file.text()
  let json
  try{json=JSON.parse(text)}catch{alert('JSON错误');return}
  token=localStorage.getItem('authToken')
  const res=await fetch('/api/importData',{method:'POST',headers:{'Content-Type':'application/json',Authorization:token},body:JSON.stringify(json)})
  if(res.ok){alert('导入成功');location.reload()}else alert('导入失败')
})
</script>

</body>
</html>`;

/* =========================
   安全工具
========================= */
function constantTimeCompare(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function validateToken(token, env) {
  if (!token) return { ok: false };
  try {
    const [ts, hash] = token.split('.');
    if (Date.now() - Number(ts) > 15 * 60 * 1000) return { ok: false };
    const raw = ts + '_' + env.ADMIN_PASSWORD;
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const expect = btoa(String.fromCharCode(...new Uint8Array(buf)));
    if (!constantTimeCompare(hash, expect)) return { ok: false };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/* =========================
   Worker 主体
========================= */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (url.pathname === '/') {
      return new Response(HTML_CONTENT, { headers: { 'Content-Type': 'text/html' } });
    }

    if (url.pathname === '/api/verifyPassword' && req.method === 'POST') {
      const { password } = await req.json();
      if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ valid: false }), { status: 403 });
      }
      const ts = Date.now();
      const raw = ts + '_' + env.ADMIN_PASSWORD;
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      const hash = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return new Response(JSON.stringify({ valid: true, token: ts + '.' + hash }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/api/getLinks') {
      const data = await env.CARD_ORDER.get('testUser');
      return new Response(data || JSON.stringify({ links: [], categories: {} }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/api/saveOrder' && req.method === 'POST') {
      const token = req.headers.get('Authorization');
      const v = await validateToken(token, env);
      if (!v.ok) return new Response('Unauthorized', { status: 401 });
      const body = await req.json();
      await env.CARD_ORDER.put('testUser', JSON.stringify(body));
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (url.pathname === '/api/exportData') {
      const token = req.headers.get('Authorization');
      const v = await validateToken(token, env);
      if (!v.ok) return new Response('Unauthorized', { status: 401 });
      const data = await env.CARD_ORDER.get('testUser');
      return new Response(data || '{}', {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="card-tab-backup.json"'
        }
      });
    }

    if (url.pathname === '/api/importData' && req.method === 'POST') {
      const token = req.headers.get('Authorization');
      const v = await validateToken(token, env);
      if (!v.ok) return new Response('Unauthorized', { status: 401 });

      const old = await env.CARD_ORDER.get('testUser');
      if (old) await env.CARD_ORDER.put('backup_' + Date.now(), old);

      const body = await req.json();
      await env.CARD_ORDER.put('testUser', JSON.stringify(body));
      return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    return new Response('Not Found', { status: 404 });
  }
};
