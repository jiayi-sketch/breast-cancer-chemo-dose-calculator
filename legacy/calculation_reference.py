# SPDX-License-Identifier: LicenseRef-ChemoDose-Academic-NonCommercial
# Extracted arithmetic reference from the supplied v3.0.2 bytecode.
# Matched against Python 3.8 disassembly; not a clinical validation.
# Deliberately excludes Tkinter, report matching and all executable startup code.
import math

def calc_bsa(height_cm, weight_kg):
    if not 80 <= height_cm <= 250:
        raise ValueError("身高须在80-250 cm范围内。")
    if not 20 <= weight_kg <= 350:
        raise ValueError("体重须在20-350 kg范围内。")
    return math.sqrt(height_cm * weight_kg / 3600.0)


def standard_text(item):
    kind, dose = item["kind"], item["dose"]
    if kind == "bsa":
        return f"{dose:g} mg/m²"
    if kind == "bsa_range":
        (lo, hi) = dose
        if lo == hi:
            return f"{lo:g} mg/m²"
        return f"{lo:g}-{hi:g} mg/m²"
    if kind == "weight":
        return f"{dose:g} mg/kg"
    if kind == "weight_seq":
        return f"首剂{dose[0]:g} mg/kg，后续{dose[1]:g} mg/kg"
    if kind == "fixed":
        return f"{dose:g} mg"
    if kind == "fixed_seq":
        return f"首剂{dose[0]:g} mg，后续{dose[1]:g} mg"
    if kind == "fixed_alt":
        return f"{dose[0]:g} mg或{dose[1]:g} mg"
    if kind == "auc":
        return f"AUC {dose:g}"
    return str(dose)


def calculate_item(item, bsa, weight_kg, gfr):
    kind, dose = item["kind"], item["dose"]
    if kind == "bsa":
        return f"{dose * bsa:.2f} mg/次"
    if kind == "bsa_range":
        (lo, hi) = dose
        if lo == hi:
            return f"{lo * bsa:.2f} mg/次"
        return f"{lo * bsa:.2f}-{hi * bsa:.2f} mg/次"
    if kind == "weight":
        return f"{dose * weight_kg:.2f} mg/次"
    if kind == "weight_seq":
        return f"首剂{dose[0] * weight_kg:.2f} mg；后续{dose[1] * weight_kg:.2f} mg/次"
    if kind == "fixed":
        return f"{dose:g} mg/次（固定剂量）"
    if kind == "fixed_seq":
        return f"首剂{dose[0]:g} mg；后续{dose[1]:g} mg/次"
    if kind == "fixed_alt":
        return "按所选给药频次使用固定剂量"
    if kind == "auc":
        if gfr is None:
            return "需输入GFR/CrCl后计算"
        if not 0 <= gfr <= 200:
            raise ValueError("GFR/CrCl须在0-200 mL/min范围内。")
        return f"{dose * (gfr + 25):.2f} mg/次"
    return "—"

