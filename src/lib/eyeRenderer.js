// SPDX-FileCopyrightText: 2012-2013 azathoth
// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Constants
const IRIS_SCALE = 0.5;
const PUPIL_SCALE = 0.4;
const TOP_LID_SCALE = 0.8;
const BOTTOM_LID_SCALE = 0.6;
const COMIC_EYE_SCALE_X = 0.6; // TODO increase cosmic eye width
const COMIC_EYE_SCALE_Y = 0.9;
//#endregion

//#region Main drawing function
/**
 * Draws the eye based on current parameters.
 *
 * @param {St.DrawingArea} area - The drawing area where the eye will be rendered.
 * @param {object} options - The drawing options.
 * @returns {Function} The function that draws the eye based on the provided options.
 */
export function drawEye(area, options) {
    switch (options.shape) {
        case 'natural':
            return new drawNaturalEye(area, options);
        case 'round':
            return new drawRoundEye(area, options);
        case 'comic':
        default:
            return new drawRoundEye(area, options, COMIC_EYE_SCALE_X, COMIC_EYE_SCALE_Y);
    }
}
//#endregion

//#region Natural eye
/**
 * Draws a natural-looking eye on the drawing area.
 *
 * @param {St.DrawingArea} area - The drawing area where the eye will be rendered.
 * @param {object} options - The drawing options.
 */
function drawNaturalEye(area, options) {
    let [mouseX, mouseY] = global.get_pointer();
    const [areaWidth, areaHeight] = area.get_surface_size();
    const [areaCenterX, areaCenterY] =
        [options.originX + (areaWidth / 2), options.originY + (areaHeight / 2)];

    mouseX -= areaCenterX;
    mouseY -= areaCenterY;

    const mouseAngle = Math.atan2(mouseY, mouseX);
    let mouseRadius = Math.sqrt((mouseX * mouseX) + (mouseY * mouseY));

    const eyeRadius = areaHeight / 2;
    const irisRadius = eyeRadius * IRIS_SCALE;
    const pupilRadius = irisRadius * PUPIL_SCALE;

    const maxRadius = eyeRadius * ((Math.pow(Math.cos(mouseAngle), 4) * 0.5) + 0.25);

    if (mouseRadius > maxRadius)
        mouseRadius = maxRadius;

    const irisArc = Math.asin(irisRadius / eyeRadius);
    const irisX = eyeRadius * Math.cos(irisArc);

    const eyeAngle = Math.atan(mouseRadius / irisX);

    const offsetX = irisRadius * Math.cos(mouseAngle) * Math.sin(eyeAngle);
    const offsetY = irisRadius * Math.sin(mouseAngle) * Math.sin(eyeAngle);

    const eyelidHeight = eyeRadius * (TOP_LID_SCALE + BOTTOM_LID_SCALE);

    const cr = area.get_context();

    function drawEyelidShape() {
        cr.moveTo(-eyeRadius, 0);
        cr.curveTo(
            offsetX - irisRadius,
            offsetY + (eyeRadius * TOP_LID_SCALE),
            offsetX + irisRadius,
            offsetY + (eyeRadius * TOP_LID_SCALE),
            eyeRadius,
            0
        );

        cr.curveTo(
            offsetX + irisRadius,
            offsetY - (eyeRadius * BOTTOM_LID_SCALE),
            offsetX - irisRadius,
            offsetY - (eyeRadius * BOTTOM_LID_SCALE),
            -eyeRadius,
            0
        );
    }

    // Drawing the base of the eye
    cr.translate(areaWidth * 0.5, areaHeight * 0.5);

    setColorFromHex(cr, options.sceleraColor);
    cr.setLineWidth(options.lineWidth);

    drawEyelidShape();
    options.lineMode ? cr.stroke() : cr.fill();

    drawEyelidShape();
    cr.clip();

    // Drawing the iris
    cr.rotate(mouseAngle);
    cr.translate(irisX * Math.sin(eyeAngle), 0);
    cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

    setColorFromHex(cr, options.irisColor);
    cr.setLineWidth(options.lineWidth / irisRadius);

    cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
    options.lineMode ? cr.stroke() : cr.fill();

    cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
    cr.translate(-irisX * Math.sin(eyeAngle), 0);

    // Drawing the pupil
    cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
    cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

    if (!options.lineMode)
        setColorFromHex(cr, options.pupilColor);

    cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
    cr.fill();

    // Drawing the eyelid
    if (options.eyelidLevel > 0) {
        cr.identityMatrix();
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);

        drawEyelidShape();
        cr.clip();

        cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

        setColorFromHex(cr, options.eyelidColor);

        cr.rectangle(0, areaHeight * 0.2, areaWidth, eyelidHeight * options.eyelidLevel);
        cr.fill();
    }

    cr.$dispose();
}
//#endregion

