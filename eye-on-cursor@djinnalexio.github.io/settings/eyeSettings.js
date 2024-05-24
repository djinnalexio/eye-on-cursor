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
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {makeAboutDialog} from './credits.js';
//#endregion

export const EyePage = GObject.registerClass(
    class EyePage extends Adw.PreferencesPage {
        constructor(extensionObject) {
            super({
                title: _('Eye'),
                icon_name: 'view-reveal-symbolic',
            });

            this.metadata = extensionObject.metadata;
            this.path = extensionObject.path;
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

            //#region Eye reactivity
            const reactiveRow = new Adw.SwitchRow({
                title: _('Interactivity'),
                subtitle: _('Allow eyes to respond to clicks'),
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
            [_('Eyelid'), _('Round')].forEach(shape => shapeLabelList.append(shape));

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

            //#region Eye line width
            const lineRow = new Adw.SpinRow({
                title: _('Drawing Thickness'),
                subtitle: _('Thickness of the strokes'),
                adjustment: new Gtk.Adjustment({
                    lower: 1.0,
                    upper: 5.0,
                    step_increment: 0.1,
                }),
                digits: 1,
                value: this.settings.get_double('eye-line-width'),
            });
            lineRow.adjustment.connect('value-changed', widget => {
                this.settings.set_double('eye-line-width', widget.value);
            });
            drawingGroup.add(lineRow);
            //#endregion

            //#region Eye margin
            const marginRow = new Adw.SpinRow({
                title: _('Margin'),
                subtitle: _('Margins around the eye'),
                adjustment: new Gtk.Adjustment({
                    lower: 0.0,
                    upper: 10.0,
                    step_increment: 0.1,
                }),
                digits: 1,
                value: this.settings.get_double('eye-margin'),
            });
            marginRow.adjustment.connect('value-changed', widget => {
                this.settings.set_double('eye-margin', widget.value);
            });
            drawingGroup.add(marginRow);
            //#endregion

            //#region Eye color
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
                subtitle: _('Default color of the eye'),
            });

            const colorBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
            colorBox.append(newColorPicker(this.settings, 'eye-color'));

            colorRow.add_suffix(colorBox);
            drawingGroup.add(colorRow);
            //#endregion

            //#region Eye repaint interval
            const repaintRow = new Adw.SpinRow({
                title: _('Refresh Interval'),
                subtitle: _(
                    'Milliseconds between redraws of the eye. Lower is faster, but more CPU intensive.'
                ),
                adjustment: new Gtk.Adjustment({
                    lower: 5, // Min 5ms interval => max 200fps
                    upper: 1000, // Max 1000ms interval => min 1fps
                    step_increment: 10,
                }),
                value: this.settings.get_int('eye-repaint-interval'),
            });
            repaintRow.adjustment.connect('value-changed', widget => {
                this.settings.set_int('eye-repaint-interval', widget.value);
            });
            drawingGroup.add(repaintRow);
            //#endregion
            //#endregion

            //#region About group
            const aboutGroup = new Adw.PreferencesGroup();
            this.add(aboutGroup);

            const aboutRow = new Adw.ActionRow({
                title: _('About'),
                subtitle: _('Development information and credits'),
                activatable: true,
            });
            aboutRow.add_prefix(new Gtk.Image({icon_name: 'help-about-symbolic'}));
            aboutRow.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));

            aboutRow.connect('activated', () => {
                this.aboutWindow = makeAboutDialog(
                    this.metadata,
                    this.path,
                    _('translator_credits')
                );
                this.aboutWindow.present(this);
            });
            aboutGroup.add(aboutRow);
            //#endregion
        }
    }
);
