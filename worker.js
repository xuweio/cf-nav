const HTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>cf-nav</title>

<style>
/* =========================
   哪吒 · 探针黑 · 极简主题
========================= */
:root{
  --bg:#0B0E11;
  --panel:#13161B;
  --line:#1F2329;
  --red:#E53935;
  --text:#E6E6E6;
  --muted:#9AA0A6;
}

*{box-sizing:border-box}

html,body{
  margin:0;
  height:100%;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto;
}

body{
  background:var(--bg);
  color:var(--text);
}

/* 顶部 */
.header{
  position:sticky;
  top:0;
  z-index:10;
  padding:14px;
  background:var(--panel);
  border-bottom:1px solid var(--line);
}

.search{
  max-width:720px;
  margin:auto;
  display:flex;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:8px;
}

.search input{
  flex:1;
  padding:12px;
  background:none;
  border:none;
  outline:none;
  color:var(--text);
}

.search button{
  width:50px;
  border:none;
  background:var(--red);
  color:#fff;
  cursor:pointer;
}

/* 主体 */
.container{
  max-width:1200px;
  margin:24px auto;
  padding:0 16px;
}

.section{
  margin-bottom:24px;
}

.section h2{
  margin:0 0 10px;
  font-size:15px;
  color:var(--muted);
}

.grid{
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(180px,1fr));
  gap:14px;
}

.card{
  background:var(--panel);
  border-left:3px solid var(--red);
  padding:14px;
  border-radius:6px;
  cursor:pointer;
}

.card:hover{
  background:#161A20;
}

.card h3{
  margin:0 0 4px;
  font-size:14px;
}

.card p{
  margin:0;
  font-size:12px;
  color:var(--muted);
  word-break:break-all;
}

/* 右下角按钮 */
.fab{
  position:fixed;
  right:18px;
  bottom:18px;
  display:flex;
  flex-direction:column;
  gap:10px;
}

.fab button{
  width:44px;
  height:44px;
  border-radius:50%;
  border:none;
  background:var(--red);
  color:#fff;
  font-size:18px;
  cursor:pointer;
}

/* 弹窗 */
.modal{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.7);
  display:none;
  align-items:center;
  justify-content:center;
}

.box{
  width:320px;
  background:var(--panel);
  border:1px solid var(--line);
  padding:16px;
  border-radius:8px;
}

.box h3{
  margin:0 0 12px;
}

.box input, .box select{
  width:100%;
  padding:10px;
  margin-bottom:10px;
  background:#0E1116;
  border:1px solid var(--line);
  color:var(--text);
}

.box button{
  width:100%;
  padding:10px;
  border:none;
  background:var(--red);
  color:#fff;
  cursor:pointer;
}

.footer{
  text-align:center;
  padding:30px;
  font-size:12px;
  color:var(--muted);
}
</style>
</head>

<body>

<div class="header">
  <div class="search">
    <input id="q" placeholder="搜索书签">
    <button onclick="search()">🔍</button>
  </div>
</div>

<div class="container" id="content"></div>

<div class="footer">cf-nav · 哪吒探针黑</div>

<div class="fab">
  <button onclick="showLogin()">🔐</button>
  <button onclick="showAdd()">➕</button>
</div>

<!-- 登录 -->
<div class="modal" id="login">
  <div class="box">
    <h3>登录</h3>
    <input id="pwd" type="password" placeholder="ADMIN_PASSWORD">
    <button onclick="login()">登录</button>
  </div>
</div>

<!-- 添加 -->
<div class="modal" id="add">
  <div class="box">
    <h3>添加链接</h3>
    <input id="name" placeholder="名称">
    <input id="url" placeholder="URL">
    <input id="cat" placeholder="分类">
    <label><input type="checkbox" id="pri"> 私密</label>
    <button onclick="add()">保存</button>
  </div>
</div>

<script>
let links=[];
let authed=false;

function render(){
  const c=document.getElementById("content");
  c.innerHTML="";
  const map={};
  links.forEach(l=>{
    if(l.private && !authed) return;
    map[l.category]=map[l.category]||[];
    map[l.category].push(l);
  });
  Object.keys(map).forEach(cat=>{
    const s=document.createElement("div");
    s.className="section";
    s.innerHTML=\`<h2>\${cat}</h2>\`;
    const g=document.createElement("div");
    g.className="grid";
    map[cat].forEach(l=>{
      const d=document.createElement("div");
      d.className="card";
      d.innerHTML=\`<h3>\${l.name}</h3><p>\${l.url}</p>\`;
      d.onclick=()=>window.open(l.url,"_blank");
      g.appendChild(d);
    });
    s.appendChild(g);
    c.appendChild(s);
  });
}

function search(){
  const q=document.getElementById("q").value.toLowerCase();
  renderFiltered(q);
}

function renderFiltered(q){
  const c=document.getElementById("content");
  c.innerHTML="";
  const g=document.createElement("div");
  g.className="grid";
  links.forEach(l=>{
    if(l.private && !authed) return;
    if(l.name.toLowerCase().includes(q)||l.url.toLowerCase().includes(q)){
      const d=document.createElement("div");
      d.className="card";
      d.innerHTML=\`<h3>\${l.name}</h3><p>\${l.url}</p>\`;
      d.onclick=()=>window.open(l.url,"_blank");
      g.appendChild(d);
    }
  });
  c.appendChild(g);
}

function showLogin(){document.getElementById("login").style.display="flex";}
function showAdd(){ if(!authed)return alert("请先登录"); document.getElementById("add").style.display="flex"; }

function login(){
  fetch("/api/login",{method:"POST",body:document.getElementById("pwd").value})
    .then(r=>r.ok?(authed=true,document.getElementById("login").style.display="none",load()):alert("密码错误"));
}

function add(){
  fetch("/api/add",{method:"POST",headers:{'content-type':'application/json'},
    body:JSON.stringify({
      name:name.value,url:url.value,category:cat.value,private:pri.checked
    })}).then(()=>{add.style.display="none";load();});
}

function load(){
  fetch("/api/list").then(r=>r.json()).then(d=>{links=d;render();});
}

load();
</script>

</body>
</html>
`;

export default {
  async fetch(req, env) {
    const url=new URL(req.url);
    const key="links";
    const pwd=env.ADMIN_PASSWORD;

    if(url.pathname==="/api/list"){
      const d=await env.CARD_ORDER.get(key);
      return new Response(d||"[]",{headers:{'content-type':'application/json'}});
    }

    if(url.pathname==="/api/login"){
      const t=await req.text();
      return new Response(null,{status:t===pwd?200:403});
    }

    if(url.pathname==="/api/add"){
      const arr=JSON.parse(await env.CARD_ORDER.get(key)||"[]");
      arr.push(await req.json());
      await env.CARD_ORDER.put(key,JSON.stringify(arr));
      return new Response("ok");
    }

    return new Response(HTML,{headers:{'content-type':'text/html;charset=UTF-8'}});
  }
};
