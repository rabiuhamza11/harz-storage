#!/usr/bin/env node
/* HARZ MESH NODE v0.1.1 (Oct 27) — offline storage node, zero dependencies.
   LAW: one object identity (sha256), integrity verified BEFORE serving,
   individual objects only, durable inventory, local mesh only.
   Client page carries the STEP LADDER: every retrieval step logged on screen
   so a failed field run self-diagnoses from one screenshot.
   Usage: node harz-mesh-node-v01.js <port> <objectsDir> [--lan] [corrupt=<sha>] */
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const PORT = parseInt(process.argv[2] || '8797', 10);
const OBJDIR = process.argv[3] || 'objects';
const LAN = process.argv.includes('--lan');
const corrupt = (process.argv.find(a => a.startsWith('corrupt=')) || '').split('=')[1];
let REGISTRY = [];
try { REGISTRY = JSON.parse(fs.readFileSync('TRUSTED-REGISTRY.json', 'utf8')); } catch (e) {}
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }
function send(res, code, body, type) { res.writeHead(code, {'content-type': type, 'Access-Control-Allow-Origin': '*'}); res.end(body); }
function page() {
  const reg = JSON.stringify(REGISTRY);
  return '<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">' +
  '<title>HARZ Mesh Client</title><style>body{font-family:system-ui;max-width:640px;margin:16px auto;padding:12px;line-height:1.5;color:#222}' +
  '.b{background:#0a7d3c;color:#fff;border-radius:6px;padding:2px 8px;font-size:12px}' +
  '.o{border:1px solid #ccc;border-radius:8px;padding:10px;margin:8px 0}' +
  '.v{color:#0a7d3c;font-weight:700}.x{color:#b00;font-weight:700}' +
  'pre{white-space:pre-wrap;background:#f6f6f6;padding:10px;border-radius:6px;max-height:50vh;overflow:auto}button{padding:6px 10px}' +
  '#lad{background:#eef;border-radius:8px;padding:10px;font-size:12px;white-space:pre-wrap}</style>' +
  '<h2>HARZ Mesh Client <span class=b>OFFLINE MESH</span></h2>' +
  '<div id=s>discovering...</div><div id=l></div><div id=c></div><div id=lad></div>' +
  '<script>var REG=' + reg + ';' +
  'async function sha(t){var b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(t));' +
  'return[...new Uint8Array(b)].map(function(x){return x.toString(16).padStart(2,"0")}).join("")}' +
  'var LAD=[];' +
  'function log(msg,ok){LAD.push((ok===undefined?"... ":(ok?"PASS ":"FAIL "))+msg);' +
  'document.getElementById("lad").textContent=LAD.join("\\n")}' +
  'async function get(want){LAD=[];' +
  'log("STEP 1: requesting "+want.slice(0,12)+"... from "+location.host);' +
  'var t0=Date.now(),r;' +
  'try{r=await fetch("/obj/"+want)}catch(e){log("STEP 1: node unreachable ("+e.message.slice(0,40)+")",false);log("DIAGNOSIS: node not running, wrong port, or different network",false);return}' +
  'if(!r.ok){log("STEP 1: node answered HTTP "+r.status,false);log("STEP 2: object refused (integrity failure or not held)",false);return}' +
  'log("STEP 1: node answered in "+(Date.now()-t0)+"ms",true);' +
  'var t1=Date.now(),t=await r.text();' +
  'log("STEP 2: received "+t.length+" bytes in "+(Date.now()-t1)+"ms",true);' +
  'var t2=Date.now(),got;try{got=await sha(t)}catch(e){log("STEP 3: hash computation FAILED ("+e.message.slice(0,50)+")",false);log("RESULT: CLIENT ERROR",false);return}' +
  'log("STEP 3: computed SHA-256 "+got.slice(0,12)+"... in "+(Date.now()-t2)+"ms",true);' +
  'var ok=got===want;' +
  'log(ok?"STEP 4: hash VERIFIED - object accepted":"STEP 4: HASH MISMATCH - object REJECTED",ok);' +
  'log(ok?"RESULT: RETRIEVE-VERIFY COMPLETE - OFFLINE MESH RETRIEVAL PASSED":"RESULT: INTEGRITY FAILURE",ok);' +
  'document.getElementById("c").innerHTML=(ok?"<p class=v>SHA-256 VERIFIED "+got.slice(0,24)+"...</p>":"<p class=x>HASH MISMATCH - rejected</p>")+"<pre>"+t.slice(0,3000)+"</pre>";attach()}' +
  'function attach(){[].slice.call(document.querySelectorAll("button[data-o]")).forEach(function(b){b.onclick=function(){get(b.dataset.o)}})}' +
  'window.addEventListener("load",function(){' +
  'fetch("/inventory").then(function(r){return r.json()}).then(function(inv){' +
  'document.getElementById("s").textContent="node: "+location.host+" | "+inv.count+" objects held | registry: "+REG.length;' +
  'var h="";inv.objects.forEach(function(o){var r2=REG.find(function(x){return x.sha256===o.sha256});' +
  'h+="<div class=o>"+o.sha256.slice(0,16)+"... "+o.bytes+" bytes"+(r2?" - id "+r2.id:" - unknown")+" <button data-o="+o.sha256+">retrieve + verify</button></div>"});' +
  'document.getElementById("l").innerHTML=h;attach();' +
  'log("AUTO-TEST: retrieve-verify ladder for first registry object");' +
  'if(inv.objects.length){get(REG[0].sha256)}}).catch(function(e){' +
  'log("DISCOVERY FAILED: "+e.message.slice(0,60),false)})});</scr' + 'ipt>';
}
const srv = http.createServer(async (req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') return send(res, 200, page(), 'text/html; charset=utf-8');
  if (u === '/health') return send(res, 200, JSON.stringify({node: 'harz-mesh-node-v0.1.1', ok: true}), 'application/json');
  if (u === '/inventory') {
    const inv = [];
    for (const sub of fs.readdirSync(OBJDIR)) {
      if (!fs.statSync(path.join(OBJDIR, sub)).isDirectory()) continue;
      for (const f of fs.readdirSync(path.join(OBJDIR, sub))) {
        if (f.endsWith('.txt')) { const st = fs.statSync(path.join(OBJDIR, sub, f));
          inv.push({sha256: f.replace('.txt', ''), bytes: st.size}); } } }
    return send(res, 200, JSON.stringify({objects: inv, count: inv.length}), 'application/json');
  }
  const m = u.match(/^\/obj\/([0-9a-f]{64})$/);
  if (m) {
    const want = m[1]; const p = path.join(OBJDIR, want.slice(0, 2), want + '.txt');
    if (!fs.existsSync(p)) return send(res, 404, JSON.stringify({error: 'object not held by this node'}), 'application/json');
    let buf = fs.readFileSync(p);
    if (corrupt && corrupt === want) buf = Buffer.concat([buf, Buffer.from('TAMPERED')]);
    const actual = sha256(buf);
    if (actual !== want) return send(res, 500, JSON.stringify({error: 'INTEGRITY FAILURE: held object does not match its content hash - refusing to serve', expected: want, actual}), 'application/json');
    res.writeHead(200, {'content-type': 'text/plain; charset=utf-8', 'content-length': buf.length,
      'x-harz-sha256': want, 'x-harz-verified-at-serve': 'true', 'Access-Control-Allow-Origin': '*'});
    return res.end(buf);
  }
  return send(res, 404, JSON.stringify({error: 'unknown route'}), 'application/json');
});
srv.listen(PORT, LAN ? '0.0.0.0' : '127.0.0.1', () => console.log('HARZ MESH NODE v0.1.1 on port ' + PORT + ' holding ' + OBJDIR + ' | registry ' + REGISTRY.length));
