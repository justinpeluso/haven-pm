# Phase 2 — Custom frame design

Roadster V2 silhouette, upsized energy bay, disc-ready, sliding dropouts, hub-motor torque reaction. Geometry targets: [00-geometry-baseline.md](00-geometry-baseline.md) (default **LG**).

## Design priorities

1. Pack trays dictate downtube (CAD first)  
2. Hub motor OLD + disc + torque tab dictate rear end  
3. Single-speed chain tension via **sliding dropouts** (locked choice)  
4. Controller heat outside the cell cavity  
5. Stealth: no external battery box  

## Main triangle (LG)

| Tube | Spec |
|------|------|
| Material | 6061-T6 aluminum (builder heat-treat / stress-relief per their process) |
| Head tube | 1-1/8" straight or tapered to match fork; length 180 mm |
| Seat tube | 30.9 or 31.6 mm ID post (pick one; stock gravel used 30.4 — prefer **31.6** modern) |
| Top tube | Round or subtle oval; keep visual light |
| Downtube | Custom oval / teardrop — **internal clear ≥ 56 × 80 mm**, usable length ≥ 640 mm |
| BB shell | BSA 68 mm English thread **or** eccentric BB shell if dropout travel alone is insufficient — primary tension method remains sliding dropouts |
| Cable ports | Internal: brake rear, motor phase/hall, display, PAS |

## Downtube energy bay

| Feature | Spec |
|---------|------|
| Access | Removable belly panel near BB (controller service) + pack insert from HT or BB end |
| Retention | Non-conductive rails + 2× M5 captive bolts into tray lugs (3–5 Nm) |
| Isolation | Kapton / fish paper + foam; no bare nickel to aluminum |
| Charge boss | Welded boss on DT side, sealed cover |
| Drain | Small weep near BB so condensation cannot pool on BMS |

Prototype with prints from:

- [`cad/pack-tray.scad`](../cad/pack-tray.scad) — one module tray  
- [`cad/pack-stack.scad`](../cad/pack-stack.scad) — three trays + gaps  
- [`cad/downtube-envelope.scad`](../cad/downtube-envelope.scad) — cavity / tube envelope  

## Rear triangle

| Feature | Spec |
|---------|------|
| Chainstay | Start 424 mm c-c at mid-slide; allow **±10 mm** slide (axle travel 15–20 mm) |
| OLD | Match hub (default design: **135 mm** QR geared hub) |
| Dropouts | Horizontal sliding, steel or thick Al inserts, replaceable |
| Torque | NDS tab engaging motor axle flat / OEM torque washer — welded/brazed structural path into CS/ST |
| Disc | 160 mm IS (or flat mount + adapter); caliper clearance vs chainstay |
| Tire clearance | 700×40c max design; run 32–38c |
| Chainline | ~45–50 mm SS; clear hub motor shell and disc |

### Sliding dropout travel

```
[HT]——DT——[BB]————CS————[dropout slot =====]
                         ← 15–20 mm axle travel →
```

Chain tension: slide rear wheel aft, lock skewer/axle nuts to spec, verify wheel dish/disk alignment.

## Fork

- Rigid Al or steel, 700c, **disc** 160 mm  
- Axle: 100×9 QR or 100×12 thru to match front hub  
- Axle-to-crown ~397 mm to preserve trail with 71° HT  
- Steerer length for 180 mm HT + spacers  

## Mounts

| Mount | Required |
|-------|----------|
| Disc front/rear | Yes |
| Fenders | Yes (M5 bosses) |
| Rack | Optional light rear rack bosses |
| Kickstand | Plate on CS |
| Bottle | Optional — may conflict with fat DT |
| Lights | Split from display power or USB |

## Controller bay

- Under BB / behind DT access panel  
- Aluminum wall between bay and pack cavity  
- Vent slots downward-facing (splash-aware)  
- Strain relief for motor cable toward CS  

## Fabrication sequence

1. Freeze hub datasheet (OLD, disc, torque)  
2. Print trays → cardboard/scrap tube fit check  
3. CAD full frame (builder) with cavity from `downtube-envelope.scad` dims  
4. Fixtures: HT, BB, ST, dropouts aligned  
5. TIG → heat treatment per 6061 process  
6. Face BB, ream HT, chase threads  
7. Paint / clear; mask charge boss and dropout faces  
8. Install rails, grommets, charge port  

## Weight budget (estimate)

| Item | kg |
|------|-----|
| Frame + fork | 2.8–3.4 |
| Pack 10S6P + trays | 3.2–3.6 |
| Hub motor wheel | 3.0–3.8 |
| Rest of bike | 5–6 |
| **Total target** | **~15–17 kg (33–37 lb)** |

Stock Roadster ~33 lb / 15 kg with 252 Wh — expect mid/high 30s lb with 756 Wh.

## Phase 2 deliverables

- [x] Frame design rules locked (sliding DO, disc, torque, cavity)  
- [x] CAD sources for trays + envelope  
- [ ] Builder drawing package from these dims + donor measures  
