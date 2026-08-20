# Navuryx

Navuryx is a dark Navify theme for Spotify with a restrained glass interface, compact navigation, and a full-window city backdrop.

## Install

Copy this folder to `%APPDATA%\navify\Themes\Navuryx`, then run:

```powershell
navify config current_theme Navuryx color_scheme Base inject_css 1 replace_colors 1
navify apply
```

To return to normal Spotify:

```powershell
navify config current_theme "" color_scheme "" inject_css 0 replace_colors 0
navify apply
```
