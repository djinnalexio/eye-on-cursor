// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
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

        window.add(new EyePage(this));
        window.add(new TrackerPage(this));
    }
}
