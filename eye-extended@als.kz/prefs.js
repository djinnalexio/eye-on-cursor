// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the eye-extended-shell-extension.

//#region Import libraries
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {EyePage} from './settings/eyeSettings.js';
import {MouseTrackerPage} from './settings/mouseTrackerSettings.js';
//#endregion

export default class EyeExtendedPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window.search_enabled = true;
        window.default_width = 480;
        window.default_height = 640;

        window.add(new MouseTrackerPage(this));
        window.add(new EyePage(this)); //TODO move eye page back in first place before release
    }
}
