<h1 align="center">Eye on Cursor</h1>
<p align="center">
    <img alt="GitHub License" src="https://img.shields.io/github/license/djinnalexio/eye-on-cursor?style=for-the-badge&logo=gnu">
    <img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/djinnalexio/eye-on-cursor?style=for-the-badge&logo=node.js">
    <img alt="GNOME versions" src="https://img.shields.io/badge/supported_shell_versions-45_|_46_|_47-green?style=for-the-badge&logo=gnome">
    <img alt="GNOME Downloads" src="https://img.shields.io/badge/dynamic/xml?url=https%3A%2F%2Fextensions.gnome.org%2Fextension%2F7036%2Feye-on-cursor%2F&query=%2Fhtml%2Fbody%2Fdiv%5B2%5D%2Fdiv%2Fdiv%5B2%5D%2Fdiv%5B1%5D%2Fspan%5B3%5D&label=GNOME%20extensions&cacheSeconds=86400&style=for-the-badge&logo=gnome">
</p>
<p align="center">
  <img alt="logo" height="100" src="./eye-on-cursor@djinnalexio.github.io/media/eye-on-cursor-logo.svg">
</p>
<h3 align="center">Let your desktop "keep an eye" on your mouse!</h3>

## Overview

**Eye on Cursor** is a fun and practical extension that gives your panel eyes that constantly follow your mouse. This quirky feature, combined with a highly customizable mouse tracker that highlights clicks, makes it easier than ever to monitor your mouse movements, ensuring your pointer gets all the attention it needs.

![tracking](assets/tracking.gif) ![tracker](assets/tracker.png)

![comic](assets/comic.png) ![round](assets/round.png) ![blueEyes](assets/blueEyes.png)

![biblicallyAccurate](assets/biblicallyAccurate.png)

## Features

- **Eyes Follow Cursor:** As many eyes as you want in the panel to follow the cursor movements, providing a fun and interactive experience.
- **Customizable Mouse Tracker:** Highlights clicks and tracks mouse movements with customizable settings to fit your preferences.
- **Click Highlighting:** Visual feedback for mouse clicks, making it easier to keep track of your actions, especially useful for presentations or demonstrations.

## Installation

### From the GNOME Extensions Website (recommended)

[<img alt="EGO page" height="100" src="assets/get-it-on-ego.svg">](https://extensions.gnome.org/extension/7036/eye-on-cursor/)

### From GitHub

1. Go to [the latest release](https://github.com/djinnalexio/eye-on-cursor/releases/latest) and download the extension zip file.
2. At the location of the downloaded zip file, run:

   ```bash
   gnome-extensions install --force eye-on-cursor@djinnalexio.github.io.shell-extension.zip
   ```

3. Log out and back in, then enable the extension in your extensions app or with:

    ```bash
    gnome-extensions enable eye-on-cursor@djinnalexio.github.io
    ```

## Acknowledgements

This extension is forked from [Eye and Mouse Extended](https://extensions.gnome.org/extension/3139/eye-extended/) by [Alexey Lovchikov](https://github.com/alexeylovchikov).

**Eye and Mouse Extended** also has a fork for the Cinnamon Desktop, [c-eyes](https://github.com/anaximeno/c-eyes), created by [anaximeno](https://github.com/anaximeno/).

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have any suggestions or find any bugs.

Translations and new glyphs for the mouse tracker are greatly appreciated as well!

If you have contributed in any way, feel free to add yourself to the `credits.js` file in `settings`.

### Development

In the root of the repo, run `make install && make enable` to use the extension or `make test` to debug it. The `Makefile` contains a few other commands that should be useful for debugging.

### Known Issues

- On Wayland, the mouse tracker click highlighting feature does not function within application windows.

  Wayland handles events differently compared to X11, isolating them to the window where they occur. On x11, **Eye on Cursor** uses `Atspi` to listen to mouse clicks, which doesn't work at all on Wayland. On Wayland, the extension thus resorts to listening with `globe.stage` instead, with its caveat that only clicks in the Shell (background, panel, etc.) are registered.

- On x11, middle click is not registered.

  `Atspi` does not register middle clicks.

### Documentation on Developing GNOME Extensions

Resources to get you started:

- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions Review Guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html)
- [GNOME Human Interface Guidelines](https://developer.gnome.org/hig/)
