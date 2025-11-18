# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: djinnalexio

COPYRIGHT_HOLDER = djinnalexio
EXTENSION_NAME = eye-on-cursor
EXTENSION_UUID = eye-on-cursor@djinnalexio.github.io
ISSUES_URL = https://github.com/djinnalexio/eye-on-cursor/issues
PACK_NAME = $(EXTENSION_UUID).shell-extension.zip
VERSION = 2.1.1

.phony: pack install uninstall enable disable prefs test test-gnome48 test-prefs-settings test-prefs-window update-pot

pack:
	# Packing extension into ./$(PACK_NAME)...
	gnome-extensions pack ./src \
		--extra-source="lib" \
		--extra-source="media" \
		--extra-source="settings" \
		--podir="../po" \
		--force

install: pack
	# Installing extension...
	gnome-extensions install --force $(PACK_NAME)
	# Log out and in to use the extension, or start testing immediately.

uninstall:
	# Uninstalling extension...
	dconf reset -f /org/gnome/shell/extensions/$(EXTENSION_NAME)/
	# gnome-extensions uninstall $(EXTENSION_UUID)

enable:
	# Enabling extension...
	gnome-extensions enable $(EXTENSION_UUID)

disable:
	# Disabling extension...
	gnome-extensions disable $(EXTENSION_UUID)

prefs:
	# Opening Preferences...
	gnome-extensions prefs $(EXTENSION_UUID)

test: install
	# Running a nested GNOME Shell:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=960x540 \
		SHELL_DEBUG=backtrace-warnings \
		G_MESSAGES_DEBUG='GNOME Shell' \
		dbus-run-session -- gnome-shell --devkit

test-gnome48: install
	# Running a nested GNOME Shell (GNOME 48 mode):
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=960x540 \
		SHELL_DEBUG=backtrace-warnings \
		G_MESSAGES_DEBUG='GNOME Shell' \
		dbus-run-session -- gnome-shell --nested --wayland

test-prefs-settings: install prefs
	# Monitoring settings value changes:
	dconf watch /org/gnome/shell/extensions/$(EXTENSION_NAME)/

test-prefs-window: install prefs
	# Monitoring Preferences window:
	journalctl -f -o cat /usr/bin/gjs

update-pot:
	# Updating POT file...
	find ./src -iname "*.js" | xargs xgettext \
		--output=po/$(EXTENSION_NAME).pot \
		--from-code=UTF-8 \
		--package-name=$(EXTENSION_NAME)  \
		--package-version=$(VERSION) \
		--copyright-holder=$(COPYRIGHT_HOLDER) \
		--msgid-bugs-address=$(ISSUES_URL)
