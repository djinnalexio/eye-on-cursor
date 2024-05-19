// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: djinnalexio

//#region Import libraries
///import Atspi from 'gi://Atspi';
///import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Eye} from './lib/eye.js';
import {TrackerManager} from './TrackerManager.js';
//#endregion

//#region Creating/Destroying eyes
function spawnEyes(eyeArray, settings, extensionObject, trackerManager) {
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

function destroyEyes(eyeArray) {
    if (eyeArray.length > 0) {
        eyeArray.forEach(eye => {
            eye.destroy();
        });
        eyeArray.length = 0; // Or eyeArray = [];
    }
}
//#endregion

//#region Launching extension
export default class EyeOnCursorExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /**
         * This class is constructed once when your extension is loaded, not
         * enabled.
         *
         * You MUST NOT make any changes to GNOME Shell, create any objects,
         * connect any signals or add any event sources here.
         *
         * Extensions **MAY** create and store a reasonable amount of static
         * data during initialization.
         *
         * @param {this} Extension - this extension object
         */

        this.settings = this.getSettings();
    }

    //#region Enable
    // Runs when the extension is enabled or the desktop session is logged in or unlocked
    // Create objects, connect signals and add main loop sources
    enable() {
        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create eyes based in starting settings
        this.eyeArray = [];
        spawnEyes(this.eyeArray, this.settings, this, this.mouseTracker);

        // Connect eye placement settings
        this.placementSettings = ['eye-position', 'eye-index', 'eye-count'];
        this.placementConnections = this.placementSettings.map(key =>
            this.settings.connect(
                `changed::${key}`,
                spawnEyes.bind(this, this.eyeArray, this.settings, this, this.mouseTracker)
            )
        );
    }
    //#endregion

    //#region Disable
    // Runs when the extension is disabled, uninstalled or the desktop session is exited or locked
    // Cleanup anything done in enable()
    disable() {
        if (this.placementConnections) {
            this.placementConnections.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.placementConnections = null;
        }

        if (this.eyeArray) {
            destroyEyes(this.eyeArray);
            this.eyeArray = null;
        }

        if (this.mouseTracker) {
            this.mouseTracker.destroy();
            this.mouseTracker = null;
        }

        this.settings = null;
    }
    //#endregion
}
//#endregion
