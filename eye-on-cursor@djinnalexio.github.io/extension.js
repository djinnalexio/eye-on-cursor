// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: djinnalexio

//#region Import libraries
///import Atspi from 'gi://Atspi';
///import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import {Eye} from './lib/eye.js';
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

//#region Defining Tracker
class TrackerManager {
    constructor(extensionObject) {
        // Get extension object properties
        this.path = extensionObject.path;
        this.settings = extensionObject.getSettings();

        // Variables for initial state
        this.cacheDir = this.getCacheDir(extensionObject.uuid);
        this.trackerEnabled = false;
        this.trackerPositionUpdater = null;

        this.currentShape = this.settings.get_string('tracker-shape');
        this.currentSize = this.settings.get_int('tracker-size');
        this.currentColor = this.settings.get_string('tracker-color');
        this.currentOpacity = this.settings.get_int('tracker-opacity');
        this.currentRepaintInterval = this.settings.get_int('tracker-repaint-interval');

        this.trackerIcon = new St.Icon({
            reactive: false,
            can_focus: false,
            track_hover: false,
            icon_size: this.currentSize,
            opacity: this.currentOpacity,
            gicon: Gio.icon_new_for_string(
                `${this.cacheDir}/${this.currentShape}_${this.currentColor}.svg`
            ),
        });

        // Create tracker icons in cache based on the initial settings
        this.updateCacheTrackers();

        // Connect settings changes to update cached trackers
        this.settingConnections = [];
        this.trackerSettings = [
            'tracker-shape',
            'tracker-size',
            'tracker-color',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
            'tracker-opacity',
            'tracker-repaint-interval',
        ];
        this.trackerSettings.forEach(key => {
            this.settingConnections.push(
                this.settings.connect(`changed::${key}`, this.updateTrackerProperties.bind(this))
            );
        });
    }

    // Create/return a cache directory for colored trackers
    getCacheDir(uuid) {
        const cacheDir = `${GLib.get_user_cache_dir()}/${uuid}/trackers`;
        try {
            if (!GLib.file_test(cacheDir, GLib.FileTest.IS_DIR)) {
                GLib.mkdir_with_parents(cacheDir, 0o755); // 'rwx' permissions for user, 'r_x' for others
            }
        } catch (e) {
            throw new Error(`Failed to create cache dir at ${cacheDir}: ${e.message}`);
        }
        return cacheDir;
    }

    // Update cached tracker for all colors
    updateCacheTrackers() {
        // Create a cached tracker icon if it doesn't exist
        function createCacheTracker(shape, color, cacheDir, path) {
            const cachedSVGpath = `${cacheDir}/${shape}_${color}.svg`;
            const cachedSVG = Gio.File.new_for_path(cachedSVGpath);
            if (!cachedSVG.query_exists(null)) {
                try {
                    cachedSVG.create(Gio.FileCreateFlags.NONE, null);

                    const shapeSVG = Gio.File.new_for_path(`${path}/media/glyphs/${shape}.svg`);

                    // Load contents of the shape SVG
                    const [, contents] = shapeSVG.load_contents(null);

                    // Decode SVG contents
                    const decoder = new TextDecoder();
                    let decodedContents = decoder.decode(contents);

                    // Replace color in SVG contents
                    decodedContents = decodedContents.replace('#000000', color);

                    // Encode SVG contents back to bytes
                    const encoder = new TextEncoder();
                    const encodedContents = encoder.encode(decodedContents);

                    // Replace contents of cached SVG with modified contents
                    cachedSVG.replace_contents(
                        encodedContents,
                        null,
                        false,
                        Gio.FileCreateFlags.REPLACE_DESTINATION,
                        null
                    );
                } catch (e) {
                    throw new Error(
                        `Failed to create cache tracker at ${cachedSVGpath}: ${e.message}`
                    );
                }
            }
        }

        this.trackerColorSettings = [
            'tracker-color',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
        ];
        this.trackerColorSettings.forEach(key => {
            const color = this.settings.get_string(key);
            createCacheTracker(this.currentShape, color, this.cacheDir, this.path);
        });
    }

    // Set tracker position to mouse position
    updateTrackerPosition() {
        if (this.trackerIcon) {
            const [mouse_x, mouse_y] = global.get_pointer();
            this.trackerIcon.set_position(
                mouse_x - this.currentSize / 2,
                mouse_y - this.currentSize / 2
            ); // Offset so that the cursor appears in the middle of the tracker
        }

        /*         this.trackerPositionUpdater = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.currentRepaintInterval,
            this.updateTrackerPosition.bind(this)
        );

        return GLib.SOURCE_CONTINUE; */
    }

    updateTrackerProperties() {
        // Update properties
        this.currentShape = this.settings.get_string('tracker-shape');
        this.currentSize = this.settings.get_int('tracker-size');
        this.currentColor = this.settings.get_string('tracker-color');
        this.currentOpacity = this.settings.get_int('tracker-opacity');
        this.currentRepaintInterval = this.settings.get_int('tracker-repaint-interval');

        // Update cached icons
        this.updateCacheTrackers();

        // Update icon
        this.trackerIcon.icon_size = this.currentSize;
        this.trackerIcon.opacity = this.currentOpacity;
        this.trackerIcon.gicon = Gio.icon_new_for_string(
            `${this.cacheDir}/${this.currentShape}_${this.currentColor}.svg`
        );
    }

    toggleTracker() {
        if (!this.trackerEnabled) {
            this.enableTracker();
        } else {
            this.disableTracker();
        }
    }

    enableTracker() {
        this.trackerEnabled = true;

        this.trackerPositionUpdater = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.currentRepaintInterval,
            this.updateTrackerPosition.bind(this)
        );

        Main.uiGroup.add_child(this.trackerIcon);
    }

    disableTracker() {
        this.trackerEnabled = false;

        if (this.trackerPositionUpdater) {
            GLib.Source.remove(this.trackerPositionUpdater);
            this.trackerPositionUpdater = null;
        }

        if (this.trackerIcon && this.trackerIcon.get_parent() === Main.uiGroup) {
            Main.uiGroup.remove_child(this.trackerIcon);
        }

        // DESTROY THE LOOP HERE
    }

    // Clean up any connections or resources when the tracker manager is destroyed
    destroy() {
        this.disableTracker();

        if (this.trackerIcon) {
            this.trackerIcon.destroy();
            this.trackerIcon = null;
        }

        if (this.settingConnections) {
            this.settingConnections.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.settingConnections = null;
        }
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
    }

    //#region Enable
    // Runs when the extension is enabled or the desktop session is logged in or unlocked
    // Create objects, connect signals and add main loop sources
    enable() {
        this.settings = this.getSettings();

        // Create the tracker
        this.mouseTracker = new TrackerManager(this);

        // Create initial eyes
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
        if (this.eyeArray) {
            destroyEyes(this.eyeArray);
            this.eyeArray = null;
        }

        if (this.placementConnections) {
            this.placementConnections.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.placementConnections = null;
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
