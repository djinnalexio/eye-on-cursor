// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
// import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

const BLINK_DURATION = 250; // TODO turn blink duration into a setting 0.2-2s
const DEBOUNCE_DELAY = 100;

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
        this.eyelidLevelIntervalAll = null;
        this.syncedRoutine = null;
        this.unsyncedDebounce = null;

        // Initialize settings values
        this.blinkMode = this.settings.get_string('eye-blink-mode');
        this.blinkInterval = this.settings.get_double('eye-blink-interval');
        this.blinkIntervalRange = this.settings.get_value('eye-blink-interval-range').deep_unpack();

        // Connect change in settings to update methods
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
        this.eyePlacementSettings = [
            'eye-position',
            'eye-index',
            'eye-count',
        ];
        this.eyePlacementSettings.forEach((key) => {
            this.settingsHandlers.push(
                this.settings.connect(`changed::${key}`, () => {
                    if (this.blinkMode === 'unsynced') {
                        // Debounce reset so that the eye array gets updated first
                        this.unsyncedDebounce = setTimeout(
                            () => {
                                this.stopUnsyncedBlink();
                                this.startUnsyncedBlink();
                            },
                            DEBOUNCE_DELAY
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
                if (this.blinkMode === 'manual')
                    this.blinkAll();
            }
        );

        this.selectBlinkMode();
    }
    //#endregion

    //#region Blink methods
    blinkAll() {
        const refreshRate = this.eyeArray[0].refreshRate;
        const blinkInterval = 1000 / refreshRate;
        const totalFrames = Math.ceil(refreshRate * (BLINK_DURATION / 1000));
        const halfFrames = totalFrames / 2;
        clearInterval(this.eyelidLevelIntervalAll);

        this.eyeArray.forEach((eye) => (eye.blinking = true));

        let currentFrame = 0;
        this.eyelidLevelIntervalAll = setInterval(() => {
            // Increment frame
            currentFrame++;

            // Calculate eyelid level based on if the animation is past the halfway point or not
            const eyelidLevel =
                currentFrame <= halfFrames
                    ? currentFrame / halfFrames // Closing
                    : 1 - ((currentFrame - halfFrames) / halfFrames); // Opening

            this.eyeArray.forEach((eye) => (eye.eyelidLevel = eyelidLevel));

            // Finishing
            if (currentFrame > totalFrames) {
                this.eyeArray.forEach((eye) => {
                    eye.eyelidLevel = 0;
                    eye.blinking = false;
                });
                clearInterval(this.eyelidLevelIntervalAll);
            }
        }, blinkInterval);
    }

    blinkSingle(eye) { // TODO Move to eye class
        const refreshRate = eye.refreshRate;
        const blinkInterval = 1000 / refreshRate;
        const totalFrames = Math.ceil(refreshRate * (BLINK_DURATION / 1000));
        const halfFrames = totalFrames / 2;

        clearInterval(eye.eyelidLevelInterval); // Interrupt current blink

        eye.blinking = true;

        let currentFrame = 0;
        eye.eyelidLevelInterval = setInterval(() => {
            // Increment frame
            currentFrame++;

            // Calculate eyelid level based on if the animation is past the halfway point or not
            const eyelidLevel =
                currentFrame <= halfFrames
                    ? currentFrame / halfFrames // Closing
                    : 1 - ((currentFrame - halfFrames) / halfFrames); // Opening

            eye.eyelidLevel = eyelidLevel;

            // Finishing
            if (currentFrame > totalFrames) {
                eye.eyelidLevel = 0;
                eye.blinking = false;
                clearInterval(eye.eyelidLevelInterval);
            }
        }, blinkInterval);
    }

    scheduleNextBlink(eye) {
        // Calculate a random interval to next blink
        const interval =
            this.blinkIntervalRange[0] +
            ((this.blinkIntervalRange[1] - this.blinkIntervalRange[0]) * Math.random());

        eye.randomBlinkTimeout = setTimeout(
            () => {
                this.blinkSingle(eye);
                this.scheduleNextBlink(eye);
            },
            1000 * interval
        );
    }
    //#endregion

    //#region Routine methods
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
        this.syncedRoutine = setInterval(
            this.blinkAll.bind(this),
            1000 * this.blinkInterval
        );
    }

    stopSyncedBlink() {
        clearInterval(this.syncedRoutine);
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
    //#endregion

    //#region Destroy method
    destroy() {
        // Clear any remaining timeouts
        this.stopSyncedBlink();
        this.stopUnsyncedBlink();
        clearInterval(this.eyelidLevelIntervalAll);
        clearTimeout(this.unsyncedDebounce);

        // Disconnect settings signal handlers
        this.settingsHandlers.forEach((connection) => this.settings.disconnect(connection));
        this.settingsHandlers = null;

        // Disconnect keybinding
        Main.wm.removeKeybinding('eye-blink-keybinding');

        // Drop settings objects
        this.settings = null;
    }
    //#endregion
}
