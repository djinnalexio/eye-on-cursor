// SPDX-FileCopyrightText: 2020-2023 Eye and Mouse Extended Contributors
// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gdk from 'gi://Gdk';
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
const PUPIL_COLOR = new Gdk.RGBA();
PUPIL_COLOR.parse('rgb(0, 0, 0)');
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
        super(0, _('Animated eye that follows the mouse cursor'), false);

        this.settings = extension.getSettings();

        // Check if accent color variable exists (GNOME 47+)
        this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.hasAccentColor = this.interfaceSettings.list_keys().includes('accent-color');
        this.themeContext = null;

        // Attach mouse tracker
        this.mouseTracker = trackerManager;
        this.trackerColor = null;

        // Variables for initial state
        this.mousePositionX = 0;
        this.mousePositionY = 0;
        this.eyelidLevel = 0;
        this.blinking = false;
        this.eyelidLevelInterval = null;
        this.randomBlinkTimeout = null;
        this.eyeRedrawInterval = null;

        // Initialize settings values
        this.reactive = this.settings.get_boolean('eye-reactive');
        this.shape = this.settings.get_string('eye-shape');
        this.lineMode = this.settings.get_boolean('eye-line-mode');
        this.lineWidth = this.settings.get_int('eye-line-width') / 10;
        this.width = this.settings.get_int('eye-width');
        this.irisColorEnabled =
            this.hasAccentColor ? this.settings.get_boolean('eye-color-iris-enabled') : true;
        this.irisColor = new Gdk.RGBA();
        this.irisColor.parse(this.settings.get_string('eye-color-iris'));
        this.refreshRate = this.settings.get_int('eye-refresh-rate');
        this.eyelidColor = new Gdk.RGBA();
        this.eyelidColor.parse(this.settings.get_string('eye-color-eyelid'));
        // TODO use foreground color as default eyelid to match it with contour

        // Connect change in settings to update method
        this.settingsHandlers = EYE_SETTINGS.map((key) =>
            this.settings.connect(`changed::${key}`, this.updateEyeProperties.bind(this))
        );

        // Use desktop accent color as default eye color (GNOME 47+)
        if (this.hasAccentColor) {
            this.themeContext = St.ThemeContext.get_for_stage(global.stage);
            const [accent] = this.themeContext.get_accent_color();
            this.accentColor = new Gdk.RGBA({ // From Cogl.Color object to Gdk.RGBA object
                red: accent.get_red(),
                green: accent.get_green(),
                blue: accent.get_blue(),
            });
            this.themeContext.connectObject(
                'changed',
                () => {
                    const [accent] = this.themeContext.get_accent_color();
                    this.accentColor = new Gdk.RGBA({ // From Cogl.Color object to Gdk.RGBA object
                        red: accent.get_red(),
                        green: accent.get_green(),
                        blue: accent.get_blue(),
                    });
                    this.area.queue_repaint();
                }
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
            this.mousePositionX !== mouseX ||
                this.mousePositionY !== mouseY ||
                this.trackerColor !== this.mouseTracker.currentColor ||
                this.blinking
        ) {
            [this.mousePositionX, this.mousePositionY] = [mouseX, mouseY];
            this.trackerColor = this.mouseTracker.currentColor;
            this.area.queue_repaint();
        }
    }

    // Draw method
    onRepaint(area) {
        // Get the coordinates of the eye
        let [originX, originY] = [0, 0];
        let obj = area;
        while (obj) { // Loop through the hierarchy of elements to calculate absolute
            let [tx, ty] = [0, 0];
            try {
                [tx, ty] = obj.get_position();
            } catch { /* Loop safely breaks when failed */ }
            // Accumulate the coordinates
            originX += tx;
            originY += ty;
            // Switch to the parent of the current element
            obj = obj.get_parent();
        }

        // Use foreground color from the theme for the white of the eye
        const themeNode = this.area.get_theme_node();
        const sceleraColor = themeNode.get_foreground_color();

        // Get iris color
        let irisColor;
        if (this.mouseTracker.enabled) {
            irisColor = new Gdk.RGBA();
            irisColor.parse(this.trackerColor);
        } else if (this.irisColorEnabled) {
            irisColor = this.irisColor;
        } else {
            irisColor = this.accentColor;
        }

        const options = {
            originX,
            originY,
            eyelidColor: this.eyelidColor,
            eyelidLevel: this.eyelidLevel,
            irisColor,
            lineMode: this.lineMode,
            lineWidth: this.lineWidth,
            pupilColor: PUPIL_COLOR,
            sceleraColor,
            shape: this.shape,
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
        const newIrisColorEnabled =
            this.hasAccentColor ? this.settings.get_boolean('eye-color-iris-enabled') : true;
        const newIrisColor = new Gdk.RGBA();
        newIrisColor.parse(this.settings.get_string('eye-color-iris'));
        const newRefreshRate = this.settings.get_int('eye-refresh-rate');
        const newEyelidColor = new Gdk.RGBA();
        newEyelidColor.parse(this.settings.get_string('eye-color-eyelid'));

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
        if (this.irisColorEnabled !== newIrisColorEnabled || !this.irisColor.equal(newIrisColor)) {
            this.irisColorEnabled = newIrisColorEnabled;
            this.irisColor = newIrisColor;
            this.area.queue_repaint();
        }

        // Update refresh rate
        if (this.refreshRate !== newRefreshRate) {
            clearInterval(this.eyeRedrawInterval);
            this.eyeRedrawInterval = setInterval(
                this.updateEyeFrame.bind(this),
                1000 / newRefreshRate
            );
            this.refreshRate = newRefreshRate;
        }

        if (!this.eyelidColor.equal(newEyelidColor)) {
            this.eyelidColor = newEyelidColor;
            this.area.queue_repaint();
        }
    }
    //#endregion

    //#region Destroy method
    destroy() {
        // Disconnect repaint signal
        this.area.disconnect(this.repaintHandler);

        // Stop periodic redraw
        clearInterval(this.eyeRedrawInterval);

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
        this.interfaceSettings = null;

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

    if (extension.settings.get_boolean('eye-active')) {
        for (let count = 0; count < extension.settings.get_int('eye-count'); count++) {
            eyeArray.push(new Eye(extension, trackerManager));
            Main.panel.addToStatusArea(
                `${extension.metadata['gettext-domain']}-${count}`,
                eyeArray[count],
                extension.settings.get_int('eye-index'),
                extension.settings.get_string('eye-position')
            );
        }
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
