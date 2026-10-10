# -*- coding: utf-8 -*-
"""经 gh + api.github.com 推送当前 git 跟踪文件。"""

from __future__ import annotations

import base64
import json
import subprocess
import tempfile
from pathlib import Path

OWNER = "chiyy167-ai"
REPO = "ruijin-onc-radar"
ROOT = Path(__file__).resolve().parent.parent
BASE = f"repos/{OWNER}/{REPO}"


def gh_api(method: str, endpoint: str, payload: dict | None = None) -> dict:
    cmd = ["gh", "api", "--method", method, endpoint]
    tmp = None
    if payload is not None:
        f = tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False)
        json.dump(payload, f, ensure_ascii=False)
        f.close()
        tmp = f.name
        cmd += ["--input", tmp]
    try:
        out = subprocess.check_output(cmd, cwd=ROOT, text=True, stderr=subprocess.STDOUT)
    except subprocess.CalledProcessError as e:
        print(e.output)
        raise
    finally:
        if tmp:
            Path(tmp).unlink(missing_ok=True)
    return json.loads(out) if out.strip() else {}


def git_files() -> list[str]:
    out = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT)
    return [p.decode() for p in out.split(b"\0") if p]


def main() -> int:
    msg = subprocess.check_output(
        ["git", "log", "-1", "--pretty=%B"], cwd=ROOT, text=True
    ).strip()
    ref = gh_api("GET", f"{BASE}/git/ref/heads/main")
    parent = ref["object"]["sha"]
    print("parent", parent[:12])

    paths = git_files()
    tree_items = []
    for i, rel in enumerate(paths, 1):
        raw = (ROOT / rel).read_bytes()
        blob = gh_api(
            "POST",
            f"{BASE}/git/blobs",
            {
                "content": base64.b64encode(raw).decode("ascii"),
                "encoding": "base64",
            },
        )
        tree_items.append(
            {
                "path": rel.replace("\\", "/"),
                "mode": "100644",
                "type": "blob",
                "sha": blob["sha"],
            }
        )
        if i % 5 == 0 or i == len(paths):
            print(f"blob {i}/{len(paths)}")

    tree_obj = gh_api("POST", f"{BASE}/git/trees", {"tree": tree_items})
    commit = gh_api(
        "POST",
        f"{BASE}/git/commits",
        {"message": msg, "tree": tree_obj["sha"], "parents": [parent]},
    )
    gh_api(
        "PATCH",
        f"{BASE}/git/refs/heads/main",
        {"sha": commit["sha"], "force": True},
    )
    print("commit", commit["sha"][:12])
    print(f"OK https://github.com/{OWNER}/{REPO}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
