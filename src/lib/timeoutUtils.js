// SPDX-FileCopyrightText: 2024-2026 djinnalexio
// SPDX-License-Identifier: GPL-3.0-or-later

/**
 * Provides GLib-based utilities for the main loop, implementing the standard JavaScript
 * `setTimeout`, `setInterval`,`clearTimeout`, and `clearInterval` functions.
 *
 * @module timeoutUtils
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/setTimeout
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/clearTimeout
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/setInterval
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/clearInterval
 */

/* eslint-disable no-console */

import GLib from 'gi://GLib';

/**
 * An object that holds the ID (greater than 0) of an event source.
 */
export class Timeout {
    constructor() {
        this._id = null;
    }
}

/**
 * Sets a timer that executes a function or code snippet once the timer expires.
 *
 * @param {Function} func - The function to call after the timer expires.
 * @param {number} delay - The time before the function is called in milliseconds.
 * @param {...any} args - The additional arguments that are passed to the function.
 * @returns {Timeout} The object that holds the ID (greater than 0) of the event source.
 */
export function setTimeout(func, delay, ...args) {
    const timeout = new Timeout();

    timeout._id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
        try {
            func(...args);
        } catch (e) {
            console.error(`Failed to execute timeout function: ${e.message}`);
        }
        timeout._id = null; // Auto-clear
        return GLib.SOURCE_REMOVE;
    });

    return timeout;
}

/**
 * Cancels a timeout previously established by calling `setTimeout()`.
 *
 * @param {Timeout} timeout - The object that holds the ID (greater than 0) of the event source.
 */
export function clearTimeout(timeout) {
    if (!timeout || (typeof timeout._id !== 'number' && timeout._id !== null))
        throw new TypeError('Expected Timeout object');

    if (timeout._id !== null) {
        GLib.Source.remove(timeout._id);
        timeout._id = null;
    }
}

/**
 * Repeatedly executes a function or code snippet, with a fixed time delay between each call.
 *
 * @param {Function} func - The function to be executed every `delay` milliseconds.
 * @param {number} delay - The time between executions of the function in milliseconds.
 * @param {...any} args - The additional arguments that are passed to the function.
 * @returns {Timeout} The object that holds the ID (greater than 0) of the event source.
 */
export function setInterval(func, delay, ...args) {
    const timeout = new Timeout();

    timeout._id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
        try {
            func(...args);
        } catch (e) {
            console.error(`Failed to execute interval function: ${e.message}`);
        }
        return GLib.SOURCE_CONTINUE;
    });

    return timeout;
}

/**
 * Cancels a timed, repeating action that was previously established by calling `setInterval()`.
 *
 * @param {Timeout} timeout - The object that holds the ID (greater than 0) of the event source.
 */
export const clearInterval = clearTimeout;
