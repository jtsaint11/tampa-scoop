"""Run the selected starter's contracts without provisioning a deployment."""

import shutil
import subprocess
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix="slideshow-template-") as directory:
    target = Path(directory)
    shutil.copytree(
        root,
        target,
        dirs_exist_ok=True,
        ignore=shutil.ignore_patterns(
            "node_modules", "dist", ".git", ".convex", "__pycache__"
        ),
    )
    (target / "node_modules").symlink_to((root / "node_modules").resolve())
    subprocess.run(
        ["python3", "scripts/select-template.py", "slideshow"], cwd=target, check=True
    )
    subprocess.run(
        ["bun", "test", "scripts/slideshow.test.ts"],
        cwd=target,
        check=True,
    )
    subprocess.run(
        [
            "bunx",
            "--no-install",
            "convex",
            "codegen",
            "--system-udfs",
            "--typecheck",
            "disable",
            "--url",
            "http://127.0.0.1:3210",
            "--admin-key",
            "ci-local-codegen",
        ],
        cwd=target,
        check=True,
    )
    subprocess.run(["bun", "run", "build"], cwd=target, check=True)
