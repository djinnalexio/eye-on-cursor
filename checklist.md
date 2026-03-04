# Checklist

- [ ] #3 "As of now, the extension does not work using the Wacom Intuos graphics tablet, the graphics tablet's input is just ignored."
  - [ ] maybe use global stage mouse listener but it won't be as efficient as global pointer

- [ ] Add a page for individual eye position settings inspired by top bar organizer: have a 2D array of [eye pos, eye index]

- [ ] Use the `SetInterval` functions already included in GJS and remove the custom script

- [ ] Add a Synced random Blink mode (either new mode or toggle above range for all vs individual): Manual, Synced, Synced random, Fully Random

- [ ] Blink when toggling tracker

- [ ] add a timeout to tracker to only make it visible while cursor is moving

- [ ] to fix the issue when tracker prevents dragging windows in overview mode, maybe remove the tracker during click

- [ ] move the po folder inside src so that it can be automatically picked up by the pack command and update makefile and crowdin accordingly.

- [ ] add upload command to make

- [ ] change pack_name in makefile to '$(EXTENSION_NAME).shell-extension.zip'
