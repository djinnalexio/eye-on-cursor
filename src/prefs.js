/*
 * Eye on Cursor GNOME Shell extension
 *
 * SPDX-FileCopyrightText: 2024-2025 djinnalexio
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
'use strict';

//#region Import libraries
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyePage} from './settings/eyeSettings.js';
import {TrackerPage} from './settings/trackerSettings.js';
//#endregion

export default class EyeOnCursorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.default_width = 460;
        window.default_height = 800;

        window.add(new EyePage(this));
        window.add(new TrackerPage(this));
    }
}
