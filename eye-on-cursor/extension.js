/* extension.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024-2025 djinnalexio
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
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BlinkController} from './lib/blinkController.js';
import {spawnEyes, destroyEyes} from './lib/eye.js';
import {TrackerManager} from './lib/trackerManager.js';
//#endregion

//#region Launching extension
export default class EyeOnCursorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /**
         * Runs when your extension is loaded, not enabled.
         *
         * DO NOT make any changes to GNOME Shell, create any objects, connect any signals
         * or add any event sources here.
         *
         * Extensions **MAY** create and store a reasonable amount of static data
         * during initialization.
         */
    }

    //#region Enable
    // Runs when the extension is enabled or the desktop session is logged in or unlocked
    // Create objects, connect signals and add main loop sources
    enable() {
        this.settings = this.getSettings();

        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create eyes based in starting settings
        this.eyeArray = [];
        spawnEyes(this, this.eyeArray, this.mouseTracker);

        // Create the Blink controller
        this.blinkController = new BlinkController(this, this.eyeArray);

        // Connect eye placement settings
        this.placementSettings = ['eye-position', 'eye-index', 'eye-count'];
        this.placementSettingHandlers = this.placementSettings.map(key =>
            this.settings.connect(
                `changed::${key}`,
                spawnEyes.bind(this, this, this.eyeArray, this.mouseTracker)
            )
        );
    }
    //#endregion

    //#region Disable
    // Runs when the extension is disabled, uninstalled or the desktop session is exited or locked
    // Cleanup anything done in enable()
    disable() {
        this.placementSettingHandlers?.forEach(connection => this.settings.disconnect(connection));
        this.placementSettingHandlers = null;

        destroyEyes(this.eyeArray);
        this.eyeArray = null;

        this.mouseTracker?.destroy();
        this.mouseTracker = null;

        this.blinkController?.destroy();
        this.blinkController = null;

        this.settings = null;
    }
    //#endregion
}
//#endregion
