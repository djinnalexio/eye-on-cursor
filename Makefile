# SPDX-License-Identifier: GPL-3.0-or-later
# SPDX-FileCopyrightText: Contributors to the Eye and Mouse Extended GNOME extension.

EXTENSION_UUID = eye-extended@als.kz
EXTENSION_GETTEXT_DOMAIN = eye-and-mouse-extended
PACK_NAME = $(EXTENSION_UUID).shell-extension.zip

.phony: pack install uninstall enable disable clean prefs test test-prefs test-settings update-pot

pack:
	gnome-extensions pack $(EXTENSION_UUID) \
		--extra-source="lib" \
		--extra-source="media" \
		--extra-source="settings" \
		--podir="po" \
		--force
	# Extension has been packed into ./$(PACK_NAME).

install: pack
	gnome-extensions install --force $(PACK_NAME)
	# Extension has been installed.
	# Log out and in to use it, or start testing immediately.

uninstall:
	dconf reset -f /org/gnome/shell/extensions/$(EXTENSION_GETTEXT_DOMAIN)
	gnome-extensions uninstall $(EXTENSION_UUID)
	# Extension has been uninstalled and settings purged.

enable:
	gnome-extensions enable $(EXTENSION_UUID)
	# Extension has been enabled.

disable:
	gnome-extensions disable $(EXTENSION_UUID)
	# Extension has been disabled.

clean:
	rm $(PACK_NAME) -vf

prefs:
	gnome-extensions prefs $(EXTENSION_UUID)
	# Opened Preferences.

test: install
	# Running a nested GNOME Shell:
	env MUTTER_DEBUG_DUMMY_MODE_SPECS=960x540 \
		SHELL_DEBUG=backtrace-warnings \
		G_MESSAGES_DEBUG='GNOME Shell' \
		dbus-run-session -- gnome-shell --nested --wayland

test-prefs: install prefs
	# Monitoring Preferences window:
	journalctl -f -o cat /usr/bin/gjs

test-settings: install prefs
	# Monitoring settings values:
	dconf watch /org/gnome/shell/extensions/$(EXTENSION_GETTEXT_DOMAIN)/

update-pot:
	find $(EXTENSION_UUID)/ -iname "*.js" | xargs xgettext --from-code=UTF-8 --output=$(EXTENSION_UUID)/po/$(EXTENSION_GETTEXT_DOMAIN).pot
