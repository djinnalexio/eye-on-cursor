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
import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as EyeRenderer from './eyeRenderer.js';
//#endregion

//#region Constants
const EYE_SETTINGS = [
    'eye-reactive',
    'eye-shape',
    'eye-line-width',
    'eye-width',
    'eye-iris-color',
    'eye-iris-color-enabled',
    'eye-repaint-interval',
];
//#endregion

//#region Defining Eye
export const Eye = GObject.registerClass(
    class Eye extends PanelMenu.Button {
        /**
         * Creates an instance of Eye, an animated eye created in the panel
         * that follows the pointer.
         *
         * @param {Object} extensionObject - The extension object.
         * @param {Object} trackerManager - The object that controls the tracker.
         */

        //#region Constructor
        constructor(extensionObject, trackerManager) {
            super(0, `Eye.${extensionObject.uuid}`, false);

            // Get extension object properties
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            // Attach mouse tracker
            this.mouseTracker = trackerManager;
            this.trackerColor = null;

            // Variables for initial state
            this.mousePositionX = 0;
            this.mousePositionY = 0;

            // Initialize settings values
            this.reactive = this.settings.get_boolean('eye-reactive');
            this.shape = this.settings.get_string('eye-shape');
            this.lineWidth = this.settings.get_int('eye-line-width') / 10;
            this.width = this.settings.get_int('eye-width');
            this.irisColorEnabled = this.settings.get_boolean('eye-iris-color-enabled');
            this.irisColor = this.settings.get_string('eye-iris-color');
            this.repaintInterval = this.settings.get_int('eye-repaint-interval');

            // Connect change in settings to update function
            this.settingsHandlers = EYE_SETTINGS.map(key =>
                this.settings.connect(`changed::${key}`, this.updateEyeProperties.bind(this))
            );

            // Add popups
            this.menuItems = [
                this.createPopupMenuItem(
                    _('Toggle Tracker'),
                    'view-reveal-symbolic',
                    this.mouseTracker.toggleTracker.bind(this.mouseTracker)
                ),
                this.createPopupMenuItem(
                    _('Settings'),
                    'org.gnome.Settings-symbolic',
                    extensionObject.openPreferences.bind(extensionObject)
                ),
            ];

            this.menuItems.forEach(popup => this.menu.addMenuItem(popup));

            // Create the eye canvas
            this.area = new St.DrawingArea({width: this.width});
            this.add_child(this.area);

            // Connect repaint signal of the area to repaint function
            this.repaintHandler = this.area.connect('repaint', this.onRepaint.bind(this));

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
        //#endregion

        // Create Popup Functions
        createPopupMenuItem(label, icon, callback) {
            const item = new PopupMenu.PopupImageMenuItem(label, icon);
            item.connect('activate', callback);
            return item;
        }

        //#region Draw eye Functions
        // Get absolute position
        getAbsPosition(area) {
            let [areaX, areaY] = [0, 0];
            let obj = area;

            // Loop through the hierarchy of parent elements
            while (obj) {
                let [tx, ty] = [0, 0];
                try {
                    [tx, ty] = obj.get_position();
                } catch {
                    /* move on if failed */
                }
                // Accumulate the coordinates
                areaX += tx;
                areaY += ty;
                // Move to the parent element
                obj = obj.get_parent();
            }
            // Return the absolute position of the drawing area on the desktop
            return [areaX, areaY];
        }

        // Update and redraw the eye frame if the mouse has moved
        updateEyeFrame() {
            const [mouseX, mouseY] = global.get_pointer();

            // If mouse has moved or tracker color has changed, redraw eye
            if (
                this.mousePositionX !== mouseX ||
                this.mousePositionY !== mouseY ||
                this.trackerColor !== this.mouseTracker.currentColor
            ) {
                [this.mousePositionX, this.mousePositionY] = [mouseX, mouseY];
                this.trackerColor = this.mouseTracker.currentColor;
                this.area.queue_repaint();
            }
        }

        // Draw function
        onRepaint(area) {
            const [areaX, areaY] = this.getAbsPosition(area);

            // Get the foreground color from the theme
            const themeNode = this.area.get_theme_node();
            const foregroundColor = themeNode.get_foreground_color();

            const [, irisColor] = Clutter.Color.from_string(this.irisColor);

            let trackerColor;
            if (this.mouseTracker.enabled) {
                [, trackerColor] = Clutter.Color.from_string(this.trackerColor);
            }

            const options = {
                areaX,
                areaY,
                mainColor: foregroundColor,
                irisColor,
                trackerColor,
                lineWidth: this.lineWidth,
                irisColorEnabled: this.irisColorEnabled,
                trackerEnabled: this.mouseTracker.enabled,
            };

            EyeRenderer.drawEye(this.shape, area, options);
        }
        //#endregion

        //#region Properties update functions
        updateEyeProperties() {
            const newReactive = this.settings.get_boolean('eye-reactive');
            const newShape = this.settings.get_string('eye-shape');
            const newLineWidth = this.settings.get_int('eye-line-width');
            const newWidth = this.settings.get_int('eye-width');
            const newIrisColorEnabled = this.settings.get_boolean('eye-iris-color-enabled');
            const newIrisColor = this.settings.get_string('eye-iris-color');
            const newRepaintInterval = this.settings.get_int('eye-repaint-interval');

            // Update reactive property
            if (this.reactive !== newReactive) this.reactive = newReactive;

            // Update width
            if (this.width !== newWidth) {
                this.area.set_width(newWidth);
                this.width = newWidth;
            }

            // Update shape and line thickness
            if (this.shape !== newShape) {
                this.shape = newShape;
                this.area.queue_repaint();
            }

            // Update line thickness
            if (this.lineWidth !== newLineWidth) {
                this.lineWidth = newLineWidth / 10;
                this.area.queue_repaint();
            }

            // Update iris color
            if (this.irisColorEnabled !== newIrisColorEnabled || this.irisColor !== newIrisColor) {
                this.irisColorEnabled = newIrisColorEnabled;
                this.irisColor = newIrisColor;
                this.area.queue_repaint();
            }

            // Update repaint interval
            if (this.repaintInterval !== newRepaintInterval) {
                if (this.updateHandler) {
                    GLib.source_remove(this.updateHandler);
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

        //#region Destroy function
        destroy() {
            // Disconnect repaint signal
            this.area.disconnect(this.repaintHandler);

            // Stop periodic redraw
            if (this.updateHandler) {
                GLib.source_remove(this.updateHandler);
            }
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
