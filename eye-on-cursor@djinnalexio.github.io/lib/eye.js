/* eye.js
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

//#region Import libraries
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//#endregion

//#region Constants
const AREA_WIDTH = 100;
const AREA_HEIGHT = 1;
const EYE_SETTINGS = [
    'eye-reactive',
    'eye-shape',
    'eye-line-width',
    'eye-margin',
    'eye-color',
    'eye-repaint-interval',
];
//#endregion

//#region Defining Eye
export const Eye = GObject.registerClass(
    class Eye extends PanelMenu.Button {
        constructor(extensionObject, trackerManager) {
            /**
             * Creates an instance of Eye, an animated eye created in the panel
             * that follows the pointer.
             *
             * @param {Extension} extensionObject - The extension object.
             * @param {TrackerManager} trackerManager - the object that controls the tracker.
             */

            super(0, `Eye.${extensionObject.uuid}`, false);

            // Get extension object properties
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            // Attach mouse tracker
            this.mouseTracker = trackerManager;
            this.trackerEnabled = this.mouseTracker.enabled;
            this.trackerColor = this.mouseTracker.currentColor;

            // Variables for initial state
            this.mousePositionX = 0;
            this.mousePositionY = 0;

            // Initialize settings values
            this.reactive = this.settings.get_boolean('eye-reactive');
            this.shape = this.settings.get_string('eye-shape');
            this.lineWidth = this.settings.get_double('eye-line-width');
            this.margin = this.settings.get_double('eye-margin');
            this.repaintInterval = this.settings.get_int('eye-repaint-interval');

            // Connect change in settings to update function
            this.settingsHandlers = [];
            EYE_SETTINGS.forEach(key => {
                this.settingsHandlers.push(
                    this.settings.connect(`changed::${key}`, this.updateEyeProperties.bind(this))
                );
            });

            // Add popups
            this.menuItems = [];

            [this.trackerPopup, this.prefsPopup].forEach(popup => {
                this.menuItems.push(popup);
                this.menu.addMenuItem(popup);
            });

            this.settingsHandlers.push(
                this.trackerPopup.connect('activate', () => {
                    this.mouseTracker.toggleTracker();
                })
            );
            this.settingsHandlers.push(
                this.prefsPopup.connect('activate', () => extensionObject.openPreferences())
            );

            // Create the eye canvas
            this.area = new St.DrawingArea({
                width: AREA_WIDTH,
                height: AREA_HEIGHT,
            });
            this.add_child(this.area);

            // Connect repaint signal of the area to repaint function
            this.repaintHandler = this.area.connect('repaint', this.onRepaint.bind(this));
            // this.repaintHandler = this.area.connect('repaint', () =>
            //     console.debug(this.desktopActor.get_theme_node().get_color('theme_fg_color'))
            // );

            // Start periodic redraw
            this.updateHandler = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this.repaintInterval,
                () => {
                    this.updateEyeFrame();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }

        //#region Draw eye Functions
        // Update and redraw the eye frame if the mouse has moved
        updateEyeFrame() {
            const [mouseX, mouseY] = global.get_pointer();

            // If mouse has moved or tracker color has changed, redraw eye
            if (
                this.mousePositionX !== mouseX ||
                this.mousePositionY !== mouseY ||
                this.trackerEnabled !== this.mouseTracker.enabled ||
                this.trackerColor !== this.mouseTracker.currentColor
            ) {
                [this.mousePositionX, this.mousePositionY] = [mouseX, mouseY];
                this.trackerColor = this.mouseTracker.currentColor;
                this.area.queue_repaint();
            }
            // add or tracker is on and it's color has changed
        }

        // Redraw the eye
        onRepaint(area) {
            function get_pos(self) {
                let area_x = 0;
                let area_y = 0;

                let obj = self.area;

                const [tx, ty] = obj.get_position();
                area_x += tx;
                area_y += ty;
                obj = obj.get_parent();

                return [area_x, area_y];
            }

            const [area_width, area_height] = area.get_surface_size();
            let [area_x, area_y] = get_pos(this);
            area_x += area_width / 2;
            area_y += area_height / 2;

            let [mouse_x, mouse_y] = global.get_pointer();
            mouse_x -= area_x;
            mouse_y -= area_y;

            const mouse_ang = Math.atan2(mouse_y, mouse_x);
            let mouse_rad = Math.sqrt(mouse_x * mouse_x + mouse_y * mouse_y);

            let eye_rad;
            let iris_rad;
            let pupil_rad;
            let max_rad;

            if (this.shape === 'round') {
                eye_rad = area_height / 2.3;
                iris_rad = eye_rad * 0.6;
                pupil_rad = iris_rad * 0.4;

                max_rad = eye_rad * Math.cos(Math.asin(iris_rad / eye_rad)) - this.lineWidth;
            }

            if (this.shape === 'eyelid') {
                eye_rad = area_height / 2;
                iris_rad = eye_rad * 0.5;
                pupil_rad = iris_rad * 0.4;

                max_rad = eye_rad * (Math.pow(Math.cos(mouse_ang), 4) * 0.5 + 0.25);
            }

            if (mouse_rad > max_rad) mouse_rad = max_rad;

            const iris_arc = Math.asin(iris_rad / eye_rad);
            const iris_r = eye_rad * Math.cos(iris_arc);

            const eye_ang = Math.atan(mouse_rad / iris_r);

            const cr = area.get_context();
            const theme_node = this.area.get_theme_node();

            // Get the foreground color from the theme
            const foreground_color = theme_node.get_foreground_color();
            let [r, g, b] = [
                foreground_color.red / 255,
                foreground_color.green / 255,
                foreground_color.blue / 255,
            ];
            const a = foreground_color.alpha / 255;

            if (this.mouseTracker.enabled) {
                const colorValue = this.trackerColor.replace(/^#/, '');
                r = parseInt(colorValue.substring(0, 2), 16) / 255;
                g = parseInt(colorValue.substring(2, 4), 16) / 255;
                b = parseInt(colorValue.substring(4, 6), 16) / 255;
            }

            // Set the foreground color
            cr.setSourceRGBA(r, g, b, a);

            cr.translate(area_width * 0.5, area_height * 0.5);
            cr.setLineWidth(this.lineWidth);

            if (this.shape === 'round') {
                cr.arc(0, 0, eye_rad, 0, 2 * Math.PI);
                cr.stroke();
            }

            if (this.shape === 'eyelid') {
                const x_def = iris_rad * Math.cos(mouse_ang) * Math.sin(eye_ang);
                const y_def = iris_rad * Math.sin(mouse_ang) * Math.sin(eye_ang);
                let amp;

                const top_lid = 0.8;
                const bottom_lid = 0.6;

                amp = eye_rad * top_lid;
                cr.moveTo(-eye_rad, 0);
                cr.curveTo(
                    x_def - iris_rad,
                    y_def + amp,
                    x_def + iris_rad,
                    y_def + amp,
                    eye_rad,
                    0
                );

                amp = eye_rad * bottom_lid;
                cr.curveTo(
                    x_def + iris_rad,
                    y_def - amp,
                    x_def - iris_rad,
                    y_def - amp,
                    -eye_rad,
                    0
                );
                cr.stroke();

                amp = eye_rad * top_lid;
                cr.moveTo(-eye_rad, 0);
                cr.curveTo(
                    x_def - iris_rad,
                    y_def + amp,
                    x_def + iris_rad,
                    y_def + amp,
                    eye_rad,
                    0
                );

                amp = eye_rad * bottom_lid;
                cr.curveTo(
                    x_def + iris_rad,
                    y_def - amp,
                    x_def - iris_rad,
                    y_def - amp,
                    -eye_rad,
                    0
                );
                cr.clip();
            }

            cr.rotate(mouse_ang);
            cr.setLineWidth(this.lineWidth / iris_rad);

            cr.translate(iris_r * Math.sin(eye_ang), 0);
            cr.scale(iris_rad * Math.cos(eye_ang), iris_rad);
            cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
            cr.stroke();
            cr.scale(1 / (iris_rad * Math.cos(eye_ang)), 1 / iris_rad);
            cr.translate(-iris_r * Math.sin(eye_ang), 0);

            cr.translate(eye_rad * Math.sin(eye_ang), 0);
            cr.scale(pupil_rad * Math.cos(eye_ang), pupil_rad);
            cr.arc(0, 0, 1.0, 0, 2 * Math.PI);
            cr.fill();

            cr.save();
            cr.restore();
            cr.$dispose();
        }
        //#endregion

        //#region Properties update functions
        updateEyeProperties() {
            const newReactive = this.settings.get_boolean('eye-reactive');
            const newShape = this.settings.get_string('eye-shape');
            const newLineWidth = this.settings.get_double('eye-line-width');
            const newMargin = this.settings.get_double('eye-margin');
            const newRepaintInterval = this.settings.get_int('eye-repaint-interval');

            // Update reactive property
            if (this.reactive !== newReactive) this.reactive = newReactive;

            // Update shape and line thickness
            if (this.shape !== newShape) {
                this.shape = newShape;
                this.area.queue_repaint();
            }

            // Update line thickness
            if (this.lineWidth !== newLineWidth) {
                this.lineWidth = newLineWidth;
                this.area.queue_repaint();
            }
            // Update margins
            if (this.margin !== newMargin) {
                this.area.set_height(AREA_HEIGHT);
                this.area.set_width(AREA_WIDTH + 2 * this.eye_margin);
                //this.set_width(Panel.PANEL_ICON_SIZE * (2 * this.eye_margin));
                this.area.queue_repaint();
            }

            // Update repaint interval
            if (this.repaintInterval !== newRepaintInterval) {
                if (this.trackerPositionUpdater) {
                    GLib.source_remove(this.trackerPositionUpdater);
                }
                this.updateHandler = GLib.timeout_add(
                    GLib.PRIORITY_DEFAULT,
                    newRepaintInterval,
                    () => {
                        this.updateEyeFrame();
                        return GLib.SOURCE_CONTINUE;
                    }
                );
                this.repaintInterval = newRepaintInterval;
            }
        }
        //#endregion

        //#region Popups
        trackerPopup = new PopupMenu.PopupImageMenuItem(
            _('Toggle Tracker'),
            'view-reveal-symbolic'
        );

        prefsPopup = new PopupMenu.PopupImageMenuItem(_('Settings'), 'org.gnome.Settings-symbolic');
        //#endregion

        //#region Destroy function
        destroy() {
            // Disconnect repaint signal
            this.area.disconnect(this.repaintHandler);

            // Stop periodic redraw
            this.updateHandler = null;

            // Destroy drawing
            this.area.destroy();
            this.area = null;

            // Disconnect settings signal handlers
            this.settingsHandlers?.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.settingsHandlers = null;

            // Destroy popups
            this.menuItems.forEach(menuItem => menuItem?.destroy());
            this.menuItems = [];

            // Destroy the button
            super.destroy();
        }
        //#endregion
    }
);
//#endregion

//#region Creating eyes
export function spawnEyes(eyeArray, settings, extensionObject, trackerManager) {
    // Remove current eyes
    destroyEyes(eyeArray);

    for (let count = 0; count < settings.get_int('eye-count'); count++) {
        eyeArray.push(new Eye(extensionObject, trackerManager));
        Main.panel.addToStatusArea(
            extensionObject.uuid + Math.random(),
            eyeArray[count],
            settings.get_int('eye-index'),
            settings.get_string('eye-position')
        );
    }
}
//#endregion

//#region Destroying eyes
export function destroyEyes(eyeArray) {
    eyeArray?.forEach(eye => eye.destroy());
    eyeArray.length = 0; // Or eyeArray = [];
}
//#endregion
