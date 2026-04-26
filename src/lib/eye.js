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

import * as EyeRenderer from './eyeRenderer.js';
import * as Timeout from './timeoutUtils.js';
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
const PUPIL_COLOR = '#000000';
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
        super(0, extension.uuid, false);
        // TODO replace `extension.uuid` with a translatable string for `accessible_name`

        this.settings = extension.getSettings();

        // Check if accent color variable exists (GNOME 47+)
        this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.hasAccentColor = this.interfaceSettings.list_keys().includes(ACCENT_COLORS_KEY);

        // Attach mouse tracker
        this.mouseTracker = trackerManager;
        this.trackerColor = null;

        // Variables for initial state
        this.mousePositionX = 0;
        this.mousePositionY = 0;
        this.eyelidLevel = 0;
        this.blinking = false;
        this.blinkTimeout = new Timeout.Timeout();
        this.randomBlinkTimeout = new Timeout.Timeout();
        this.eyeRedrawInterval = new Timeout.Timeout();

        // Initialize settings values
        this.reactive = this.settings.get_boolean('eye-reactive');
        this.shape = this.settings.get_string('eye-shape');
        this.lineMode = this.settings.get_boolean('eye-line-mode');
        this.lineWidth = this.settings.get_int('eye-line-width') / 10;
        this.width = this.settings.get_int('eye-width');
        this.irisColorEnabled =
            this.hasAccentColor ? this.settings.get_boolean('eye-color-iris-enabled') : true;
        this.irisColor = this.settings.get_string('eye-color-iris');
        this.refreshRate = this.settings.get_int('eye-refresh-rate');
        this.eyelidColor = this.settings.get_string('eye-color-eyelid');
        // TODO use foreground color as default eyelid to match it with contour

        // Connect change in settings to update method
        this.settingsHandlers = EYE_SETTINGS.map((key) =>
            this.settings.connect(`changed::${key}`, this.updateEyeProperties.bind(this))
        );

        // Add popups
        this.menuItems = [
            this.createPopupMenuItem(
                _('Toggle Tracker'),
                'view-reveal-symbolic',
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

        // Use desktop accent color as default eye color (GNOME 47+)
        if (this.hasAccentColor) {
            this.accentColor = ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];
            this.accentColorHandler = this.interfaceSettings.connect(
                `changed::${ACCENT_COLORS_KEY}`,
                () => {
                    this.accentColor =
                        ACCENT_COLORS[this.interfaceSettings.get_string(ACCENT_COLORS_KEY)];
                    this.area.queue_repaint();
                }
            );
        }

        // Connect the repaint signal of the area to the repaint method
        this.repaintHandler = this.area.connect('repaint', this.onRepaint.bind(this));

        // Start periodic redraw
        this.eyeRedrawInterval = Timeout.setInterval(
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
        const sceleraColor = `#${[
            'red',
            'green',
            'blue',
        ].map((color) =>
            themeNode.get_foreground_color()[color].toString(16).padStart(2, '0')).join('')}`;

        // Get iris color
        let irisColor;
        if (this.mouseTracker.enabled)
            irisColor = this.trackerColor;
        else if (this.irisColorEnabled)
            irisColor = this.irisColor;
        else
            irisColor = this.accentColor;

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
        EyeRenderer.drawEye(area, options);
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
        const newIrisColor = this.settings.get_string('eye-color-iris');
        const newRefreshRate = this.settings.get_int('eye-refresh-rate');
        const newEyelidColor = this.settings.get_string('eye-color-eyelid');

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
        if (this.irisColorEnabled !== newIrisColorEnabled || this.irisColor !== newIrisColor) {
            this.irisColorEnabled = newIrisColorEnabled;
            this.irisColor = newIrisColor;
            this.area.queue_repaint();
        }

        // Update refresh rate
        if (this.refreshRate !== newRefreshRate) {
            Timeout.clearInterval(this.eyeRedrawInterval);
            this.eyeRedrawInterval = Timeout.setInterval(
                this.updateEyeFrame.bind(this),
                1000 / newRefreshRate
            );
            this.refreshRate = newRefreshRate;
        }

        if (this.eyelidColor !== newEyelidColor) {
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
        Timeout.clearInterval(this.eyeRedrawInterval);

        // Destroy drawing
        this.area.destroy();
        this.area = null;

        // Disconnect settings signal handlers
        this.settingsHandlers?.forEach((connection) => this.settings.disconnect(connection));
        this.settingsHandlers = null;

        if (this.accentColorHandler)
            this.interfaceSettings.disconnect(this.accentColorHandler);
        this.accentColorHandler = null;

        // Destroy popups
        this.menuItems.forEach((menuItem) => menuItem?.destroy());
        this.menuItems = [];

        // Disconnect settings
        this.settings = null;
        this.interfaceSettings = null;

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
    eyeArray.length = 0; // Or eyeArray = [];
}
//#endregion
