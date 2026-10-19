"""Materialize a standalone starter with explicitly shared platform files."""

import argparse
import json
import shutil
import tempfile
from pathlib import Path

TEMPLATES = {"application": None, "slideshow": "templates/slideshow"}


def select_template(root: Path, template: str) -> None:
    if template not in TEMPLATES:
        raise ValueError(f"Unknown template: {template}")
    relative_source = TEMPLATES[template]
    if relative_source is None:
        return
    source = root / relative_source
    if not source.is_dir():
        raise ValueError(f"Template not available in this artifact: {template}")
    shared = json.loads((source / "shared-files.json").read_text())
    # Stage and validate before removing any application files.
    with tempfile.TemporaryDirectory(prefix=f"{template}-") as directory:
        staged = Path(directory)
        for name in shared:
            relative = Path(name)
            if relative.is_absolute() or ".." in relative.parts:
                raise ValueError(f"Invalid shared path: {name}")
            destination = staged / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(root / relative, destination)
        shutil.copytree(source, staged, dirs_exist_ok=True)
        (staged / "shared-files.json").unlink()
        for path in staged.rglob("*.template"):
            path.rename(path.with_suffix(""))
        (staged / "viktor.starter.json").write_text(
            json.dumps({"template": template}) + "\n"
        )
        for path in root.iterdir():
            if path.name in {".git", "node_modules", ".env.local", ".convex"}:
                continue
            if path.is_dir() and not path.is_symlink():
                shutil.rmtree(path)
            else:
                path.unlink()
        shutil.copytree(staged, root, dirs_exist_ok=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("template", choices=TEMPLATES)
    args = parser.parse_args()
    select_template(Path(__file__).resolve().parents[1], args.template)
