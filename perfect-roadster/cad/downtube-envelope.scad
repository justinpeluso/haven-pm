// Perfect Roadster — downtube internal envelope + outer tube suggestion
// Units: mm
// Cavity must clear three trays (see pack-stack.scad)

cavity_l = 640;
cavity_w = 56;
cavity_h = 80;

// Outer teardrop / oval approximation (extruded profile)
outer_w = 70;
outer_h = 95;
wall = 2.5;

module cavity() {
  color([0.9, 0.6, 0.1, 0.4])
    cube([cavity_l, cavity_w, cavity_h]);
}

module outer_tube() {
  // simplified rectangular outer with rounded suggestion via Minkowski
  color([0.6, 0.6, 0.65, 0.25])
    minkowski() {
      translate([-5, (cavity_w - outer_w) / 2, (cavity_h - outer_h) / 2])
        cube([cavity_l + 10, outer_w - 6, outer_h - 6]);
      sphere(r = 3, $fn = 16);
    }
}

module wire_channel() {
  // channel along wall for main leads
  color([0.2, 0.4, 0.9, 0.5])
    translate([0, cavity_w - 0.1, 10])
      cube([cavity_l, 8, 16]);
}

outer_tube();
cavity();
wire_channel();

echo("cavity_lwh", cavity_l, cavity_w, cavity_h);
echo("outer_wh_approx", outer_w, outer_h);
echo("note", "Builder should loft a teardrop matching Roadster silhouette around this cavity");
