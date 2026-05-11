// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import {drawEye} from './eyeRenderer.js';
//#endregion

//#region Constants
const BLINK_DURATION = 250; // TODO turn blink duration into a setting 0.2-2s
const EYE_SETTINGS = [
    'eye-reactive',
    'eye-shape',
    'eye-line-mode',
    'eye-line-width',
    'eye-width',
    'eye-color-iris',
    'eye-color-iris-enabled',
    'eye-refresh-rate',
    'eye-color-eyelid',
];
const PUPIL_COLOR = parseRGB('rgb(0,0,0)');
//#endregion

/**
 * An animated eye created in the panel that follows the pointer.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @param {TrackerManager} trackerManager - The mouse tracker object.
 */
export const Eye = GObject.registerClass(
class Eye extends PanelMenu.Button {
    //#region Constructor
    constructor(extension, trackerManager) {
        super(0, _('Animated eye that follows the mouse'), false);

        this.settings = extension.getSettings();

        // Check if accent color variable exists (GNOME 47+)
        this.hasAccentColor = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'})
            .list_keys()
            .includes('accent-color');

        // Attach mouse tracker
        this.mouseTracker = trackerManager;

        // Initialize state variables
        this.mouseX = 0;
        this.mouseY = 0;
        this.blinking = false;
        this.eyelidLevel = 0;
        this.eyelidLevelInterval = null;
        this.randomBlinkTimeout = null;

        // Initialize settings values
        this.reactive = this.settings.get_boolean('eye-reactive');
        this.shape = this.settings.get_string('eye-shape');
        this.lineMode = this.settings.get_boolean('eye-line-mode');
        this.lineWidth = this.settings.get_int('eye-line-width') / 10;
        this.width = this.settings.get_int('eye-width');
        this.irisCustomColorEnabled =
            this.hasAccentColor ? this.settings.get_boolean('eye-color-iris-enabled') : true;
        this.irisColor = parseRGB(this.settings.get_string('eye-color-iris'));
        this.refreshRate = this.settings.get_int('eye-refresh-rate');
        this.eyelidColor = parseRGB(this.settings.get_string('eye-color-eyelid'));
        this.trackerColor = this.mouseTracker.currentColor;
        // TODO use foreground color as default eyelid to match it with contour

        // Connect change in settings to update method
        this.settingsHandlers = EYE_SETTINGS.map((key) =>
            this.settings.connect(`changed::${key}`, this.updateEyeProperties.bind(this))
        );

        // Use desktop accent color as default eye color (GNOME 47+)
        if (this.hasAccentColor) {
            this.themeContext = St.ThemeContext.get_for_stage(global.stage);
            const [accent] = this.themeContext.get_accent_color();
            this.accentColor = {
                red: accent.get_red(),
                green: accent.get_green(),
                blue: accent.get_blue(),
            };
            this.themeContext.connectObject(
                'changed',
                () => {
                    const [accent] = this.themeContext.get_accent_color();
                    this.accentColor = {
                        red: accent.get_red(),
                        green: accent.get_green(),
                        blue: accent.get_blue(),
                    };
                    this.area.queue_repaint();
                },
                this
            );
        }

        // Add popups
        this.menuItems = [
            this.createPopupMenuItem( // TODO replace with PopupSwitchMenuItem
                _('Toggle Tracker'),
                'input-mouse-symbolic',
                this.mouseTracker.toggleTracker.bind(this.mouseTracker)
            ),
            this.createPopupMenuItem(
                _('Settings'),
                'org.gnome.Settings-symbolic',
                extension.openPreferences.bind(extension)
            ),
        ];
        this.menuItems.forEach((popup) => this.menu.addMenuItem(popup));

        // Create the eye canvas
        this.area = new St.DrawingArea({width: this.width});
        // TODO see interaction if any between area width and button width
        this.add_child(this.area);

        // Connect the repaint signal of the area to the repaint method
        this.repaintHandler = this.area.connect('repaint', this.onRepaint.bind(this));

        // Start periodic redraw
        this.eyeRedrawInterval = setInterval(
            this.updateEyeFrame.bind(this),
            1000 / this.refreshRate
        );
    }

    // Create Popup method
    createPopupMenuItem(label, icon, callback) {
        const item = new PopupMenu.PopupImageMenuItem(label, icon);
        item.connect('activate', callback);
        return item;
    }
    //#endregion

    //#region Drawing methods
    // Update and redraw the eye frame if the mouse has moved
    updateEyeFrame() {
        const [mouseX, mouseY] = global.get_pointer();

        // If mouse has moved, tracker color has changed, or eye is blinking, redraw eye
        if (
            this.mouseX !== mouseX ||
                this.mouseY !== mouseY ||
                this.trackerColor !== this.mouseTracker.currentColor ||
                this.blinking
        ) {
            [this.mouseX, this.mouseY] = [mouseX, mouseY];
            this.trackerColor = this.mouseTracker.currentColor;
            this.area.queue_repaint();
        }
    }

    // Draw method
    onRepaint(area) {
        // Get the coordinates of the eye
        const [originX, originY] = area.get_transformed_position();
        if (isNaN(originX) || isNaN(originY))
            return; // Don't draw if the surface isn't placed yet

        // Use foreground color from the theme for the white of the eye
        const themeNode = this.area.get_theme_node();
        const scleraColor = themeNode.get_foreground_color();

        // Get iris color
        let irisColor;
        if (this.mouseTracker.enabled)
            irisColor = parseRGB(this.trackerColor);
        else if (this.irisCustomColorEnabled)
            irisColor = this.irisColor;
        else
            irisColor = this.accentColor;

        const options = {
            shape: this.shape,
            mouseX: this.mouseX,
            mouseY: this.mouseY,
            originX,
            originY,
            lineWidth: this.lineWidth,
            lineMode: this.lineMode,
            scleraColor,
            irisColor,
            pupilColor: PUPIL_COLOR,
            eyelidLevel: this.eyelidLevel,
            eyelidColor: this.eyelidColor,
        };
        drawEye(area, options);
    }
    //#endregion

    //#region Properties updater
    updateEyeProperties() {
        const newReactive = this.settings.get_boolean('eye-reactive');
        const newShape = this.settings.get_string('eye-shape');
        const newLineMode = this.settings.get_boolean('eye-line-mode');
        const newLineWidth = this.settings.get_int('eye-line-width');
        const newWidth = this.settings.get_int('eye-width');
        const newIrisCustomColorEnabled =
            this.hasAccentColor ? this.settings.get_boolean('eye-color-iris-enabled') : true;
        const newIrisColor = parseRGB(this.settings.get_string('eye-color-iris'));
        const newRefreshRate = this.settings.get_int('eye-refresh-rate');
        const newEyelidColor = parseRGB(this.settings.get_string('eye-color-eyelid'));

        // Update reactive property
        if (this.reactive !== newReactive)
            this.reactive = newReactive;

        // Update width
        if (this.width !== newWidth) {
            this.area.set_width(newWidth);
            this.width = newWidth;
        }

        // Update shape
        if (this.shape !== newShape) {
            this.shape = newShape;
            this.area.queue_repaint();
        }

        // Update drawing mode
        if (this.lineMode !== newLineMode) {
            this.lineMode = newLineMode;
            this.area.queue_repaint();
        }

        // Update line thickness
        if (this.lineWidth !== newLineWidth) {
            this.lineWidth = newLineWidth / 10;
            this.area.queue_repaint();
        }

        // Update iris color
        if (
            this.irisCustomColorEnabled !== newIrisCustomColorEnabled ||
            JSON.stringify(this.irisColor) !== JSON.stringify(newIrisColor)
        ) {
            this.irisCustomColorEnabled = newIrisCustomColorEnabled;
            this.irisColor = newIrisColor;
            this.area.queue_repaint();
        }

        // Update refresh rate
        if (this.refreshRate !== newRefreshRate) {
            this.eyeRedrawInterval = clearInterval(this.eyeRedrawInterval);
            this.eyeRedrawInterval = setInterval(
                this.updateEyeFrame.bind(this),
                1000 / newRefreshRate
            );
            this.refreshRate = newRefreshRate;
        }

        if (!JSON.stringify(this.eyelidColor) !== JSON.stringify(newEyelidColor)) {
            this.eyelidColor = newEyelidColor;
            this.area.queue_repaint();
        }
    }
    //#endregion

    //#region Blink method
    blink() { // TODO blink when toggling tracker
        const blinkInterval = 1000 / this.refreshRate;
        const totalFrames = Math.ceil(this.refreshRate * (BLINK_DURATION / 1000));
        const halfFrames = totalFrames / 2;

        this.eyelidLevelInterval = clearInterval(this.eyelidLevelInterval);
        this.blinking = true;

        let currentFrame = 0;
        this.eyelidLevelInterval = setInterval(() => {
            currentFrame++;
            const eyelidLevel = currentFrame <= halfFrames
                ? currentFrame / halfFrames // Closing
                : 1 - ((currentFrame - halfFrames) / halfFrames); // Opening

            this.eyelidLevel = eyelidLevel;

            // Finishing
            if (currentFrame > totalFrames) {
                this.eyelidLevel = 0;
                this.blinking = false;
                this.area.queue_repaint(); // Ensure that blinking animation ends with eyelid completely opened
                this.eyelidLevelInterval = clearInterval(this.eyelidLevelInterval);
            }
        }, blinkInterval);
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disconnect repaint signal
        this.area.disconnect(this.repaintHandler);

        // Stop blinking
        this.randomBlinkTimeout = clearTimeout(this.randomBlinkTimeout);
        this.eyelidLevelInterval = clearInterval(this.eyelidLevelInterval);

        // Stop periodic redraw
        this.eyeRedrawInterval = clearInterval(this.eyeRedrawInterval);

        // Destroy drawing
        this.area.destroy();
        this.area = null;

        // Disconnect settings signal handlers
        this.settingsHandlers.forEach((connection) => this.settings.disconnect(connection));
        this.settingsHandlers = null;
        if (this.hasAccentColor) {
            this.themeContext.disconnectObject(this);
            this.themeContext = null;
        }

        // Destroy popups
        this.menuItems.forEach((menuItem) => menuItem.destroy());
        this.menuItems.length = 0;

        // Drop settings objects
        this.settings = null;

        // Drop tracker
        this.mouseTracker = null;

        // Destroy the button
        super.destroy();
    }
    //#endregion
});

