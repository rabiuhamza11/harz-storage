# Phase 2A node store seeds (verified)
Files here are ready node-store objects for the hardened two-phone kit.
Identity law: sha256 of the JSON "text" field = manifest text_sha256.
1719: bd3ea562... (17,534 utf8 bytes) | 815: de216a7c... (9,460 utf8 bytes)
Prepare phone-2 store (Termux):
  mkdir -p ~/mesh/node-store && cd ~/mesh/node-store
  for f in 1719.json 815.json; do curl -sfLO https://raw.githubusercontent.com/rabiuhamza11/harz-storage/main/mesh-seed/$f; done
Then: node mesh-node.mjs --port 8787 --dir ./node-store  (startup must print "Held: 1719.json, 815.json")
