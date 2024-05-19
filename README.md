<h1 align="center">Eye on Cursor</h1>
<h3 align="center">Let your desktop "keep an eye" on your mouse!</h3>

<p align="center">
    <img alt="GitHub License" src="https://img.shields.io/github/license/djinnalexio/eye-on-cursor?style=plastic">
    <img alt="GitHub repo size" src="https://img.shields.io/github/repo-size/djinnalexio/eye-on-cursor?style=plastic">
    <img alt="GitHub top language" src="https://img.shields.io/github/languages/top/djinnalexio/eye-on-cursor?style=plastic&label=GNOME%20javascript">
    <img alt="GitHub package.json version" src="https://img.shields.io/github/package-json/v/djinnalexio/eye-on-cursor?style=plastic">
    <img alt="Static Badge" src="https://img.shields.io/badge/supported_shell_versions-45_and_46-green?style=plastic">
</p>

## Overview

**Eye on Cursor** is a fun and practical extension that gives your panel eyes that constantly follow your mouse. This quirky feature, combined with a highly customizable mouse tracker that highlights clicks, makes it easier than ever to monitor your mouse movements, ensuring your pointer gets all the attention it needs.

## Installation

### From the GNOME Extensions Website (recommended)

[<img alt="website" src="https://img.shields.io/website?url=https%3A%2F%2Fextensions.gnome.org%2Fextension%2Fgnome_ext_code%2Feye-on-cursor%2F&up_message=Eye%20on%20Cursor&down_message=page%20offline&style=plastic&label=extensions.gnome.org" height="30">](https://extensions.gnome.org/extension/gnome_ext_code/eye-on-cursor/)

*Note: The extension is not yet available on the GNOME Extensions website.*

### Manually

1. Clone or download and unzip the repository.
2. At the root of the repository, run `make install`. The command will pack the extension and place it in `~/.local/share/gnome-shell/extensions`.
3. Log out, log back in, then enable the extension in your extensions app.

## Acknowledgements

This extension is forked from [Eye and Mouse Extended](https://extensions.gnome.org/extension/3139/eye-extended/) by [Alexey Lovchikov](https://github.com/alexeylovchikov).

## Contributing

Contributions are welcome! Please feel free to submit a pull request or open an issue if you have any suggestions or find any bugs.

Translations and new glyphs for the mouse tracker are greatly appreciated as well!

If you have contributed in any way, don't forget to add yourself to the `credits.js` file.

### Development

Here are a few steps to get you set up:

1. Create a fork to start working on the changes you want to implement.
2. Clone your repository.
3. In the root of the repo, run `npm install` to enable linting and formatting (you need the `nodejs` package installed on your system). You will then be able to run `npm run lint` and `npm run format` to check the code.
4. Run `make install && make enable` to use the extension or `make test` to debug it. The `Makefile` contains a few other commands that should be useful for debugging.

### Documentation on Developing GNOME Extensions

Resources to get you started:

- [GJS Guide](https://gjs.guide/)
- [GNOME Shell Extensions Review Guidelines](https://gjs.guide/extensions/review-guidelines/review-guidelines.html)
- [GNOME Human Interface Guidelines](https://developer.gnome.org/hig/)
