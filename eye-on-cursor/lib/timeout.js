/* timeout.js
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

/**
 * Utility functions for managing single and recurring timed events using `GLib.timeout_add`.
 * These functions are ports of `setTimeout` and `setInterval` from standard JavaScript.
 *
 * @module Timeout
 */

import GLib from 'gi://GLib';

export function setTimeout(timeout, func, delay, ...args) {
    timeout.id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
        func(...args);
        timeout.id = null;
        return GLib.SOURCE_REMOVE;
    });
}

export function clearTimeout(timeout) {
    if (timeout.id) {
        GLib.source_remove(timeout.id);
        timeout.id = null;
    }
}

export function setInterval(timeout, func, delay, ...args) {
    timeout.id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
        func(...args);
        return GLib.SOURCE_CONTINUE;
    });
}

export function clearInterval(timeout) {
    if (timeout.id) {
        GLib.source_remove(timeout.id);
        timeout.id = null;
    }
}
