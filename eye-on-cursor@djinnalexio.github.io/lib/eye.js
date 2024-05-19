// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: djinnalexio

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
            if (this.settingConnections) {
                this.settingConnections.forEach(connection => {
                    this.settings.disconnect(connection);
                });
                this.settingConnections = null;
            }

            // Destroy the button
            super.destroy();
        }
    }
);
//#endregion

//#region Creating/Destroying eyes
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

export function destroyEyes(eyeArray) {
    if (eyeArray.length > 0) {
        eyeArray.forEach(eye => {
            eye.destroy();
        });
        eyeArray.length = 0; // Or eyeArray = [];
    }
}
//#endregion
