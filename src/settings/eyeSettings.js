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
        this.updateFunctions = [];

        //#region Eye placement group
        const placementGroup = new Adw.PreferencesGroup({
            title: _('Layout'),
        });
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

        this.updateFunctions.push(
            () => activeRow.set_active(this.settings.get_boolean('eye-active'))
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

        this.updateFunctions.push(() => countRow.set_value(this.settings.get_int('eye-count')));
        placementGroup.add(countRow);
        //#endregion

        //#region Eye position
        const positionLabelList = new Gtk.StringList();
        [
            _('Left'),
            _('Center'),
            _('Right'),
        ].forEach((position) => positionLabelList.append(position));

        const positionRow = new Adw.ComboRow({
            title: _('Position'),
            subtitle: _('Position of the eyes on the panel'),
            model: positionLabelList,
            selected: this.settings.get_enum('eye-position'),
        });
        positionRow.connect('notify::selected', (widget) =>
            this.settings.set_enum('eye-position', widget.selected)
        );

        this.updateFunctions.push(
            () => positionRow.set_selected(this.settings.get_enum('eye-position'))
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

        this.updateFunctions.push(() => indexRow.set_value(this.settings.get_int('eye-index')));
        placementGroup.add(indexRow);
        //#endregion

        //#region Eye margin
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

        this.updateFunctions.push(() => widthRow.set_value(this.settings.get_int('eye-width')));
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

        this.updateFunctions.push(
            () => reactiveRow.set_active(this.settings.get_boolean('eye-reactive'))
        );
        placementGroup.add(reactiveRow);
        //#endregion
        //#endregion

        //#region Eye drawing group
        const drawingGroup = new Adw.PreferencesGroup({
            title: _('Appearance'),
        });
        this.add(drawingGroup);

        //#region Eye shape
        const shapeLabelList = new Gtk.StringList();
        [
            _('Natural'),
            _('Round'),
            _('Comic'),
        ].forEach((shape) => shapeLabelList.append(shape));

        const shapeRow = new Adw.ComboRow({
            title: _('Shape'),
            subtitle: _('Shape of the eyes'),
            model: shapeLabelList,
            selected: this.settings.get_enum('eye-shape'),
        });
        shapeRow.connect('notify::selected', (widget) =>
            this.settings.set_enum('eye-shape', widget.selected)
        );

        this.updateFunctions.push(() => shapeRow.set_selected(this.settings.get_enum('eye-shape')));
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

        this.updateFunctions.push(
            () => lineModeRow.set_active(this.settings.get_boolean('eye-line-mode'))
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

        this.updateFunctions.push(
            () => lineWidthRow.set_value(this.settings.get_int('eye-line-width'))
        );
        drawingGroup.add(lineWidthRow);
        //#endregion

        //#region Eye iris color
        const colorRow = new Adw.ActionRow({
            title: _('Iris Color'),
            subtitle: _('Custom color for the iris'),
        });

        const irisColorPicker = newColorPicker(this.settings, 'eye-color-iris');

        this.updateFunctions.push(() => {
            const currentColor = irisColorPicker.get_rgba();
            currentColor.parse(this.settings.get_string('eye-color-iris'));
            irisColorPicker.set_rgba(currentColor);
        });

        const colorBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

        // Iris Color Toggle (GNOME 47+)
        this.interfaceSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this.hasAccentColor = this.interfaceSettings.list_keys().includes('accent-color');
        if (this.hasAccentColor) {
            const irisColorToggle = new Gtk.CheckButton({
                active: this.settings.get_boolean('eye-color-iris-enabled'),
                hexpand: false,
                margin_end: 8,
                valign: Gtk.Align.CENTER,
                vexpand: false,
            });
            irisColorToggle.connect('toggled', (widget) => {
                this.settings.set_boolean('eye-color-iris-enabled', widget.active);
                irisColorPicker.set_sensitive(widget.active);
            });
            irisColorPicker.set_sensitive(irisColorToggle.active);

            this.updateFunctions.push(
                () =>
                    irisColorToggle.set_active(this.settings.get_boolean('eye-color-iris-enabled'))
            );
            colorBox.append(irisColorToggle);
        }

        colorBox.append(irisColorPicker);

        colorRow.add_suffix(colorBox);
        drawingGroup.add(colorRow);
        //#endregion
        // TODO Make scelera and pupil color into settings

        //#region Eye refresh rate
        const refreshRow = new Adw.SpinRow({
            title: _('Refresh Rate'),
            subtitle: _('Hz'),
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
        refreshRow.set_tooltip_text(_('Higher refresh rates may impact performance.'));

        this.updateFunctions.push(
            () => refreshRow.set_value(this.settings.get_int('eye-refresh-rate'))
        );

        drawingGroup.add(refreshRow);
        //#endregion
        //#endregion

        //#region Eye blink group
        const blinkGroup = new Adw.PreferencesGroup({
            title: _('Blinking'),
        });
        this.add(blinkGroup);

        //#region Eyelid color
        const colorEyelidRow = new Adw.ActionRow({title: _('Eyelid Color')});

        const eyelidColorPicker = newColorPicker(this.settings, 'eye-color-eyelid');

        this.updateFunctions.push(() => {
            const currentColor = eyelidColorPicker.get_rgba();
            currentColor.parse(this.settings.get_string('eye-color-eyelid'));
            eyelidColorPicker.set_rgba(currentColor);
        });

        const colorEyelidBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        colorEyelidBox.append(eyelidColorPicker);

        colorEyelidRow.add_suffix(colorEyelidBox);
        blinkGroup.add(colorEyelidRow);
        //#endregion

        //#region Blink mode
        const blinkModeList = new Gtk.StringList();
        [
            _('Manual'),
            _('Synced'),
            _('Unsynced'),
        ].forEach((mode) => blinkModeList.append(mode));
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

        this.updateFunctions.push(
            () => blinkModeRow.set_selected(this.settings.get_enum('eye-blink-mode'))
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

        this.updateFunctions.push(() => blinkKeybindingRow.resetKeybinding());
        blinkGroup.add(blinkKeybindingRow);
        //#endregion

        //#region Blink interval
        const blinkIntervalRow = new Adw.SpinRow({
            title: _('Regular Blink Interval'),
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

        this.updateFunctions.push(
            () => blinkIntervalRow.set_value(this.settings.get_double('eye-blink-interval'))
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
            hexpand: false,
            margin_end: 8,
            margin_top: 8,
            valign: Gtk.Align.CENTER,
            vexpand: false,
            value: blinkIntervalRange[0],
        });
        const maxIntervalButton = new Gtk.SpinButton({
            adjustment: new Gtk.Adjustment({
                lower: blinkIntervalRange[0] + MIN_GAP,
                upper: 3600,
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

        this.updateFunctions.push(() => {
            const [min, max] = this.settings.get_value('eye-blink-interval-range').deep_unpack();
            minIntervalButton.adjustment.set_upper(max - MIN_GAP);
            maxIntervalButton.adjustment.set_lower(min + MIN_GAP);
            minIntervalButton.set_value(min);
            maxIntervalButton.set_value(max);
        });

        const box = new Gtk.Box({orientation: Gtk.Orientation.VERTICAL});
        box.append(minIntervalButton);
        box.append(new Gtk.Label({
            label: _('to'),
            margin_end: 8,
        }));
        box.append(maxIntervalButton);

        blinkIntervalRangeRow.add_suffix(box);
        blinkGroup.add(blinkIntervalRangeRow);
        //#endregion
        //#endregion

        //#region Reset group
        const resetGroup = new Adw.PreferencesGroup();
        this.add(resetGroup);

        const resetRow = new ResetRow(
            this.settings,
            this.updateFunctions,
            'eye',
            _('Reset Eye Settings'),
            _('Reset all eye settings?')
        );
        resetGroup.add(resetRow);
        //#endregion
    }
});
