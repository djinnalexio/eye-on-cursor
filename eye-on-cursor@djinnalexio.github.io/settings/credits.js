/* credits.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024 djinnalexio
 *
 * This extension is free software: you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * This extension is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this extension.
 * If not, see <https://www.gnu.org/licenses/gpl-3.0.html#license-text>.
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
'use strict';

//#region Import libraries
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';
//#endregion

//#region Credits

/* Feel free to add your name and url in the relevant section below
 * if you have contributed.
 *
 * Translators do not need to write in this file and must instead
 * use the "translator_credits" string located in the translation files.
 */

const artists = [];
const designers = [];
const developers = ['djinnalexio https://github.com/djinnalexio/'];
const documenters = [];

const copyright = '© 2024 djinnalexio';
const developerName = 'djinnalexio';
const issueUrl = 'https://github.com/djinnalexio/eye-on-cursor/issues/';
/* The string for `release_notes` supports <p> paragraphs, <em> emphasis, and <code> code,
    <ol> ordered and <ul> unordered lists with <li> list items, and <code> code. */
const releaseNotes =
    '<p>Fixes:</p>\
    <ul>\
        <li>made tracker stay above UI elements</li>\
    </ul >\
    <p>New:</p>\
    <ul>\
        <li>added outline mode option</li>\
    </ul >\
    <p>Changes:</p>\
    <ul>\
        <li>replaced <em>Refresh interval</em> option with <em>Refresh rate</em></li>\
    </ul >\
    ';
const supportUrl = '';
//#endregion

//#region About dialog
export function makeAboutDialog(metadata, path, translatorCredits) {
    /**
     * Returns an AboutDialog window with information about the extension filled out.
     *
     * @param {metadata} metadata - metadata of the extension
     * @param {string} path - path to the extension folder
     * @param {string} translatorCredits - string containing translators' info in any
     * */

    // To find custom icons
    const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if (!iconTheme.get_search_path().includes(`${path}/media/`))
        iconTheme.add_search_path(`${path}/media/`);

    const aboutPage = new Adw.AboutDialog({
        application_icon: 'eye-on-cursor-logo',
        application_name: metadata['name'],
        artists: artists,
        // comments: metadata['description'],
        copyright: copyright,
        designers: designers,
        developer_name: developerName,
        developers: developers,
        documenters: documenters,
        issue_url: issueUrl,
        license_type: Gtk.License.GPL_3_0,
        release_notes: releaseNotes,
        release_notes_version: metadata['version-name'],
        support_url: supportUrl,
        translator_credits: translatorCredits,
        version: metadata['version-name'],
        website: metadata['url'],
    });

    aboutPage.add_link(
        'Extension Page',
        'https://extensions.gnome.org/extension/7036/eye-on-cursor/'
    );

    aboutPage.add_acknowledgement_section('Forked from', [
        'Eye and Mouse Extended https://extensions.gnome.org/extension/3139/eye-extended/',
    ]);

    aboutPage.add_acknowledgement_section('Cinnamon Fork', [
        'C-eyes https://github.com/anaximeno/c-eyes',
    ]);

    return aboutPage;
}
//#endregion
