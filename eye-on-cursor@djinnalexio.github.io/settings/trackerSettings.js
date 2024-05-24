/* trackerSettings.js
 *
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
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gio from 'gi://Gio';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

export const TrackerPage = GObject.registerClass(
    class TrackerPage extends Adw.PreferencesPage {
        constructor(extensionObject) {
            super({
                title: _('Mouse Tracker'),
                icon_name: 'input-mouse-symbolic',
            });

            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            //#region Tracker drawing group
            const drawingGroup = new Adw.PreferencesGroup({title: _('Tracker Drawing')});
            this.add(drawingGroup);

            //#region Tracker shape
            function getSVGsList(path) {
                const svgsList = [];
                const svgsDir = Gio.file_new_for_path(path);
                const enumFiles = svgsDir.enumerate_children(
                    'standard::name',
                    Gio.FileQueryInfoFlags.NONE,
                    null
                );
                let fileInfo;
                while ((fileInfo = enumFiles.next_file(null)) !== null) {
                    const fileName = fileInfo.get_name();
                    if (fileName.toLowerCase().endsWith('.svg'))
                        svgsList.push(fileName.replace('.svg', ''));
                }
                svgsList.sort();
                return svgsList;
            }

            const shapeList = getSVGsList(`${this.path}/media/glyphs/`);
            const shapeLabelList = new Gtk.StringList();
            shapeList.forEach(shape => {
                shape = shape.replaceAll('_', ' ');
                shapeLabelList.append(shape);
            });

            const shapeRow = new Adw.ComboRow({
                title: _('Shape'),
                subtitle: _('Shape of the tracker'),
                model: shapeLabelList,
                enable_search: true,
                expression: new Gtk.PropertyExpression(Gtk.StringObject, null, 'string'),
                selected: shapeList.indexOf(this.settings.get_string('tracker-shape')),
            });
            shapeRow.connect('notify::selected', widget => {
                this.settings.set_string('tracker-shape', shapeList[widget.selected]);
            });
            drawingGroup.add(shapeRow);
            //#endregion

            //#region Tracker size
            const sizeRow = new Adw.SpinRow({
                title: _('Size'),
                subtitle: _('Size of the tracker'),
                adjustment: new Gtk.Adjustment({
                    lower: 128,
                    upper: 1024,
                    step_increment: 16,
                }),
                value: this.settings.get_int('tracker-size'),
            });
            sizeRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('tracker-size', widget.value);
            });
            drawingGroup.add(sizeRow);
            //#endregion

            //#region Tracker colors
            function newColorPicker(settings, key) {
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
                const currentColor = colorPicker.get_rgba();
                currentColor.parse(settings.get_string(key));
                colorPicker.set_rgba(currentColor);

                colorPicker.connect('notify::rgba', widget => {
                    // Convert 'rgb(255,255,255)' to '#ffffff'
                    const rgbCode = widget.get_rgba().to_string();
                    const hexCode =
                        '#' +
                        rgbCode
                            .replace(/^rgb\(|\s+|\)$/g, '') // Remove 'rgb()'
                            .split(',') // Split numbers at ","
                            .map(string => parseInt(string)) // Convert them to int
                            .map(number => number.toString(16)) // Convert them to base16
                            .map(string => (string.length === 1 ? '0' + string : string)) // If the length of the string is 1, adds a leading 0
                            .join(''); // Join them back into a string
                    settings.set_string(key, hexCode);
                });
                return colorPicker;
            }

            const colorDefaultRow = new Adw.ActionRow({
                title: _('Default Color'),
                subtitle: _('Default color of the tracker'),
            });

            const colorDefaultBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            colorDefaultBox.append(newColorPicker(this.settings, 'tracker-color'));

            colorDefaultRow.add_suffix(colorDefaultBox);
            drawingGroup.add(colorDefaultRow);

            const colorClickRow = new Adw.ActionRow({
                title: _('Colors on Click'),
                subtitle: _('Colors when left, middle, and right-clicking'),
            });

            const colorClickBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            ['tracker-color-left', 'tracker-color-middle', 'tracker-color-right'].forEach(key => {
                colorClickBox.append(newColorPicker(this.settings, key));
            });
            colorClickRow.add_suffix(colorClickBox);
            drawingGroup.add(colorClickRow);
            //#endregion

            //#region Tracker opacity
            const opacityRow = new Adw.SpinRow({
                title: _('Opacity'),
                subtitle: _('Opacity of the tracker'),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 100,
                    step_increment: 10,
                }),
                value: this.settings.get_int('tracker-opacity'),
            });
            opacityRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('tracker-opacity', widget.value);
            });
            drawingGroup.add(opacityRow);
            //#endregion

            //#region Tracker repaint interval
            const repaintRow = new Adw.SpinRow({
                title: _('Refresh Interval'),
                subtitle: _(
                    'Milliseconds between redraws of the tracker. Lower is faster, but more CPU intensive.'
                ),
                adjustment: new Gtk.Adjustment({
                    lower: 5, // Min 5ms interval => max 200fps
                    upper: 1000, // Max 1000ms interval => min 1fps
                    step_increment: 10,
                }),
                value: this.settings.get_int('tracker-repaint-interval'),
            });
            repaintRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('tracker-repaint-interval', widget.value);
            });
            drawingGroup.add(repaintRow);
            //#endregion
            //#endregion

            //#region Tracker keybinding
            const keybindGroup = new Adw.PreferencesGroup({title: _('Tracker keybinding')});
            this.add(keybindGroup);

            // Create row
            const keybindRow = new Adw.ActionRow({
                title: _('Toggle Tracker'),
                subtitle: _('Set a shortcut'),
                activatable: true,
            });

            // Display current keybinding
            const keybindLabel = new Gtk.ShortcutLabel({
                disabled_text: _('New shortcut…'),
                valign: Gtk.Align.CENTER,
                hexpand: false,
                vexpand: false,
                accelerator: this.settings.get_strv('tracker-keybinding')[0],
            });

            const keybindBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            keybindBox.append(keybindLabel);
            keybindRow.add_suffix(keybindBox);

            // Connect row to launch capture window
            keybindRow.connect('activated', openCaptureWindow.bind(this));

            // Connect change in accelerator to update setting
            keybindLabel.connect('notify::accelerator', widget => {
                this.settings.set_strv('tracker-keybinding', [widget.accelerator]);
                // Main.wm.addKeybinding takes string arrays, not strings
            });

            // Button to reset keybinding
            const resetKeybindButton = new Gtk.Button({
                icon_name: 'edit-delete-symbolic',
                css_classes: ['error'],
                hexpand: false,
                vexpand: false,
            });

            resetKeybindButton.connect('clicked', resetKeybind.bind(this));
            function resetKeybind() {
                keybindLabel.accelerator = '';
                resetKeybindButton.visible = false;
            }
            // Hide it if no shortcut is set
            if (!keybindLabel.accelerator) resetKeybindButton.visible = false;

            keybindGroup.set_header_suffix(resetKeybindButton);

            //#region Keybinding Capture
            let captureWindow;
            function openCaptureWindow(row) {
                const controller = new Gtk.EventControllerKey();

                const content = new Adw.StatusPage({
                    title: _('Toggle Tracker'),
                    description: _('Press Esc to cancel or Backspace to disable the shortcut'),
                    icon_name: 'preferences-desktop-keyboard-shortcuts-symbolic',
                });

                captureWindow = new Adw.Window({
                    modal: true,
                    hide_on_close: true,
                    transient_for: row.get_root(),
                    width_request: 480, // TODO resize this later
                    height_request: 320,
                    content,
                });

                captureWindow.add_controller(controller);
                controller.connect('key-pressed', registerKey.bind(this));
                captureWindow.present();
            }

            function registerKey(widget, keyval, keycode, state) {
                // Get default modifier mask (keys) that are currently pressed
                let mask = state & Gtk.accelerator_get_default_mod_mask();
                // Filter out CAPS LOCK
                mask &= ~Gdk.ModifierType.LOCK_MASK;

                // If Esc is pressed without modifiers, close capture window
                if (!mask && keyval === Gdk.KEY_Escape) {
                    captureWindow.close();
                    return Gdk.EVENT_STOP;
                }

                // If Backspace is pressed, reset keybinding
                if (keyval === Gdk.KEY_BackSpace) {
                    resetKeybind();
                    captureWindow.destroy();
                    return Gdk.EVENT_STOP;
                }

                // If the key combination is not acceptable, ignore it
                if (!isValidBinding(mask, keycode, keyval) || !isValidAccel(mask, keyval)) {
                    return Gdk.EVENT_STOP;
                }

                // Save shortcut
                keybindLabel.accelerator = Gtk.accelerator_name_with_keycode(
                    null,
                    keyval,
                    keycode,
                    mask
                );
                resetKeybindButton.visible = true;
                captureWindow.destroy();
                return Gdk.EVENT_STOP;
            }
            //#endregion

            //#region Keybinding Validation
            // Validating functions from https://gitlab.gnome.org/GNOME/gnome-control-center/-/blob/main/panels/keyboard/keyboard-shortcuts.c

            function keyvalIsForbidden(keyval) {
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

            function isValidBinding(mask, keycode, keyval) {
                if (mask === 0) return false;

                if (mask === Gdk.ModifierType.SHIFT_MASK && keycode !== 0) {
                    if (
                        isKeyInRange(keyval, Gdk.KEY_a, Gdk.KEY_z) ||
                        isKeyInRange(keyval, Gdk.KEY_A, Gdk.KEY_Z) ||
                        isKeyInRange(keyval, Gdk.KEY_0, Gdk.KEY_9) ||
                        isKeyInRange(keyval, Gdk.KEY_kana_fullstop, Gdk.KEY_semivoicedsound) ||
                        isKeyInRange(keyval, Gdk.KEY_Arabic_comma, Gdk.KEY_Arabic_sukun) ||
                        isKeyInRange(keyval, Gdk.KEY_Serbian_dje, Gdk.KEY_Cyrillic_HARDSIGN) ||
                        isKeyInRange(keyval, Gdk.KEY_Greek_ALPHAaccent, Gdk.KEY_Greek_omega) ||
                        isKeyInRange(keyval, Gdk.KEY_hebrew_doublelowline, Gdk.KEY_hebrew_taf) ||
                        isKeyInRange(keyval, Gdk.KEY_Thai_kokai, Gdk.KEY_Thai_lekkao) ||
                        isKeyInRange(keyval, Gdk.KEY_Hangul_Kiyeog, Gdk.KEY_Hangul_J_YeorinHieuh) ||
                        (keyval === Gdk.KEY_space && mask === 0) ||
                        keyvalIsForbidden(keyval)
                    ) {
                        return false;
                    }
                }

                return true;
            }

            function isKeyInRange(keyval, start, end) {
                return keyval >= start && keyval <= end;
            }

            function isValidAccel(mask, keyval) {
                return (
                    Gtk.accelerator_valid(keyval, mask) || (keyval === Gdk.KEY_Tab && mask !== 0)
                );
            }
            //#endregion

            keybindGroup.add(keybindRow);
            //#endregion
        }
    }
);
