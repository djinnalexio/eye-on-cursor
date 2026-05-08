// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Atspi from 'gi://Atspi';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Meta from 'gi://Meta';
import Shell from 'gi://Shell';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

//#region Constants
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

// Enable async/await with asynchronous methods in platform libraries
Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_async');

/**
 * An object that controls an icon that follows and reacts to the cursor.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 */
export class TrackerManager {
    //#region Constructor
    constructor(extension) {
        // Get extension object properties
        this.gettextDomain = extension.metadata['gettext-domain'];
        this.trackersDir = GLib.build_filenamev([
            extension.path,
            'assets',
            'trackers',
        ]);
        this.settings = extension.getSettings();

        // Check if accent color variable exists (GNOME 47+)
        this.hasAccentColor = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'})
            .list_keys()
            .includes('accent-color');

        // Initialize state variables
        this.enabled = false;
        this.currentColor = null;
        this.lastPositionX = null;
        this.lastPositionY = null;
        this.capturedEvent = null;
        this.mouseListener = null;
        this.activeClick = null;
        this.clickResetPending = false;
        this.clickMaxTimeout = null;
        this.clickReleaseTimeout = null;
        this.trackerPositionUpdater = null;
        this.trackerRaiseTimeout = null;

        // Initialize settings values
        this.shape = this.settings.get_string('tracker-shape');
        this.size = this.settings.get_int('tracker-size');
        this.colorMainEnabled = this.hasAccentColor
            ? this.settings.get_boolean('tracker-color-main-enabled')
            : true;
        this.colorMain = this.settings.get_string('tracker-color-main');
        this.colorLeft = this.settings.get_string('tracker-color-left');
        this.colorMiddle = this.settings.get_string('tracker-color-middle');
        this.colorRight = this.settings.get_string('tracker-color-right');
        this.opacity = this.settings.get_int('tracker-opacity');
        this.refreshRate = this.settings.get_int('tracker-refresh-rate');

        // Connect change in settings to update method
        this.settingsHandlers = TRACKER_SETTINGS.map((key) =>
            this.settings.connect(`changed::${key}`, this.updateTrackerProperties.bind(this)));

        // Create the tracker object
        this.tracker = new St.Icon({
            reactive: false,
            can_focus: false,
            track_hover: false,
        });
        this.tracker.icon_size = this.size;
        this.tracker.opacity = Math.ceil(this.opacity * 2.55); // Convert from 0-100 to 0-255 range

        // Get the cache directory for colored trackers
        this.cacheDir = GLib.build_filenamev([
            GLib.get_user_cache_dir(),
            this.gettextDomain,
            'trackers',
        ]);
        // Create the cache directory if it doesn't exist
        try {
            if (!GLib.file_test(this.cacheDir, GLib.FileTest.IS_DIR))
                GLib.mkdir_with_parents(this.cacheDir, CACHE_DIR_PERMISSIONS);
        } catch (e) {
            throw new Error(`Failed to create cache directory at ${this.cacheDir}: ${e.message}`);
        }

        // Create tracker icons files in cache based on the initial settings
        this.updateCacheTrackers(this.shape, [
            this.colorMain,
            this.colorLeft,
            this.colorMiddle,
            this.colorRight,
        ]).catch((e) => {
            throw new Error(`Failed to create cache trackers: ${e.message}`);
        });

        // Use desktop accent color as default tracker color (GNOME 47+)
        if (this.hasAccentColor) {
            const context = St.ThemeContext.get_for_stage(global.stage);
            const [color] = context.get_accent_color(); // Cogl.Color object
            this.colorAccent = `rgb(${color['red']}, ${color['green']}, ${color['blue']})`;
            this.updateCacheTrackers(this.shape, [this.colorAccent])
            .catch((e) => {
                throw new Error(`Failed to create cache tracker for accent color: ${e.message}`);
            });

            // Connect change in accent color to tracker redraw
            this.settingsHandlers.push(context.connectObject(
                'changed',
                async () => {
                    const [color] = context.get_accent_color();
                    this.colorAccent = `rgb(${color['red']}, ${color['green']}, ${color['blue']})`;
                    await this.updateCacheTrackers(this.shape, [this.colorAccent]);
                    this.colorMainEnabled
                        ? this.updateTrackerIcon(this.shape, this.colorMain)
                        : this.updateTrackerIcon(this.shape, this.colorAccent);
                }
            ));
        }

        this.colorMainEnabled
            ? this.currentColor = this.colorMain
            : this.currentColor = this.colorAccent;

        // Connect toggle tracker shortcut
        Main.wm.addKeybinding(
            'tracker-keybinding',
            this.settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.ALL,
            this.toggleTracker.bind(this)
        );

        // Check if running on wayland (GNOME 50+ is Wayland only)
        this.isWayland = Meta.is_wayland_compositor ? Meta.is_wayland_compositor() : true;

        // If on X11, use `Atspi` as the event listener
        if (!this.isWayland)
            Atspi.init();
    }
    //#endregion

