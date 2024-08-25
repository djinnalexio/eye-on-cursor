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

import * as Timeout from './timeout.js';
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
        this.syncedRoutineID = {id: null};
        this.unsyncedRoutineDelayID = {id: null};

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
                if (this.blinkMode === 'synced') {
                    this.stopSyncedBlink();
                    this.startSyncedBlink();
                }
            }),
            this.settings.connect('changed::eye-blink-interval-range', () => {
                this.blinkIntervalRange = this.settings
                    .get_value('eye-blink-interval-range')
                    .deep_unpack();
                if (this.blinkMode === 'unsynced') {
                    this.stopUnsyncedBlink();
                    this.startUnsyncedBlink();
                }
            }),
        ];

        // Restart Unsynced routine if eye array changes
        this.eyePlacementSettings = ['eye-position', 'eye-index', 'eye-count'];
        this.eyePlacementSettings.forEach(key => {
            this.settingsHandlers.push(
                this.settings.connect(`changed::${key}`, () => {
                    if (this.blinkMode === 'unsynced') {
                        this.stopUnsyncedBlink();
                        // Adding a delay so that the eye array gets updated first
                        Timeout.setTimeout(
                            this.unsyncedRoutineDelayID,
                            this.startUnsyncedBlink.bind(this),
                            100
                        );
                    }
                })
            );
        });

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
        this.stopSyncedBlink();
        this.stopUnsyncedBlink();

        switch (this.blinkMode) {
            case 'synced':
                this.startSyncedBlink();
                break;
            case 'unsynced':
                this.startUnsyncedBlink();
                break;
            case 'manual':
            default:
                break;
        }
    }

    //#region Synced
    startSyncedBlink() {
        Timeout.setInterval(
            this.syncedRoutineID,
            this.blinkAll.bind(this),
            1000 * this.blinkInterval
        );
    }

    stopSyncedBlink() {
        Timeout.clearInterval(this.syncedRoutineID);
    }
    //#endregion

    //#region Unsynced
    startUnsyncedBlink() {
        this.eyeArray.forEach(eye => {
            this.scheduleNextBlink(eye);
        });
    }

    stopUnsyncedBlink() {
        this.eyeArray.forEach(eye => {
            Timeout.clearTimeout(eye.randomBlinkTimeoutID);
        });
    }

    scheduleNextBlink(eye) {
        const interval =
            this.blinkIntervalRange[0] +
            (this.blinkIntervalRange[1] - this.blinkIntervalRange[0]) * Math.random();

        eye.randomBlinkTimeoutID.id = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            1000 * interval,
            () => {
                eye.blink(this);
                this.scheduleNextBlink(eye);
                return GLib.SOURCE_REMOVE;
            }
        );
    }
    //#endregion
    //#endregion

    //#region Destroy function
    destroy() {
        this.stopSyncedBlink();
        this.stopUnsyncedBlink();

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
