# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: djinnalexio

COPYRIGHT_HOLDER = djinnalexio
EXTENSION_NAME = eye-on-cursor
EXTENSION_UUID = eye-on-cursor@djinnalexio.github.io
ISSUES_URL = https://github.com/djinnalexio/eye-on-cursor/issues
PACK_NAME = $(EXTENSION_UUID).shell-extension.zip
VERSION = 2.1.0

.phony: pack install uninstall prefs test test-prefs-settings test-prefs-window update-pot

pack:
	gnome-extensions pack $(EXTENSION_NAME) \
		--extra-source="lib" \
		--extra-source="media" \
		--extra-source="settings" \
		--podir="../po" \
		--force
	# Extension has been packed into ./$(PACK_NAME).

install: pack
	gnome-extensions install --force $(PACK_NAME)
	# Extension has been installed.
	# Log out and in to use it, or start testing immediately.

uninstall:
	dconf reset -f /org/gnome/shell/extensions/$(EXTENSION_NAME)
	gnome-extensions uninstall $(EXTENSION_UUID)
	# Extension has been uninstalled and settings purged.

prefs:
	gnome-extensions prefs $(EXTENSION_UUID)
	# Opened Preferences.

test-gnome48: install
	# Running a nested GNOME Shell:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=960x540 \
		SHELL_DEBUG=backtrace-warnings \
		G_MESSAGES_DEBUG='GNOME Shell' \
		dbus-run-session -- gnome-shell --nested --wayland

test: install
	# Running a nested GNOME Shell:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=960x540 \
		SHELL_DEBUG=backtrace-warnings \
		G_MESSAGES_DEBUG='GNOME Shell' \
		dbus-run-session -- gnome-shell --devkit

test-prefs-settings: install prefs
	# Monitoring settings values:
	dconf watch /org/gnome/shell/extensions/$(EXTENSION_NAME)/

test-prefs-window: install prefs
	# Monitoring Preferences window:
	journalctl -f -o cat /usr/bin/gjs

update-pot:
	find $(EXTENSION_NAME)/ -iname "*.js" | xargs xgettext \
		--output=po/$(EXTENSION_NAME).pot \
		--from-code=UTF-8 \
		--package-name=$(EXTENSION_NAME)  \
		--package-version=$(VERSION) \
		--copyright-holder=$(COPYRIGHT_HOLDER) \
		--msgid-bugs-address=$(ISSUES_URL)
