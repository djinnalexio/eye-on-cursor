// SPDX-License-Identifier: GPL-3.0-or-later
// SPDX-FileCopyrightText: Contributors to the Eye and Mouse Extended GNOME extension.

//#region Import libraries
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import {Extension, gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
//#endregion

//#region Defining Panel button
const Eye = GObject.registerClass(
    class Eye extends PanelMenu.Button {
        _init(extensionObject) {
            // Call the class
            super._init(0.0, extensionObject.metadata.name, false);

            // Get extension object properties
            this.metadata = extensionObject.metadata;
            this.path = extensionObject.path;
            this.settings = extensionObject.getSettings();

            //#region Get starting configuration
            this.trackerShape = this.settings.get_string('tracker-shape');

            this.trackerColorDefault = this.settings.get_string('tracker-color');
            this.trackerColorLeft = this.settings.get_string('tracker-color-left');
            this.trackerColorMiddle = this.settings.get_string('tracker-color-middle');
            this.trackerColorRight = this.settings.get_string('tracker-color-right');
            //#endregion

            // this.trackerCacheDir = this._trackerGetCacheDir();
            //this._trackerCreateCacheIcon();
            this._trackerCreateCacheIcons();

            this.add_child(
                new St.Icon({
                    gicon: Gio.icon_new_for_string(
                        `${this.path}/media/eye-and-mouse-extended-logo.svg`
                    ),
                    style_class: 'system-status-icon',
                })
            );

            //#region add popups
            const trackerPopup = new PopupMenu.PopupImageMenuItem(
                _('Toggle Tracker'),
                'view-reveal-symbolic'
            );
            this.menu.addMenuItem(trackerPopup);
            trackerPopup.connect('activate', () =>
                Main.notify(_('Tracker Toggled'), _('You toggled the tracker!'))
            );

            const prefsPopup = new PopupMenu.PopupImageMenuItem(
                _('Settings'),
                'org.gnome.Settings-symbolic'
            );
            this.menu.addMenuItem(prefsPopup);
            prefsPopup.connect('activate', () => extensionObject.openPreferences());
            //#endregion
        }

        //#region Tracker functions

        // Create/return a cache directory for colored trackers
        _trackerGetCacheDir() {
            const cacheDir = `${GLib.get_user_cache_dir()}/${this.metadata.uuid}/trackers`;
            if (GLib.mkdir_with_parents(cacheDir, 0o755) < 0)
                throw new Error(`Failed to create cache dir at ${cacheDir}`);
            return cacheDir;
        }

        _trackerCreateCacheIcons() {
            // Create cache for all current colors at once
            // [].foreach ...
            const cachedSVGpath = `${this._trackerGetCacheDir()}/${this.trackerShape}_${this.trackerColorDefault}.svg`;
            const cachedSVG = Gio.File.new_for_path(cachedSVGpath);
            if (!cachedSVG.query_exists(null)) {
                cachedSVG.create(Gio.FileCreateFlags.NONE, null);
            }
        }

        /*     // Get the current tracker color
_trackerGetCurrentColor() {
const colorIndex = this._settings.get_int('tracker-color-index');
const colorKey = `tracker-color-${colorIndex}`;
return this._settings.get_string(colorKey);
}

// Create current tracker
_trackerCreateCacheIcon() {
// load shape
const sourceSVG = Gio.File.new_for_path(`${this._path}/media/glyphs/${this.trackerShape}.svg`);
let [l_success, contents] = sourceSVG.load_contents(null);
contents = imports.TextDecoder.toString(contents);

// replace color
contents = contents.replace('#000000', `${this.trackerColor}`);

// save colored shape to cache

const cacheSVG = Gio.File.new_for_path(`${this.trackerCacheDir}/${this.trackerShape}_${this.trackerColor}.svg`);
if (!cacheSVG.query_exists(null))
    cacheSVG.create(Gio.FileCreateFlags.NONE, null);
let [r_success, tag] = cacheSVG.replace_contents(contents, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null);
console.log('@@@Cached Tracker Shape File: ' + `${this.trackerCacheDir}/${this.trackerShape}_${this.trackerColor}.svg`);
} */

        //#endregion
    }
);
//#endregion

//#region Creating/Destroying eyes
function spawnEyes(eyeArray, settings, extensionObject) {
    // Remove current eyes
    destroyEyes(eyeArray);

    for (let count = 0; count < settings.get_int('eye-count'); count++) {
        eyeArray.push(new Eye(extensionObject));
        Main.panel.addToStatusArea(
            extensionObject.uuid + Math.random(),
            eyeArray[count],
            settings.get_int('eye-index'),
            settings.get_string('eye-position')
        );
    }
}

function destroyEyes(eyeArray) {
    if (eyeArray.length > 0) {
        eyeArray.forEach((eye) => {
            eye.destroy();
        });
        eyeArray.length = 0; // Or eyeArray = [];
    }
}
//#endregion

//#region Launching extension
export default class EyeExtendedExtension extends Extension {
    /**
     * This class is constructed once when your extension is loaded, not
     * enabled. This is a good time to setup translations or anything else you
     * only do once.
     *
     * You MUST NOT make any changes to GNOME Shell, create any objects,
     * connect any signals or add any event sources here.
     *
     * @param {this} Extension - this extension object
     */

    //#region Enable
    // Runs when the extension is enabled or the desktop session is logged in or unlocked
    // Create objects, connect signals and add main loop sources
    enable() {
        this.settings = this.getSettings();
        this.eyeArray = [];

        // Create initial eyes
        spawnEyes(this.eyeArray, this.settings, this);

        //
        this.placementSettings = ['eye-position', 'eye-index', 'eye-count'];
        this.placementSettings.forEach((key) => {
            console.debug('Connected `Spawn` to ' + key);
            this.settings.connect(`changed::${key}`, () => {
                console.debug('Noticed a change in Placement settings');
                spawnEyes(this.eyeArray, this.settings, this);
            });
        });
    }
    //#endregion

    //#region Disable
    // Runs when the extension is disabled, uninstalled or the desktop session is exited or locked
    // Cleanup anything done in enable()
    disable() {
        destroyEyes(this.eyeArray);
        this.settings = null;
    }
    //#endregion
}
//#endregion
