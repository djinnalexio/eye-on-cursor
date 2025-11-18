/*
 * Eye on Cursor GNOME Shell extension
 *
 * SPDX-FileCopyrightText: 2024-2025 djinnalexio
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
