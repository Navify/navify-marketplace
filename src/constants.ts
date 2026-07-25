import { version } from "../package.json";
import type { TabItemConfig } from "./types/marketplace-types";

export const MARKETPLACE_VERSION = version;

const STORAGE_KEY_PREFIX = "marketplace";
export const LOCALSTORAGE_KEYS = {
  installedExtensions: `${STORAGE_KEY_PREFIX}:installed-extensions`,
  installedSnippets: `${STORAGE_KEY_PREFIX}:installed-snippets`,
  installedThemes: `${STORAGE_KEY_PREFIX}:installed-themes`,
  activeTab: `${STORAGE_KEY_PREFIX}:active-tab`,
  tabs: `${STORAGE_KEY_PREFIX}:tabs`,
  sort: `${STORAGE_KEY_PREFIX}:sort`,
  themeInstalled: `${STORAGE_KEY_PREFIX}:theme-installed`,
  localTheme: `${STORAGE_KEY_PREFIX}:local-theme`,
  albumArtBasedColor: `${STORAGE_KEY_PREFIX}:albumArtBasedColors`,
  albumArtBasedColorMode: `${STORAGE_KEY_PREFIX}:albumArtBasedColorsMode`,
  albumArtBasedColorVibrancy: `${STORAGE_KEY_PREFIX}:albumArtBasedColorsVibrancy`,
  colorShift: `${STORAGE_KEY_PREFIX}:colorShift`
};

export const ALL_TABS: TabItemConfig[] = [
  { name: "Extensions", enabled: true },
  { name: "Themes", enabled: true },
  { name: "Snippets", enabled: true },
  { name: "Apps", enabled: true },
  { name: "Installed", enabled: true }
];

export const ITEMS_PER_REQUEST = 24;

export const CUSTOM_APP_PATH = "/marketplace";

export const MAX_TAGS = 4;

const catalogOwner = "Navify";
const catalogRepository = "navify-marketplace";

export const SNIPPETS_PAGE_URL = `https://github.com/${catalogOwner}/${catalogRepository}/blob/main/resources/snippets.json`;

export const SNIPPETS_URL = `https://raw.githubusercontent.com/${catalogOwner}/${catalogRepository}/main/resources/snippets.json`;

export const BLACKLIST_URL = `https://raw.githubusercontent.com/${catalogOwner}/${catalogRepository}/main/resources/blacklist.json`;

export const RELEASES_URL = `https://github.com/${catalogOwner}/${catalogRepository}/releases`;

export const LATEST_RELEASE_URL = `https://api.github.com/repos/${catalogOwner}/${catalogRepository}/releases/latest`;
