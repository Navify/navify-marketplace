// NAME: Navify Marketplace Extension
// AUTHOR: theRealPadster, CharlieS1103
// DESCRIPTION: Companion extension for Navify Marketplace

import { t } from "i18next";

import { LOCALSTORAGE_KEYS, MARKETPLACE_VERSION } from "../constants";
import { hydrateMarketplaceStorage, marketplaceStorage } from "../logic/Storage";
import {
  addExtensionToNavifyConfig,
  exportMarketplace,
  getAvailableTLD,
  getLocalStorageDataFromKey,
  getParamsFromGithubRaw,
  initAlbumArtBasedColor,
  initColorShiftLoop,
  initializeSnippets,
  injectColourScheme,
  // TODO: there's a slightly different copy of this function in Card.ts?
  injectUserCSS,
  isGithubRawUrl,
  parseCSS,
  resetMarketplace
} from "../logic/Utils";

(async function init() {
  if (!Navify.LocalStorage || !Navify.showNotification) {
    setTimeout(init, 100);
    return;
  }

  // https://github.com/satya164/react-simple-code-editor/issues/86
  const reactSimpleCodeEditorFix = document.createElement("script");
  reactSimpleCodeEditorFix.innerHTML = "const global = globalThis;";
  document.body.appendChild(reactSimpleCodeEditorFix);

  // Show message on start.
  console.log(`Initializing Navify Marketplace v${MARKETPLACE_VERSION}`);
  await hydrateMarketplaceStorage();

  // Expose useful methods in global context
  window.Marketplace = {
    // Should allow you to reset Marketplace from the dev console if it's b0rked
    reset: resetMarketplace,
    // Export all marketplace localstorage keys
    export: exportMarketplace,
    version: MARKETPLACE_VERSION
  };

  const tld = (await getAvailableTLD()) || "net";

  const initializeExtension = (extensionKey: string) => {
    const extensionManifest = getLocalStorageDataFromKey(extensionKey);
    // Abort if no manifest found or no extension URL (i.e. a theme)
    if (!extensionManifest?.extensionURL) return;

    console.debug("Initializing extension: ", extensionManifest);

    const script = document.createElement("script");
    script.defer = true;
    script.src = extensionManifest.extensionURL;

    // If it's a github raw script, use jsdelivr
    if (isGithubRawUrl(script.src)) {
      const { user, repo, branch, filePath } = getParamsFromGithubRaw(extensionManifest.extensionURL);
      if (!user || !repo || !branch || !filePath) return;
      script.src = `https://cdn.jsdelivr.${tld}/gh/${user}/${repo}@${branch}/${filePath}`;
      if (filePath.endsWith(".mjs")) script.type = "module";
    }

    script.src = `${script.src}?time=${Date.now()}`;

    document.body.appendChild(script);

    // Add to Navify.Config
    addExtensionToNavifyConfig(extensionManifest.manifest?.main);
  };

  const initializeTheme = async (themeKey: string) => {
    const themeManifest = getLocalStorageDataFromKey(themeKey);
    // Abort if no manifest found
    if (!themeManifest) {
      console.debug("No theme manifest found");
      return;
    }

    console.debug("Initializing theme: ", themeManifest);

    // Inject colour scheme if found
    if (themeManifest.schemes) {
      const activeScheme = themeManifest.schemes[themeManifest.activeScheme];
      injectColourScheme(activeScheme);

      // Add to Navify.Config
      // @ts-expect-error: `color_scheme` is read-only type in types
      Navify.Config.color_scheme = themeManifest.activeScheme;
      if (marketplaceStorage.getItem(LOCALSTORAGE_KEYS.albumArtBasedColor) === "true") {
        initAlbumArtBasedColor(activeScheme);
      } else if (marketplaceStorage.getItem(LOCALSTORAGE_KEYS.colorShift) === "true") {
        initColorShiftLoop(themeManifest.schemes);
      }
    } else {
      console.warn("No schemes found for theme");
    }

    // Remove default css
    // TODO: what about if we remove the theme? Should we re-add the user.css/colors.css?
    // const existingUserThemeCSS = document.querySelector("link[href='user.css']");
    // if (existingUserThemeCSS) existingUserThemeCSS.remove();

    // Remove any existing marketplace theme
    const existingMarketplaceThemeCSS = document.querySelector("link.marketplaceCSS");
    if (existingMarketplaceThemeCSS) existingMarketplaceThemeCSS.remove();

    // Add theme css
    const userCSS = await parseCSS(themeManifest, tld);
    if (!injectUserCSS(userCSS)) {
      Navify.showNotification(t("notifications.themeInstallationError"), true, 5000);
      return;
    }

    // Add to Navify.Config
    // @ts-expect-error: `current_theme` is read-only type in types
    Navify.Config.current_theme = themeManifest.manifest?.name;

    // Inject any included js
    if (themeManifest.include?.length) {
      // console.log("Including js", installedThemeData.include);

      for (const script of themeManifest.include) {
        const newScript = document.createElement("script");
        let src = script;

        // If it's a github raw script, use jsdelivr
        if (isGithubRawUrl(script)) {
          const { user, repo, branch, filePath } = getParamsFromGithubRaw(script);
          if (!user || !repo || !branch || !filePath) return;
          src = `https://cdn.jsdelivr.${tld}/gh/${user}/${repo}@${branch}/${filePath}`;
          if (filePath.endsWith(".mjs")) newScript.type = "module";
        }
        // console.log({src});
        newScript.src = `${src}?time=${Date.now()}`;
        newScript.classList.add("marketplaceScript");
        document.body.appendChild(newScript);

        // Add to Navify.Config
        addExtensionToNavifyConfig(script);
      }
    }
  };

  console.log("Loaded Marketplace extension");

  const installedSnippetKeys = getLocalStorageDataFromKey(LOCALSTORAGE_KEYS.installedSnippets, []);
  const installedSnippets = installedSnippetKeys.map((key) => getLocalStorageDataFromKey(key));
  initializeSnippets(installedSnippets);

  window.sessionStorage.setItem("marketplace-request-tld", tld);

  const installedExtensions = getLocalStorageDataFromKey(LOCALSTORAGE_KEYS.installedExtensions, []);
  for (const extensionKey of installedExtensions) {
    initializeExtension(extensionKey);
  }

  const { current_theme: localTheme } = Navify.Config;
  marketplaceStorage.setItem(LOCALSTORAGE_KEYS.localTheme, localTheme);
  let installedTheme = marketplaceStorage.getItem(LOCALSTORAGE_KEYS.themeInstalled);
  if (!installedTheme) {
    const installedThemes = getLocalStorageDataFromKey(LOCALSTORAGE_KEYS.installedThemes, []);
    installedTheme = installedThemes.find((themeKey: string) => marketplaceStorage.getItem(themeKey)) || null;
    if (installedTheme) marketplaceStorage.setItem(LOCALSTORAGE_KEYS.themeInstalled, installedTheme);
  }
  if (installedTheme) {
    const installedThemeData = getLocalStorageDataFromKey(installedTheme);
    if (installedThemeData?.manifest?.name === "Navuryx" && installedThemeData.include) {
      delete installedThemeData.include;
      delete installedThemeData.manifest.include;
      marketplaceStorage.setItem(installedTheme, JSON.stringify(installedThemeData));
    }
    if (localTheme && localTheme.toLocaleLowerCase() !== "marketplace") {
      Navify.showNotification(t("notifications.wrongLocalTheme"), true, 5000);
      return;
    }
    initializeTheme(installedTheme);
  }
})();