    //#region Cache icons methods
    // Create cached tracker icons for a given shape and array of colors
    async updateCacheTrackers(shape, colorArray) {
        const tasks = colorArray.map(async (color) => {
            // Get the cached tracker icon file for this shape and color
            const colorTag = color.replace(/[^\d,]/g, '');
            const cacheIconPath = GLib.build_filenamev([this.cacheDir, `${shape}_${colorTag}.svg`]);
            const cacheIcon = Gio.File.new_for_path(cacheIconPath);
            try {
                // Get template shape
                const templatePath = GLib.build_filenamev([this.trackersDir, `${shape}.svg`]);
                const template = Gio.File.new_for_path(templatePath);

                // Load contents of the template
                const [contents, etag_] = await template.load_contents_async(null);

                // Decode SVG contents
                const decoder = new TextDecoder();
                let decodedContents = decoder.decode(contents);

                // Replace color in SVG contents
                decodedContents = decodedContents.replace('#000', color);

                // Encode SVG contents back into bytes
                const encoder = new TextEncoder();
                const encodedContents = encoder.encode(decodedContents);

                // Fill cached icon file with modified contents
                await cacheIcon.replace_contents_async(
                    encodedContents,
                    null,
                    false,
                    Gio.FileCreateFlags.REPLACE_DESTINATION,
                    null
                );
            } catch (e) {
                throw new Error(`Failed to create cache tracker ${cacheIconPath}: ${e.message}`);
            }
        });
        await Promise.all(tasks);
    }

    // Change tracker icon
    updateTrackerIcon(shape, color) {
        const colorTag = color.replace(/[^\d,]/g, '');
        const trackerIconPath = GLib.build_filenamev([this.cacheDir, `${shape}_${colorTag}.svg`]);
        this.tracker.gicon = Gio.icon_new_for_string(trackerIconPath);
        this.currentColor = color;
    }
    //#endregion

    //#region Position updater
    updateTrackerPosition() {
        // Get mouse coordinates
        const [mouseX, mouseY] = global.get_pointer();

        // Offset so that the tracker is aligned with the point of the cursor
        const newPositionX = mouseX - (this.size / 2);
        const newPositionY = mouseY - (this.size / 2);

        // Only update icon position if tracker is on screen AND mouse has moved
        if (
            this.tracker.get_parent() &&
                (this.lastPositionX !== newPositionX || this.lastPositionY !== newPositionY)
        ) {
            this.tracker.set_position(newPositionX, newPositionY);
            // Keep tracker on top of other UI elements
            Main.uiGroup.set_child_above_sibling(this.tracker, null);
            [this.lastPositionX, this.lastPositionY] = [newPositionX, newPositionY];
        }
    }
    //#endregion

    //#region Tracker toggle
    toggleTracker() {
        this.enabled ? this.disableTracker() : this.enableTracker();
    }

    enableTracker() {
        this.enabled = true;

        // Start Updater
        this.trackerPositionUpdater = setInterval(
            this.updateTrackerPosition.bind(this),
            1000 / this.refreshRate
        );

        // Add tracker to desktop
        Main.uiGroup.add_child(this.tracker);
        this.updateTrackerPosition(); // Needs tracker to be part of uiGroup
        this.colorMainEnabled
            ? this.updateTrackerIcon(this.shape, this.colorMain)
            : this.updateTrackerIcon(this.shape, this.colorAccent);

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

        // Clear timeouts
        [
            this.clickMaxTimeout,
            this.clickReleaseTimeout,
            this.trackerRaiseTimeout,
        ].forEach((timeout) => clearTimeout(timeout));

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
        if (this.tracker && this.tracker.get_parent() === Main.uiGroup)
            Main.uiGroup.remove_child(this.tracker);

        this.tracker.gicon = null;

        // Stop updating the tracker position
        clearInterval(this.trackerPositionUpdater);
    }
    //#endregion

    //#region Button Press methods
    // Button press method
    handleMouseButtonPress(button) {
        switch (button) {
            // Button presses
            case 1:
                this.handleClick(button, this.colorLeft);
                break;
            case 2:
                this.handleClick(button, this.colorMiddle);
                break;
            case 3:
                this.handleClick(button, this.colorRight);
                break;
            default:
        }
    }

    // Using `global.stage` to monitor mouse clicks on Wayland (doesn't work on applications)
    onStageMouseEvent(actor, event) {
        if (event.type() === Clutter.EventType.BUTTON_PRESS) {
            const button = event.get_button();
            this.handleMouseButtonPress(button);
        } else if (event.type() === Clutter.EventType.BUTTON_RELEASE) {
            const button = event.get_button();
            this.handleClickRelease(button);
        }
    }

