# Phase 0 — Geometry & pack envelope baseline

Sources: Ride1Up sizing guidance; Gravel Roadster V2 geometry tables (bikes.fan / Bike Insights aggregates). Road and gravel Roadster V2 share the same frame family; use these as **design targets**, then verify on your physical bike with [checklists/measure-donor.md](../checklists/measure-donor.md).

## Frame sizes

| Size | Seat tube (approx) | Rider height | Notes |
|------|--------------------|--------------|-------|
| SM / 52 | 500–508 mm | 5'3"–5'8" (160–174 cm) | Primary for shorter riders |
| LG / 58 | 558–560 mm | 5'8"–6'3" (171–190 cm) | Default custom target if unspecified |

**Custom build default:** **LG (58)** geometry unless your donor is SM.

## Target geometry (LG / 58)

| Dimension | Target | Custom notes |
|-----------|--------|--------------|
| Stack | 599 mm | Keep ±5 mm |
| Reach | 417 mm | Keep ±5 mm |
| Effective top tube | 595 mm | |
| Seat tube angle | 73.5° | |
| Head tube angle | 71° | |
| Head tube length | 180 mm | |
| Chainstay | 424 mm | May grow +5–10 mm for hub motor + SS tension room |
| Wheelbase | ~1054 mm | Recalculate after CS change |
| Standover | ~838 mm | |
| Fork length | ~397 mm | Rigid aluminum, disc-ready |
| Wheel | 700c (622 mm BSD) | |
| Bars / stem (stock ref) | 550 × 25.4 mm / 60 mm | Optional carryover |

## Target geometry (SM / 52)

| Dimension | Target |
|-----------|--------|
| Stack | 575 mm |
| Reach | 378 mm |
| Effective top tube | 548 mm |
| Seat / head angles | 73.5° / 70° |
| Head tube | 160 mm |
| Chainstay | 424 mm |
| Wheelbase | ~1026 mm |
| Standover | ~774 mm |

## Hub / dropout envelope (electrical rear)

| Spec | Stock Roadster V2 (typical) | Custom Perfect Roadster |
|------|-----------------------------|-------------------------|
| Drive | Geared hub, belt (stock) | Geared hub, **chain SS** |
| Rear spacing (OLD) | Measure donor — often ~135–142 mm hub-motor | **Design to motor datasheet**; default **135 mm** QR or **142×12** thru-axle if motor supports |
| Dropout | Vertical / fixed (belt tension elsewhere) | **Sliding horizontal**, 15–20 mm travel |
| Torque reaction | Axle flats + washers | **Integrated torque plate / tab** on NDS dropout — mandatory |
| Disc | Road model: rim; Gravel: disc | **160 mm disc**, IS or FM mounts |

**Action:** Record exact OLD, axle type, and disc offset from the chosen 500W hub **before** dropouts are cut.

## Stock electrical packaging (donor)

| Item | Spec |
|------|------|
| Pack | 36V 7.0Ah Samsung 35E (~252 Wh), typically **10S2P** |
| Location | Sealed downtube; non-quick-swap |
| Access | BB-area controller panel; Torx retainers for pack |
| Controller | Inside downtube near BB (very tight with add-on battery kit) |
| Charge port | Frame-mounted, removable with pack service |
| PAS | Bottom-bracket cadence |
| Assist | Class-3 style, stock ~24 mph limit, no throttle |

## Custom pack cavity (design envelope)

Three physical **10S2P** modules (see CAD) must fit the downtube as a single electrical **10S6P**.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Cell | Samsung INR18650-35E class | Match stock chemistry |
| Module | 10S2P, 20× 18650 | Same as one stock pack |
| Module outer (nominal) | **200 × 48 × 72 mm** (L×W×H) | Cells + wrap + terminals; refine after first prototype |
| Tray clearance | +2 mm per side | Foam / insert |
| Tray outer | **204 × 52 × 76 mm** | See `cad/pack-tray.scad` |
| Stack | 3 modules along downtube axis | Nose → BB |
| Cavity clear length | ≥ **640 mm** usable | 3×204 + 2×6 mm gaps + lead dress |
| Cavity clear width × height | ≥ **56 × 80 mm** | Tray + wires along one wall |
| Downtube OD (design) | Oval / teardrop ~**70 × 95 mm** | Upsized vs stock thin tube; keep stealth silhouette |
| Controller bay | Separate under BB / seat-tube pocket | **Not** co-located with cells |
| Charge port | Sealed barrel or XT60 charge inlet on DT | Away from tire spray |

### Pack insertion mockup deliverable

1. 3D-print three trays from `cad/pack-tray.scad`  
2. Insert into scrap tube or cardboard mock of cavity dims  
3. Confirm lead routing and BB exit before welding  

## Phase 0 deliverable checklist

- [ ] Donor size confirmed (SM or LG)  
- [ ] Physical measure sheet filled ([checklists/measure-donor.md](../checklists/measure-donor.md))  
- [ ] Chosen hub OLD / axle / disc offset recorded  
- [ ] Pack cavity length ≥ 640 mm validated in CAD  
- [ ] Geometry locked for frame fab (default LG if no donor measure yet)  