//#region Creating eyes
/**
 * Creates Eye instances and adds them to the panel based on extension settings.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 * @param {TrackerManager} trackerManager - The mouse tracker object.
 */
export function spawnEyes(extension, eyeArray, trackerManager) {
    // Remove current eyes
    destroyEyes(eyeArray);

    if (!extension.settings.get_boolean('eye-active'))
        return; // Stop here if eyes are disabled

    const count = extension.settings.get_int('eye-count');
    const index = extension.settings.get_int('eye-index');
    const position = extension.settings.get_string('eye-position');
    const domain = extension.metadata['gettext-domain'];

    for (let i = 0; i < count; i++) {
        const eye = new Eye(extension, trackerManager);
        Main.panel.addToStatusArea(`${domain}-${i}`, eye, index, position);
        eyeArray.push(eye);
    }
}
//#endregion

//#region Destroying eyes
/**
 * Destroys any Eye instances present in the panel.
 *
 * @param {Eye[]} eyeArray - The array that stores created Eye instances.
 */
export function destroyEyes(eyeArray) {
    eyeArray?.forEach((eye) => eye.destroy());
    eyeArray.length = 0;
}
//#endregion

//#region Helper functions
/**
 * Parses an `rgb(r, g, b)` color string and returns an object with 'red', 'green', and 'blue' properties.
 *
 * @param {string} rgbString - The color string (color value 0-255).
 * @returns {object} The object with 'red', 'green', and 'blue' properties.
 */
function parseRGB(rgbString) {
    const [red, green, blue] = rgbString.match(/[\d.]+/g).map((value) => value / 255);
    return {
        red,
        green,
        blue,
    };
}
//#endregion
