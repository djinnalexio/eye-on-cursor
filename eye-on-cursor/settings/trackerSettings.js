/* trackerSettings.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024-2025 djinnalexio
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
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyeAboutRow} from './about.js';

import {KeybindingRow} from './keybinding.js';
//#endregion

export const TrackerPage = GObject.registerClass(
    class TrackerPage extends Adw.PreferencesPage {
        constructor(extensionObject) {
            /**
             * A page displaying the tracker settings
             *
             * @param {Extension} extensionObject - the extension object
             */

            super({
                title: _('Mouse Tracker'),
                icon_name: 'input-mouse-symbolic',
            });

            this.metadata = extensionObject.metadata;
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            //#region Tracker drawing group
            const drawingGroup = new Adw.PreferencesGroup({title: _('Appearance')});
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
                    lower: 16,
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
                title: _('Color'),
                subtitle: _('Default color of the tracker'),
            });

            const colorDefaultBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            colorDefaultBox.append(newColorPicker(this.settings, 'tracker-color-default'));

            colorDefaultRow.add_suffix(colorDefaultBox);
            drawingGroup.add(colorDefaultRow);

            const colorClickRow = new Adw.ActionRow({
                title: _('Colors on Click'),
                subtitle: _('Colors when left, middle, and right-clicking'),
            });

            const isWayland = Gdk.Display.get_default().constructor.name.includes('Wayland');
            if (isWayland) {
                colorClickRow.set_tooltip_text(
                    _('Click highlighting does not work in applications on Wayland. See README.')
                );
            } else {
                colorClickRow.set_tooltip_text(
                    _('Middle-click highlighting does not work on x11. See README.')
                );
            }

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

            //#region Tracker refresh rate
            const refreshRow = new Adw.SpinRow({
                title: _('Refresh Rate'),
                subtitle: _('Hz'),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 144,
                    step_increment: 1,
                }),
                value: this.settings.get_int('tracker-refresh-rate'),
            });
            refreshRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('tracker-refresh-rate', widget.value);
            });
            refreshRow.set_tooltip_text(_('Higher refresh rates may impact performance.'));
            drawingGroup.add(refreshRow);
            //#endregion
            //#endregion

            //#region Tracker keybinding
            const keybindGroup = new Adw.PreferencesGroup({title: _('Keybinding')});
            this.add(keybindGroup);

            // Create row
            const keybindRow = new KeybindingRow(
                this.settings,
                'tracker-keybinding',
                _('Toggle Tracker')
            );

            keybindGroup.set_header_suffix(keybindRow.resetButton);
            keybindGroup.add(keybindRow);
            //#endregion

            //#region About group
            const adwVersion = parseFloat(Adw.VERSION_S.substring(0, 3));
            //AboutDialog is available starting in v1.5.0 of Adw (GNOME 46)
            if (adwVersion >= 1.5) {
                const aboutGroup = new Adw.PreferencesGroup({title: _('Credits')});
                this.add(aboutGroup);

                const aboutRow = new EyeAboutRow(this.metadata, this.path);
                aboutGroup.add(aboutRow);
            }
            //#endregion
        }
    }
);
