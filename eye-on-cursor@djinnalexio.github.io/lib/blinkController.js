/* blinkController.js
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
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//#endregion

//#region Define Blinking Controller
export class BlinkController {
    /**
     * Creates an instance of BlinkController, which controls blinking functions.
     *
     * @param {Extension} extensionObject - The extension object.
     * @param {Array} eyeArray - The array of eye objects.
     */

    //#region Constructor
    constructor(extensionObject, eyeArray) {
        // Get extension object properties
        this.settings = extensionObject.settings;

        // Attach eye array
        this.eyeArray = eyeArray;

        // Initialize state variables
        this.syncedBlinkRoutineID = null;

        // Initialize settings values
        this.blinkMode = this.settings.get_string('eye-blink-mode');
        this.blinkInterval = this.settings.get_double('eye-blink-interval');
        this.blinkIntervalRange = this.settings.get_value('eye-blink-interval-range').deep_unpack();

        // Connect change in settings to update functions
        this.settingsHandlers = [
            this.settings.connect('changed::eye-blink-mode', () => {
                this.blinkMode = this.settings.get_string('eye-blink-mode');
                this.selectBlinkMode();
            }),
            this.settings.connect('changed::eye-blink-interval', () => {
                this.blinkInterval = this.settings.get_double('eye-blink-interval');
                if (this.blinkMode === 'synced') this.startSyncedBlink();
            }),
            this.settings.connect('changed::eye-blink-interval-range', () => {
                this.blinkIntervalRange = this.settings
                    .get_value('eye-blink-interval-range')
                    .deep_unpack();
                // restart unsynced routine
            }),
        ];

        // Connect blinking shortcut
        Main.wm.addKeybinding(
            'eye-blink-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            () => {
                if (this.blinkMode === 'manual') this.blinkAll();
            }
        );

        this.selectBlinkMode();
    }
    //#endregion

    //#region Blink functions
    blinkAll() {
        this.eyeArray.forEach(eye => eye.blink());
    }

    selectBlinkMode() {
        this.clearTimeout(this.syncedBlinkRoutineID);
        // stop unsynced blinking

        switch (this.blinkMode) {
            case 'synced':
                this.startSyncedBlink();
                break;
            case 'unsynced':
                break;
            case 'manual':
            default:
                break;
        }
    }

    startSyncedBlink() {
        this.clearTimeout(this.syncedBlinkRoutineID);

        this.syncedBlinkRoutineID = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            1000 * this.blinkInterval,
            () => {
                this.blinkAll();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    clearTimeout(timeout) {
        if (timeout) {
            GLib.source_remove(timeout);
        }
        timeout = null;
    }
    //#endregion

    //#region Destroy function
    destroy() {
        this.clearTimeout(this.syncedBlinkRoutineID);

        // Disconnect settings signal handlers
        this.settingsHandlers?.forEach(connection => {
            this.settings.disconnect(connection);
        });
        this.settingsHandlers = null;

        // Disconnect keybinding
        Main.wm.removeKeybinding('tracker-keybinding');

        // Disconnect settings
        this.settings = null;
    }
    //#endregion
}
//#endregion
