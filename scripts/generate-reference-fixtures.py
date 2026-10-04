"""Generate arithmetic comparison fixtures from the isolated, inspected reference.

This runs only legacy/calculation_reference.py. It never runs the Windows exe,
the Tkinter application, the report parser or the decompiled candidate files.
"""
import importlib.util
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("reference", ROOT / "legacy/calculation_reference.py")
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)

# Synthetic coefficients, with no drug or treatment assignment.
specs = [
    ("bsa", 7.5), ("bsa_range", [1.5, 2.5]), ("bsa_range", [2, 2]),
    ("weight", 1.25), ("weight_seq", [2, 1]), ("fixed", 12.5),
    ("fixed_seq", [20, 10]), ("auc", 2),
]
contexts = [(180, 80, 90), (170, 65, 75), (80, 20, 0), (250, 350, 200), (164, 60.5, 72.5)]
cases = []
for h, w, renal in contexts:
    bsa = reference.calc_bsa(h, w)
    for kind, dose in specs:
        display = reference.calculate_item({"kind": kind, "dose": dose}, bsa, w, renal)
        cases.append({
            "kind": kind, "dose": dose, "heightCm": h, "weightKg": w,
            "renalMlMin": renal, "expectedBsaM2": bsa,
            "legacyDisplay": display,
            "expectedRoundedMg": [float(s) for s in re.findall(r"\d+(?:\.\d+)?", display)],
        })

payload = {
    "provenance": "Inspected arithmetic recovered from user-supplied executable; no clinical validation.",
    "synthetic": True,
    "cases": cases,
}
destination = ROOT / "packages/calculation-core/tests/fixtures/legacy-arithmetic.json"
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Generated {len(cases)} synthetic arithmetic comparison cases.")
