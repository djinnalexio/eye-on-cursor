// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {newColorPicker, KeybindingRow, ResetRow} from './prefsWidgets.js';
//#endregion

/**
 * A page displaying the eye settings.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 */
export const EyePage = GObject.registerClass(
class EyePage extends Adw.PreferencesPage {
    constructor(extension) {
        super({
            title: _('Eyes'),
            icon_name: 'view-reveal-symbolic',
        });

        this.settings = extension.getSettings();
        this.resetFunctions = [];

        // Check if accent color variable exists (GNOME 47+)
        this.hasAccentColor = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'})
            .list_keys()
            .includes('accent-color');

        //#region Eye placement group
        const placementGroup = new Adw.PreferencesGroup({title: _('Layout')});
        this.add(placementGroup);

        //#region Eye activity
        const activeRow = new Adw.SwitchRow({
            title: _('Active'),
            subtitle: _('Enable the eyes'),
            active: this.settings.get_boolean('eye-active'),
        });
        activeRow.connect('notify::active', (widget) =>
            this.settings.set_boolean('eye-active', widget.active)
        );

        this.resetFunctions.push(
            () => activeRow.set_active(this.settings.get_default_value('eye-active').deep_unpack())
        );
        placementGroup.add(activeRow);
        //#endregion

        //#region Eye count
        const countRow = new Adw.SpinRow({
            title: _('Count'),
            subtitle: _('Number of eyes'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 100,
                step_increment: 1,
            }),
            value: this.settings.get_int('eye-count'),
        });
        countRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('eye-count', widget.value)
        );
        countRow.set_tooltip_text(_('Displaying more eyes may reduce performance.'));

        this.resetFunctions.push(
            () => countRow.set_value(this.settings.get_default_value('eye-count').deep_unpack())

        );
        placementGroup.add(countRow);
        //#endregion

        //#region Eye position
        const positionLabelList = new Gtk.StringList();
        [_('Left'), _('Center'), _('Right')]
            .forEach((position) => positionLabelList.append(position));

        const positionRow = new Adw.ComboRow({
            title: _('Position'),
            subtitle: _('Position of the eyes on the panel'),
            model: positionLabelList,
            selected: this.settings.get_enum('eye-position'),
        });
        positionRow.connect('notify::selected', (widget) =>
            this.settings.set_enum('eye-position', widget.selected)
        );

        this.resetFunctions.push(
            () => {
                const defValue = this.settings.get_default_value('eye-position').deep_unpack();
                const values = ['left', 'center', 'right']; // Values from eye-position enum in schema
                positionRow.set_selected(values.indexOf(defValue));
            }
        );
        placementGroup.add(positionRow);
        //#endregion

        //#region Eye index
        const indexRow = new Adw.SpinRow({
            title: _('Index'),
            subtitle: _('Index of the eyes on the panel segment'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 1,
            }),
            value: this.settings.get_int('eye-index'),
        });
        indexRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('eye-index', widget.value)
        );

        this.resetFunctions.push(
            () => indexRow.set_value(this.settings.get_default_value('eye-index').deep_unpack())
        );
        placementGroup.add(indexRow);
        //#endregion

        //#region Eye width
        const widthRow = new Adw.SpinRow({
            title: _('Width'),
            subtitle: _('Drawing space and padding'),
            adjustment: new Gtk.Adjustment({
                lower: 20,
                upper: 1000,
                step_increment: 1,
            }),
            value: this.settings.get_int('eye-width'),
        });
        widthRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('eye-width', widget.value)
        );

        this.resetFunctions.push(
            () => widthRow.set_value(this.settings.get_default_value('eye-width').deep_unpack())
        );
        placementGroup.add(widthRow);
        //#endregion

        //#region Eye reactivity
        const reactiveRow = new Adw.SwitchRow({
            title: _('Menu'),
            subtitle: _('Enable the eye menu'),
            active: this.settings.get_boolean('eye-reactive'),
        });
        reactiveRow.connect('notify::active', (widget) =>
            this.settings.set_boolean('eye-reactive', widget.active)
        );

        this.resetFunctions.push(
            () => reactiveRow.set_active(
                this.settings.get_default_value('eye-reactive').deep_unpack()
            )
        );
        placementGroup.add(reactiveRow);
        //#endregion
        //#endregion

        //#region Eye drawing group
        const drawingGroup = new Adw.PreferencesGroup({title: _('Appearance')});
        this.add(drawingGroup);

        //#region Eye shape
        const shapeLabelList = new Gtk.StringList();
        [_('Natural'), _('Round'), _('Comic')].forEach((shape) => shapeLabelList.append(shape));

        const shapeRow = new Adw.ComboRow({
            title: _('Shape'),
            subtitle: _('Shape of the eyes'),
            model: shapeLabelList,
            selected: this.settings.get_enum('eye-shape'),
        });
        shapeRow.connect('notify::selected', (widget) =>
            this.settings.set_enum('eye-shape', widget.selected)
        );

        this.resetFunctions.push(
            () => {
                const defValue = this.settings.get_default_value('eye-shape').deep_unpack();
                const values = ['natural', 'round', 'comic']; // Values from eye-shape enum in schema
                shapeRow.set_selected(values.indexOf(defValue));
            }
        );
        drawingGroup.add(shapeRow);
        //#endregion

        //#region Eye outline mode
        const lineModeRow = new Adw.SwitchRow({
            title: _('Sketch Mode'),
            subtitle: _('Only draw the outline'),
            active: this.settings.get_boolean('eye-line-mode'),
        });
        lineModeRow.connect('notify::active', (widget) =>
            this.settings.set_boolean('eye-line-mode', widget.active)
        );

        this.resetFunctions.push(
            () => lineModeRow.set_active(
                this.settings.get_default_value('eye-line-mode').deep_unpack()
            )
        );
        drawingGroup.add(lineModeRow);
        //#endregion

        //#region Eye line width
        const lineWidthRow = new Adw.SpinRow({
            title: _('Line Thickness'),
            subtitle: _('Thickness of the strokes in outline mode'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
            }),
            value: this.settings.get_int('eye-line-width'),
        });
        lineWidthRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('eye-line-width', widget.value)
        );

        this.resetFunctions.push(
            () => lineWidthRow.set_value(
                this.settings.get_default_value('eye-line-width').deep_unpack()
            )
        );
        drawingGroup.add(lineWidthRow);
        //#endregion

        //#region Eye iris color
        const colorRow = new Adw.ActionRow({
            title: _('Iris Color'),
            subtitle: _('Custom color for the iris'),
        });

        const irisColorPicker = newColorPicker(this.settings, 'eye-color-iris');

        this.resetFunctions.push(() => {
            const currentColor = irisColorPicker.get_rgba();
            currentColor.parse(this.settings.get_default_value('eye-color-iris').deep_unpack());
            irisColorPicker.set_rgba(currentColor);
        });

        const colorBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

        // Iris Color Toggle (GNOME 47+)
        if (this.hasAccentColor) {
            const irisColorToggle = new Gtk.CheckButton({
                active: this.settings.get_boolean('eye-color-iris-enabled'),
                margin_end: 8,
                valign: Gtk.Align.CENTER,
            });
            irisColorToggle.connect('toggled', (widget) => {
                this.settings.set_boolean('eye-color-iris-enabled', widget.active);
                irisColorPicker.set_sensitive(widget.active);
            });
            irisColorPicker.set_sensitive(irisColorToggle.active);

            this.resetFunctions.push(
                () =>
                    irisColorToggle.set_active(
                        this.settings.get_default_value('eye-color-iris-enabled').deep_unpack()
                    )
            );
            colorBox.append(irisColorToggle);
        }

        colorBox.append(irisColorPicker);

        colorRow.add_suffix(colorBox);
        drawingGroup.add(colorRow);
        //#endregion
        // TODO Make sclera and pupil color into settings

        //#region Eye refresh rate
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Rate (Hz)'),
            subtitle: _('Higher refresh rates may impact performance.'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 144,
                step_increment: 1,
            }),
            value: this.settings.get_int('eye-refresh-rate'),
        });
        refreshRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('eye-refresh-rate', widget.value)
        );

        this.resetFunctions.push(
            () => refreshRow.set_value(
                this.settings.get_default_value('eye-refresh-rate').deep_unpack()
            )
        );

        drawingGroup.add(refreshRow);
        //#endregion
        //#endregion

        //#region Eye blink group
        const blinkGroup = new Adw.PreferencesGroup({title: _('Blinking')});
        this.add(blinkGroup);

        //#region Eyelid color
        const colorEyelidRow = new Adw.ActionRow({title: _('Eyelid Color')});

        const eyelidColorPicker = newColorPicker(this.settings, 'eye-color-eyelid');

        this.resetFunctions.push(() => {
            const currentColor = eyelidColorPicker.get_rgba();
            currentColor.parse(this.settings.get_default_value('eye-color-eyelid').deep_unpack());
            eyelidColorPicker.set_rgba(currentColor);
        });

        const colorEyelidBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        colorEyelidBox.append(eyelidColorPicker);

        colorEyelidRow.add_suffix(colorEyelidBox);
        blinkGroup.add(colorEyelidRow);
        //#endregion

        //#region Blink mode
        const blinkModeList = new Gtk.StringList();
        [_('Manual'), _('Fixed'), _('Random')].forEach((mode) => blinkModeList.append(mode));
        // Each option enables the corresponding row
        const blinkModeRow = new Adw.ComboRow({
            title: _('Blink Mode'),
            subtitle: _('Choose how eyes blink'),
            model: blinkModeList,
            selected: this.settings.get_enum('eye-blink-mode'),
        });
        blinkModeRow.connect('notify::selected', (widget) =>
            this.settings.set_enum('eye-blink-mode', widget.selected)
        );

        this.resetFunctions.push(
            () => {
                const defValue = this.settings.get_default_value('eye-blink-mode').deep_unpack();
                const values = ['manual', 'synced', 'unsynced'];// Values from eye-blink-mode enum in schema
                blinkModeRow.set_selected(values.indexOf(defValue));
            }
        );
        blinkGroup.add(blinkModeRow);
        //#endregion

        //#region Blink keybinding
        const blinkKeybindingRow = new KeybindingRow(
            this.settings,
            'eye-blink-keybinding',
            _('Manual Blink')
        );
        blinkGroup.set_header_suffix(blinkKeybindingRow.resetButton);

        this.resetFunctions.push(() => blinkKeybindingRow.resetKeybinding());
        blinkGroup.add(blinkKeybindingRow);
        //#endregion

        //#region Blink interval
        const blinkIntervalRow = new Adw.SpinRow({
            title: _('Fixed Blink Interval'),
            subtitle: _('Duration in seconds between blinks'),
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: 3600,
                step_increment: 0.1,
            }),
            digits: 1,
            value: this.settings.get_double('eye-blink-interval'),
        });
        blinkIntervalRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_double('eye-blink-interval', widget.value)
        );

        this.resetFunctions.push(
            () => blinkIntervalRow.set_value(
                this.settings.get_default_value('eye-blink-interval').deep_unpack()
            )
        );
        blinkGroup.add(blinkIntervalRow);
        //#endregion

        //#region Blink interval range
        const blinkIntervalRangeRow = new Adw.ActionRow({
            title: _('Random Blink Interval'),
            subtitle: _('Range of durations in seconds between random blinks'),
        });

        const blinkIntervalRange = this.settings
                .get_value('eye-blink-interval-range')
                .deep_unpack();

        const MIN_GAP = 0.1;
        const minIntervalButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: 0.1,
                upper: blinkIntervalRange[1] - MIN_GAP,
                step_increment: 0.1,
            }),
            digits: 1,
            value: blinkIntervalRange[0],
        });
        const maxIntervalButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: blinkIntervalRange[0] + MIN_GAP,
                upper: 3600,
                step_increment: 0.1,
            }),
            digits: 1,
            value: blinkIntervalRange[1],
        });

        minIntervalButton.connect('value-changed',
            () => {
                // Update the minimum value of the max interval
                maxIntervalButton.adjustment.set_lower(minIntervalButton.get_value() + MIN_GAP);

                this.settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant(
                        'ad',
                        [minIntervalButton.get_value(), maxIntervalButton.get_value()])
                );
            });
        maxIntervalButton.connect('value-changed',
            () => {
                // Update the maximum value of the min interval
                minIntervalButton.adjustment.set_upper(maxIntervalButton.get_value() - MIN_GAP);

                this.settings.set_value(
                    'eye-blink-interval-range',
                    new GLib.Variant(
                        'ad',
                        [minIntervalButton.get_value(), maxIntervalButton.get_value()])
                );
            });

        this.resetFunctions.push(() => {
            const [min, max] =
                this.settings.get_default_value('eye-blink-interval-range').deep_unpack();
            minIntervalButton.adjustment.set_upper(max - MIN_GAP);
            maxIntervalButton.adjustment.set_lower(min + MIN_GAP);
            minIntervalButton.set_value(min);
            maxIntervalButton.set_value(max);
        });

        const box = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 4,
            margin_top: 4,
            margin_bottom: 4,
        });
        box.append(minIntervalButton);
        box.append(new Gtk.Label({label: _('to')}));
        box.append(maxIntervalButton);

        blinkIntervalRangeRow.add_suffix(box);
        blinkGroup.add(blinkIntervalRangeRow);
        //#endregion
        //#endregion

        //#region Reset group
        const resetGroup = new Adw.PreferencesGroup();
        this.add(resetGroup);

        const resetRow = new ResetRow(
            'eye',
            this.settings,
            _('Reset all eye settings?'),
            this.resetFunctions
        );
        resetGroup.add(resetRow);
        //#endregion
    }
});
