// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the Eye and Mouse Extended GNOME extension.

//#region Import libraries
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import * as Credits from './credits.js';
// #endregion

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
            const colorPicker = new Gtk.ColorDialogButton({
                dialog: new Gtk.ColorDialog({
                    modal: true,
                    with_alpha: false,
                }),
                margin_top: 4,
                margin_bottom: 4,
                margin_end: 16,
            });
            const currentColor = colorPicker.get_rgba();
            currentColor.parse(this.settings.get_string('eye-color'));
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
                this.settings.set_string('eye-color', hexCode);
            });

            const colorRow = new Adw.ActionRow({
                title: _('Color'),
                subtitle: _('Default color of the eye'),
            });

            colorRow.add_suffix(colorPicker);
            drawingGroup.add(colorRow);
            //#endregion

            //#region Eye repaint interval
            const repaintRow = new Adw.SpinRow({
                title: _('Refresh Interval'),
                subtitle: _(
                    'Milliseconds between redraws of the eye. Lower is faster, but more CPU intensive.'
                ),
                adjustment: new Gtk.Adjustment({
                    lower: 1,
                    upper: 1000,
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
                this.aboutWindow = Credits.aboutDialog(
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
