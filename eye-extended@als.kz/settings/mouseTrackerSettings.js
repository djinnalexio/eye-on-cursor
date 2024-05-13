// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the Eye and Mouse Extended GNOME extension.

//#region Import libraries
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

export const MouseTrackerPage = GObject.registerClass(
    class MouseTrackerPage extends Adw.PreferencesPage {
        _init(extensionObject) {
            this._metadata = extensionObject.metadata;
            this._path = extensionObject.path;
            this._settings = extensionObject.getSettings();

            super._init({
                title: _('Mouse Tracker'),
                icon_name: 'input-mouse-symbolic',
            });

            //#region Tracker drawing
            const drawingGroup = new Adw.PreferencesGroup({
                title: _('Tracker Drawing'),
            });
            this.add(drawingGroup);

            //#region Tracker shape
            function _getSVGsList(path) {
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

            const shapeList = _getSVGsList(`${this._path}/media/glyphs/`);
            const shapeLabelList = new Gtk.StringList();
            shapeList.forEach((shape) => {
                shape = shape.replaceAll('_', ' ');
                shapeLabelList.append(shape);
            });

            const shapeRow = new Adw.ComboRow({
                title: _('Shape'),
                subtitle: _('Shape of the tracker'),
                model: shapeLabelList,
                enable_search: true,
                expression: new Gtk.PropertyExpression(Gtk.StringObject, null, 'string'),
                selected: shapeList.indexOf(this._settings.get_string('tracker-shape')),
            });
            shapeRow.connect('notify::selected', (widget) => {
                this._settings.set_string('tracker-shape', shapeList[widget.selected]);
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
                value: this._settings.get_int('tracker-size'),
            });
            sizeRow.adjustment.connect('value-changed', (widget) => {
                this._settings.set_int('tracker-size', widget.value);
            });
            drawingGroup.add(sizeRow);
            //#endregion

            //#region Tracker colors
            function _newColorPicker(settings, key) {
                const colorPicker = new Gtk.ColorDialogButton({
                    dialog: new Gtk.ColorDialog({
                        modal: true,
                        with_alpha: false,
                    }),
                    margin_top: 4,
                    margin_bottom: 4,
                    margin_end: 8,
                });
                const currentColor = colorPicker.get_rgba();
                currentColor.parse(settings.get_string(key));
                colorPicker.set_rgba(currentColor);

                colorPicker.connect('notify::rgba', (widget) => {
                    // Convert 'rgb(255,255,255)' to '#ffffff'
                    const rgbCode = widget.get_rgba().to_string();
                    const hexCode =
                        '#' +
                        rgbCode
                            .replace(/^rgb\(|\s+|\)$/g, '') // Remove 'rgb()'
                            .split(',') // Split numbers at ","
                            .map((string) => parseInt(string)) // Convert them to int
                            .map((number) => number.toString(16)) // Convert them to base16
                            .map((string) => (string.length === 1 ? '0' + string : string)) // If the length of the string is 1, adds a leading 0
                            .join(''); // Join them back into a string
                    settings.set_string(key, hexCode);
                });
                return colorPicker;
            }

            const colorPickerDefault = _newColorPicker(this._settings, 'tracker-color-default');
            const colorPickerLeft = _newColorPicker(this._settings, 'tracker-color-left');
            const colorPickerMiddle = _newColorPicker(this._settings, 'tracker-color-middle');
            const colorPickerRight = _newColorPicker(this._settings, 'tracker-color-right');

            const colorDefaultRow = new Adw.ActionRow({
                title: _('Default Color'),
                subtitle: _('Default color of the tracker'),
            });
            colorDefaultRow.add_suffix(colorPickerDefault);
            drawingGroup.add(colorDefaultRow);

            const colorClickRow = new Adw.ActionRow({
                title: _('Colors on Click'),
                subtitle: _('Colors when left, middle, and right-clicking'),
            });
            colorClickRow.add_suffix(colorPickerLeft);
            colorClickRow.add_suffix(colorPickerMiddle);
            colorClickRow.add_suffix(colorPickerRight);
            drawingGroup.add(colorClickRow);
            //#endregion

            //#region Tracker opacity
            const opacityRow = new Adw.SpinRow({
                title: _('Opacity'),
                subtitle: _('Opacity of the tracker'),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 255,
                    step_increment: 10,
                }),
                value: this._settings.get_int('tracker-opacity'),
            });
            opacityRow.adjustment.connect('value-changed', (widget) => {
                this._settings.set_int('tracker-opacity', widget.value);
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
                    lower: 1,
                    upper: 1000,
                    step_increment: 10,
                }),
                value: this._settings.get_int('tracker-repaint-interval'),
            });
            repaintRow.adjustment.connect('value-changed', (widget) => {
                this._settings.set_int('tracker-repaint-interval', widget.value);
            });
            drawingGroup.add(repaintRow);
            //#endregion
            //#endregion
        }
    }
);
