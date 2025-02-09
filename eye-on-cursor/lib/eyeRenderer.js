/* eyeRenderer.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024-2025 djinnalexio
 *
 * This extension is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This extension is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this extension.
 * If not, see <https://www.gnu.org/licenses/gpl-3.0.html#license-text>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
'use strict';

//#region Constants
const IRIS_SCALE = 0.5;
const PUPIL_SCALE = 0.4;
const TOP_LID_SCALE = 0.8;
const BOTTOM_LID_SCALE = 0.6;
const COMIC_EYE_SCALE_X = 0.6;
const COMIC_EYE_SCALE_Y = 0.9;
//#endregion

//#region Main class
class EyeShape {
    /**
     * Draws the eye on the panel
     * @param {St.DrawingArea} area The area on repaint
     * @param {Object} options Drawing options
     */

    constructor(area, options) {
        this.area = area;
        this.options = options;

        // Color Assignment
        this.scleraColor = this.options.foregroundColor;
        if (this.options.trackerEnabled) {
            this.irisColor = this.options.trackerColor;
        } else if (this.options.irisColorEnabled) {
            this.irisColor = this.options.irisColor;
        } else if (this.options.lineMode) {
            this.irisColor = this.options.foregroundColor;
        } else {
            this.irisColor = this.options.defaultColor;
        }
        this.pupilColor = this.options.pupilColor;
        this.eyelidColor = this.options.eyelidColor;
    }
}
//#endregion

//#region Natural class
class NaturalEye extends EyeShape {
    constructor(area, options) {
        super(area, options);
        this.drawNaturalEye();
    }

    drawNaturalEye() {
        let [mouseX, mouseY] = global.get_pointer();
        const [areaWidth, areaHeight] = this.area.get_surface_size();
        let [areaX, areaY] = [this.options.areaX, this.options.areaY];

        areaX += areaWidth / 2;
        areaY += areaHeight / 2;

        mouseX -= areaX;
        mouseY -= areaY;

        const mouseAngle = Math.atan2(mouseY, mouseX);
        let mouseRadius = Math.sqrt(mouseX * mouseX + mouseY * mouseY);

        const eyeRadius = areaHeight / 2;
        const irisRadius = eyeRadius * IRIS_SCALE;
        const pupilRadius = irisRadius * PUPIL_SCALE;

        const maxRadius = eyeRadius * (Math.pow(Math.cos(mouseAngle), 4) * 0.5 + 0.25);

        if (mouseRadius > maxRadius) mouseRadius = maxRadius;

        const irisArc = Math.asin(irisRadius / eyeRadius);
        const irisX = eyeRadius * Math.cos(irisArc);

        const eyeAngle = Math.atan(mouseRadius / irisX);

        const offsetX = irisRadius * Math.cos(mouseAngle) * Math.sin(eyeAngle);
        const offsetY = irisRadius * Math.sin(mouseAngle) * Math.sin(eyeAngle);

        const eyelidHeight = eyeRadius * (TOP_LID_SCALE + BOTTOM_LID_SCALE);

        const cr = this.area.get_context();

        function drawEyelidShape() {
            cr.moveTo(-eyeRadius, 0);
            cr.curveTo(
                offsetX - irisRadius,
                offsetY + eyeRadius * TOP_LID_SCALE,
                offsetX + irisRadius,
                offsetY + eyeRadius * TOP_LID_SCALE,
                eyeRadius,
                0
            );

            cr.curveTo(
                offsetX + irisRadius,
                offsetY - eyeRadius * BOTTOM_LID_SCALE,
                offsetX - irisRadius,
                offsetY - eyeRadius * BOTTOM_LID_SCALE,
                -eyeRadius,
                0
            );
        }

        // -- Drawing the base of the eye
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);

        cairoSetColorFromHex(cr, this.scleraColor);
        cr.setLineWidth(this.options.lineWidth);

        drawEyelidShape();
        this.options.lineMode ? cr.stroke() : cr.fill();

        drawEyelidShape();
        cr.clip();

        // -- Drawing the iris
        cr.rotate(mouseAngle);
        cr.translate(irisX * Math.sin(eyeAngle), 0);
        cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

        cairoSetColorFromHex(cr, this.irisColor);
        cr.setLineWidth(this.options.lineWidth / irisRadius);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        this.options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
        cr.translate(-irisX * Math.sin(eyeAngle), 0);

        // -- Drawing the pupil
        cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
        cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

