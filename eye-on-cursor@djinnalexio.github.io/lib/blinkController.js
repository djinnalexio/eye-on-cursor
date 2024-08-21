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
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
//#endregion

//#region Constants
const BLINK_SETTINGS = ['eye-blink-mode', 'eye-blink-interval', 'eye-blink-interval-range'];
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

        // Initialize settings values
        this.blinkMode = this.settings.get_string('eye-blink-mode');
        this.blinkInterval = this.settings.get_double('eye-blink-interval');
        this.blinkIntervalRange = this.settings.get_value('eye-blink-interval-range').deep_unpack();

        // Connect blinking shortcut
        Main.wm.addKeybinding(
            'eye-blink-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.manualBLink.bind(this)
        );

        // Connect change in settings to update function
        this.settingsHandlers = BLINK_SETTINGS.map(key =>
            this.settings.connect(`changed::${key}`, this.updateBlinkProperties.bind(this))
        );
    }
    //#endregion

    //#region manual blink function
    manualBLink() {
        if (this.blinkMode === 'manual') this.eyeArray.forEach(eye => eye.blink());
    }

    //#region Properties update functions
    updateBlinkProperties() {
        const newBlinkMode = this.settings.get_string('eye-blink-mode');
        const newBlinkInterval = this.settings.get_double('eye-blink-interval');
        const newBlinkIntervalRange = this.settings
            .get_value('eye-blink-interval-range')
            .deep_unpack();

        // Update blinking mode
        if (this.blinkMode !== newBlinkMode) {
            this.blinkMode = newBlinkMode;
        }

        // Update synced blinking interval
        if (this.blinkInterval !== newBlinkInterval) {
            this.blinkInterval = newBlinkInterval;
        }

        // Update unsynced blinking interval range
        if (this.blinkIntervalRange !== newBlinkIntervalRange) {
            // FIXME find how to properly compare arrays
            this.blinkIntervalRange = newBlinkIntervalRange;
            console.debug('Updated unsynced interval to ' + this.blinkIntervalRange);
        }
    }
    //#endregion

    //#region Destroy function
    destroy() {
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
