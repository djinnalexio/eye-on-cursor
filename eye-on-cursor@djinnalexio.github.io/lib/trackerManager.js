/*
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
 */
'use strict';

//#region Import libraries
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

//#region Defining Tracker
export class TrackerManager {
    //#region Constructor
    constructor(extensionObject) {
        // Get extension object properties
        this.path = extensionObject.path;
        this.settings = extensionObject.getSettings();

        this.settingConnections = [];

        // Variables for initial state
        this.cacheDir = this.getCacheDir(extensionObject.metadata['gettext-domain']);
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
        this.trackerSettings = [
            'tracker-shape',
            'tracker-size',
            'tracker-color',
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
            'tracker-opacity',
        ];
        this.trackerSettings.forEach(key => {
            this.settingConnections.push(
                this.settings.connect(`changed::${key}`, this.updateTrackerProperties.bind(this))
            );
        });

        this.settingConnections.push(
            this.settings.connect(
                `changed::tracker-repaint-interval`,
                this.updateRepaintInterval.bind(this)
            )
        );

        // Connect toggle tracker shortcut
        Main.wm.addKeybinding(
            'tracker-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.toggleTracker.bind(this)
        );
    }
    //#endregion

    //#region Cache icons functions
    // Create/return a cache directory for colored trackers
    getCacheDir(gettext_domain) {
        const cacheDirPath = `${GLib.get_user_cache_dir()}/${gettext_domain}/trackers`;
        try {
            if (!GLib.file_test(cacheDirPath, GLib.FileTest.IS_DIR)) {
                GLib.mkdir_with_parents(cacheDirPath, 0o755); // 'rwx' permissions for user, 'r_x' for others
            }
        } catch (e) {
            throw new Error(`Failed to create cache dir at ${cacheDirPath}: ${e.message}`);
        }
        return cacheDirPath;
    }

    // Update cached tracker for all colors
    updateCacheTrackers() {
        // Create a cached tracker icon if it doesn't exist
        function createCacheTracker(shape, color, cacheDir, path) {
            const cachedSVGpath = `${cacheDir}/${shape}_${color}.svg`;
            const cachedSVG = Gio.File.new_for_path(cachedSVGpath);
            if (!cachedSVG.query_exists(null)) {
                try {
                    // Create empty file
                    cachedSVG.create(Gio.FileCreateFlags.NONE, null);

                    // Get template SVG
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

                    // Fill cachedSVG with modified contents
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
    //#endregion

    //#region Settings update functions
    updateTrackerProperties() {
        // Update properties
        this.currentShape = this.settings.get_string('tracker-shape');
        this.currentSize = this.settings.get_int('tracker-size');
        this.currentColor = this.settings.get_string('tracker-color');
        this.currentOpacity = this.settings.get_int('tracker-opacity');

        // Update cached icons
        this.updateCacheTrackers();

        // Update icon
        this.trackerIcon.icon_size = this.currentSize;
        this.trackerIcon.opacity = this.currentOpacity;
        this.trackerIcon.gicon = Gio.icon_new_for_string(
            `${this.cacheDir}/${this.currentShape}_${this.currentColor}.svg`
        );
    }

    updateRepaintInterval() {
        this.currentRepaintInterval = this.settings.get_int('tracker-repaint-interval');

        // If the position updater is currently running, stop it and start a new one with the updated interval
        if (this.trackerPositionUpdater) {
            GLib.source_remove(this.trackerPositionUpdater);
            this.trackerPositionUpdater = null;
            this.trackerPositionUpdater = GLib.timeout_add(
                GLib.PRIORITY_DEFAULT,
                this.currentRepaintInterval,
                () => {
                    this.updateTrackerPosition();
                    return GLib.SOURCE_CONTINUE;
                }
            );
        }
    }
    //#endregion

    // Set tracker position to mouse position
    updateTrackerPosition() {
        if (this.trackerIcon) {
            const [mouse_x, mouse_y] = global.get_pointer();
            this.trackerIcon.set_position(
                mouse_x - this.currentSize / 2,
                mouse_y - this.currentSize / 2
            ); // Offset so that the cursor appears in the middle of the tracker
        }
    }

    //#region Toggle tracker functions
    toggleTracker() {
        if (!this.trackerEnabled) {
            this.enableTracker();
        } else {
            this.disableTracker();
        }
    }

    enableTracker() {
        this.trackerEnabled = true;

        // Start updating the tracker position at regular intervals
        this.trackerPositionUpdater = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.currentRepaintInterval,
            () => {
                this.updateTrackerPosition();
                return GLib.SOURCE_CONTINUE;
            }
        );

        // Add tracker to desktop
        Main.uiGroup.add_child(this.trackerIcon);
    }

    disableTracker() {
        this.trackerEnabled = false;

        // Remove tracker from desktop
        if (this.trackerIcon && this.trackerIcon.get_parent() === Main.uiGroup) {
            Main.uiGroup.remove_child(this.trackerIcon);
        }

        // Stop updating the tracker position
        if (this.trackerPositionUpdater) {
            GLib.source_remove(this.trackerPositionUpdater);
            this.trackerPositionUpdater = null;
        }
    }
    //#endregion

    //#region Destroy function
    // Clean up any connections or resources when the tracker manager is destroyed
    destroy() {
        if (this.settingConnections) {
            this.disableTracker();
            this.settingConnections.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.settingConnections = null;
        }

        Main.wm.removeKeybinding('tracker-keybinding');

        if (this.trackerIcon) {
            this.trackerIcon.destroy();
            this.trackerIcon = null;
        }
    }
    //#endregion
}
