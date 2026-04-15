# SPDX-FileCopyrightText: 2024-2026 djinnalexio
# SPDX-License-Identifier: GPL-3.0-or-later
COPYRIGHT_HOLDER = djinnalexio
EGO_USERNAME = djinnalexio
EXTENSION_NAME = eye-on-cursor
EXTENSION_UUID = eye-on-cursor@djinnalexio.github.io
ISSUES_URL = https://github.com/djinnalexio/eye-on-cursor/issues
PACK_NAME = $(EXTENSION_UUID).shell-extension.zip
VERSION = 2.3.0

pack:
	# Packing extension into ./$(PACK_NAME)...
	gnome-extensions pack ./src -f --extra-source="lib" \
		--extra-source="media" --extra-source="settings"

install: pack
	# Installing extension...
	gnome-extensions install $(PACK_NAME) -f
	# Log out of the session and then back in to use the extension, or start testing immediately.

uninstall:
	# Uninstalling extension...
	dconf reset -f /org/gnome/shell/extensions/$(EXTENSION_NAME)/
	gnome-extensions uninstall $(EXTENSION_UUID)

enable:
	# Enabling extension...
	gnome-extensions enable $(EXTENSION_UUID)

disable:
	# Disabling extension...
	gnome-extensions disable $(EXTENSION_UUID)

prefs:
	# Opening Preferences...
	gnome-extensions prefs $(EXTENSION_UUID)

test-prefs-settings: install prefs
	# Monitoring settings value changes:
	dconf watch /org/gnome/shell/extensions/$(EXTENSION_NAME)/

test-prefs-window: install prefs
	# Monitoring Preferences window:
	journalctl -f -o cat /usr/bin/gjs

update-pot:
	# Updating POT file...
	find ./src -iname "*.js" | xargs xgettext \
		--output=src/po/$(EXTENSION_NAME).pot \
		--from-code=UTF-8 \
		--package-name=$(EXTENSION_NAME)  \
		--package-version=$(VERSION) \
		--copyright-holder=$(COPYRIGHT_HOLDER) \
		--msgid-bugs-address=$(ISSUES_URL)

upload: pack
	# Uploading $(PACK_NAME) to https://extensions.gnome.org
	# Enter EGO password:
	gnome-extensions upload $(PACK_NAME) --accept-tos -u $(EGO_USERNAME) -P "-"
