#!/usr/bin/env python3
"""Gear development helper for Perfect Roadster single-speed setups."""

from __future__ import annotations

# 700c BSD + tire width approx outer circumference
BSD_MM = 622.0


def circumference_mm(tire_width_mm: float) -> float:
    # Simple ISO approx: wheel diameter ≈ BSD + 2.1*width
    diameter = BSD_MM + 2.1 * tire_width_mm
    return 3.141592653589793 * diameter


def development_m(front: int, rear: int, tire_width_mm: float = 35.0) -> float:
    return (front / rear) * circumference_mm(tire_width_mm) / 1000.0


def speed_kmh(front: int, rear: int, cadence_rpm: float, tire_width_mm: float = 35.0) -> float:
    return development_m(front, rear, tire_width_mm) * cadence_rpm * 60.0 / 1000.0


def main() -> None:
    setups = [
        ("primary", 42, 17),
        ("tall", 48, 17),
        ("easy", 42, 18),
        ("stock_belt_ref", 64, 20),
    ]
    tire = 35.0
    print(f"Tire: 700x{tire:.0f}c  circ={circumference_mm(tire):.1f} mm\n")
    print(f"{'setup':<16} {'ratio':>6} {'m/rev':>8} {'km/h@90':>10} {'mph@90':>9}")
    for name, f, r in setups:
        ratio = f / r
        dev = development_m(f, r, tire)
        kmh = speed_kmh(f, r, 90.0, tire)
        mph = kmh * 0.621371
        print(f"{name:<16} {ratio:6.2f} {dev:8.2f} {kmh:10.1f} {mph:9.1f}")


if __name__ == "__main__":
    main()
