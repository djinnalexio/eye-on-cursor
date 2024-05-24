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
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//#endregion

//#region Defining Eye
export const Eye = GObject.registerClass(
    class Eye extends PanelMenu.Button {
        constructor(extensionObject, trackerManager) {
            super(0, 'Eye.' + extensionObject.uuid, false);

            // Get extension object properties
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            this.settingConnections = [];

            this.mouseTracker = trackerManager;

            //#region add popups
            this.trackerPopup = new PopupMenu.PopupImageMenuItem(
                _('Toggle Tracker'),
                'view-reveal-symbolic'
            );
            this.menu.addMenuItem(this.trackerPopup);
            this.settingConnections.push(
                this.trackerPopup.connect('activate', () => {
                    this.mouseTracker.toggleTracker();
                })
            );

            this.prefsPopup = new PopupMenu.PopupImageMenuItem(
                _('Settings'),
                'org.gnome.Settings-symbolic'
            );
            this.menu.addMenuItem(this.prefsPopup);
            this.settingConnections.push(
                this.prefsPopup.connect('activate', () => extensionObject.openPreferences())
            );
            //#endregion

            // Do stuff
            this.add_child(
                new St.Icon({
                    gicon: Gio.icon_new_for_string(`${this.path}/media/eye-on-cursor-logo.svg`),
                    style_class: 'system-status-icon',
                })
            );
        }

        destroy() {
            // Disconnect signal handlers
            this.settingConnections?.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.settingConnections = null;

            // Destroy the button
            super.destroy();
        }
    }
);
//#endregion

//#region Creating eyes function
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
        eyeArray[count].reactive = settings.get_boolean('eye-reactive');
    }
}
//#endregion

//#region Destroying eyes function
export function destroyEyes(eyeArray) {
    eyeArray?.forEach(eye => eye.destroy());
    eyeArray.length = 0; // Or eyeArray = [];
}
//#endregion
