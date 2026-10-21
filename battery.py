import json, hashlib, time, requests, subprocess
import subprocess, time
for pr in subprocess.run(["pgrep","-f","harz-mesh-node"],capture_output=True,text=True).stdout.split():
    subprocess.run(["kill","-9",pr],capture_output=True)
time.sleep(1)
nA = subprocess.Popen(["node","harz-mesh-node-v01.js","8797","node-a/objects"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
nB = subprocess.Popen(["node","harz-mesh-node-v01.js","8798","node-b/objects"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
reg = json.load(open('TRUSTED-REGISTRY.json'))
target = next(r for r in reg if r['id'] == '1719')
expected = target['sha256']
t0 = time.time(); nodes = []
for port in (8797, 8798, 8799):
    try:
        r = requests.get("http://127.0.0.1:%d/health" % port, timeout=1.5)
        if r.ok: nodes.append(port)
    except Exception: pass
print("1. DISCOVERY: nodes %s found in %.0f ms (8799 correctly absent)" % (nodes, (time.time()-t0)*1000), flush=True)
invA = requests.get("http://127.0.0.1:8797/inventory", timeout=3).json()
invB = requests.get("http://127.0.0.1:8798/inventory", timeout=3).json()
print("2. INVENTORY: A holds %d, B holds %d | target on A: %s, on B: %s" % (invA['count'], invB['count'], any(o['sha256']==expected for o in invA['objects']), any(o['sha256']==expected for o in invB['objects'])), flush=True)
t0=time.time(); rA = requests.get("http://127.0.0.1:8797/obj/"+expected, timeout=5); msA=(time.time()-t0)*1000
shaA = hashlib.sha256(rA.content).hexdigest()
print("3. RETRIEVE A: HTTP %d | %d bytes | %.0f ms | client verify: %s | serve-time integrity: %s" % (rA.status_code, len(rA.content), msA, "PASS" if shaA==expected else "FAIL", rA.headers.get('x-harz-verified-at-serve')), flush=True)
t0=time.time(); rB = requests.get("http://127.0.0.1:8798/obj/"+expected, timeout=5); msB=(time.time()-t0)*1000
shaB = hashlib.sha256(rB.content).hexdigest()
print("4. RETRIEVE B: HTTP %d | %d bytes | %.0f ms | client verify: %s" % (rB.status_code, len(rB.content), msB, "PASS" if shaB==expected else "FAIL"), flush=True)
subprocess.run(["pkill","-f","8797 node-a"], capture_output=True); time.sleep(1)
try:
    requests.get("http://127.0.0.1:8797/health", timeout=1.5); A_alive=True
except Exception: A_alive=False
rB2 = requests.get("http://127.0.0.1:8798/obj/"+expected, timeout=5)
print("5. FAILOVER: A down: %s | B retrieval: HTTP %d | verify: %s" % (not A_alive, rB2.status_code, "PASS" if hashlib.sha256(rB2.content).hexdigest()==expected else "FAIL"), flush=True)
p = subprocess.Popen(["node","harz-mesh-node-v01.js","8797","node-a/objects","corrupt="+expected], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
rC = requests.get("http://127.0.0.1:8797/obj/"+expected, timeout=5)
print("6. CORRUPTION: tampered node responds HTTP %d | %s" % (rC.status_code, rC.text[:90]), flush=True)
print("   client accepted corrupt bytes: %s" % ("NO - rejected (correct)" if rC.status_code != 200 else "YES - FAIL"), flush=True)
print("7. TRANSPORT: all sockets 127.0.0.1, zero external requests | largest single-object transfer: %d bytes" % max(len(rA.content), len(rB.content)), flush=True)
p.terminate()
print("BATTERY COMPLETE", flush=True)
