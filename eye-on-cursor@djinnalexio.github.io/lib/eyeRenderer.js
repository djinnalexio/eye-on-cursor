/* eyeRenderer.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024 djinnalexio
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

const IRIS_SCALE = 0.5;
const PUPIL_SCALE = 0.4;
const TOP_LID_SCALE = 0.8;
const BOTTOM_LID_SCALE = 0.6;

class EyeShape {
    /**
     * Draws the eye on the panel
     * @param {St.DrawingArea} area The area on repaint
     * @param {Object} options Drawing options
     */

    constructor(area, options) {
        this.area = area;
        this.options = options;
    }
}

class EyelidEye extends EyeShape {
    constructor(area, options) {
        super(area, options);
        this.drawEyelidEye();
    }

    drawEyelidEye() {
        let [mouse_x, mouse_y] = global.get_pointer();
        const [area_width, area_height] = this.area.get_surface_size();
        let [area_x, area_y] = [this.options.areaX, this.options.areaY];

        area_x += area_width / 2;
        area_y += area_height / 2;

        mouse_x -= area_x;
        mouse_y -= area_y;

        const mouse_ang = Math.atan2(mouse_y, mouse_x);
        let mouse_rad = Math.sqrt(mouse_x * mouse_x + mouse_y * mouse_y);

        const eye_rad = area_height / 2;
        const iris_rad = eye_rad * IRIS_SCALE;
        const pupil_rad = iris_rad * PUPIL_SCALE;

        const max_rad = eye_rad * (Math.pow(Math.cos(mouse_ang), 4) * 0.5 + 0.25);

        if (mouse_rad > max_rad) mouse_rad = max_rad;

        const iris_arc = Math.asin(iris_rad / eye_rad);
        const iris_r = eye_rad * Math.cos(iris_arc);

        const eye_ang = Math.atan(mouse_rad / iris_r);

        const cr = this.area.get_context();

        // -- Drawing the base of the eye
        cairoSetSourceClutterColor(cr, this.options.mainColor);

        cr.translate(area_width * 0.5, area_height * 0.5);
        cr.setLineWidth(this.options.lineWidth);

        const x_def = iris_rad * Math.cos(mouse_ang) * Math.sin(eye_ang);
        const y_def = iris_rad * Math.sin(mouse_ang) * Math.sin(eye_ang);

        let amp = eye_rad * TOP_LID_SCALE;
        cr.moveTo(-eye_rad, 0);
        cr.curveTo(x_def - iris_rad, y_def + amp, x_def + iris_rad, y_def + amp, eye_rad, 0);

        amp = eye_rad * BOTTOM_LID_SCALE;
        cr.curveTo(x_def + iris_rad, y_def - amp, x_def - iris_rad, y_def - amp, -eye_rad, 0);

        this.options.lineMode ? cr.stroke() : cr.fill();

        amp = eye_rad * TOP_LID_SCALE;
        cr.moveTo(-eye_rad, 0);
        cr.curveTo(x_def - iris_rad, y_def + amp, x_def + iris_rad, y_def + amp, eye_rad, 0);

        amp = eye_rad * BOTTOM_LID_SCALE;
        cr.curveTo(x_def + iris_rad, y_def - amp, x_def - iris_rad, y_def - amp, -eye_rad, 0);
        cr.clip();

        // -- Drawing the iris of the eye
        cr.rotate(mouse_ang);
        cr.setLineWidth(this.options.lineWidth / iris_rad);

        if (this.options.trackerEnabled) {
            cairoSetSourceClutterColor(cr, this.options.trackerColor);
        } else if (this.options.irisColorEnabled) {
            cairoSetSourceClutterColor(cr, this.options.irisColor);
        } else {
            cairoSetSourceClutterColor(cr, this.options.mainColor);
        }

        cr.translate(iris_r * Math.sin(eye_ang), 0);
        cr.scale(iris_rad * Math.cos(eye_ang), iris_rad);
        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);