        if (!this.options.lineMode) cairoSetColorFromHex(cr, this.pupilColor);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        // -- Drawing the eyelid
        if (this.options.eyelidLevel > 0) {
            cr.identityMatrix();
            cr.translate(areaWidth * 0.5, areaHeight * 0.5);

            drawEyelidShape();
            cr.clip();

            cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

            cairoSetColorFromHex(cr, this.eyelidColor);

            cr.rectangle(0, areaHeight * 0.2, areaWidth, eyelidHeight * this.options.eyelidLevel);
            cr.fill();
        }

        cr.$dispose();
    }
}
//#endregion

//#region Round/Comic class
class RoundEye extends EyeShape {
    constructor(area, options, scaleX = 0.95, scaleY = 0.95) {
        super(area, options);
        this.scaleX = scaleX;
        this.scaleY = scaleY;
        this.drawRoundEye();
    }

    drawRoundEye() {
        let [mouseX, mouseY] = global.get_pointer();
        const [areaWidth, areaHeight] = this.area.get_surface_size();
        let [areaX, areaY] = [this.options.areaX, this.options.areaY];

        areaX += areaWidth / 2;
        areaY += areaHeight / 2;

        mouseX -= areaX;
        mouseY -= areaY;

        const mouseAngle = Math.atan2(mouseY, mouseX);
        let mouseRadius = Math.sqrt(mouseX * mouseX + mouseY * mouseY);

        const eyeRadius = areaHeight / 2.3;
        const irisRadius = eyeRadius * IRIS_SCALE * 1.3;
        const pupilRadius = irisRadius * PUPIL_SCALE;

        const maxRadius =
            eyeRadius * Math.cos(Math.asin(irisRadius / eyeRadius)) - this.options.lineWidth;

        if (mouseRadius > maxRadius) mouseRadius = maxRadius;

        const irisArc = Math.asin(irisRadius / eyeRadius);
        const irisX = eyeRadius * Math.cos(irisArc);

        const eyeAngle = Math.atan(mouseRadius / irisX);

        const cr = this.area.get_context();

        // -- Drawing the base of the eye
        cr.translate(areaWidth * 0.5, areaHeight * 0.5);
        cr.scale(this.scaleX, this.scaleY);

        cairoSetColorFromHex(cr, this.scleraColor);
        cr.setLineWidth(this.options.lineWidth);

        cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
        this.options.lineMode ? cr.stroke() : cr.fill();

        cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
        cr.clip();

        // -- Drawing the iris
        cr.rotate(mouseAngle);
        cr.translate(irisX * Math.sin(eyeAngle), 0);
        cr.scale(irisRadius * Math.cos(eyeAngle), irisRadius);

        cairoSetColorFromHex(cr, this.irisColor);
        cr.setLineWidth(this.options.lineWidth / irisRadius);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        this.options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (irisRadius * Math.cos(eyeAngle)), 1 / irisRadius);
        cr.translate(-irisX * Math.sin(eyeAngle), 0);

        // -- Drawing the pupil
        cr.translate(eyeRadius * Math.sin(eyeAngle), 0);
        cr.scale(pupilRadius * Math.cos(eyeAngle), pupilRadius);

        if (!this.options.lineMode) cairoSetColorFromHex(cr, this.pupilColor);

        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        // -- Drawing the eyelid
        if (this.options.eyelidLevel > 0) {
            cr.identityMatrix();
            cr.translate(areaWidth * 0.5, areaHeight * 0.5);

            cr.arc(0, 0, eyeRadius, 0, 2 * Math.PI);
            cr.clip();

            cr.translate(-areaWidth * 0.5, -areaHeight * 0.5);

            cairoSetColorFromHex(cr, this.eyelidColor);

            cr.rectangle(0, 0, areaWidth, areaHeight * this.options.eyelidLevel);
            cr.fill();
        }

        cr.$dispose();
    }
}
//#endregion

//#region Draw function
export function drawEye(area, options) {
    switch (options.shape) {
        case 'round':
            return new RoundEye(area, options);
        case 'comic':
            return new RoundEye(area, options, COMIC_EYE_SCALE_X, COMIC_EYE_SCALE_Y);
        case 'natural':
        default:
            return new NaturalEye(area, options);
    }
}
//#endregion

//#region Helper functions
function cairoSetColorFromHex(cr, hex) {
    hex = hex.slice(1);

    const [r, g, b] = [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map(
        value => parseInt(value, 16) / 255.0
    );

    cr.setSourceRGBA(r, g, b, 1);
}
//#endregion
