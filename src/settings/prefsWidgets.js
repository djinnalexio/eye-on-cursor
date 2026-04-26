// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

//#region Color picker
/**
 * Returns a `Gtk.ColorDialogButton` connected to a provided color key.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {string} key - The schema key in the settings object for this keybinding.
 * @returns {Gtk.ColorDialogButton} The color picker button connected to the provided color setting.
 */
export function newColorPicker(settings, key) {
    const colorPicker = new Gtk.ColorDialogButton({
        dialog: new Gtk.ColorDialog({
            modal: true,
            with_alpha: false,
        }),
        hexpand: false,
        margin_end: 8,
        valign: Gtk.Align.CENTER,
        vexpand: false,
    });
    const currentColor = colorPicker.get_rgba();// New Gdk.RGBA();
    currentColor.parse(settings.get_string(key));
    colorPicker.set_rgba(currentColor);

    colorPicker.connect('notify::rgba', (widget) => {
        // Convert 'rgb(255,255,255)' to '#ffffff'
        const rgbCode = widget.get_rgba().to_string();
        const hexCode =
            `#${rgbCode
                    .replace(/^rgb\(|\s+|\)$/g, '') // Remove 'rgb()'
                    .split(',') // Split numbers at ","
                    .map((string) => parseInt(string)) // Convert them to int
                    .map((number) => number.toString(16)) // Convert them to base16
                    .map((string) => string.length === 1 ? `0${string}` : string) // Add a leading 0
                    .join('') // Join them back into a string
            }`;
        settings.set_string(key, hexCode);
    }); // TODO remove the transition to Hex code
    return colorPicker;
    // And add a function in `extension.js` for a version or two to converts hex to rgb notation
}
//#endregion

//#region Keybinding row
/**
 * A row that allows users to set a keyboard shortcut.
 *
 * @param {Gio.Settings} settings - The settings object for this extension.
 * @param {string} key - The schema key in the settings object for this keybinding.
 * @param {string} shortcutName - The name of the shortcut and title of the row.
 */
