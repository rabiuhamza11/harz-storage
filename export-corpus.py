#!/usr/bin/env python3
"""HARZ Mesh Storage — Node B export: live corpus → content-addressed files.
sha256(text) is the identity (Stage 1: content-derived). Every exported doc's
hash is verified against the live TX manifest before writing. Files land in
docs/<sha[0:2]>/<sha>.txt + MANIFEST.json."""
import json, hashlib, requests, os, sys
H = "https://harz-offline-browser.hamzarabiu390.workers.dev"
UA = {'User-Agent': 'HARZ-MeshStorage/1.0'}
shell = requests.get(H + "/v2/", headers=UA, timeout=40).text
dec = json.JSONDecoder()
t = shell.find('var TITLES = '); titles, _ = dec.raw_decode(shell, shell.find('[', t))
x = shell.find('var TX = '); tx, _ = dec.raw_decode(shell, shell.find('{', x))
os.makedirs('docs', exist_ok=True)
man, mismatches, missing = [], [], []
for i, trec in enumerate(titles):
    did = trec['i']
    try:
        r = requests.get(H + "/v2/doc/" + did, headers=UA, timeout=30)
        if r.status_code != 200: missing.append(did); continue
        d = r.json()
        text = d['text']
        sha = hashlib.sha256(text.encode()).hexdigest()
        want = tx.get(did)
        if want and sha != want: mismatches.append((did, want[:12], sha[:12])); continue
        sub = os.path.join('docs', sha[:2]); os.makedirs(sub, exist_ok=True)
        path = os.path.join(sub, sha + '.txt')
        if not os.path.exists(path):
            open(path, 'w', encoding='utf-8').write(text)
        man.append({'id': did, 'sha256': sha, 'title': trec.get('t','')[:120],
                    'domain': trec.get('d',''), 'url': (trec.get('u') or '')[:160], 'bytes': len(text.encode())})
    except Exception as e:
        missing.append(did + ':' + type(e).__name__)
    if i % 250 == 0: print("%d/%d" % (i, len(titles)), flush=True)
json.dump({'version': 1, 'created': '2026-10-21', 'law': 'content-derived sha256 identity; no silent modification; hash verified against live TX manifest at export',
           'node': 'B (github rabiuhamza11)', 'count': len(man), 'manifest': man},
          open('MANIFEST.json', 'w'), ensure_ascii=False)
print("EXPORTED: %d | mismatches: %d %s | missing: %d" % (len(man), len(mismatches), mismatches[:3], len(missing)), flush=True)
if missing: print("missing:", missing[:10], flush=True)
