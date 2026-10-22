// Фасовка гранул: the pellet hopper with its weighing doser, the big bag and the 25 kg bagging station of the KPTBO-300 line,
// cut from the whole-line drawing (figures/granulation-lines/unit-figure.mjs). `node figures/bagging/build.mjs [--light]`.
import { unitFigure } from "../granulation-lines/unit-figure.mjs";

await unitFigure({ id: "bagging", units: ["bagging"], lit: '[data-slide="bags"]' });
