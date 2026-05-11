// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BlinkController} from './extensionModules/blinkController.js';
import {spawnEyes, destroyEyes} from './extensionModules/eye.js';
import {TrackerManager} from './extensionModules/trackerManager.js';
//#endregion

/**
 * The **Eye on Cursor** GNOME Shell extension.
 */
export default class EyeOnCursorExtension extends Extension {
    // DO NOT create objects, connect signals or add main loop sources here
    // constructor(metadata) {
    //     super(metadata);
    // }

    //#region Enable
    /**
     * Enables the extension.
     */
    enable() {
        this.settings = this.getSettings();

        // 28-apr-26: transition from hex code (v2.3.1 and earlier) to rgb values for color settings
        // convert user custom colors so that they fit the new expected format
        [
            'eye-color-iris',
            'eye-color-eyelid',
            'tracker-color-main',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
        ].forEach((key) => {
            const color = this.settings.get_string(key);
            if (color.startsWith('#')) {
                const rgbValue = `rgb(${[color.slice(1, 3), color.slice(3, 5), color.slice(5, 7)]
                    .map((value) => parseInt(value, 16)).join()})`;
                this.settings.set_string(key, rgbValue);
            }
        });

        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create eyes based on starting settings
        this.eyeArray = [];
        spawnEyes(this, this.eyeArray, this.mouseTracker);

        // Create the Blink controller
        this.blinkController = new BlinkController(this, this.eyeArray);

        // Connect eye placement settings
        this.placementSettingHandlers = [
            'eye-active',
            'eye-position',
            'eye-index',
            'eye-count',
        ].map((key) =>
            this.settings.connect(
                `changed::${key}`,
                spawnEyes.bind(this, this, this.eyeArray, this.mouseTracker)
            )
        );
    }
    //#endregion

    //#region Disable
    /**
     * Disables the extension.
     */
    disable() {
        this.placementSettingHandlers.forEach((connection) => this.settings.disconnect(connection));
        this.placementSettingHandlers = null;

        this.blinkController.destroy();
        this.blinkController = null;

        destroyEyes(this.eyeArray);
        this.eyeArray = null;

        this.mouseTracker.destroy();
        this.mouseTracker = null;

        this.settings = null;
    }
    //#endregion
}