        this.options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (iris_rad * Math.cos(eye_ang)), 1 / iris_rad);
        cr.translate(-iris_r * Math.sin(eye_ang), 0);

        // -- Drawing the pupil of the eye
        if (!this.options.lineMode) cr.setSourceRGBA(0, 0, 0, 255);

        cr.translate(eye_rad * Math.sin(eye_ang), 0);
        cr.scale(pupil_rad * Math.cos(eye_ang), pupil_rad);
        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        cr.save();
        cr.restore();
        cr.$dispose();
    }
}

class RoundEye extends EyeShape {
    constructor(area, options) {
        super(area, options);
        this.drawRoundEye();
    }

    drawRoundEye() {
        let [mouse_x, mouse_y] = global.get_pointer();
        const [area_width, area_height] = this.area.get_surface_size();
        let [area_x, area_y] = [this.options.areaX, this.options.areaY];

        area_x += area_width / 2;
        area_y += area_height / 2;

        mouse_x -= area_x;
        mouse_y -= area_y;

        const mouse_ang = Math.atan2(mouse_y, mouse_x);
        let mouse_rad = Math.sqrt(mouse_x * mouse_x + mouse_y * mouse_y);

        const eye_rad = area_height / 2.3;
        const iris_rad = eye_rad * IRIS_SCALE;
        const pupil_rad = iris_rad * PUPIL_SCALE;

        const max_rad = eye_rad * Math.cos(Math.asin(iris_rad / eye_rad)) - this.options.lineWidth;

        if (mouse_rad > max_rad) mouse_rad = max_rad;

        const iris_arc = Math.asin(iris_rad / eye_rad);
        const iris_r = eye_rad * Math.cos(iris_arc);

        const eye_ang = Math.atan(mouse_rad / iris_r);

        const cr = this.area.get_context();

        // -- Drawing the base of the eye
        cairoSetSourceClutterColor(cr, this.options.mainColor);

        cr.translate(area_width * 0.5, area_height * 0.5);
        cr.setLineWidth(this.options.lineWidth);
        cr.arc(0, 0, eye_rad, 0, 2 * Math.PI);

        this.options.lineMode ? cr.stroke() : cr.fill();

        // -- Drawing the iris of the eye
        cr.rotate(mouse_ang);
        cr.setLineWidth(this.options.lineWidth / iris_rad);

        if (this.options.trackerEnabled) {
            cairoSetSourceClutterColor(cr, this.options.trackerColor);
        } else if (this.options.irisColorEnabled) {
            cairoSetSourceClutterColor(cr, this.options.irisColor);
        } else {
            cairoSetSourceClutterColor(cr, this.options.mainColor);
        }

        cr.translate(iris_r * Math.sin(eye_ang), 0);
        cr.scale(iris_rad * Math.cos(eye_ang), iris_rad);
        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);

        this.options.lineMode ? cr.stroke() : cr.fill();

        cr.scale(1 / (iris_rad * Math.cos(eye_ang)), 1 / iris_rad);
        cr.translate(-iris_r * Math.sin(eye_ang), 0);

        // -- Drawing the pupil of the eye
        if (!this.options.lineMode) cr.setSourceRGBA(0, 0, 0, 255);

        cr.translate(eye_rad * Math.sin(eye_ang), 0);
        cr.scale(pupil_rad * Math.cos(eye_ang), pupil_rad);
        cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
        cr.fill();

        cr.save();
        cr.restore();
        cr.$dispose();
    }
}

export function drawEye(area, options) {
    switch (options.shape) {
        case 'eyelid':
            return new EyelidEye(area, options);
        case 'round':
        default:
            return new RoundEye(area, options);
    }
}

function cairoSetSourceClutterColor(cr, clutterColor) {
    const r = clutterColor.red / 255.0;
    const g = clutterColor.green / 255.0;
    const b = clutterColor.blue / 255.0;
    const a = clutterColor.alpha / 255.0;

    cr.setSourceRGBA(r, g, b, a);
}
