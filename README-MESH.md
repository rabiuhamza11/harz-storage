# HARZ MESH NODE v0.1 — Phase 2A kit
Zero-dependency offline storage node + self-verifying browser client.
PHONE FIELD RUN (Infinix/Termux):
  mkdir -p mesh && cd mesh
  curl -L -C - -o node.js <raw url>/harz-mesh-node-v01.js  (or git pull)
  cp -r seed/objects objects  && cp TRUSTED-REGISTRY.json .
  node node.js 8797 objects
  airplane mode ON -> Chrome: http://127.0.0.1:8797/ -> tap object -> SHA-256 VERIFIED badge
LAW: integrity verified before serving; corrupt copies refused (HTTP 500);
inventory = exactly what the node holds; loopback/LAN only.
