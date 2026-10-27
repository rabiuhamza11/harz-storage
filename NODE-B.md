# HARZ Mesh Storage — Node B
Content-addressed knowledge corpus. Every file is docs/<sha256[:2]>/<sha256>.txt —
the filename IS the identity, derived from the file's actual bytes.
MANIFEST.json maps doc ids, titles, domains to hashes (hash-verified against the
live TX manifest at export, 2026-10-21, 1987 docs, 5 refusals recorded).
Serving: raw.githubusercontent.com/rabiuhamza11/harz-storage/main/docs/<ab>/<sha>.txt
Law: content-derived identity; no silent modification (any edit creates a new
address); provenance in git history; retention = append + history.
Companion Node A: harz-offline-browser.hamzarabiu390.workers.dev/v2/doc/<id>
