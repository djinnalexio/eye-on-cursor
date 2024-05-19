// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: djinnalexio

//#region Import libraries
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyePage} from './settings/eyeSettings.js';
import {TrackerPage} from './settings/trackerSettings.js';
//#endregion

export default class EyeOnCursorPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.search_enabled = true;
        window.default_width = 480; // TODO resize this later
        window.default_height = 640;

        window.add(new TrackerPage(this));
        window.add(new EyePage(this)); //TODO move eye page back in first place before release
    }
}
