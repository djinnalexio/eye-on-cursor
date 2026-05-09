// SPDX-FileCopyrightText: 2012-2013 azathoth
// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Constants
const IRIS_SCALE = 0.5;
const PUPIL_SCALE = 0.4;
const TOP_LID_SCALE = 0.8;
const BOTTOM_LID_SCALE = 0.6;
const COMIC_EYE_SCALE_X = 0.7;
const COMIC_EYE_SCALE_Y = 1;
// TODO Make eye, iris, and/or pupil sizes into settings
//#endregion

//#region Main drawing function
/**
 * Draws the eye based on current parameters.
 *
 * @param {St.DrawingArea} area - The drawing area where the eye will be rendered.
 * @param {object} options - The drawing options.
 */
export function drawEye(area, options) {
    switch (options.shape) {
        case 'natural':
            drawNaturalEye(area, options);
            break;
        case 'round':
            drawRoundEye(area, options);
            break;
        case 'comic':
        default:
            drawRoundEye(area, options, COMIC_EYE_SCALE_X, COMIC_EYE_SCALE_Y);
            break;
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
    let [mouseX, mouseY] = [options.mouseX, options.mouseY];
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

    try {
        const drawEyelidShape = () => {
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
        };

        // Drawing the base of the eye
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);

        setColor(cr, options.sceleraColor);
        cr.setLineWidth(options.lineWidth);

        drawEyelidShape();
        options.lineMode ? cr.stroke() : cr.fill();

        drawEyelidShape();
        cr.clip();

        // Drawing the iris
        cr.rotate(mouseAngle);
        cr.translate(irisX * Math.sin(eyeAngle), 0);
        cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

        setColor(cr, options.irisColor);
        cr.setLineWidth(options.lineWidth / irisRadius);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
        cr.translate(-irisX * Math.sin(eyeAngle), 0);

        // Drawing the pupil
        cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
        cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

        if (!options.lineMode)
            setColor(cr, options.pupilColor);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        // Drawing the eyelid
        if (options.eyelidLevel > 0) {
            cr.identityMatrix(); // Reset transformations
            cr.translate(areaWidth * 0.5, areaHeight * 0.5);

            drawEyelidShape();
            cr.clip();

            cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

            setColor(cr, options.eyelidColor);

            cr.rectangle(0, areaHeight * 0.2, areaWidth, eyelidHeight * options.eyelidLevel);
            cr.fill();
        }
    } finally {
        cr.$dispose();
    }
}
//#endregion

//#region Round/Comic eye
/**
 * Draws a round eye on the drawing area, with optional scaling to modify its shape.
 *
 * @param {St.DrawingArea} area - The drawing area where the eye will be rendered.
 * @param {object} options - The drawing options.
 * @param {number} scaleX [scaleX=1] - The scaling factor for the horizontal axis.
 * @param {number} scaleY [scaleY=1] - The scaling factor for the vertical axis.
 */
function drawRoundEye(area, options, scaleX = 1, scaleY = 1) {
    let [mouseX, mouseY] = [options.mouseX, options.mouseY];
    const [areaWidth, areaHeight] = area.get_surface_size();
    const [areaCenterX, areaCenterY] =
        [options.originX + (areaWidth / 2), options.originY + (areaHeight / 2)];

    mouseX -= areaCenterX;
    mouseY -= areaCenterY;

    const mouseAngle = Math.atan2(mouseY, mouseX);
    let mouseRadius = Math.sqrt((mouseX * mouseX) + (mouseY * mouseY));

    const eyeRadius = areaHeight / 2.5;
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

    try {
    // Drawing the base of the eye
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);
        cr.scale(scaleX, scaleY);

        setColor(cr, options.sceleraColor);
        cr.setLineWidth(options.lineWidth);

        cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
        options.lineMode ? cr.stroke() : cr.fill();

        cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
        cr.clip();

        // Drawing the iris
        cr.rotate(mouseAngle);
        cr.translate(irisX * Math.sin(eyeAngle), 0);
        cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

        setColor(cr, options.irisColor);
        cr.setLineWidth(options.lineWidth / irisRadius);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
        cr.translate(-irisX * Math.sin(eyeAngle), 0);

        // Drawing the pupil
        cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
        cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

        if (!options.lineMode)
            setColor(cr, options.pupilColor);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        // Drawing the eyelid
        if (options.eyelidLevel > 0) {
            cr.identityMatrix(); // Reset transformations
            cr.translate(areaWidth * 0.5, areaHeight * 0.5);

            cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
            cr.clip();

            cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

            setColor(cr, options.eyelidColor);

            cr.rectangle(0, 0, areaWidth, areaHeight * options.eyelidLevel);
            cr.fill();
        }
    } finally {
        cr.$dispose();
    }
}
//#endregion

//#region Helper functions
/**
 * Sets the color of the Cairo context using an RGB color value.
 *
 * @param {cairo.Context} cr - The Cairo graphics context where the color will be applied.
 * @param {Gdk.RGBA} color - The color to apply.
 */
function setColor(cr, color) {
    cr.setSourceRGB(color['red'], color['green'], color['blue']);
}
//#endregion
