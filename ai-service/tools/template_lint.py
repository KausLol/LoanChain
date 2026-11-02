"""Template linter: validates all YAML templates against the Pydantic schema."""

import sys
from pathlib import Path
import yaml
from pydantic import ValidationError

# Add app to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.template import TemplateSchema


def lint_templates(template_dir: Path) -> bool:
    all_ok = True
    yaml_files = list(template_dir.rglob("*.yaml"))
    if not yaml_files:
        print(f"No YAML templates found in {template_dir}")
        return False

    print(f"Linting {len(yaml_files)} template(s) in {template_dir}...")
    for yf in sorted(yaml_files):
        try:
            with open(yf, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            t = TemplateSchema(**data)
            print(f"  [PASS] {yf.name} (id={t.id}, version={t.version}, docType={t.docType})")
        except ValidationError as ve:
            print(f"  [FAIL] {yf.name}: Validation error:")
            for err in ve.errors():
                loc = " -> ".join(str(elem) for elem in err["loc"])
                print(f"         {loc}: {err['msg']}")
            all_ok = False
        except Exception as e:
            print(f"  [FAIL] {yf.name}: {e}")
            all_ok = False

    return all_ok


if __name__ == "__main__":
    base_dir = Path(__file__).resolve().parent.parent / "templates"
    success = lint_templates(base_dir)
    sys.exit(0 if success else 1)