    // Using `Atspi.EventListener` to monitor clicks on X11 (middle click is not registered)
    onAtspiMouseEvent(event) {
        // Match button presses and releases
        const match = event.type.match(/mouse:button:(\d)([pr])/);
        if (match) {
            const button = parseInt(match[1], 10);
            const action = match[2];
            if (action === 'p')
                this.handleMouseButtonPress(button);
            else if (action === 'r')
                this.handleClickRelease(button);
        }
    }

    //#region Click highlighting
    handleClick(button, color) {
        // Set the active button
        this.activeClick = button;
        this.clickResetPending = false;

        // Update the tracker icon with the new color
        this.updateTrackerIcon(this.shape, color);

        // Move the tracker on top of any new UI element that appears after click
        clearTimeout(this.trackerRaiseTimeout);
        this.trackerRaiseTimeout = setTimeout(
            () => Main.uiGroup.set_child_above_sibling(this.tracker, null),
            TRACKER_RAISE_DELAY
        );

        // Set a maximum timeout to revert the color
        clearTimeout(this.clickMaxTimeout);
        this.clickMaxTimeout = setTimeout(this.resetColor.bind(this), CLICK_MAX_DEBOUNCE);

        // Create an animated icon
        const colorTag = color.replace(/[^\d,]/g, '');
        let animatedIcon = new St.Icon({
            x: this.tracker.x,
            y: this.tracker.y,
            reactive: false,
            can_focus: false,
            track_hover: false,
            icon_size: this.tracker.icon_size,
            opacity: this.tracker.opacity,
            gicon: Gio.icon_new_for_string(`${this.cacheDir}/${this.shape}_${colorTag}.svg`),
        });

        // Add animated icon to the UI group
        Main.uiGroup.add_child(animatedIcon);

        // Offset so that the animation is aligned with the point of the cursor
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
            onComplete() {
                Main.uiGroup.remove_child(animatedIcon);
                animatedIcon.destroy();
                animatedIcon = null;
            },
        });
    }

    handleClickRelease(button) {
        // Debounce the release event
        clearTimeout(this.clickReleaseTimeout);
        this.clickReleaseTimeout = setTimeout(
            () => {
                // Only reset if no new click event has occurred in the meantime
                if (this.activeClick === button && this.clickResetPending)
                    this.resetColor();
            },
            CLICK_MIN_DEBOUNCE
        );
        this.clickResetPending = true;
    }

    resetColor() {
        // Reset the tracker icon to the main color
        this.colorMainEnabled
            ? this.updateTrackerIcon(this.shape, this.colorMain)
            : this.updateTrackerIcon(this.shape, this.colorAccent);
        this.activeClick = null;
        this.clickResetPending = false;

        // Clear timeout
        clearTimeout(this.clickMaxTimeout);
    }
    //#endregion
    //#endregion

    //#region Properties updater
    async updateTrackerProperties() {
        // Get new settings
        const newShape = this.settings.get_string('tracker-shape');
        const newSize = this.settings.get_int('tracker-size');
        const newColorMainEnabled = this.hasAccentColor
            ? this.settings.get_boolean('tracker-color-main-enabled')
            : true;
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
            await this.updateCacheTrackers(newShape, [
                this.colorAccent,
                newColorMain,
                newColorLeft,
                newColorMiddle,
                newColorRight,
            ]);

            newColorMainEnabled
                ? this.updateTrackerIcon(newShape, newColorMain)
                : this.updateTrackerIcon(newShape, this.colorAccent);

            this.shape = newShape;
            this.colorMainEnabled = newColorMainEnabled;
            this.colorMain = newColorMain;
            this.colorLeft = newColorLeft;
            this.colorMiddle = newColorMiddle;
            this.colorRight = newColorRight;
        }

        // Update size if changed
        if (this.size !== newSize) {
            this.tracker.icon_size = newSize;
            this.size = newSize;
        }

        // Update opacity if changed
        if (this.opacity !== newOpacity) {
            this.tracker.opacity = Math.ceil(newOpacity * 2.55);
            this.opacity = newOpacity;
        }

        // If the position updater is currently running, stop it and start a new one with
        // the updated refresh rate
        if (this.refreshRate !== newRefreshRate && this.trackerPositionUpdater) {
            clearInterval(this.trackerPositionUpdater);
            this.trackerPositionUpdater = setInterval(
                this.updateTrackerPosition.bind(this),
                1000 / newRefreshRate
            );
            this.refreshRate = newRefreshRate;
        }
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disable tracker if active
        this.disableTracker();

        // Disconnect settings signal handlers
        this.settingsHandlers.forEach((connection) => this.settings.disconnect(connection));
        this.settingsHandlers = null;

        // Disconnect keybinding
        Main.wm.removeKeybinding('tracker-keybinding');

        // Disconnect Atspi
        if (!this.isWayland)
            Atspi.exit();

        // Destroy tracker
        this.tracker.destroy();
        this.tracker = null;

        // Drop settings objects
        this.settings = null;
    }
    //#endregion
}