//#region Round/Comic eye
/**
 * Draws a round eye on the drawing area, with optional scaling to modify its shape.
 *
 * @param {St.DrawingArea} area - The drawing area where the eye will be rendered.
 * @param {object} options - The drawing options.
 * @param {number} scaleX [scaleX=0.95] - The scaling factor for the horizontal axis.
 * @param {number} scaleY [scaleY=0.95] - The scaling factor for the vertical axis.
 */
function drawRoundEye(area, options, scaleX = 0.95, scaleY = 0.95) {
    let [mouseX, mouseY] = global.get_pointer();
    const [areaWidth, areaHeight] = area.get_surface_size();
    const [areaCenterX, areaCenterY] =
        [options.originX + (areaWidth / 2), options.originY + (areaHeight / 2)];

    mouseX -= areaCenterX;
    mouseY -= areaCenterY;

    const mouseAngle = Math.atan2(mouseY, mouseX);
    let mouseRadius = Math.sqrt((mouseX * mouseX) + (mouseY * mouseY));

    // TODO change the eye radius here instead of using a default scaling to reduce the eye
    const eyeRadius = areaHeight / 2.3;
    const irisRadius = eyeRadius * IRIS_SCALE * 1.3;
    const pupilRadius = irisRadius * PUPIL_SCALE;

    const maxRadius =
        (eyeRadius * Math.cos(Math.asin(irisRadius / eyeRadius))) - options.lineWidth;

    if (mouseRadius > maxRadius)
        mouseRadius = maxRadius;

    const irisArc = Math.asin(irisRadius / eyeRadius);
    const irisX = eyeRadius * Math.cos(irisArc);

    const eyeAngle = Math.atan(mouseRadius / irisX);

    const cr = area.get_context();

    // Drawing the base of the eye
    cr.translate(areaWidth * 0.5, areaHeight * 0.5);
    cr.scale(scaleX, scaleY);

    setColorFromHex(cr, options.sceleraColor);
    cr.setLineWidth(options.lineWidth);

    cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
    options.lineMode ? cr.stroke() : cr.fill();

    cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
    cr.clip();

    // Drawing the iris
    cr.rotate(mouseAngle);
    cr.translate(irisX * Math.sin(eyeAngle), 0);
    cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

    setColorFromHex(cr, options.irisColor);
    cr.setLineWidth(options.lineWidth / irisRadius);

    cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
    options.lineMode ? cr.stroke() : cr.fill();

    cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
    cr.translate(-irisX * Math.sin(eyeAngle), 0);

    // Drawing the pupil
    cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
    cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

    if (!options.lineMode)
        setColorFromHex(cr, options.pupilColor);

    cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
    cr.fill();

    // Drawing the eyelid
    if (options.eyelidLevel > 0) {
        cr.identityMatrix();
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);

        cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
        cr.clip();

        cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

        setColorFromHex(cr, options.eyelidColor);

        cr.rectangle(0, 0, areaWidth, areaHeight * options.eyelidLevel);
        cr.fill();
    }

    cr.$dispose();
}
//#endregion

//#region Helper functions
/**
 * Sets the color of the Cairo context using a hexadecimal color code.
 *
 * @param {cairo.Context} cr - The Cairo graphics context where the color will be applied.
 * @param {string} hex - The hexadecimal color code.
 */
function setColorFromHex(cr, hex) { // TODO stop using hex code for colors
    hex = hex.slice(1);
    const [
        r,
        g,
        b,
    ] = [
        hex.slice(0, 2),
        hex.slice(2, 4),
        hex.slice(4, 6),
    ].map(
        (value) => parseInt(value, 16) / 255.0
    );
    cr.setSourceRGBA(r, g, b, 1);
}
//#endregion
