#!/usr/bin/env node
/* HARZ MESH NODE v0.1 (Oct 21, 2026) — offline storage node, zero dependencies.
   LAW: one object identity (sha256), integrity verified BEFORE serving,
   individual objects only (no library sync), durable inventory, local mesh only.
   Usage: node harz-mesh-node-v01.js <port> <objectsDir> [corrupt=<sha>]
   Serves ONLY on 127.0.0.1 (or LAN IP with --lan). */
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const PORT = parseInt(process.argv[2] || '8797', 10);
const OBJDIR = process.argv[3] || 'objects';
const LAN = process.argv.includes('--lan');
const corrupt = (process.argv.find(a => a.startsWith('corrupt=')) || '').split('=')[1];
let REGISTRY = [];
try { REGISTRY = JSON.parse(fs.readFileSync('TRUSTED-REGISTRY.json','utf8')); } catch (e) {}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function send(res, code, body, type) { res.writeHead(code, {'content-type': type, 'Access-Control-Allow-Origin': '*'}); res.end(body); }
const srv = http.createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);

  if (u === '/') {
    const page = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>HARZ Mesh Client</title>
<style>body{font-family:system-ui;max-width:640px;margin:16px auto;padding:12px;line-height:1.5;color:#222}
.b{background:#0a7d3c;color:#fff;border-radius:6px;padding:2px 8px;font-size:12px}
.o{border:1px solid #ccc;border-radius:8px;padding:10px;margin:8px 0}
.v{color:#0a7d3c;font-weight:700}.x{color:#b00;font-weight:700}
pre{white-space:pre-wrap;background:#f6f6f6;padding:10px;border-radius:6px;max-height:60vh;overflow:auto}button{padding:6px 10px}</style>
<h2>HARZ Mesh Client <span class=b>OFFLINE MESH</span></h2>
<div id=s>discovering...</div><div id=l></div><div id=c></div>
<script>const REG=${JSON.stringify(REGISTRY)};
async function sha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
(async()=>{const inv=await(await fetch('/inventory')).json();
document.getElementById('s').textContent='node: '+location.host+' | '+inv.count+' objects held';let h='';
for(const o of inv.objects){const r=REG.find(x=>x.sha256===o.sha256);
h+='<div class=o>'+o.sha256.slice(0,16)+'... '+o.bytes+' bytes'+(r?' · id '+r.id:' · unknown')+' <button onclick="get(\''+o.sha256+'\')">retrieve + verify</button></div>'}
document.getElementById('l').innerHTML=h})().catch(e=>document.getElementById('s').textContent='mesh error: '+e);
async function get(sha){document.getElementById('c').textContent='requesting...';
const r=await fetch('/obj/'+sha);if(!r.ok){document.getElementById('c').innerHTML='<p class=x>REJECTED by node</p>';return}
const t=await r.text();const got=await sha(t);
document.getElementById('c').innerHTML=(got===sha?'<p class=v>SHA-256 VERIFIED \u2713 '+got.slice(0,24)+'...</p>':'<p class=x>HASH MISMATCH - rejected</p>')
+'<pre>'+t.slice(0,4000)+(t.length>4000?'\n...':'')+'</pre>'}</script>`;
    return send(res, 200, page, 'text/html; charset=utf-8');
  }
  if (u === '/health') return send(res, 200, JSON.stringify({node: 'harz-mesh-node-v0.1', ok: true}), 'application/json');
  if (u === '/inventory') {  // the advertisement: exactly what this node holds
    const inv = [];
    for (const sub of fs.readdirSync(OBJDIR)) for (const f of fs.readdirSync(path.join(OBJDIR, sub))) {
      if (f.endsWith('.txt')) { const st = fs.statSync(path.join(OBJDIR, sub, f));
        inv.push({sha256: f.replace('.txt',''), bytes: st.size}); } }
    return send(res, 200, JSON.stringify({objects: inv, count: inv.length}), 'application/json');
  }
  const m = u.match(/^\/obj\/([0-9a-f]{64})$/);
  if (m) {
    const want = m[1]; const p = path.join(OBJDIR, want.slice(0,2), want + '.txt');
    if (!fs.existsSync(p)) return send(res, 404, JSON.stringify({error: 'object not held by this node'}), 'application/json');
    let buf = fs.readFileSync(p);
    let actual = sha256(buf);
    if (corrupt && corrupt === want) { buf = Buffer.concat([buf, Buffer.from('TAMPERED')]); actual = sha256(buf); }
    if (actual !== want) return send(res, 500, JSON.stringify({error: 'INTEGRITY FAILURE: held object does not match its content hash — refusing to serve', expected: want, actual}), 'application/json');
    res.writeHead(200, {'content-type': 'text/plain; charset=utf-8', 'content-length': buf.length,
      'x-harz-sha256': want, 'x-harz-verified-at-serve': 'true', 'Access-Control-Allow-Origin': '*'});
    return res.end(buf);
  }
  return send(res, 404, JSON.stringify({error: 'unknown route'}), 'application/json');
});
srv.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => console.log('HARZ MESH NODE v0.1 on port ' + PORT + ' holding ' + OBJDIR));
