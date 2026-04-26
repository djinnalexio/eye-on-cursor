// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BlinkController} from './lib/blinkController.js';
import {spawnEyes, destroyEyes} from './lib/eye.js';
import {TrackerManager} from './lib/trackerManager.js';
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

        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create eyes based on starting settings
        this.eyeArray = [];
        spawnEyes(this, this.eyeArray, this.mouseTracker);

        // Create the Blink controller
        this.blinkController = new BlinkController(this, this.eyeArray);

        // Connect eye placement settings
        this.placementSettings = [
            'eye-active',
            'eye-position',
            'eye-index',
            'eye-count',
        ];
        this.placementSettingHandlers = this.placementSettings.map((key) =>
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

        destroyEyes(this.eyeArray);
        this.eyeArray = null;

        this.mouseTracker.destroy();
        this.mouseTracker = null;

        this.blinkController.destroy();
        this.blinkController = null;

        this.settings = null;
    }
    //#endregion
}
