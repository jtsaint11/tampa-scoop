import importlib.util
import json
import shutil
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location(
    "select_template", Path(__file__).with_name("select-template.py")
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SelectionTests(unittest.TestCase):
    def test_application_unchanged(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "file").write_text("original")
            module.select_template(root, "application")
            self.assertEqual((root / "file").read_text(), "original")
            self.assertEqual(len(list(root.iterdir())), 1)

    def test_unknown_and_missing_fail_closed(self):
        with tempfile.TemporaryDirectory() as directory:
            for name in ("../../bad", "unknown", "slideshow"):
                with self.assertRaises(ValueError):
                    module.select_template(Path(directory), name)

    def test_standalone_keeps_only_explicit_shared_files(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "convex").mkdir()
            (root / "convex/auth.ts").write_text("shared-auth")
            (root / "convex/schema.ts").write_text("application")
            (root / "unrelated-app-file").write_text("remove")
            source = root / "templates/slideshow/convex"
            source.mkdir(parents=True)
            (source / "schema.ts").write_text("slideshow")
            (source / "example.test.ts.template").write_text("test")
            (source.parent / "shared-files.json").write_text('["convex/auth.ts"]')
            module.select_template(root, "slideshow")
            self.assertEqual((root / "convex/auth.ts").read_text(), "shared-auth")
            self.assertEqual((root / "convex/schema.ts").read_text(), "slideshow")
            self.assertFalse((root / "templates").exists())
            self.assertTrue((root / "convex/example.test.ts").exists())
            self.assertFalse((root / "unrelated-app-file").exists())
            self.assertEqual(
                json.loads((root / "viktor.starter.json").read_text()),
                {"template": "slideshow"},
            )

    def test_missing_shared_file_leaves_application_intact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "templates/slideshow"
            source.mkdir(parents=True)
            (root / "original").write_text("keep")
            (source / "shared-files.json").write_text('["missing"]')
            with self.assertRaises(FileNotFoundError):
                module.select_template(root, "slideshow")
            self.assertEqual((root / "original").read_text(), "keep")

    def test_real_scaffold_has_no_application_baggage(self):
        base = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            shutil.copytree(
                base,
                root,
                dirs_exist_ok=True,
                ignore=shutil.ignore_patterns(
                    "node_modules", "dist", ".git", "__pycache__", ".ruff_cache"
                ),
            )
            (root / ".git").mkdir()
            (root / ".git/marker").write_text("keep")
            module.select_template(root, "slideshow")
            for name in (
                "src/components/AppLayout.tsx",
                "src/components/ui/sidebar.tsx",
                "src/pages/SettingsPage.tsx",
                "src/pages/LandingPage.tsx",
                "src/pages/SignupPage.tsx",
                "convex/users.ts",
                "convex/viktorTools.ts",
                "templates",
                "package-lock.json",
            ):
                self.assertFalse((root / name).exists(), name)
            for name in (
                "src/App.tsx",
                "presentation/content.ts",
                "presentation/Slide.tsx",
                "presentation/slides.css",
                "src/Presentation.tsx",
                "convex/presentations.ts",
                "scripts/auth.ts",
                ".git/marker",
            ):
                self.assertTrue((root / name).is_file(), name)
            deps = json.loads((root / "package.json").read_text())["dependencies"]
            self.assertNotIn("recharts", deps)
            self.assertNotIn("react-hook-form", deps)
            self.assertNotIn("framer-motion", deps)
            for name in (
                "convex/viktorSpaceAuthConfig.ts",
                "src/auth/SpaceSession.tsx",
                "src/auth/oauthReturn.ts",
                "src/auth/autoSignInIntent.ts",
                "src/pages/ViktorOAuthCallbackPage.tsx",
            ):
                self.assertEqual((root / name).read_bytes(), (base / name).read_bytes())
            self.assertFalse((root / "src/auth/return.ts").exists())
            app = (root / "src/App.tsx").read_text()
            for forbidden in ("signIn(", "sessionStorage", "useAuthActions", "callback"):
                self.assertNotIn(forbidden, app)


if __name__ == "__main__":
    unittest.main()
