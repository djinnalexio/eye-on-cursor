// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the eye-extended-shell-extension.

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

//#region Credits

/* Feel free to add your name and url in the relevant section below
 * if you have contributed.
 *
 * Translators must use the "translator_credits" string located in the translation files.
 */

const applicationIcon = 'eye-extended-logo';
const artists = [];
const copyright = '© 2020-2024 Contributors to the eye-extended-shell-extension.';
const developerName = 'alexeylovchikov';
const developers = [
    'alexeylovchikov https://github.com/alexeylovchikov/',
    'djinnalexio https://github.com/djinnalexio/',
    'buzztaiki https://github.com/buzztaiki/',
    'anaximeno https://github.com/anaximeno/',
    'rafameou https://github.com/rafameou/',
];
const designers = [];
const documenters = [];
const issueUrl = 'https://github.com/alexeylovchikov/eye-extended-shell-extension/issues/';
/* The string for `release_notes` supports <p> paragraphs, <em> emphasis, and <code> code,
    <ol> ordered and <ul> unordered lists with <li> list items, and <code> code. */
const releaseNotes =
    '\
    <p>This extension is currently under development.</p>\
    <p>What has been done so far:</p>\
    <ul>\
        <li>added many more tracker icons</li>\
        <li>updated the folder structure</li>\
        <li>created a logo</li>\
        <li>ported the Settings menu to Gnome 46</li>\
        <li>added linting and formatting support</li>\
    </ul>\
    <p>Remaining goals before publishing:</p>\
    <ul>\
        <li>working mouse tracker with click highlighting</li>\
        <li>working animated eye</li>\
        <li>fixing svg trackers for recoloring</li>\
        <li>updating readme</li>\
        <li>providing french translation</li>\
        <li>connecting to ctrl</li>\
    </ul>\
    ';
const supportUrl = '';
const version = '3.0.0-alpha.1';
//#endregion

//#region About dialog
export function aboutDialog(metadata, path, translatorCredits) {
    // To find custom icons
    const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if (!iconTheme.get_search_path().includes(`${path}/media/`))
        iconTheme.add_search_path(`${path}/media/`);

    const aboutPage = new Adw.AboutDialog({
        application_icon: applicationIcon,
        application_name: metadata.name,
        artists: artists,
        comments: metadata.description,
        copyright: copyright,
        designers: designers,
        developer_name: developerName,
        developers: developers,
        documenters: documenters,
        issue_url: issueUrl,
        license_type: Gtk.License.GPL_3_0,
        release_notes: releaseNotes,
        release_notes_version: version,
        support_url: supportUrl,
        translator_credits: translatorCredits,
        version: version,
        website: metadata.url,
    });
    return aboutPage;
}
//#endregion
