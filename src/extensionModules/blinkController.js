// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

const BLINK_CHANGE_DELAY = 100; // Make sure the eyeArray is created before starting blink routine
const EYE_ARRAY_SETTINGS = [
    'eye-active',
    'eye-count',
    'eye-index',
    'eye-position',
    'eye-blink-mode',
];

/**
 * An object that controls blinking actions for the Eye instances.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 */
export class BlinkController {
    //#region Constructor
    constructor(extension, eyeArray) {
        this.settings = extension.getSettings();

        // Attach eye array
        this.eyeArray = eyeArray;

        // Initialize state variables
        this.syncedRoutine = null;
        this.blinkChangeDelay = null;
        this.keybindingConnected = false;

        // Initialize settings values
        this.blinkMode = this.settings.get_string('eye-blink-mode');
        this.blinkInterval = this.settings.get_double('eye-blink-interval');
        this.blinkIntervalRange = this.settings.get_value('eye-blink-interval-range').deep_unpack();

        // Connect changes in eye array or blink mode settings to update methods
        this.settingsHandlers = EYE_ARRAY_SETTINGS.map((key) =>
            this.settings.connect(`changed::${key}`, () => {
            // Delay reset so that the eye array gets updated before blink routine
                clearTimeout(this.blinkChangeDelay);
                this.blinkChangeDelay = setTimeout(
                    this.startBlinkMode.bind(this),
                    BLINK_CHANGE_DELAY
                );
            })
        );

        // Connect routine-specific changes in settings to update methods
        this.settingsHandlers.push(
            this.settings.connect('changed::eye-blink-interval', () => {
                this.blinkInterval = this.settings.get_double('eye-blink-interval');
                this.startBlinkMode();
            }),
            this.settings.connect('changed::eye-blink-interval-range', () => {
                this.blinkIntervalRange = this.settings
                    .get_value('eye-blink-interval-range')
                    .deep_unpack();
                this.startBlinkMode();
            })
        );

        this.startBlinkMode();
    }
    //#endregion

    //#region Blink methods
    blinkAll() {
        if (this.eyeArray.length > 0) // Only trigger if there are eyes
            this.eyeArray.forEach((eye) => eye.blink());
    }

    scheduleNextBlink(eye) {
        // Calculate a random interval to next blink
        const interval =
            this.blinkIntervalRange[0] +
            ((this.blinkIntervalRange[1] - this.blinkIntervalRange[0]) * Math.random());

        eye.randomBlinkTimeout = setTimeout(
            () => {
                eye.blink();
                this.scheduleNextBlink(eye);
            },
            1000 * interval
        );
    }
    //#endregion

    //#region Routine methods
    //#region Start
    startBlinkMode() {
        this.stopCurrentMode();

        // Update blink mode
        this.blinkMode = this.settings.get_string('eye-blink-mode');

        if (this.eyeArray.length > 0) {
            switch (this.blinkMode) {
                case 'synced':
                    this.startSyncedBlink();
                    break;
                case 'unsynced':
                    this.startUnsyncedBlink();
                    break;
                case 'manual':
                    this.connectBlinkKeybinding();
                    break;
                default:
                    break;
            }
        }
    }
    //#endregion

    //#region Stop
    stopCurrentMode() {
        switch (this.blinkMode) {
            case 'synced':
                this.stopSyncedBlink();
                break;
            case 'unsynced':
                this.stopUnsyncedBlink();
                break;
            case 'manual':
                this.disconnectKeybinding();
                break;
            default:
                break;
        }
    }
    //#endregion

    //#region Synced
    startSyncedBlink() {
        this.syncedRoutine = setInterval(
            this.blinkAll.bind(this),
            1000 * this.blinkInterval
        );
    }

    stopSyncedBlink() {
        clearInterval(this.syncedRoutine);
        this.syncedRoutine = null;
    }
    //#endregion

    //#region Unsynced
    startUnsyncedBlink() {
        this.eyeArray.forEach((eye) => this.scheduleNextBlink(eye));
    }

    stopUnsyncedBlink() {
        this.eyeArray.forEach((eye) => clearTimeout(eye.randomBlinkTimeout));
    }
    //#endregion

    //#region Manual
    connectBlinkKeybinding() {
        Main.wm.addKeybinding(
            'eye-blink-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.blinkAll.bind(this)
        );

        this.keybindingConnected = true;
    }

    disconnectKeybinding() {
        if (this.keybindingConnected) {
            Main.wm.removeKeybinding('eye-blink-keybinding');
            this.keybindingConnected = false;
        }
    }
    //#endregion
    //#endregion

    //#region Destroy method
    destroy() {
        // Stop routines
        this.stopCurrentMode();

        // Clear any remaining timeouts
        clearTimeout(this.blinkChangeDelay);

        // Disconnect settings signal handlers
        this.settingsHandlers.forEach((connection) => this.settings.disconnect(connection));
        this.settingsHandlers = null;

        // Drop settings objects
        this.settings = null;
    }
    //#endregion
}
