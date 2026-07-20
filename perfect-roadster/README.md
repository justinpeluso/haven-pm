# Perfect Roadster — Custom Frame Build Package

Design package implementing the Perfect Roadster plan: a Roadster V2–inspired custom frame with a **36V 500W rear hub**, **~756Wh in-tube battery** (3× stock-equivalent modules as one **10S6P** electrical pack), and a **single-speed chain** drivetrain.

## Locked decisions

| Item | Spec |
|------|------|
| Geometry donor | Ride1Up Roadster V2 (road / gravel chart) |
| Motor | 36V rear hub, 500W peak class |
| Battery | 10S6P (~21Ah / ~756Wh), three 10S2P housings, **one BMS** |
| Drivetrain | Single-speed chain (no belt, no gears) |
| Brakes | Disc (IS or flat mount) — required |
| Tension | Sliding horizontal dropouts |

## Package layout

| Path | Phase | Contents |
|------|-------|----------|
| [docs/00-geometry-baseline.md](docs/00-geometry-baseline.md) | 0 | Donor geometry, OLD, pack envelope, measure checklist |
| [docs/01-electrical-architecture.md](docs/01-electrical-architecture.md) | 1 | Pack topology, harness, fusing, controller bay |
| [docs/02-frame-design.md](docs/02-frame-design.md) | 2 | Custom frame specs, dropouts, mounts |
| [docs/03-drivetrain.md](docs/03-drivetrain.md) | 3 | SS ratio, chainline, tension |
| [docs/04-rolling-stock.md](docs/04-rolling-stock.md) | 4 | Wheels, tires, brakes |
| [docs/05-commissioning.md](docs/05-commissioning.md) | 5 | Bench test, integration, range/thermal, legal |
| [cad/](cad/) | 2 | OpenSCAD pack trays + downtube envelope |
| [bom/master-bom.md](bom/master-bom.md) | all | Ordered BOM |
| [checklists/](checklists/) | 0 & 5 | Field measurement + commission checklists |

## Build order

1. Measure your donor (checklist) → confirm size SM/LG  
2. Order cells/BMS/hub/controller **before** final weld  
3. Print/prototype pack trays → validate insertion  
4. Frame fab → wheel build → SS drivetrain → brakes  
5. Bench electrical → install → commission  

## Safety note

Lithium pack work, hub-motor wheel building, and aluminum frame fab require competent practice (or a pro). This package is the engineering baseline, not a substitute for qualified battery assembly, welding, or brake setup.
