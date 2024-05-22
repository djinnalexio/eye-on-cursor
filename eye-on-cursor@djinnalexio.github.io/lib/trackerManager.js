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
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
'use strict';

//#region Import libraries
import Atspi from 'gi://Atspi';
import Clutter from 'gi://Clutter';
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
        this.gettext_domain = extensionObject.metadata['gettext-domain'];
        this.path = extensionObject.path;
        this.settings = extensionObject.getSettings();
        this.gdkBackend = this.getBackend();

        // Variables for initial state
        this.trackerEnabled = false;
        this.currentPositionX = null;
        this.currentPositionY = null;
        this.trackerPositionUpdater = null;

        this.currentShape = this.settings.get_string('tracker-shape');
        this.currentSize = this.settings.get_int('tracker-size');
        this.currentColor = this.settings.get_string('tracker-color');
        this.currentColorLeft = this.settings.get_string('tracker-color-left');
        this.currentColorMiddle = this.settings.get_string('tracker-color-middle');
        this.currentColorRight = this.settings.get_string('tracker-color-right');
        this.currentOpacity = this.settings.get_int('tracker-opacity');
        this.currentRepaintInterval = this.settings.get_int('tracker-repaint-interval');

        // Create tracker icons in cache based on the initial settings
        this.cacheDir = this.getCacheDir(this.gettext_domain);
        this.updateCacheTrackers(this.currentShape, [
            this.currentColor,
            this.currentColorLeft,
            this.currentColorMiddle,
            this.currentColorRight,
        ]);

        // Create the tracker
        this.trackerIcon = new St.Icon({
            reactive: false,
            can_focus: false,
            track_hover: false,
        });
        this.trackerIcon.icon_size = this.currentSize;
        this.trackerIcon.opacity = Math.ceil(this.currentOpacity * 2.55); // Go from 0-100 to 0-255 range
        this.updateTrackerIcon(this.currentShape, this.currentColor);

        // Connect change in settings to update function
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
        this.settingConnections = [];
        this.trackerSettings.forEach(key => {
            this.settingConnections.push(
                this.settings.connect(`changed::${key}`, this.updateTrackerProperties.bind(this))
            );
        });

        // Connect toggle tracker shortcut
        Main.wm.addKeybinding(
            'tracker-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.toggleTracker.bind(this)
        );

        // Set up mouse click highlighting depending on display server
        this.capturedEvent = null;
        this.mouseListener = null;

        this.activeClick = null;
        this.clickMaxTimeoutID = null;
        this.clickResetPending = false;
        this.clickDebounce = 50; // Min delay to stop highlighting after receiving BUTTON RELEASED signal
        this.clickMaxTimeout = 3000; // Max duration before highlighting is stopped without receiving BUTTON RELEASED signal
        // For cases where the BUTTON RELEASED signal never arrives

        if (this.gdkBackend === 'x11') {
            Atspi.init();
        }
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
    updateCacheTrackers(shape, colorArray) {
        // Check cacheDir
        this.cacheDir = this.getCacheDir(this.gettext_domain);

        colorArray.forEach(color => {
            createCacheTracker(color, this.cacheDir, this.path);
        });

        // Create a cached tracker icon if it doesn't exist
        function createCacheTracker(color, cacheDir, path) {
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
    }
    //#endregion

    //#region Properties update functions
    updateTrackerProperties() {
        // Get new settings
        const newShape = this.settings.get_string('tracker-shape');
        const newSize = this.settings.get_int('tracker-size');
        const newColor = this.settings.get_string('tracker-color');
        const newColorLeft = this.settings.get_string('tracker-color-left');
        const newColorMiddle = this.settings.get_string('tracker-color-middle');
        const newColorRight = this.settings.get_string('tracker-color-right');
        const newOpacity = this.settings.get_int('tracker-opacity');
        const newRepaintInterval = this.settings.get_int('tracker-repaint-interval');

        // Update cache if shape or any color has changed
        if (
            this.currentShape !== newShape ||
            this.currentColor !== newColor ||
            this.currentColorLeft !== newColorLeft ||
            this.currentColorMiddle !== newColorMiddle ||
            this.currentColorRight !== newColorRight
        ) {
            this.updateCacheTrackers(newShape, [
                newColor,
                newColorLeft,
                newColorMiddle,
                newColorRight,
            ]);
        }

        // Update current tracker if shape or main color has changed
        if (this.currentShape !== newShape || this.currentColor !== newColor) {
            this.updateTrackerIcon(newShape, newColor);
        }

        if (this.currentSize !== newSize) {
            this.trackerIcon.icon_size = newSize;
        }

        if (this.currentOpacity !== newOpacity) {
            this.trackerIcon.opacity = Math.ceil(newOpacity * 2.55); // Go from 0-100 to 0-255 range
        }

        // If the position updater is currently running, stop it and start a new one with the updated interval
        if (this.currentRepaintInterval !== newRepaintInterval && this.trackerPositionUpdater) {
            this.stopPositionUpdater();
            this.startPositionUpdater(newRepaintInterval);
        }

        // Update variables
        this.currentShape = newShape;
        this.currentSize = newSize;
        this.currentColor = newColor;
        this.currentColorLeft = newColorLeft;
        this.currentColorMiddle = newColorMiddle;
        this.currentColorRight = newColorRight;
        this.currentOpacity = newOpacity;
        this.currentRepaintInterval = newRepaintInterval;
    }

    // Change tracker icon
    updateTrackerIcon(shape, color) {
        this.trackerIcon.gicon = Gio.icon_new_for_string(`${this.cacheDir}/${shape}_${color}.svg`);
    }
    //#endregion

    //#region Position updater functions
    startPositionUpdater(interval) {
        this.trackerPositionUpdater = GLib.timeout_add(GLib.PRIORITY_DEFAULT, interval, () => {
            this.updateTrackerPosition();
            return GLib.SOURCE_CONTINUE;
        });
    }

    stopPositionUpdater() {
        if (this.trackerPositionUpdater) {
            GLib.source_remove(this.trackerPositionUpdater);
            this.trackerPositionUpdater = null;
        }
    }

    // Set tracker position to mouse position
    updateTrackerPosition() {
        if (this.trackerIcon) {
            // Get mouse coordinates
            const [mouseX, mouseY] = global.get_pointer();

            // Offset so that the cursor appears in the center of the tracker
            const newPositionX = mouseX - this.currentSize / 2;
            const newPositionY = mouseY - this.currentSize / 2;

            // If mouse has moved, update icon position
            if (this.currentPositionX !== newPositionX || this.currentPositionY !== newPositionY) {
                this.trackerIcon.set_position(newPositionX, newPositionY);
                // Update last recorded position
                [this.currentPositionX, this.currentPositionY] = [newPositionX, newPositionY];
            }
        }
    }
    //#endregion

    //#region Mouse click event functions
    getBackend() {
        if (Meta.is_wayland_compositor()) {
            return 'wayland';
        } else {
            return 'x11';
        }
    }

    // Using `global.stage` to monitor mouse clicks on Wayland
    // While it works on both x11 and Wayland, signals are only caught on the desktop and Shell
    onCapturedEvent(actor, event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const button = event.get_button();
            switch (button) {
                case 1:
                    this.handleButtonPress(button, this.currentColorLeft);
                    break;
                case 2:
                    this.handleButtonPress(button, this.currentColorMiddle);
                    break;
                case 3:
                    this.handleButtonPress(button, this.currentColorRight);
                    break;
                default:
                    return;
            }
        } else if (event.type() === Clutter.EventType.BUTTON_RELEASE) {
            const button = event.get_button();
            this.handleButtonRelease(button);
        }
    }

    // Using `Atspi.EventListener` to monitor clicks on X11
    // works on X11, but not at all on Wayland, and middle click is not registered
    onMouseEvent(event) {
        // Match button presses and releases
        const match = event.type.match(/mouse:button:(\d)([pr])/);
        if (match) {
            const button = parseInt(match[1], 10);
            const action = match[2];
            if (action === 'p') {
                // Button presses
                switch (button) {
                    case 1:
                        this.handleButtonPress(button, this.currentColorLeft);
                        break;
                    case 2:
                        this.handleButtonPress(button, this.currentColorMiddle);
                        break;
                    case 3:
                        this.handleButtonPress(button, this.currentColorRight);
                        break;
                    default:
                        return;
                }
            } else if (action === 'r') {
                // Button releases
                this.handleButtonRelease(button);
            }
        }
    }

    //#region Handle click functions
    handleButtonPress(button, color) {
        // Clear any existing timeout if a new button press occurs
        if (this.clickMaxTimeoutID) {
            clearTimeout(this.clickMaxTimeoutID);
            this.clickMaxTimeoutID = null;
        }

        // Update the tracker icon with the new color
        this.updateTrackerIcon(this.currentShape, color);

        // Set the active button
        this.activeClick = button;
        this.clickResetPending = false;

        // Set a maximum timeout to revert the color
        this.clickMaxTimeoutID = setTimeout(() => {
            this.resetColor();
        }, this.clickMaxTimeout);
    }

    handleButtonRelease(button) {
        // Debounce the release event
        setTimeout(() => {
            // Only reset if no new click event has occurred in the meantime
            if (this.activeClick === button && this.clickResetPending) {
                this.resetColor();
            }
        }, this.clickDebounce);

        this.clickResetPending = true;
    }

    resetColor() {
        // Reset the tracker icon to the default color
        this.updateTrackerIcon(this.currentShape, this.currentColor);
        this.activeClick = null;
        this.clickResetPending = false;

        // Clear timeout
        if (this.clickMaxTimeoutID) {
            clearTimeout(this.clickMaxTimeoutID);
            this.clickMaxTimeoutID = null;
        }
    }
    //#endregion
    //#endregion

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

        // Start Updater
        this.startPositionUpdater(this.currentRepaintInterval);

        // Add tracker to desktop
        Main.uiGroup.add_child(this.trackerIcon);

        // Connect mouse click events
        if (this.gdkBackend === 'wayland') {
            this.capturedEvent = global.stage.connect(
                'captured-event',
                this.onCapturedEvent.bind(this)
            );
        } else if (this.gdkBackend === 'x11') {
            this.mouseListener = Atspi.EventListener.new(this.onMouseEvent.bind(this));
            this.mouseListener.register('mouse');
        }
    }

    disableTracker() {
        this.trackerEnabled = false;

        // Disconnect mouse click events
        if (this.capturedEvent) {
            global.stage.disconnect(this.capturedEvent);
            this.capturedEvent = null;
        }

        if (this.mouseListener) {
            this.mouseListener.deregister('mouse');
            this.mouseListener = null;
        }

        // Remove tracker from desktop
        if (this.trackerIcon && this.trackerIcon.get_parent() === Main.uiGroup) {
            Main.uiGroup.remove_child(this.trackerIcon);
        }

        // Stop updating the tracker position
        this.stopPositionUpdater();
    }
    //#endregion

    //#region Destroy function
    destroy() {
        // Disable tracker if active
        this.disableTracker();

        // Remove all connections
        if (this.settingConnections) {
            this.settingConnections.forEach(connection => {
                this.settings.disconnect(connection);
            });
            this.settingConnections = null;
        }

        // Disconnect keybinding
        Main.wm.removeKeybinding('tracker-keybinding');

        // Destroy tracker
        if (this.trackerIcon) {
            this.trackerIcon.destroy();
            this.trackerIcon = null;
        }
    }
    //#endregion
}
