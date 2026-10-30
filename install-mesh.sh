#!/data/data/com.termux/files/usr/bin/sh
# HARZ MESH NODE — one-command installer (Termux / any Linux)
# Downloads the node kit, the trusted registry, and the seed objects, then
# verifies every object against its content hash before declaring READY.
set -e
RAW="https://raw.githubusercontent.com/rabiuhamza11/harz-storage/main"
DEST="${1:-$HOME/mesh}"
mkdir -p "$DEST/objects"
cd "$DEST"
echo "→ downloading kit + registry..."
curl -sfL -o node.js "$RAW/harz-mesh-node-v01.js"
curl -sfL -o TRUSTED-REGISTRY.json "$RAW/TRUSTED-REGISTRY.json"
echo "→ downloading + verifying seed objects..."
for sha in $(python3 -c "import json;print(' '.join(r['sha256'] for r in json.load(open('TRUSTED-REGISTRY.json'))))"); do
  sub=$(echo "$sha" | cut -c1-2)
  mkdir -p "objects/$sub"
  curl -sfL -o "objects/$sub/$sha.txt" "$RAW/seed/objects/$sub/$sha.txt"
  got=$(sha256sum "objects/$sub/$sha.txt" | cut -d' ' -f1)
  if [ "$got" = "$sha" ]; then echo "  ✓ ${sha%????????????????????????????????????????????????????????}… verified"; else echo "  ✗ HASH MISMATCH for $sha — refusing"; exit 1; fi
done
NODE_VER=$(node -v 2>/dev/null || echo "MISSING")
if [ "$NODE_VER" = "MISSING" ]; then
  echo "node not installed — run: pkg install -y nodejs"; exit 1
fi
echo ""
echo "READY ($NODE_VER). Now run:"
echo "  cd $DEST && node node.js 8797 objects"
echo "Then: airplane mode ON → Chrome → http://127.0.0.1:8797/"
