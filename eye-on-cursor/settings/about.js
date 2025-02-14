/* about.js
 *
 * This file is part of the Eye on Cursor GNOME Shell extension (eye-on-cursor@djinnalexio.github.io).
 *
 * Copyright (C) 2024-2025 djinnalexio
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
import GObject from 'gi://GObject';
import Adw from 'gi://Adw';
import Gdk from 'gi://Gdk';
import Gtk from 'gi://Gtk';

import {
    gettext as _,
    pgettext,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
//#endregion

//#region Credits

/* Feel free to add your name and url in the relevant section below if you have contributed.
 *
 * Translators do not need to write in this file and must instead use the "translator_credits"
 * string located in the translation files.
 */

const artists = [];
const designers = [];
const developers = ['djinnalexio https://github.com/djinnalexio/'];
const documenters = [];

const copyright = '© 2024-2025 djinnalexio';
const developerName = 'djinnalexio';
const issueUrl = 'https://github.com/djinnalexio/eye-on-cursor/issues/';
/* The string for `release_notes` supports <p> paragraphs, <em> emphasis, and <code> code,
    <ol> ordered and <ul> unordered lists with <li> list items, and <code> code. */
const releaseNotes =
    '<p>New:</p>\
    <ul>\
        <li>Added support for GNOME 48</li>\
        <li>Added donations options</li>\
    </ul >\
    <p>Fixes &amp; Improvements:</p>\
    <ul>\
        <li>Set minimum eye count to zero allowing to disable eye</li>\
        <li>Lowered minimum tracker size</li>\
    </ul >\
    ';
const supportUrl = 'https://github.com/djinnalexio/eye-on-cursor/discussions/categories/q-a';
//#endregion

//#region About row class
export const EyeAboutRow = GObject.registerClass(
    class EyeAboutRow extends Adw.ActionRow {
        constructor(metadata, path) {
            /**
             * A row that opens an AboutDialog window with information about the extension filled out.
             *
             * @param {Object} metadata - metadata of the extension
             * @param {string} path - path to the extension folder
             */

            super({
                title: _('About'),
                subtitle: _('Development information and credits'),
                activatable: true,
            });

            this.metadata = metadata;
            this.path = path;

            // Add row icons
            this.add_prefix(new Gtk.Image({icon_name: 'help-about-symbolic'}));
            this.add_suffix(new Gtk.Image({icon_name: 'go-next-symbolic'}));

            // Add path for custom icons
            this.iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
            if (!this.iconTheme.get_search_path().includes(`${path}/media/`))
                this.iconTheme.add_search_path(`${path}/media/`);

            //#region About dialog
            this.aboutWindow = new Adw.AboutDialog({
                application_icon: 'eye-on-cursor-logo',
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
            this.aboutWindow.add_acknowledgement_section(_('Forked from'), [
                'Eye and Mouse Extended https://extensions.gnome.org/extension/3139/eye-extended/',
            ]);
            this.aboutWindow.add_acknowledgement_section(_('Cinnamon Fork'), [
                'C-eyes https://github.com/anaximeno/c-eyes',
            ]);
            //#endregion

            this.connect('activated', () => {
                this.aboutWindow.present(this);
            });
        }
    }
);
//#endregion
