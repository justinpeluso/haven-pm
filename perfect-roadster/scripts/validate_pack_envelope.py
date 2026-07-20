#!/usr/bin/env python3
"""Validate Perfect Roadster pack cavity vs tray stack dimensions."""

from __future__ import annotations

TRAY_L, TRAY_W, TRAY_H = 204.0, 52.0, 76.0
GAP = 6.0
MODULES = 3
END_CLEAR = 16.0
CAVITY_L, CAVITY_W, CAVITY_H = 640.0, 56.0, 80.0


def main() -> None:
    stack_l = MODULES * TRAY_L + (MODULES - 1) * GAP
    need_l = stack_l + END_CLEAR
    ok_l = CAVITY_L >= need_l
    ok_w = CAVITY_W >= TRAY_W + 4
    ok_h = CAVITY_H >= TRAY_H + 4
    print(f"stack_length_mm={stack_l}")
    print(f"required_cavity_length_mm={need_l}")
    print(f"cavity=({CAVITY_L}x{CAVITY_W}x{CAVITY_H})")
    print(f"length_ok={ok_l} width_ok={ok_w} height_ok={ok_h}")
    if not all([ok_l, ok_w, ok_h]):
        raise SystemExit(1)
    # Energy check
    wh = 36.0 * 7.0 * 3  # three 7Ah modules
    print(f"system_wh_approx={wh}")
    print("PASS")


if __name__ == "__main__":
    main()
