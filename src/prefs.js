// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyePage} from './prefsModules/eyeSettings.js';
import {TrackerPage} from './prefsModules/trackerSettings.js';
//#endregion

/**
 * The preferences window for the **Eye on Cursor** GNOME Shell extension.
 */
export default class EyeOnCursorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.default_width = 460;
        window.default_height = 800;

        // Add path for custom icons
        const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        const iconThemePath = GLib.build_filenamev([this.path, 'assets']);
        if (!iconTheme.get_search_path().includes(iconThemePath))
            iconTheme.add_search_path(iconThemePath);

        window.add(new EyePage(this));
        window.add(new TrackerPage(this));
    }
}
