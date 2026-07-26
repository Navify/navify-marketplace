import type { CardItem } from "../types/marketplace-types";

const base = `${location.origin}/assets/marketplace/builtins`;
const noImage =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23141722'/%3E%3Ctext x='160' y='96' text-anchor='middle' fill='%239aa0b5' font-family='Arial,sans-serif' font-size='22'%3ENo image%3C/text%3E%3C/svg%3E";
const internalThemes = new Set(["marketplace", "navify", "navifydefault", "default", "spotify", "none"]);

export const isInternalThemeName = (name?: string | null) => internalThemes.has((name || "").trim().toLowerCase());

const shared = {
  user: "Navify",
  repo: "navify-marketplace",
  branch: "main",
  archived: false,
  stars: 0,
  tags: ["navify", "local"],
  lastUpdated: new Date().toISOString(),
  created: new Date().toISOString(),
  authors: [{ name: "Navify", url: "" }]
};

const extension = {
  ...shared,
  manifest: {
    name: "Navify Journal Capture",
    description: "Save a note about the current track with Ctrl+Shift+N.",
    main: "listening-journal.js",
    authors: shared.authors,
    preview: "",
    readme: ""
  },
  title: "Navify Journal Capture",
  subtitle: "Save a note about the current track with Ctrl+Shift+N.",
  imageURL: noImage,
  extensionURL: `${base}/listening-journal.js`,
  readmeURL: "",
  name: "Navify Journal Capture"
} as unknown as CardItem;

const theme = {
  ...shared,
  tags: ["latest", "navify"],
  manifest: {
    name: "Navuryx",
    description: "Dark glass interface with a neon city backdrop.",
    main: "",
    authors: shared.authors,
    preview: "assets/background.png",
    readme: "README.md",
    usercss: "user.css",
    schemes: "color.ini"
  },
  title: "Navuryx",
  subtitle: "Dark glass interface with a neon city backdrop.",
  imageURL: `${base}/navuryx/assets/background.png`,
  extensionURL: "",
  readmeURL: `${base}/navuryx/README.md`,
  cssURL: `${base}/navuryx/user.css`,
  schemesURL: `${base}/navuryx/color.ini`,
  name: "Navuryx"
} as unknown as CardItem;

const app = {
  ...shared,
  manifest: {
    name: "Navify Listening Journal",
    description: "Search, export, and manage notes saved for songs.",
    main: "",
    authors: shared.authors,
    preview: "",
    readme: ""
  },
  title: "Navify Listening Journal",
  subtitle: "Search, export, and manage notes saved for songs.",
  imageURL: noImage,
  extensionURL: "",
  readmeURL: "",
  name: "Navify Listening Journal"
} as unknown as CardItem;

export const getLocalCatalog = (type: "extension" | "theme" | "app") => {
  if (type === "extension") return [extension];
  if (type === "theme") return [theme];
  return [app];
};

const createConfiguredItem = (name: string, type: "extension" | "theme" | "app") => {
  const displayName = name
    .replace(/\.(js|mjs)$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return {
    ...shared,
    repo: "local-config",
    tags: ["navify", "local", "installed"],
    manifest: {
      name: displayName,
      description: `Installed from the Navify ${type === "app" ? "CustomApps" : type === "theme" ? "Themes" : "Extensions"} folder.`,
      main: type === "extension" ? name : "",
      authors: shared.authors,
      preview: "",
      readme: "",
      usercss: type === "theme" ? "user.css" : undefined
    },
    title: displayName,
    subtitle: "Local Navify installation",
    imageURL: noImage,
    extensionURL: "",
    readmeURL: "",
    name: displayName
  } as unknown as CardItem;
};

export const getConfiguredCatalog = () => {
  const items: Array<{ item: CardItem; type: "extension" | "theme" | "app" }> = [];
  const currentTheme = (Navify.Config.current_theme || "").trim();

  if (currentTheme && !isInternalThemeName(currentTheme)) {
    items.push({ item: createConfiguredItem(currentTheme, "theme"), type: "theme" });
  }

  for (const name of (Navify.Config.extensions || []).filter(
    (extensionName) => !["navify-branding.js", "marketplace.js", "navify-marketplace.js"].includes(extensionName.toLowerCase())
  )) {
    items.push({ item: createConfiguredItem(name, "extension"), type: "extension" });
  }

  for (const name of (Navify.Config.custom_apps || []).filter((appName) => !["marketplace", "navify-marketplace"].includes(appName.toLowerCase()))) {
    items.push({ item: createConfiguredItem(name, "app"), type: "app" });
  }

  return items;
};
