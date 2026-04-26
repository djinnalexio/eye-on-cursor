// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

//#region Imports
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

//#region Credits
// Feel free to add your name and url in the relevant section below if you have contributed.

// Translators do not need to write in this file and must instead use the "translator_credits"
// string located in the translation files.
const artists = [];
const designers = [];
const developers = ['djinnalexio https://github.com/djinnalexio/'];
const documenters = [];

const copyright = '© 2024-2026 djinnalexio';
const developerName = 'djinnalexio';
const issueUrl = 'https://github.com/djinnalexio/eye-on-cursor/issues/';
// The string for `release_notes` supports <p> paragraphs, <em> emphasis, and <code> code,
// <ol> ordered and <ul> unordered lists with <li> list items, and <code> code.
const releaseNotes =
    '<p>New:</p>\
    <ul>\
        <li></li>\
    </ul>\
    <p>Fixes &amp; Improvements:</p>\
    <ul>\
        <li>fixed first frame of tracker not rendering</li>\
        <li>fixed tracker briefly appearing at out-of-date location when being re-enabled</li>\
        <li>increased max blink interval to one hour</li>\
    </ul>\
    ';
const supportUrl = 'https://github.com/djinnalexio/eye-on-cursor/discussions/categories/q-a';
//#endregion

//#region About row
/**
 * A row that opens an AboutDialog window with information about the extension.
 *
 * @param {ExtensionMetadata} metadata - The metadata object from metadata.json.
 * @param {string} path - The absolute path to the extension folder.
 */
export const AboutRow = GObject.registerClass(
class AboutRow extends Adw.ActionRow {
    constructor(metadata, path) {
        super({
            title: _('About Eye on Cursor'),
            activatable: true,
        });

        // Add row icons
        this.add_prefix(new Gtk.Image({icon_name: 'help-about-symbolic'}));
        this.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));

        // Add path for custom icons
        this.iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
        this.iconThemePath = GLib.build_filenamev([path, 'media']);
        if (!this.iconTheme.get_search_path().includes(this.iconThemePath))
            this.iconTheme.add_search_path(this.iconThemePath);

        //#region About dialog
        this.aboutWindow = new Adw.AboutDialog({
            application_icon: 'eye-on-cursor-logo',
            application_name: metadata.name,
            artists,
            comments: metadata.description,
            copyright,
            designers,
            developer_name: developerName,
            developers,
            documenters,
            issue_url: issueUrl,
            license_type: Gtk.License.GPL_3_0,
            release_notes: releaseNotes,
            release_notes_version: metadata['version-name'],
            support_url: supportUrl,
            translator_credits: pgettext('(USER)NAME EMAIL/URL', 'translator_credits'),
            version: metadata['version-name'],
            website: metadata.url,
        });

        this.aboutWindow.add_link(
            _('Extension Page'),
            'https://extensions.gnome.org/extension/7036/eye-on-cursor/'
        );
        this.aboutWindow.add_link(_('Donate'), 'https://github.com/sponsors/djinnalexio');
        this.aboutWindow.add_acknowledgement_section(
            _('Forked from'),
            ['Eye and Mouse Extended https://extensions.gnome.org/extension/3139/eye-extended/']
        );
        this.aboutWindow.add_acknowledgement_section(
            _('Cinnamon Fork'),
            ['Cinnamon Eyes https://cinnamon-spices.linuxmint.com/applets/view/363']
        );
        //#endregion

        this.connect('activated', () => this.aboutWindow.present(this));
    }
});
//#endregion
