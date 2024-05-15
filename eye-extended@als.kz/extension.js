// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the Eye and Mouse Extended GNOME extension.

//#region Import libraries
import GLib from 'gi://GLib';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Eye} from './lib/eye.js';
//#endregion

//#region Creating/Destroying eyes
function spawnEyes(eyeArray, settings, extensionObject) {
    // Remove current eyes
    destroyEyes(eyeArray);

    for (let count = 0; count < settings.get_int('eye-count'); count++) {
        eyeArray.push(new Eye(extensionObject));
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

//#region Defining Tracker
//const Tracker = GObject.registerClass(class Tracker extends St.Icon {});

//#region Tracker functions
// Create/return a cache directory for colored trackers
function getCacheDir(uuid) {
    const cacheDir = `${GLib.get_user_cache_dir()}/${uuid}/trackers`;
    if (GLib.mkdir_with_parents(cacheDir, 0o755) < 0)
        throw new Error(`Failed to create cache dir at ${cacheDir}`);
    return cacheDir;
}

function createCacheTracker(shape, color, cacheDir) {
    console.debug('Working on color ' + color);
    const cachedSVGpath = `${cacheDir}/${shape}_${color}.svg`;
    console.debug('SVG path: ' + cachedSVGpath);
    /* const cachedSVG = Gio.File.new_for_path(cachedSVGpath);
    if (!cachedSVG.query_exists(null)) {
        cachedSVG.create(Gio.FileCreateFlags.NONE, null);
        console.debug('Created cache icon: ' + cachedSVGpath);
    } else {
        console.debug('Got cache icon: ' + cachedSVGpath);
    } */
}
//#endregion
//#endregion

//#region Launching extension
export default class EyeExtendedExtension extends Extension {
    constructor(metadata) {
        super(metadata);
        /**
         * This class is constructed once when your extension is loaded, not
         * enabled. This is a good time to setup translations or anything else you
         * only do once.
         *
         * You MUST NOT make any changes to GNOME Shell, create any objects,
         * connect any signals or add any event sources here.
         *
         * Extensions **MAY** create and store a reasonable amount of static
         * data during initialization.
         *
         * @param {this} Extension - this extension object
         */
    }

    //#region Enable
    // Runs when the extension is enabled or the desktop session is logged in or unlocked
    // Create objects, connect signals and add main loop sources
    enable() {
        this.settings = this.getSettings();

        // Create initial eyes
        this.eyeArray = [];
        spawnEyes(this.eyeArray, this.settings, this);

        // Connect eye placement settings
        this.placementSettings = ['eye-position', 'eye-index', 'eye-count'];
        this.placementSettings.forEach(key => {
            this.settings.connect(
                `changed::${key}`,
                spawnEyes.bind(this, this.eyeArray, this.settings, this)
            );
        });

        // Create initial cached tracker icons and connect tracker color settings
        this.cacheDir = getCacheDir(this.uuid);
        this.trackerShape = this.settings.get_string('tracker-shape');
        this.trackerColorSettings = [
            'tracker-color',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
        ];
        this.trackerColorSettings.forEach(key => {
            // Create initial cached tracker icons
            createCacheTracker(this.trackerShape, this.settings.get_string(key), this.cacheDir);
            // Connect tracker color settings
            this.settings.connect(
                `changed::${key}`,
                createCacheTracker.bind(
                    this,
                    this.trackerShape,
                    this.settings.get_string(key),
                    this.cacheDir
                )
            );
        });

        //this.mouseTracker = new Tracker(this.settings, this);
    }
    //#endregion

    //#region Disable
    // Runs when the extension is disabled, uninstalled or the desktop session is exited or locked
    // Cleanup anything done in enable()
    disable() {
        destroyEyes(this.eyeArray);
        this.settings = null;
    }
    //#endregion
}
//#endregion
