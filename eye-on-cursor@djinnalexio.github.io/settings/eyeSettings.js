/* eyeSettings.js
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
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {KeybindingRow} from './keybinding.js';
//#endregion

export const EyePage = GObject.registerClass(
    class EyePage extends Adw.PreferencesPage {
        constructor(extensionObject) {
            /**
             * A page displaying the eye settings
             *
             * @param {Extension} extensionObject - the extension object
             */

            super({
                title: _('Eye'),
                icon_name: 'view-reveal-symbolic',
            });

            this.settings = extensionObject.getSettings();

            //#region Eye placement group
            const placementGroup = new Adw.PreferencesGroup({
                title: _('Eye Placement'),
            });
            this.add(placementGroup);

            //#region Eye position
            const positionLabelList = new Gtk.StringList();
            [_('Left'), _('Center'), _('Right')].forEach(position =>
                positionLabelList.append(position)
            );

            const positionRow = new Adw.ComboRow({
                title: _('Position'),
                subtitle: _('Position of the eye on the panel'),
                model: positionLabelList,
                selected: this.settings.get_enum('eye-position'),
            });
            positionRow.connect('notify::selected', widget => {
                this.settings.set_enum('eye-position', widget.selected);
            });
            placementGroup.add(positionRow);
            //#endregion

            //#region Eye index
            const indexRow = new Adw.SpinRow({
                title: _('Index'),
                subtitle: _('Index of the eye on the panel segment'),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 100,
                    step_increment: 1,
                }),
                value: this.settings.get_int('eye-index'),
            });
            indexRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-index', widget.value);
            });
            placementGroup.add(indexRow);
            //#endregion

            //#region Eye count
            const countRow = new Adw.SpinRow({
                title: _('Count'),
                subtitle: _('Number of eyes to be spawned'),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 100,
                    step_increment: 1,
                }),
                value: this.settings.get_int('eye-count'),
            });
            countRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-count', widget.value);
            });
            placementGroup.add(countRow);
            //#endregion

            //#region Eye margin
            const widthRow = new Adw.SpinRow({
                title: _('Width'),
                subtitle: _('Drawing space and padding of the eye'),
                adjustment: new Gtk.Adjustment({
                    lower: 20,
                    upper: 1000,
                    step_increment: 1,
                }),
                value: this.settings.get_int('eye-width'),
            });
            widthRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-width', widget.value);
            });
            placementGroup.add(widthRow);
            //#endregion

            //#region Eye reactivity
            const reactiveRow = new Adw.SwitchRow({
                title: _('Menu'),
                subtitle: _('Enable the eye submenu'),
                active: this.settings.get_boolean('eye-reactive'),
            });
            reactiveRow.connect('notify::active', widget => {
                this.settings.set_boolean('eye-reactive', widget.active);
            });
            placementGroup.add(reactiveRow);
            //#endregion
            //#endregion

            //#region Eye Drawing group
            const drawingGroup = new Adw.PreferencesGroup({
                title: _('Eye Drawing'),
            });
            this.add(drawingGroup);

            //#region Eye shape
            const shapeLabelList = new Gtk.StringList();
            [_('Eyelid'), _('Comic'), _('Round')].forEach(shape => shapeLabelList.append(shape));

            const shapeRow = new Adw.ComboRow({
                title: _('Shape'),
                subtitle: _('Shape of the eye'),
                model: shapeLabelList,
                selected: this.settings.get_enum('eye-shape'),
            });
            shapeRow.connect('notify::selected', widget => {
                this.settings.set_enum('eye-shape', widget.selected);
            });
            drawingGroup.add(shapeRow);
            //#endregion

            //#region Eye outline mode
            const lineModeRow = new Adw.ExpanderRow({
                title: _('Outline Mode'),
                subtitle: _('Draw the eye as outline only'),
                show_enable_switch: true,
                expanded: this.settings.get_boolean('eye-line-mode'),
                enable_expansion: this.settings.get_boolean('eye-line-mode'),
            });
            lineModeRow.connect('notify::expanded', widget => {
                lineModeRow.enable_expansion = widget.expanded;
                this.settings.set_boolean('eye-line-mode', widget.expanded);
            });
            drawingGroup.add(lineModeRow);
            //#endregion

            //#region Eye line width
            const lineWidthRow = new Adw.SpinRow({
                title: _('Strokes'),
                subtitle: _('Thickness of the strokes'),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 50,
                    step_increment: 1,
                }),
                value: this.settings.get_int('eye-line-width'),
            });
            lineWidthRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-line-width', widget.value);
            });
            lineModeRow.add_row(lineWidthRow);
            //#endregion

            //#region Eye color
            // Color picker
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

            const colorRow = new Adw.ActionRow({
                title: _('Color'),
                subtitle: _('Custom iris color'),
            });

            const irisColorPicker = newColorPicker(this.settings, 'eye-color-iris');

            // Iris Color Toggle
            const irisColorToggle = new Gtk.CheckButton({
                active: this.settings.get_boolean('eye-color-iris-enabled'),
                hexpand: false,
                margin_end: 8,
                valign: Gtk.Align.CENTER,
                vexpand: false,
            });
            irisColorToggle.connect('toggled', widget => {
                this.settings.set_boolean('eye-color-iris-enabled', widget.active);
                irisColorPicker.set_sensitive(widget.active);
            });
            irisColorPicker.set_sensitive(irisColorToggle.active);

            const colorBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            colorBox.append(irisColorToggle);
            colorBox.append(irisColorPicker);

            colorRow.add_suffix(colorBox);
            drawingGroup.add(colorRow);
            //#endregion

            //#region Eye refresh rate
            const refreshRow = new Adw.SpinRow({
                title: _('Refresh Rate'),
                subtitle: _('Hz'),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 360,
                    step_increment: 1,
                }),
                value: this.settings.get_int('eye-refresh-rate'),
            });
            refreshRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-refresh-rate', widget.value);
            });
            drawingGroup.add(refreshRow);
            //#endregion
            //#endregion

            //#region Eye Blink group
            const blinkGroup = new Adw.PreferencesGroup({
                title: _('Eye Blink'),
            });
            this.add(blinkGroup);

            //#region Eyelid Color
            const colorEyelidRow = new Adw.ActionRow({
                title: _('Eyelid Color'),
                subtitle: _('Color of the eyelid'),
            });

            const colorEyelidBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            colorEyelidBox.append(newColorPicker(this.settings, 'eye-color-eyelid'));

            colorEyelidRow.add_suffix(colorEyelidBox);
            blinkGroup.add(colorEyelidRow);
            //#endregion

            //#region Blink Mode
            const blinkModeList = new Gtk.StringList();
            [_('Manual'), _('Synced'), _('Unsynced')].forEach(mode => blinkModeList.append(mode));
            // Each option enables the corresponding row
            const blinkModeRow = new Adw.ComboRow({
                title: _('Blink Mode'),
                subtitle: _('Blink Control Method'),
                model: blinkModeList,
                selected: this.settings.get_enum('eye-blink-mode'),
            });
            blinkModeRow.connect('notify::selected', widget => {
                this.settings.set_enum('eye-blink-mode', widget.selected);
            });
            blinkGroup.add(blinkModeRow);
            //#endregion

            //#region Blink Keybinding
            const blinkKeybindRow = new KeybindingRow(
                this.settings,
                'eye-blink-keybinding',
                _('Manual Blink Key')
            );

            blinkGroup.set_header_suffix(blinkKeybindRow.resetButton);
            blinkGroup.add(blinkKeybindRow);
            //#endregion

            //#region Blink Interval
            const blinkIntervalRow = new Adw.SpinRow({
                title: _('Synced Blinking Interval'),
                subtitle: _('Seconds between blinks'),
                adjustment: new Gtk.Adjustment({
                    lower: 0.5,
                    upper: 60,
                    step_increment: 0.1,
                }),
                digits: 1,
                value: this.settings.get_double('eye-blink-interval'),
            });
            blinkIntervalRow.adjustment.connect('value-changed', widget => {
                this.settings.set_double('eye-blink-interval', widget.value);
            });
            blinkGroup.add(blinkIntervalRow);
            //#endregion

            //#region Blink Interval Range
            const blinkIntervalRangeRow = new Adw.ActionRow({
                title: _('Unsynced Blinking Interval'),
                subtitle: _('Range of seconds between blinks'),
            });

            const blinkIntervalRange = this.settings
                .get_value('eye-blink-interval-range')
                .deep_unpack();

            const minIntervalButton = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 0.5,
                    upper: 59.9,
                    step_increment: 0.1,
                }),
                digits: 1,
                hexpand: false,
                margin_end: 8,
                margin_top: 8,
                valign: Gtk.Align.CENTER,
                vexpand: false,
                value: blinkIntervalRange[0],
            });
            const maxIntervalButton = new Gtk.SpinButton({
                adjustment: new Gtk.Adjustment({
                    lower: 0.6,
                    upper: 60,
                    step_increment: 0.1,
                }),
                digits: 1,
                hexpand: false,
                margin_end: 8,
                margin_bottom: 8,
                valign: Gtk.Align.CENTER,
                vexpand: false,
                value: blinkIntervalRange[1],
            });

            // Function to validate and correct interval range values
            function validateIntervals(valueChanged) {
                let minValue = minIntervalButton.get_value();
                let maxValue = maxIntervalButton.get_value();

                // Ensure a minimum gap of 0.1 between min and max
                if (maxValue - minValue < 0.1) {
                    switch (valueChanged) {
                        case 'min':
                            minValue = maxValue - 0.1;
                            minIntervalButton.set_value(minValue);
                            break;
                        case 'max':
                        default:
                            maxValue = minValue + 0.1;
                            maxIntervalButton.set_value(maxValue);
                            break;
                    }
                }

                // Update the settings with validated values
                this.settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant('ad', [minValue, maxValue])
                );
            }

            minIntervalButton.connect('value-changed', validateIntervals.bind(this, 'min'));
            maxIntervalButton.connect('value-changed', validateIntervals.bind(this, 'max'));

            const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
            box.append(minIntervalButton);
            box.append(new Gtk.Label({label: _('to'), margin_end: 8}));
            box.append(maxIntervalButton);

            blinkIntervalRangeRow.add_suffix(box);
            blinkGroup.add(blinkIntervalRangeRow);
            //#endregion
            //#endregion
        }
    }
);
