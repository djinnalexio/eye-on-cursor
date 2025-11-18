/*
 * Eye on Cursor GNOME Shell extension
 *
 * SPDX-FileCopyrightText: 2024-2025 djinnalexio
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
import * as Timeout from './timeout.js';
//#endregion

//#region Constants
// See https://gitlab.gnome.org/GNOME/libadwaita/-/blob/main/src/adw-accent-color.c?ref_type=heads#L15
// And https://gitlab.gnome.org/GNOME/gsettings-desktop-schemas/-/blob/master/schemas/org.gnome.desktop.interface.gschema.xml.in?ref_type=heads#L314
const ACCENT_COLORS = {
    blue: '#3584e4',
    teal: '#2190a4',
    green: '#3a944a',
    yellow: '#c88800',
    orange: '#ed5b00',
    red: '#e62d42',
    pink: '#d56199',
    purple: '#9141ac',
    slate: '#6f8396',
};
const ACCENT_COLORS_KEY = 'accent-color';
const DISABLED_COLOR = '#1C2A2B'; // Disabled color so that there is a change when toggling the tracker
const CACHE_DIR_PERMISSIONS = 0o755; // 'rwx' permissions for user, 'r_x' for group and others
const CLICK_MIN_DEBOUNCE = 100; // Min highlighting duration after receiving BUTTON RELEASED signal
const CLICK_MAX_DEBOUNCE = 5000; // Max highlighting duration after receiving BUTTON PRESSED signal
const CLICK_RIPPLE_SCALE = 2;
const TRACKER_RAISE_DELAY = 20;
const TRACKER_SETTINGS = [
    'tracker-shape',
    'tracker-size',
    'tracker-color-main-enabled',
    'tracker-color-main',
    'tracker-color-left',
    'tracker-color-middle',
    'tracker-color-right',
    'tracker-opacity',
    'tracker-refresh-rate',
];
//#endregion

//#region Defining Tracker
export class TrackerManager {
    /**
     * Creates an instance of TrackerManager, which controls an icon that follows
     * and reacts to the cursor.
     *
     * @param {Extension} extensionObject - The extension object.
     */

    //#region Constructor
    constructor(extensionObject) {
        // Get extension object properties
        this.gettextDomain = extensionObject.metadata['gettext-domain'];
        this.glyphsDir = `${extensionObject.path}/media/glyphs`;
        this.settings = extensionObject.settings;

        // Initialize state variables
        this.enabled = false;
        this.currentColor = null;
        this.lastPositionX = null;
        this.lastPositionY = null;
        this.capturedEvent = null;
        this.mouseListener = null;
        this.activeClick = null;
        this.clickResetPending = false;
        this.isWayland = Meta.is_wayland_compositor();
        this.clickMaxTimeoutID = {id: null};
        this.clickReleaseTimeoutID = {id: null};
        this.trackerPositionUpdaterID = {id: null};
        this.trackerRaiseTimeoutID = {id: null};

        // Initialize settings values
        this.shape = this.settings.get_string('tracker-shape');
        this.size = this.settings.get_int('tracker-size');
        this.colorMainEnabled = this.settings.get_boolean('tracker-color-main-enabled');
        this.colorMain = this.settings.get_string('tracker-color-main');
        this.colorLeft = this.settings.get_string('tracker-color-left');
        this.colorMiddle = this.settings.get_string('tracker-color-middle');
        this.colorRight = this.settings.get_string('tracker-color-right');
        this.opacity = this.settings.get_int('tracker-opacity');
        this.refreshRate = this.settings.get_int('tracker-refresh-rate');

        // Use desktop accent color as default tracker color
        this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.colorDefault = ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];

        // Create tracker icons in cache based on the initial settings
        this.cacheDir = this.getCacheDir();
        this.updateCacheTrackers(this.shape, [
            this.colorDefault,
            this.colorMain,
            this.colorLeft,
            this.colorMiddle,
            this.colorRight,
        ]);

        // Create the tracker icon
        this.trackerIcon = new St.Icon({
            reactive: false,
            can_focus: false,
            track_hover: false,
        });
        this.trackerIcon.icon_size = this.size;
        this.trackerIcon.opacity = Math.ceil(this.opacity * 2.55); // Convert from 0-100 to 0-255 range
        this.updateTrackerIcon(this.shape, DISABLED_COLOR);

        // Connect change in settings to update function
        this.settingsHandlers = TRACKER_SETTINGS.map(key =>
            this.settings.connect(`changed::${key}`, this.updateTrackerProperties.bind(this))
        );

        // Connect toggle tracker shortcut
        Main.wm.addKeybinding(
            'tracker-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.toggleTracker.bind(this)
        );

        if (!this.isWayland) Atspi.init();

        // Connect change in accent color to tracker redraw
        this.defaultColorHandler = this.interfaceSettings.connect(
            `changed::${ACCENT_COLORS_KEY}`,
            () => {
                this.colorDefault =
                    ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];
                this.updateCacheTrackers(this.shape, [this.colorDefault]);
                this.colorMainEnabled
                    ? this.updateTrackerIcon(this.shape, this.colorMain)
                    : this.updateTrackerIcon(this.shape, this.colorDefault);
            }
        );
    }

    // Change tracker icon
    updateTrackerIcon(shape, color) {
        this.trackerIcon.gicon = Gio.icon_new_for_string(`${this.cacheDir}/${shape}_${color}.svg`);
        this.currentColor = color;
    }
    //#endregion

    //#region Cache icons functions
    // Create/return a cache directory for colored trackers
    getCacheDir() {
        const cacheDirPath = `${GLib.get_user_cache_dir()}/${this.gettextDomain}/trackers`;
        try {
            if (!GLib.file_test(cacheDirPath, GLib.FileTest.IS_DIR)) {
                GLib.mkdir_with_parents(cacheDirPath, CACHE_DIR_PERMISSIONS);
            }
        } catch (e) {
            throw new Error(`Failed to create cache dir at ${cacheDirPath}: ${e.message}`);
        }
        return cacheDirPath;
    }

    // Create cached tracker icons for a given shape and array of colors
    updateCacheTrackers(shape, colorArray) {
        colorArray.forEach(color => {
            const cachedSVGpath = `${this.cacheDir}/${shape}_${color}.svg`;
            const cachedSVG = Gio.File.new_for_path(cachedSVGpath);
            // Create a cached tracker icon if it doesn't exist
            if (!cachedSVG.query_exists(null)) {
                try {
                    // Create empty file
                    cachedSVG.create(Gio.FileCreateFlags.NONE, null);

                    // Get template SVG
                    const shapeSVG = Gio.File.new_for_path(`${this.glyphsDir}/${shape}.svg`);

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
        });
    }
    //#endregion

    //#region Position updater function
    updateTrackerPosition() {
        if (this.trackerIcon) {
            // Get mouse coordinates
            const [mouseX, mouseY] = global.get_pointer();

            // Offset so that the cursor appears in the center of the tracker
            const newPositionX = mouseX - this.size / 2;
            const newPositionY = mouseY - this.size / 2;

            // If mouse has moved and tracker is on screen, update icon position
            if (
                this.trackerIcon.get_parent() &&
                (this.lastPositionX !== newPositionX || this.lastPositionY !== newPositionY)
            ) {
                this.trackerIcon.set_position(newPositionX, newPositionY);
                Main.uiGroup.set_child_above_sibling(this.trackerIcon, null); // Keep tracker on top of UI elements
                [this.lastPositionX, this.lastPositionY] = [newPositionX, newPositionY];
            }
        }
    }
    //#endregion

    //#region Toggle tracker functions
    toggleTracker() {
        this.enabled ? this.disableTracker() : this.enableTracker();
    }

    enableTracker() {
        this.enabled = true;

        // Start Updater
        Timeout.setInterval(
            this.trackerPositionUpdaterID,
            this.updateTrackerPosition.bind(this),
            1000 / this.refreshRate
        );

        // Add tracker to desktop
        Main.uiGroup.add_child(this.trackerIcon);
        this.colorMainEnabled
            ? this.updateTrackerIcon(this.shape, this.colorMain)
            : this.updateTrackerIcon(this.shape, this.colorDefault);
        this.updateTrackerPosition();

        // Connect mouse click events
        if (this.isWayland) {
            this.capturedEvent = global.stage.connect(
                'captured-event',
                this.onStageMouseEvent.bind(this)
            );
        } else {
            this.mouseListener = Atspi.EventListener.new(this.onAtspiMouseEvent.bind(this));
            this.mouseListener.register('mouse');
        }
    }

    disableTracker() {
        this.enabled = false;
        this.currentColor = DISABLED_COLOR;

        // Clear timeouts
        [this.clickMaxTimeoutID, this.clickReleaseTimeoutID, this.trackerRaiseTimeoutID].forEach(
            timeout => Timeout.clearTimeout(timeout)
        );

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
        Timeout.clearInterval(this.trackerPositionUpdaterID);
    }
    //#endregion

    //#region Monitor Click functions
    // Button press function
    handleMousePress(button) {
        switch (button) {
            // Button presses
            case 1:
                this.handleButtonPress(button, this.colorLeft);
                break;
            case 2:
                this.handleButtonPress(button, this.colorMiddle);
                break;
            case 3:
                this.handleButtonPress(button, this.colorRight);
                break;
            default:
                return;
        }
    }

    // Using `global.stage` to monitor mouse clicks on Wayland (doesn't work on applications)
    onStageMouseEvent(actor, event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const button = event.get_button();
            this.handleMousePress(button);
        } else if (event.type() === Clutter.EventType.BUTTON_RELEASE) {
            const button = event.get_button();
            this.handleButtonRelease(button);
        }
    }

    // Using `Atspi.EventListener` to monitor clicks on X11 (middle click is not registered)
    onAtspiMouseEvent(event) {
        // Match button presses and releases
        const match = event.type.match(/mouse:button:(\d)([pr])/);
        if (match) {
            const button = parseInt(match[1], 10);
            const action = match[2];
            if (action === 'p') this.handleMousePress(button);
            else if (action === 'r') this.handleButtonRelease(button);
        }
    }

    //#region Handle click functions
    handleButtonPress(button, color) {
        // Set the active button
        this.activeClick = button;
        this.clickResetPending = false;

        // Update the tracker icon with the new color
        this.updateTrackerIcon(this.shape, color);

        // Move the tracker on top of any new UI element that appears after click
        Timeout.clearTimeout(this.trackerRaiseTimeoutID);
        Timeout.setTimeout(
            this.trackerRaiseTimeoutID,
            () => {
                Main.uiGroup.set_child_above_sibling(this.trackerIcon, null);
            },
            TRACKER_RAISE_DELAY
        );

        // Set a maximum timeout to revert the color
        Timeout.clearTimeout(this.clickMaxTimeoutID);
        Timeout.setTimeout(this.clickMaxTimeoutID, this.resetColor.bind(this), CLICK_MAX_DEBOUNCE);

        // Create an animated icon
        let animatedIcon = new St.Icon({
            x: this.trackerIcon.x,
            y: this.trackerIcon.y,
            reactive: false,
            can_focus: false,
            track_hover: false,
            icon_size: this.trackerIcon.icon_size,
            opacity: this.trackerIcon.opacity,
            gicon: Gio.icon_new_for_string(`${this.cacheDir}/${this.shape}_${color}.svg`),
        });

        // Add animated icon to the UI group
        Main.uiGroup.add_child(animatedIcon);

        // Offset so that the center of the animated icon stays on the tracker
        const rippleOffset = (animatedIcon.icon_size * (CLICK_RIPPLE_SCALE - 1)) / 2;

        // Play ripple effect
        animatedIcon.ease({
            x: animatedIcon.x - rippleOffset,
            y: animatedIcon.y - rippleOffset,
            scale_x: CLICK_RIPPLE_SCALE,
            scale_y: CLICK_RIPPLE_SCALE,
            opacity: 0,
            duration: CLICK_MIN_DEBOUNCE * 2,
            mode: Clutter.AnimationMode.EASE_OUT_QUAD,
            onComplete: function () {
                Main.uiGroup.remove_child(animatedIcon);
                animatedIcon.destroy();
                animatedIcon = null;
            },
        });
    }

    handleButtonRelease(button) {
        // Debounce the release event
        Timeout.clearTimeout(this.clickReleaseTimeoutID);
        Timeout.setTimeout(
            this.clickReleaseTimeoutID,
            () => {
                // Only reset if no new click event has occurred in the meantime
                if (this.activeClick === button && this.clickResetPending) {
                    this.resetColor();
                }
            },
            CLICK_MIN_DEBOUNCE
        );
        this.clickResetPending = true;
    }

    resetColor() {
        // Reset the tracker icon to the default color
        this.colorMainEnabled
            ? this.updateTrackerIcon(this.shape, this.colorMain)
            : this.updateTrackerIcon(this.shape, this.colorDefault);
        this.activeClick = null;
        this.clickResetPending = false;

        // Clear timeout
        Timeout.clearTimeout(this.clickMaxTimeoutID);
    }
    //#endregion
    //#endregion

    //#region Properties update functions
    updateTrackerProperties() {
        // Get new settings
        const newShape = this.settings.get_string('tracker-shape');
        const newSize = this.settings.get_int('tracker-size');
        const newColorMainEnabled = this.settings.get_boolean('tracker-color-main-enabled');
        const newColorMain = this.settings.get_string('tracker-color-main');
        const newColorLeft = this.settings.get_string('tracker-color-left');
        const newColorMiddle = this.settings.get_string('tracker-color-middle');
        const newColorRight = this.settings.get_string('tracker-color-right');
        const newOpacity = this.settings.get_int('tracker-opacity');
        const newRefreshRate = this.settings.get_int('tracker-refresh-rate');

        // Update tracker if shape or any color has changed
        if (
            this.shape !== newShape ||
            this.colorMainEnabled !== newColorMainEnabled ||
            this.colorMain !== newColorMain ||
            this.colorLeft !== newColorLeft ||
            this.colorMiddle !== newColorMiddle ||
            this.colorRight !== newColorRight
        ) {
            this.updateCacheTrackers(newShape, [
                this.colorDefault,
                newColorMain,
                newColorLeft,
                newColorMiddle,
                newColorRight,
            ]);

            newColorMainEnabled
                ? this.updateTrackerIcon(newShape, newColorMain)
                : this.updateTrackerIcon(newShape, this.colorDefault);

            this.shape = newShape;
            this.colorMainEnabled = newColorMainEnabled;
            this.colorMain = newColorMain;
            this.colorLeft = newColorLeft;
            this.colorMiddle = newColorMiddle;
            this.colorRight = newColorRight;
        }

        // Update size if changed
        if (this.size !== newSize) {
            this.trackerIcon.icon_size = newSize;
            this.size = newSize;
        }

        // Update opacity if changed
        if (this.opacity !== newOpacity) {
            this.trackerIcon.opacity = Math.ceil(newOpacity * 2.55); // Convert from 0-100 to 0-255 range
            this.opacity = newOpacity;
        }

        // If the position updater is currently running, stop it and start a new one with the updated refresh rate
        if (this.refreshRate !== newRefreshRate && this.trackerPositionUpdaterID) {
            Timeout.clearInterval(this.trackerPositionUpdaterID);

            Timeout.setInterval(
                this.trackerPositionUpdaterID,
                this.updateTrackerPosition.bind(this),
                1000 / newRefreshRate
            );
            this.refreshRate = newRefreshRate;
        }
    }
    //#endregion

    //#region Destroy function
    destroy() {
        // Disable tracker if active
        this.disableTracker();

        // Disconnect settings signal handlers
        this.settingsHandlers?.forEach(connection => this.settings.disconnect(connection));
        this.settingsHandlers = null;

        if (this.defaultColorHandler) {
            this.interfaceSettings.disconnect(this.defaultColorHandler);
        }
        this.defaultColorHandler = null;

        // Disconnect keybinding
        Main.wm.removeKeybinding('tracker-keybinding');

        // Destroy tracker
        this.trackerIcon?.destroy();
        this.trackerIcon = null;

        // Disconnect settings
        this.settings = null;
    }
    //#endregion
}
//#endregion
