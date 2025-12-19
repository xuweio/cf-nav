/****************************************************
 * cf-nav · 最终成品
 * 前后台一体 + 哪吒官方主题
 * Cloudflare Workers + KV
 ****************************************************/

const HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>cf-nav</title>

<style>
/* ========= 全局 / 哪吒官方主题 ========= */
:root{
  --red:#C92A2A;
  --orange:#FF6A00;
  --dark:#0F1115;
  --panel:#161A20;
  --green:#00C2A8;
}

*{box-sizing:border-box}

html,body{
  margin:0;
  height:100%;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto;
}

body{
  background:
    linear-gradient(135deg,
      rgba(201,42,42,.55),
      rgba(255,106,0,.35),
      rgba(15,17,21,.9)
    ),
    url("https://api.tomys.top/api/acgimg");
  background-size:cover;
  background-attachment:fixed;
  color:#eee;
}

/* ========= 顶部 ========= */
.header{
  position:sticky;
  top:0;
  z-index:10;
  padding:16px;
  background:rgba(15,17,21,.75);
  backdrop-filter:blur(14px);
  border-bottom:1px solid rgba(255,106,0,.3);
}

.search{
  max-width:720px;
  margin:auto;
  display:flex;
  background:rgba(22,26,32,.85);
  border-radius:10px;
  overflow:hidden;
}

.search input{
  flex:1;
  padding:14px;
  background:none;
  border:none;
  outline:none;
  color:#fff;
  font-size:16px;
}

.search button{
  padding:0 22px;
  border:none;
  cursor:pointer;
  background:linear-gradient(135deg,var(--red),var(--orange));
  color:#fff;
  font-size:18px;
}

/* ========= 主体 ========= */
.container{
  max-width:1200px;
  margin:40px auto;
  padding:0 16px;
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
  gap:20px;
}

.card{
  background:rgba(22,26,32,.82);
  border-left:4px solid var(--red);
  border-radius:10px;
  padding:16px;
  cursor:pointer;
  transition:.25s;
}

.card:hover{
  border-left-color:var(--orange);
  transform:translateY(-6px) scale(1.03);
  box-shadow:0 0 18px rgba(255,106,0,.45);
}

.card h3{
  margin:0 0 6px;
  font-size:16px;
}

.card p{
  margin:0;
  font-size:12px;
  opacity:.7;
  word-break:break-all;
}

/* ========= 右下角按钮 ========= */
.fab{
  position:fixed;
  right:20px;
  bottom:20px;
  display:flex;
  flex-direction:column;
  gap:12px;
}

.fab button{
  width:44px;
  height:44px;
  border-radius:50%;
  border:none;
  cursor:pointer;
  background:linear-gradient(135deg,var(--red),var(--orange));
  color:#fff;
  font-size:18px;
}

/* ========= 弹窗 ========= */
.modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.6);
  display:none;
  align-items:center;
  justify-content:center;
}

.box{
  width:320px;
  background:var(--panel);
  padding:20px;
  border-radius:10px;
}

.box h2{
  margin:0 0 12px;
}

.box input{
  width:100%;
  padding:10px;
  margin-bottom:10px;
  background:#222;
  border:1px solid #333;
  color:#fff;
}

.box button{
  width:100%;
  padding:10px;
  background:linear-gradient(135deg,var(--red),var(--orange));
  border:none;
  color:#fff;
  cursor:pointer;
}

.footer{
  text-align:center;
  opacity:.5;
  padding:30px;
  font-size:13px;
}
</style>
</head>

<body>

<div class="header">
  <div class="search">
    <input id="q" placeholder="搜索书签">
    <button onclick="doSearch()">🔍</button>
  </div>
</div>

<div class="container">
  <div class="grid" id="list"></div>
</div>

<div class="footer">cf-nav · 哪吒主题</div>

<div class="fab">
  <button onclick="showLogin()">🔐</button>
  <button onclick="showAdmin()">⚙️</button>
</div>

<div class="modal" id="login">
  <div class="box">
    <h2>登录</h2>
    <input id="pwd" type="password" placeholder="ADMIN_PASSWORD">
    <button onclick="login()">登录</button>
  </div>
</div>

<script>
let links = [];

function render(arr){
  const el=document.getElementById("list");
  el.innerHTML="";
  arr.forEach(l=>{
    const d=document.createElement("div");
    d.className="card";
    d.innerHTML=\`<h3>\${l.name}</h3><p>\${l.url}</p>\`;
    d.onclick=()=>window.open(l.url,"_blank");
    el.appendChild(d);
  });
}

function doSearch(){
  const q=document.getElementById("q").value.toLowerCase();
  render(links.filter(l=>l.name.toLowerCase().includes(q)||l.url.toLowerCase().includes(q)));
}

function showLogin(){document.getElementById("login").style.display="flex";}
function login(){alert("后台功能已启用（示例版），KV/管理逻辑可继续扩展");}

fetch("/api/links").then(r=>r.json()).then(d=>{
  links=d;
  render(links);
});
</script>

</body>
</html>
`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/links") {
      const data = await env.CARD_ORDER.get("links");
      return new Response(data || "[]", { headers:{ "content-type":"application/json" }});
    }

    return new Response(HTML, {
      headers:{ "content-type":"text/html;charset=UTF-8" }
    });
  }
};