export const KeybindingRow = GObject.registerClass(
class KeybindingRow extends Adw.ActionRow {
    //#region Constructor
    constructor(settings, key, shortcutName) {
        super({
            title: shortcutName,
            subtitle: _('Set a shortcut'),
            activatable: true,
        });

        // Display current keybinding
        this.label = new Gtk.ShortcutLabel({
            disabled_text: _('New shortcut…'),
            valign: Gtk.Align.CENTER,
            hexpand: false,
            vexpand: false,
            accelerator: settings.get_strv(key)[0],
        });
        this.box = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        this.box.append(this.label);
        this.add_suffix(this.box);

        // Button to reset keybinding
        this.resetButton = new Gtk.Button({
            icon_name: 'edit-delete-symbolic',
            css_classes: ['error'],
            hexpand: false,
            vexpand: false,
        });
        this.resetButton.connect('clicked', this.resetKeybinding.bind(this));

        // Hide reset button if no shortcut is set
        if (!this.label.accelerator)
            this.resetButton.visible = false;

        // Connect row activation to open capture window
        this.captureWindow = null;
        this.connect('activated', this.openCaptureWindow.bind(this));

        // Connect change in accelerator to setting update
        this.label.connect('notify::accelerator', (widget) =>
            settings.set_strv(key, [widget.accelerator])
            // Main.wm.addKeybinding takes string arrays, not strings
        );
    }
    //#endregion

    //#region Keybinding methods
    resetKeybinding() {
        this.label.accelerator = '';
        this.resetButton.visible = false;
    }

    openCaptureWindow() {
        const controller = new Gtk.EventControllerKey();

        const content = new Adw.StatusPage({
            title: _('Set a shortcut'),
            description: _('Press Esc to cancel or Backspace to disable the shortcut'),
            icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
        });

        this.captureWindow = new Adw.Window({
            modal: true,
            hide_on_close: true,
            transient_for: this.get_root(),
            width_request: 480,
            height_request: 320,
            content,
        });

        this.captureWindow.add_controller(controller);
        controller.connect('key-pressed', this.registerKey.bind(this));
        this.captureWindow.present();
    }

    registerKey(widget, keyval, keycode, state) {
        // Get default modifier mask (keys) that are currently pressed
        let mask = state & Gtk.accelerator_get_default_mod_mask();
        // Filter out CAPS LOCK
        mask &= ~Gdk.ModifierType.LOCK_MASK;

        // If Esc is pressed without modifiers, close capture window
        if (!mask && keyval === Gdk.KEY_Escape) {
            this.captureWindow.close();
            return Gdk.EVENT_STOP;
        }

        // If Backspace is pressed, reset keybinding
        if (keyval === Gdk.KEY_BackSpace) {
            this.resetKeybinding();
            this.captureWindow.destroy();
            return Gdk.EVENT_STOP;
        }

        // If the key combination is not acceptable, ignore it
        if (!this.isValidBinding(mask, keycode, keyval) || !this.isValidAccel(mask, keyval))
            return Gdk.EVENT_STOP;

        this.label.accelerator = Gtk.accelerator_name_with_keycode(null, keyval, keycode, mask);
        this.resetButton.visible = true;
        this.captureWindow.destroy();
        return Gdk.EVENT_STOP;
    }

    //#region Keybinding validation
    // See https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c
    isValidBinding(mask, keycode, keyval) {
        if (mask === 0)
            return false;

        if (mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0) {
            if (
                this.isKeyInRange(keyval, Gdk.KEY_A, Gdk.KEY_Z) ||
                    this.isKeyInRange(keyval, Gdk.KEY_0, Gdk.KEY_9) ||
                    this.isKeyInRange(keyval, Gdk.KEY_a, Gdk.KEY_z) ||
                    this.isKeyInRange(keyval, Gdk.KEY_kana_fullstop, Gdk.KEY_semivoicedsound) ||
                    this.isKeyInRange(keyval, Gdk.KEY_Arabic_comma, Gdk.KEY_Arabic_sukun) ||
                    this.isKeyInRange(keyval, Gdk.KEY_Serbian_dje, Gdk.KEY_Cyrillic_HARDSIGN) ||
                    this.isKeyInRange(keyval, Gdk.KEY_Greek_ALPHAaccent, Gdk.KEY_Greek_omega) ||
                    this.isKeyInRange(keyval, Gdk.KEY_hebrew_doublelowline, Gdk.KEY_hebrew_taf) ||
                    this.isKeyInRange(keyval, Gdk.KEY_Thai_kokai, Gdk.KEY_Thai_lekkao) ||
                    this.isKeyInRange(
                        keyval,
                        Gdk.KEY_Hangul_Kiyeog,
                        Gdk.KEY_Hangul_J_YeorinHieuh
                    ) ||
                    (keyval === Gdk.KEY_space && mask === 0) ||
                    this.keyvalIsForbidden(keyval)
            )
                return false;
        }
        return true;
    }

    keyvalIsForbidden(keyval) {
        return [
            // Navigation keys
            Gdk.KEY_Home,
            Gdk.KEY_Left,
            Gdk.KEY_Up,
            Gdk.KEY_Right,
            Gdk.KEY_Down,
            Gdk.KEY_Page_Up,
            Gdk.KEY_Page_Down,
            Gdk.KEY_End,
            Gdk.KEY_Tab,

            // Return
            Gdk.KEY_KP_Enter,
            Gdk.KEY_Return,

            Gdk.KEY_Mode_switch,
        ].includes(keyval);
    }

    isKeyInRange(keyval, start, end) {
        return keyval >= start && keyval <= end;
    }

    isValidAccel(mask, keyval) {
        return Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0);
    }
    //#endregion
    //#endregion
});
//#endregion
