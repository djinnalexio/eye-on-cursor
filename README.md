> [!WARNING]
> **This repository has been migrated and archived**
> 
> Development has moved to [gitlab.gnome.org](https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/).
> This repository is kept for historical reference only and will no longer receive updates.

<div align="center">

[![Static Badge](https://img.shields.io/badge/Eye%20on%20Cursor-gold?logo=gnome&label=gitlab)](https://gitlab.gnome.org/DjinnAlexio/eye-on-cursor/)

# Eye on Cursor

[![GitHub License](https://img.shields.io/github/license/djinnalexio/eye-on-cursor?&logo=gnu)](https://github.com/djinnalexio/eye-on-cursor/blob/main/LICENSE)
[![Latest Release](https://img.shields.io/github/v/release/djinnalexio/eye-on-cursor?label=latest%20release&logo=github&color=red)](https://github.com/djinnalexio/eye-on-cursor/releases/latest")
[![GNOME versions](https://img.shields.io/badge/compatibility-45_to_50-3584e4?logo=gnome)](https://extensions.gnome.org/extension/7036/eye-on-cursor/)
[![GNOME Downloads](https://img.shields.io/gnome-extensions/dt/eye-on-cursor%40djinnalexio.github.io?logo=gnome&color=3584e4)](https://extensions.gnome.org/extension/7036/eye-on-cursor/)

<p align="center">
  <img alt="logo" height="100" src="./src/assets/eye-on-cursor-logo.svg">
</p>

### Let your desktop "keep an eye" on your mouse!

</div>

## Overview

**Eye on Cursor** is a fun and practical extension that gives your panel eyes that constantly follow
your mouse. This quirky feature, combined with a highly customizable mouse tracker that highlights
clicks, makes it easier than ever to monitor your mouse movements, ensuring your pointer gets all
the attention it needs.

<p align="center">
<img alt="" height="300" src="images/tracking.gif">
</p>
<p align="center">
<img alt="" height="300" src="images/biblicallyAccurate.png">
</p>
<p align="center">
<img alt="" height="200" src="images/tracker.png">
<img alt="" height="200" src="images/comic.png">
</p>
<p align="center">
<img alt="" height="200" src="images/blueEyes.png">
<img alt="" height="200" src="images/round.png">
</p>

## Features

- **Eyes Follow Cursor:** As many eyes as you want in the panel to follow the cursor movements,
  providing a fun and interactive experience.
- **Customizable Mouse Tracker:** Highlights clicks and tracks mouse movements with customizable
  settings to fit your preferences.

## Installation

### From the GNOME Extensions Website (recommended)

[<img alt="EGO page" height="100" src="images/get-it-on-ego.svg">](https://extensions.gnome.org/extension/7036/eye-on-cursor/)

### From GitHub

1. Run the following command to download and install the latest release:

    ```bash
    curl -L https://github.com/djinnalexio/eye-on-cursor/releases/download/v2.4.1/eye-on-cursordjinnalexio.github.io.v23.shell-extension.zip \
    -o /tmp/eye-on-cursor.zip && gnome-extensions install -f /tmp/eye-on-cursor.zip
    ```

2. Log out and back in, then enable the extension using Extensions Manager or by running:

    ```bash
    gnome-extensions enable eye-on-cursor@djinnalexio.github.io
    ```

## Acknowledgements

This extension is forked from
[Eye and Mouse Extended](https://extensions.gnome.org/extension/3139/eye-extended/) by
[Alexey Lovchikov](https://github.com/alexeylovchikov).

**Eye and Mouse Extended** also has a fork for the Cinnamon Desktop,
[Cinnamon Eyes](https://cinnamon-spices.linuxmint.com/applets/view/363), created by
[anaximeno](https://github.com/anaximeno/).

## Contributing

First off, thanks for taking the time to contribute! ❤️

If you want to **ask a question**, **offer a suggestion**, or **report a bug**, feel free to open an
[issue](https://github.com/djinnalexio/eye-on-cursor/issues/new).

You can also submit pull requests to provide **translations**, **new tracker icons**, or
**bug fixes**.

If you have contributed in any way, feel free to add yourself to the `about.js` file in
`settings`.

### Known Issues

- On **Wayland**, the mouse tracker uses `globe.stage` to listen to clicks:
  - clicks within application windows are not registered. Only clicks in the Shell (background,
  panel, etc.) are highlighted.

- On **x11**, the mouse tracker uses `Atspi` listen to clicks:
  - middle click is not registered.

### Resources

- [GNOME Shell Extensions Guide](https://gjs.guide/extensions)
- [GNOME Developer Documentation](https://developer.gnome.org/documentation/index.html)
- [GNOME Shell Repository](https://gitlab.gnome.org/GNOME/gnome-shell#gnome-shell)
- [Poedit Translation Editor](https://flathub.org/apps/net.poedit.Poedit)
