// Perfect Roadster — single 10S2P module tray
// Units: millimeters
// Open in OpenSCAD or any SCAD-compatible tool; also documents dims for fab.

/* [Module / cells] */
cell_d = 18.6;
cell_h = 65.2;
// 10S2P brick footprint (2 parallel × 10 series along length)
brick_l = 10 * cell_d + 8; // ~194 + wrap margin handled below
brick_w = 2 * cell_d + 4;  // ~41.2
brick_h = cell_h + 2;

/* [Tray outer — matches docs/00 envelope] */
tray_l = 204;
tray_w = 52;
tray_h = 76;
wall = 2.0;
corner_r = 3;

/* [Clearance / foam] */
foam = 1.5;

module rounded_box(l, w, h, r) {
  hull() {
    for (x = [r, l - r])
      for (y = [r, w - r])
        translate([x, y, 0])
          cylinder(h = h, r = r, $fn = 32);
  }
}

module tray() {
  difference() {
    rounded_box(tray_l, tray_w, tray_h, corner_r);
    // inner cavity
    translate([wall, wall, wall])
      rounded_box(tray_l - 2 * wall, tray_w - 2 * wall, tray_h - wall + 0.1, corner_r - 0.5);
    // wire exit (BB end)
    translate([-0.1, tray_w / 2 - 6, tray_h - 18])
      cube([wall + 2, 12, 12]);
    // retention bolt holes (M5)
    for (x = [20, tray_l - 20])
      translate([x, tray_w / 2, -0.1])
        cylinder(h = wall + 1, d = 5.2, $fn = 24);
  }
}

module cell_brick_ghost() {
  color([0.2, 0.7, 0.3, 0.35])
    translate([
      (tray_l - brick_l) / 2,
      (tray_w - brick_w) / 2,
      wall + foam
    ])
      cube([brick_l, brick_w, brick_h]);
}

tray();
cell_brick_ghost();

echo("tray_outer_mm", tray_l, tray_w, tray_h);
echo("brick_approx_mm", brick_l, brick_w, brick_h);
echo("inner_clear_mm", tray_l - 2 * wall, tray_w - 2 * wall, tray_h - wall);
