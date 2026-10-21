// Where everything stands, in millimetres (x along the line, y across it with +y toward the viewer, z up).
// The complex follows the KPTBO-300 presentation of NPO Himmash: a washing line about 37 m long and 2.5 m
// wide, a pelletizing line of 300 kg/h, the T-5000 water treatment, and a hopper 3.7 m tall. The layout is
// a principal one (the company's own word): two rows joined by pneumatic conveying, sizes approximate.
export const YB = -2400;        // washing row centre line (back)
export const YF = 4000;         // pelletizing row centre line (front)
export const YE = 4300;         // extruder axis
export const ZE = 1000;         // extruder axis height
export const ROW = 2500;        // row width (spec: 2.5 m)

export const FLOOR = { x: -1500, y: -4700, w: 43800, d: 11300 };

// Water: the clean header runs along the far side of the washing row, the dirty collector along the aisle.
export const CLEAN = { y: YB - 1550, z: 3050, x0: 700, x1: 29000, r: 55 };
export const DIRTY = { y: -950, z: 260, x0: 5600, x1: 32300, r: 75 };
// T-5000 water treatment in the front left corner.
export const T5 = { x: 900, y: 750, w: 6200, d: 3500 };
