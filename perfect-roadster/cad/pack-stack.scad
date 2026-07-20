// Perfect Roadster — three module trays stacked along downtube axis
// Units: mm

use <pack-tray.scad>

gap = 6; // lead dress / foam between modules
tray_l = 204;
tray_w = 52;
tray_h = 76;

module stack() {
  for (i = [0:2])
    translate([i * (tray_l + gap), 0, 0])
      tray();
}

stack();

total_l = 3 * tray_l + 2 * gap;
echo("pack_stack_length_mm", total_l); // 624
echo("required_cavity_length_mm", total_l + 16); // ~640 with end clearance
echo("required_cavity_wh_mm", tray_w + 4, tray_h + 4);
