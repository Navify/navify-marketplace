#!/bin/sh

set -eu

command -v curl >/dev/null 2>&1 || { echo "curl is required" >&2; exit 1; }
command -v unzip >/dev/null 2>&1 || { echo "unzip is required" >&2; exit 1; }
command -v find >/dev/null 2>&1 || { echo "find is required" >&2; exit 1; }
command -v navify >/dev/null 2>&1 || { echo "navify is not available in PATH" >&2; exit 1; }

if [ "$#" -gt 0 ]; then
    tag=${1#v}
    download_uri="https://github.com/Navify/navify-marketplace/releases/download/v$tag/marketplace.zip"
else
    download_uri="https://github.com/Navify/navify-marketplace/releases/latest/download/marketplace.zip"
fi

default_color_uri="https://raw.githubusercontent.com/Navify/navify-marketplace/main/resources/color.ini"
navify_config_dir=${NAVIFY_CONFIG:-"${XDG_CONFIG_HOME:-$HOME/.config}/navify"}
custom_apps_dir="$navify_config_dir/CustomApps"
marketplace_dir="$custom_apps_dir/marketplace"
archive_path="$custom_apps_dir/marketplace.zip"
temporary_dir="$custom_apps_dir/.marketplace-install-$$"

cleanup() {
    rm -f "$archive_path"
    rm -rf "$temporary_dir"
}
trap cleanup EXIT HUP INT TERM

mkdir -p "$custom_apps_dir" "$temporary_dir"

echo "Downloading Navify Marketplace"
curl --fail --location --progress-bar --output "$archive_path" "$download_uri"

echo "Extracting Navify Marketplace"
unzip -q -o "$archive_path" -d "$temporary_dir"
manifest_path=$(find "$temporary_dir" -maxdepth 4 -type f -name manifest.json -print | head -n 1)
if [ -z "$manifest_path" ]; then
    echo "The Marketplace archive does not contain manifest.json" >&2
    exit 1
fi
source_dir=${manifest_path%/*}

rm -rf "$marketplace_dir"
mkdir -p "$marketplace_dir"
cp -R "$source_dir"/. "$marketplace_dir"/

navify config custom_apps navify-marketplace- >/dev/null 2>&1 || true
navify config inject_css 1
navify config replace_colors 1

current_theme=$(navify config current_theme 2>/dev/null || true)
if [ -z "$current_theme" ]; then
    marketplace_theme_dir="$navify_config_dir/Themes/marketplace"
    mkdir -p "$marketplace_theme_dir"
    curl --fail --location --progress-bar --output "$marketplace_theme_dir/color.ini" "$default_color_uri"
    navify config current_theme marketplace
fi

navify config custom_apps marketplace
navify apply

echo "Navify Marketplace installed successfully"