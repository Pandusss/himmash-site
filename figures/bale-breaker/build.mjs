// Рыхлитель кип и брикетов: the 5 m plate conveyor and the two toothed drums of the KPTBO-300 line's bale breaker,
// cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs). `node figures/bale-breaker/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "bale-breaker", units: ["breaker"], lit: '[data-rotor^="breaker-"]' });
