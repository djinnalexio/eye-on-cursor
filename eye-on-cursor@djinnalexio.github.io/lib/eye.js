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
        constructor(extensionObject) {
            super(0, 'Eye.' + extensionObject.uuid, false);

            // Get extension object properties
            this.metadata = extensionObject.metadata;
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            // Get starting configuration
            this.trackerShape = this.settings.get_string('tracker-shape');

            // Do stuff
            this.add_child(
                new St.Icon({
                    gicon: Gio.icon_new_for_string(`${this.path}/media/eye-on-cursor-logo.svg`),
                    style_class: 'system-status-icon',
                })
            );

            //#region add popups
            const trackerPopup = new PopupMenu.PopupImageMenuItem(
                _('Toggle Tracker'),
                'view-reveal-symbolic'
            );
            this.menu.addMenuItem(trackerPopup);
            trackerPopup.connect('activate', () =>
                Main.notify(_('Tracker Toggled'), _('You toggled the tracker!'))
            );

            const prefsPopup = new PopupMenu.PopupImageMenuItem(
                _('Settings'),
                'org.gnome.Settings-symbolic'
            );
            this.menu.addMenuItem(prefsPopup);
            prefsPopup.connect('activate', () => extensionObject.openPreferences());
            //#endregion
        }
    }
);
//#endregion
