// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {AboutRow} from './about.js';
import {newColorPicker, KeybindingRow, ResetRow} from './prefsWidgets.js';
//#endregion

/**
 * A page displaying the tracker settings.
 *
 * @param {EyeOnCursorExtension} extension - The extension instance.
 */
export const TrackerPage = GObject.registerClass(
class TrackerPage extends Adw.PreferencesPage {
    constructor(extension) {
        super({
            title: _('Mouse Tracker'),
            icon_name: 'input-mouse-symbolic',
        });

        this.settings = extension.getSettings();
        this.updateFunctions = [];

        //#region Tracker drawing group
        const drawingGroup = new Adw.PreferencesGroup({title: _('Appearance')});
        this.add(drawingGroup);

        //#region Tracker shape
        // Get list of shapes
        const shapeList = [];
        const shapeDirPath = GLib.build_filenamev([
            extension.path,
            'assets',
            'trackers',
        ]);
        const shapeDir = Gio.file_new_for_path(shapeDirPath);
        const enumFiles = shapeDir.enumerate_children(
            'standard::name',
            Gio.FileQueryInfoFlags.NONE,
            null
        );
        let fileInfo;
        try {
            while ((fileInfo = enumFiles.next_file(null)) !== null) {
                const fileName = fileInfo.get_name();
                if (fileName.toLowerCase().endsWith('.svg'))
                    shapeList.push(fileName.replace('.svg', ''));
            }
        } finally {
            enumFiles.close(null);
        }
        shapeList.sort();

        const shapeRow = new Adw.ActionRow({
            title: _('Shape'),
            subtitle: _('Shape of the tracker'),
            activatable: true,
        });

        const shapeRowLabel = new Gtk.Label({
            label: this.settings.get_string('tracker-shape').replaceAll('_', ' '),
            valign: Gtk.Align.CENTER,
        });
        shapeRow.add_suffix(shapeRowLabel);

        // Make shape picker
        const shapeWindow = new Adw.Dialog({
            title: _('Select a Tracker'),
            content_width: 400,
            content_height: 600,
        });

        const shapePicker = new Gtk.FlowBox({
            min_children_per_line: 3,
            activate_on_single_click: true,
            homogeneous: true,
            margin_top: 8,
            margin_bottom: 8,
            margin_start: 8,
            margin_end: 8,
            row_spacing: 4,
            column_spacing: 4,
        });

        shapeList.forEach((shape) => {
            const displayName = shape.replaceAll('_', ' ');
            const filePath = GLib.build_filenamev([shapeDirPath, `${shape}.svg`]);

            const flowItem = new Gtk.FlowBoxChild();
            flowItem.shape = shape;
            flowItem.name = displayName;

            const flowItemContent = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                spacing: 4,
                valign: Gtk.Align.CENTER,
                halign: Gtk.Align.CENTER,
            });

            const picture = Gtk.Picture.new_for_filename(filePath);
            picture.set_size_request(48, 48);
            picture.set_content_fit(Gtk.ContentFit.CONTAIN);

            const label = new Gtk.Label({
                label: displayName,
                justify: Gtk.Justification.CENTER,
                wrap: true,
                xalign: 0.5,
            });

            flowItemContent.append(picture);
            flowItemContent.append(label);
            flowItem.set_child(flowItemContent);
            shapePicker.append(flowItem);
        });

        shapePicker.connect('child-activated', (flowBox, flowBoxChild) => {
            shapeRowLabel.set_label(flowBoxChild.name);
            this.settings.set_string('tracker-shape', flowBoxChild.shape);
            shapeWindow.close();
        });

        const scrolledWindow = new Gtk.ScrolledWindow();
        scrolledWindow.set_child(shapePicker);
        shapeWindow.set_child(scrolledWindow);

        shapeRow.connect('activated', () => shapeWindow.present(this));

        this.updateFunctions.push(() => {
            shapeRowLabel.set_label(this.settings.get_default_value('tracker-shape').deep_unpack());
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
        sizeRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('tracker-size', widget.value)
        );

        this.updateFunctions.push(
            () => sizeRow.set_value(this.settings.get_default_value('tracker-size').deep_unpack())
        );
        drawingGroup.add(sizeRow);
        //#endregion

        //#region Tracker main color
        const colorMainRow = new Adw.ActionRow({
            title: _('Color'),
            subtitle: _('Custom color for the tracker'),
        });

        const colorMainPicker = newColorPicker(this.settings, 'tracker-color-main');

        this.updateFunctions.push(() => {
            const currentColor = colorMainPicker.get_rgba();
            currentColor.parse(this.settings.get_default_value('tracker-color-main').deep_unpack());
            colorMainPicker.set_rgba(currentColor);
        });

        const colorMainBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});

        // Tracker Main Color Toggle (GNOME 47+)
        this.hasAccentColor = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'})
            .list_keys()
            .includes('accent-color');
        if (this.hasAccentColor) {
            const trackerColorToggle = new Gtk.CheckButton({
                active: this.settings.get_boolean('tracker-color-main-enabled'),
                hexpand: false,
                margin_end: 8,
                valign: Gtk.Align.CENTER,
                vexpand: false,
            });
            trackerColorToggle.connect('toggled', (widget) => {
                this.settings.set_boolean('tracker-color-main-enabled', widget.active);
                colorMainPicker.set_sensitive(widget.active);
            });
            colorMainPicker.set_sensitive(trackerColorToggle.active);

            this.updateFunctions.push(
                () =>
                    trackerColorToggle.set_active(
                        this.settings.get_default_value('tracker-color-main-enabled').deep_unpack()
                    )
            );
            colorMainBox.append(trackerColorToggle);
        }

        colorMainBox.append(colorMainPicker);

        colorMainRow.add_suffix(colorMainBox);
        drawingGroup.add(colorMainRow);
        //#endregion

        //#region Tracker click colors
        const colorClickRow = new Adw.ActionRow({
            title: _('Colors on Click'),
            subtitle: _('Colors when left, middle, and right-clicking'),
        });

        const isWayland = Gdk.Display.get_default().constructor.name.includes('Wayland');
        if (isWayland) {
            colorClickRow.set_tooltip_text(
                _('Click highlighting does not work in windows.')
            );
        }

        const colorClickBox = new Gtk.Box({orientation: Gtk.Orientation.HORIZONTAL});
        [
            'tracker-color-left',
            'tracker-color-middle',
            'tracker-color-right',
        ].forEach((key) => {
            const colorPicker = newColorPicker(this.settings, key);

            this.updateFunctions.push(() => {
                const currentColor = colorPicker.get_rgba();
                currentColor.parse(this.settings.get_default_value(key).deep_unpack());
                colorPicker.set_rgba(currentColor);
            });

            colorClickBox.append(colorPicker);
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
        opacityRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('tracker-opacity', widget.value)
        );

        this.updateFunctions.push(
            () => opacityRow.set_value(
                this.settings.get_default_value('tracker-opacity').deep_unpack()
            )
        );
        drawingGroup.add(opacityRow);
        //#endregion

        //#region Tracker refresh rate
        const refreshRow = new Adw.SpinRow({// TODO doesn't seem to actually affect refresh rate
            title: _('Refresh Rate (Hz)'),
            subtitle: _('Higher refresh rates may impact performance.'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 144,
                step_increment: 1,
            }),
            value: this.settings.get_int('tracker-refresh-rate'),
        });
        refreshRow.adjustment.connect('value-changed', (widget) =>
            this.settings.set_int('tracker-refresh-rate', widget.value)
        );

        this.updateFunctions.push(
            () => refreshRow.set_value(
                this.settings.get_default_value('tracker-refresh-rate').deep_unpack()
            )
        );
        drawingGroup.add(refreshRow);
        //#endregion
        //#endregion

        //#region Tracker keybinding
        const keybindingGroup = new Adw.PreferencesGroup({title: _('Keybinding')});
        this.add(keybindingGroup);

        const keybindingRow = new KeybindingRow(
            this.settings,
            'tracker-keybinding',
            _('Toggle Tracker')
        );
        keybindingGroup.set_header_suffix(keybindingRow.resetButton);

        this.updateFunctions.push(() => keybindingRow.resetKeybinding());
        keybindingGroup.add(keybindingRow);
        //#endregion

        //#region Reset group
        const resetGroup = new Adw.PreferencesGroup();
        this.add(resetGroup);

        const resetRow = new ResetRow(
            this.settings,
            this.updateFunctions,
            'tracker',
            _('Reset Tracker Settings'),
            _('Reset all tracker settings?')
        );
        resetGroup.add(resetRow);
        //#endregion

        //#region About group
        const aboutGroup = new Adw.PreferencesGroup({title: _('Information')});
        this.add(aboutGroup);

        const aboutRow = new AboutRow(extension.metadata, extension.path);
        aboutGroup.add(aboutRow);
        //#endregion
    }
});
