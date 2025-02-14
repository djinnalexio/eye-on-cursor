/* eye.js
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

//#region Import libraries
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as EyeRenderer from './eyeRenderer.js';
import * as Timeout from './timeout.js';
//#endregion

//#region Constants
// See https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/adw-accent-color.c?ref_type=heads#L15
// And https://gitlab.gnome.org/GNOME/gsettings-desktop-schemas/-/blob/master/schemas/org.gnome.desktop.interface.gschema.xml.in?ref_type=heads#L314
const ACCENT_COLORS = {
    blue: '#3584e4',
    teal: '#2190a4',
    green: '#3a944a',
    yellow: '#c88800',
    orange: '#ed5b00',
    red: '#e62d42',
    pink: '#d56199',
    purple: '#9141ac',
    slate: '#6f8396',
};
const ACCENT_COLORS_KEY = 'accent-color';
const DEFAULT_COLOR = '#b5b5b5';
const EYE_SETTINGS = [
    'eye-reactive',
    'eye-shape',
    'eye-line-mode',
    'eye-line-width',
    'eye-width',
    'eye-color-iris',
    'eye-color-iris-enabled',
    'eye-refresh-rate',
    'eye-color-eyelid',
];
const PUPIL_COLOR = '#000000';
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
            super(0, extensionObject.uuid, false);

            // Get extension object properties
            this.path = extensionObject.path;
            this.settings = extensionObject.settings;

            // Attach mouse tracker
            this.mouseTracker = trackerManager;
            this.trackerColor = null;

            // Variables for initial state
            this.mousePositionX = 0;
            this.mousePositionY = 0;
            this.eyelidLevel = 0;
            this.blinking = false;
            this.blinkTimeoutID = {id: null};
            this.randomBlinkTimeoutID = {id: null};
            this.updateHandlerID = {id: null};

            // Initialize settings values
            this.reactive = this.settings.get_boolean('eye-reactive');
            this.shape = this.settings.get_string('eye-shape');
            this.lineMode = this.settings.get_boolean('eye-line-mode');
            this.lineWidth = this.settings.get_int('eye-line-width') / 10;
            this.width = this.settings.get_int('eye-width');
            this.irisColorEnabled = this.settings.get_boolean('eye-color-iris-enabled');
            this.irisColor = this.settings.get_string('eye-color-iris');
            this.refreshRate = this.settings.get_int('eye-refresh-rate');
            this.eyelidColor = this.settings.get_string('eye-color-eyelid');

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

            // Get desktop accent color if supported (GNOME 47+) else use default
            this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
            this.accentColorKeyFound = this.interfaceSettings
                .list_keys()
                .includes(ACCENT_COLORS_KEY);

            if (this.accentColorKeyFound) {
                this.defaultColor =
                    ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];
                this.defaultColorHandler = this.interfaceSettings.connect(
                    `changed::${ACCENT_COLORS_KEY}`,
                    () => {
                        this.defaultColor =
                            ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];
                        this.area.queue_repaint();
                    }
                );
            } else {
                this.defaultColor = DEFAULT_COLOR;
            }

            // Connect repaint signal of the area to repaint function
            this.repaintHandler = this.area.connect('repaint', this.onRepaint.bind(this));

            // Start periodic redraw
            Timeout.setInterval(
                this.updateHandlerID,
                this.updateEyeFrame.bind(this),
                1000 / this.refreshRate
            );
        }

        // Create Popup Functions
        createPopupMenuItem(label, icon, callback) {
            const item = new PopupMenu.PopupImageMenuItem(label, icon);
            item.connect('activate', callback);
            return item;
        }
        //#endregion

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

            // If mouse has moved or tracker color has changed, or is blinking, redraw eye
            if (
                this.mousePositionX !== mouseX ||
                this.mousePositionY !== mouseY ||
                this.trackerColor !== this.mouseTracker.currentColor ||
                this.blinking
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
            const foregroundColor = `#${['red', 'green', 'blue']
                .map(color => themeNode.get_foreground_color()[color].toString(16).padStart(2, '0'))
                .join('')}`;

            const options = {
                areaX,
                areaY,
                shape: this.shape,
                lineMode: this.lineMode,
                lineWidth: this.lineWidth,
                irisColorEnabled: this.irisColorEnabled,
                trackerEnabled: this.mouseTracker.enabled,
                foregroundColor,
                defaultColor: this.defaultColor,
                irisColor: this.irisColor,
                trackerColor: this.trackerColor,
                eyelidColor: this.eyelidColor,
                pupilColor: PUPIL_COLOR,
                eyelidLevel: this.eyelidLevel,
            };

            EyeRenderer.drawEye(area, options);
        }
        //#endregion

        //#region Properties update functions
        updateEyeProperties() {
            const newReactive = this.settings.get_boolean('eye-reactive');
            const newShape = this.settings.get_string('eye-shape');
            const newLineMode = this.settings.get_boolean('eye-line-mode');
            const newLineWidth = this.settings.get_int('eye-line-width');
            const newWidth = this.settings.get_int('eye-width');
            const newIrisColorEnabled = this.settings.get_boolean('eye-color-iris-enabled');
            const newIrisColor = this.settings.get_string('eye-color-iris');
            const newRefreshRate = this.settings.get_int('eye-refresh-rate');
            const newEyelidColor = this.settings.get_string('eye-color-eyelid');

            // Update reactive property
            if (this.reactive !== newReactive) this.reactive = newReactive;

            // Update width
            if (this.width !== newWidth) {
                this.area.set_width(newWidth);
                this.width = newWidth;
            }

            // Update shape
            if (this.shape !== newShape) {
                this.shape = newShape;
                this.area.queue_repaint();
            }

            // Update drawing mode
            if (this.lineMode !== newLineMode) {
                this.lineMode = newLineMode;
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

            // Update refresh rate
            if (this.refreshRate !== newRefreshRate) {
                Timeout.clearInterval(this.updateHandlerID);

                Timeout.setInterval(
                    this.updateHandlerID,
                    this.updateEyeFrame.bind(this),
                    1000 / newRefreshRate
                );
                this.refreshRate = newRefreshRate;
            }

            if (this.eyelidColor !== newEyelidColor) {
                this.eyelidColor = newEyelidColor;
                this.area.queue_repaint();
            }
        }
        //#endregion

        //#region Destroy function
        destroy() {
            // Disconnect repaint signal
            this.area.disconnect(this.repaintHandler);

            // Stop periodic redraw
            Timeout.clearInterval(this.updateHandlerID);

            // Destroy drawing
            this.area.destroy();
            this.area = null;

            // Disconnect settings signal handlers
            this.settingsHandlers?.forEach(connection => this.settings.disconnect(connection));
            this.settingsHandlers = null;

            if (this.defaultColorHandler) {
                this.interfaceSettings.disconnect(this.defaultColorHandler);
            }
            this.defaultColorHandler = null;

            // Destroy popups
            this.menuItems.forEach(menuItem => menuItem?.destroy());
            this.menuItems = [];

            // Disconnect settings
            this.settings = null;
            this.interfaceSettings = null;

            // Destroy the button
            super.destroy();
        }
        //#endregion
    }
);
//#endregion

//#region Creating eyes
export function spawnEyes(extensionObject, eyeArray, trackerManager) {
    // Remove current eyes
    destroyEyes(eyeArray);

    for (let count = 0; count < extensionObject.settings.get_int('eye-count'); count++) {
        eyeArray.push(new Eye(extensionObject, trackerManager));
        Main.panel.addToStatusArea(
            `${extensionObject.metadata['gettext-domain']}-${count}`,
            eyeArray[count],
            extensionObject.settings.get_int('eye-index'),
            extensionObject.settings.get_string('eye-position')
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
