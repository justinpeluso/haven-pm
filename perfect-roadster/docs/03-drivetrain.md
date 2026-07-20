# Phase 3 — Single-speed chain drivetrain

**Locked:** chain, one gear, no derailleur, no IGH, no belt. Tension via **sliding dropouts** (Phase 2).

## Ratio strategy

Stock Roadster road belt was **64T / 20T** ≈ **3.20** development — tall road gear that relies on the motor for launches.

With assist and hills, Perfect Roadster starts **easier**, then you can raise the front ring if flats feel spinny.

| Setup | Front | Rear | Ratio | 700×35 approx m/rev @ 90 rpm | Role |
|-------|-------|------|-------|------------------------------|------|
| **Primary (build)** | **42T** | **17T** | **2.47** | ~5.4 m | Daily / hills |
| Tall option | 48T | 17T | 2.82 | ~6.2 m | Flats / strong riders |
| Easy option | 42T | 18T | 2.33 | ~5.1 m | Steeper hills |
| Stock-like ref | 64/20 belt | — | 3.20 | ~7.0 m | Too tall without assist |

Use [`cad/../scripts` ratio helper](../scripts/gear_ratio.py) to recompute after tire choice.

## Parts

| Part | Spec |
|------|------|
| Crank | Square taper or hollowtech SS crank, 170–172.5 mm |
| Ring | **42T** narrow-wide or track 3/32", BCD match crank |
| Bottom bracket | BSA 68 mm; torque to crank OEM |
| Chain | **KMC Z1 / 710** single-speed 1/8" **or** 3/32" matching ring/cog — stay consistent |
| Rear cog | **17T** singlespeed cog on freehub **or** freewheel on hub motor if threaded |
| Lockring | SS lockring if freehub cog |
| Chainline | **45–50 mm**; verify vs hub motor dish and disc |

### Hub motor cog interface (critical)

Confirm the chosen 500W hub provides **one** of:

1. Freehub body for SS cog, or  
2. Threaded freewheel boss, or  
3. OEM single cog  

Do not assume a cassette body — many geared hubs are freewheel or fixed single cog.

## Tension & alignment

1. Fit chain with wheel at mid-slot  
2. Size chain so with axle mid-travel there is slight slack; final tension at ~mid-aft  
3. Vertical play at chain midpoint ~5–10 mm when tensioned  
4. Wheel centered in dropouts; disc rotor parallel to caliper  
5. Re-check after first 50 km (chain stretch)

## Chainline clearance checks

- [ ] Ring clears chainstay  
- [ ] Chain clears hub motor shell  
- [ ] Chain clears disc / caliper  
- [ ] Pedal/crank clears front derailleur bosses (none expected)  

## Phase 3 deliverables

- [x] Primary ratio locked: **42/17**  
- [x] Tension method locked: sliding dropouts  
- [x] Chain type rule: matched 1/8" or 3/32" throughout  
- [ ] Hub cog interface confirmed on ordered motor  
