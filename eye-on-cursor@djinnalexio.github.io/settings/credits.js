// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: djinnalexio

import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

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
    '\
    <p>This extension is currently under development.</p>\
    <p></p>\
    <p>List of fixes since "Eye and Mouse Extended":</p>\
    ';
const supportUrl = '';
//#endregion

//#region About dialog
export function makeAboutDialog(metadata, path, translatorCredits) {
    // To find custom icons
    const iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
    if (!iconTheme.get_search_path().includes(`${path}/media/`))
        iconTheme.add_search_path(`${path}/media/`);

    const aboutPage = new Adw.AboutDialog({
        application_icon: 'eye-on-cursor-logo',
        application_name: metadata['name'],
        artists: artists,
        comments: metadata['description'],
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

    /* / aboutPage.add_link(
        'Extension Page',
        'https://extensions.gnome.org/extension/gnome_ext_code/eye-on-cursor/'
    ); */

    aboutPage.add_acknowledgement_section('Forked from', [
        'Eye and Mouse Extended https://extensions.gnome.org/extension/3139/eye-extended/',
    ]);

    return aboutPage;
}
//#endregion
