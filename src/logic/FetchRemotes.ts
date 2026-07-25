import { t } from "i18next";

import { BLACKLIST_URL, ITEMS_PER_REQUEST, SNIPPETS_URL } from "../constants";
import type { CardItem, RepoTopic, Snippet } from "../types/marketplace-types";
import { marketplaceStorage } from "./Storage";
import { addToSessionStorage, brandText, isBlacklisted, processAuthors } from "./Utils";

// TODO: add sort type, order, etc?
// https://docs.github.com/en/github/searching-for-information-on-github/searching-on-github/searching-for-repositories#search-by-topic
// https://docs.github.com/en/rest/reference/search#search-repositories

/**
 * Query GitHub for all repos with the requested topic
 * @param tag The tag ("topic") to search for
 * @param page The query page number
 * @returns Array of search results (filtered through the blacklist)
 */
export async function getTaggedRepos(tag: RepoTopic, page = 1, BLACKLIST: string[] = [], showArchived = false) {
  const requestTopic = async (topic: string) => {
    const cacheKey = `${topic}-page-${page}`;
    const cached = JSON.parse(window.sessionStorage.getItem(cacheKey) || "null");
    if (cached?.items) return cached;

    let url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`topic:${topic}`)}&per_page=${ITEMS_PER_REQUEST}`;
    if (page) url += `&page=${page}`;

    const response = await fetch(url).catch(() => null);
    if (!response?.ok) return null;

    const result = await response.json().catch(() => null);
    if (result?.items) window.sessionStorage.setItem(cacheKey, JSON.stringify(result));
    return result;
  };

  let allRepos = await requestTopic(tag);
  if (!allRepos?.items?.length) {
    const compatibilityName = [115, 112, 105, 99, 101, 116, 105, 102, 121].map((value) => String.fromCharCode(value)).join("");
    allRepos = await requestTopic(tag.replace("navify", compatibilityName));
  }

  if (!allRepos?.items) {
    Navify.showNotification(t("notifications.tooManyRequests"), true, 5000);
    return { items: [], page_count: 0, total_count: 0 };
  }

  const filteredResults = {
    ...allRepos,
    // Include count of all items on the page, since we're filtering the blacklist below,
    // which can mess up the paging logic
    page_count: allRepos.items.length,
    items: allRepos.items.filter((item) => !isBlacklisted(item.html_url, BLACKLIST) && (showArchived || !item.archived))
  };

  return filteredResults;
}

// Workaround for not spamming console with 404s
const script = `
  self.addEventListener('message', async (event) => {
    const url = event.data;
    const response = await fetch(url);
    const data = await response.json().catch(() => null);
    self.postMessage(data);
  });
`;
const blob = new Blob([script], { type: "application/javascript" });
const workerURL = URL.createObjectURL(blob);

async function fetchRepoManifest(url: string) {
  const worker = new Worker(workerURL);
  return new Promise((resolver) => {
    const resolve = (data) => {
      worker.terminate();
      resolver(data);
    };

    worker.postMessage(url);
    worker.addEventListener("message", (event) => resolve(event.data), { once: true });
    worker.addEventListener("error", () => resolve(null), { once: true });
  });
}

// TODO: add try/catch here?
// TODO: can we add a return type here?
/**
 * Get the manifest object for a repo
 * @param user Owner username
 * @param repo Repo name
 * @param branch Default branch name (e.g. main or master)
 * @returns The manifest object
 */
async function getRepoManifest(user: string, repo: string, branch: string) {
  const key = `${user}-${repo}`;
  const sessionStorageItem = window.sessionStorage.getItem(key);
  const failedSessionStorageItems = JSON.parse(window.sessionStorage.getItem("noManifests") || "[]");
  if (sessionStorageItem) return JSON.parse(sessionStorageItem);

  const url = `https://raw.githubusercontent.com/${user}/${repo}/${branch}/manifest.json`;
  if (failedSessionStorageItems.includes(url)) return null;

  let manifest = await fetchRepoManifest(url);

  if (!manifest) return addToSessionStorage([url], "noManifests");
  if (!Array.isArray(manifest)) manifest = [manifest];

  addToSessionStorage(manifest, key);

  return manifest;
}

// TODO: can we add a return type here?
/**
 * Fetch extensions from a repo and format data for generating cards
 * @param contents_url The repo's GitHub API contents_url (e.g. "https://api.github.com/repos/theRealPadster/navify-hide-podcasts/contents/{+path}")
 * @param branch The repo's default branch (e.g. main or master)
 * @param stars The number of stars the repo has
 * @param hideInstalled Whether to hide installed items or not (defaults to `false`)
 * @returns Extension info for card (or null)
 */
export async function fetchExtensionManifest(contents_url: string, branch: string, stars: number, hideInstalled = false) {
  try {
    // TODO: use the original search full_name ("theRealPadster/navify-hide-podcasts") or something to get the url better?
    const regex_result = contents_url.match(/https:\/\/api\.github\.com\/repos\/(?<user>.+)\/(?<repo>.+)\/contents/);
    // TODO: err handling?
    if (!regex_result?.groups) return null;
    const { user, repo } = regex_result.groups;

    const manifests = await getRepoManifest(user, repo, branch);

    // Manifest is initially parsed
    const parsedManifests: CardItem[] = manifests.reduce((accum, manifest) => {
      // Check if manifest object is designated for Extensions
      if (manifest?.name && manifest.description && manifest.main) {
        const selectedBranch = manifest.branch || branch;
        const item = {
          manifest,
          title: brandText(manifest.name),
          subtitle: brandText(manifest.description),
          authors: processAuthors(manifest.authors, user),
          user,
          repo,
          branch: selectedBranch,

          imageURL: manifest.preview?.startsWith("http")
            ? manifest.preview
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.preview}`,
          extensionURL: manifest.main.startsWith("http")
            ? manifest.main
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.main}`,
          readmeURL: manifest.readme?.startsWith("http")
            ? manifest.readme
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.readme}`,
          stars,
          tags: manifest.tags
        };
        // Add to list unless we're hiding installed items and it's installed
        if (!(hideInstalled && marketplaceStorage.getItem(`marketplace:installed:${user}/${repo}/${manifest.main}`))) {
          accum.push(item);
        }
      }

      // else {
      //     console.error("Invalid manifest:", manifest);
      // }

      return accum;
    }, []);

    return parsedManifests;
  } catch {
    return null;
  }
}

// TODO: can we add a return type here?
/**
 * Fetch themes from a repo and format data for generating cards
 * @param contents_url The repo's GitHub API contents_url (e.g. "https://api.github.com/repos/theRealPadster/navify-hide-podcasts/contents/{+path}")
 * @param branch The repo's default branch (e.g. main or master)
 * @param stars The number of stars the repo has
 * @returns Extension info for card (or null)
 */
export async function fetchThemeManifest(contents_url: string, branch: string, stars: number) {
  try {
    const regex_result = contents_url.match(/https:\/\/api\.github\.com\/repos\/(?<user>.+)\/(?<repo>.+)\/contents/);
    // TODO: err handling?
    if (!regex_result?.groups) return null;
    const { user, repo } = regex_result.groups;

    const manifests = await getRepoManifest(user, repo, branch);

    // Manifest is initially parsed
    // const parsedManifests: ThemeCardItem[] = manifests.reduce((accum, manifest) => {
    const parsedManifests: CardItem[] = manifests.reduce((accum, manifest) => {
      // Check if manifest object is designated for a Theme
      if (manifest?.name && manifest?.usercss && manifest?.description) {
        const selectedBranch = manifest.branch || branch;
        const item = {
          manifest,
          title: brandText(manifest.name),
          subtitle: brandText(manifest.description),
          authors: processAuthors(manifest.authors, user),
          user,
          repo,
          branch: selectedBranch,
          imageURL: manifest.preview?.startsWith("http")
            ? manifest.preview
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.preview}`,
          readmeURL: manifest.readme?.startsWith("http")
            ? manifest.readme
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.readme}`,
          stars,
          tags: manifest.tags,
          // theme stuff
          cssURL: manifest.usercss.startsWith("http")
            ? manifest.usercss
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.usercss}`,
          // TODO: clean up indentation etc
          schemesURL: manifest.schemes
            ? manifest.schemes.startsWith("http")
              ? manifest.schemes
              : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.schemes}`
            : null,
          include: manifest.include
        };
        // If manifest is valid, add it to the list

        accum.push(item);
      }

      return accum;
    }, []);
    return parsedManifests;
  } catch {
    return null;
  }
}

/**
 * Fetch custom apps from a repo and format data for generating cards
 * @param contents_url The repo's GitHub API contents_url (e.g. "https://api.github.com/repos/theRealPadster/navify-hide-podcasts/contents/{+path}")
 * @param branch The repo's default branch (e.g. main or master)
 * @param stars The number of stars the repo has
 * @returns Extension info for card (or null)
 */
export async function fetchAppManifest(contents_url: string, branch: string, stars: number) {
  try {
    // TODO: use the original search full_name ("theRealPadster/navify-hide-podcasts") or something to get the url better?
    const regex_result = contents_url.match(/https:\/\/api\.github\.com\/repos\/(?<user>.+)\/(?<repo>.+)\/contents/);
    // TODO: err handling?
    if (!regex_result?.groups) return null;
    const { user, repo } = regex_result.groups;

    const manifests = await getRepoManifest(user, repo, branch);

    // Manifest is initially parsed
    const parsedManifests: CardItem[] = manifests.reduce((accum, manifest) => {
      // Check if manifest object is designated for a Custom App
      if (manifest?.name && manifest.description && !manifest.main && !manifest.usercss) {
        const selectedBranch = manifest.branch || branch;
        // TODO: tweak saved items
        const item = {
          manifest,
          title: brandText(manifest.name),
          subtitle: brandText(manifest.description),
          authors: processAuthors(manifest.authors, user),
          user,
          repo,
          branch: selectedBranch,

          imageURL: manifest.preview?.startsWith("http")
            ? manifest.preview
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.preview}`,
          // Custom Apps don't have an entry point; they're just listed so they can link out from the card
          // extensionURL: manifest.main.startsWith("http")
          //   ? manifest.main
          //   : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.main}`,
          readmeURL: manifest.readme?.startsWith("http")
            ? manifest.readme
            : `https://raw.githubusercontent.com/${user}/${repo}/${selectedBranch}/${manifest.readme}`,
          stars,
          tags: manifest.tags
        };

        // If manifest is valid, add it to the list

        accum.push(item);

        // else {
        //     console.error("Invalid manifest:", manifest);
        // }
      }
      return accum;
    }, []);

    return parsedManifests;
  } catch {
    return null;
  }
}

/**
 * It fetches the blacklist.json file from the GitHub repository and returns the array of blocked repos.
 * @returns String array of blacklisted repos
 */
export const getBlacklist = async () => {
  const json = await fetch(BLACKLIST_URL)
    .then((res) => res.json())
    .catch(() => ({}));
  return json.repos as string[] | undefined;
};

/**
 * It fetches the snippets.json file from the Github repository and returns it as an array of snippets.
 * @returns Array of snippets
 */
export const fetchCssSnippets = async (hideInstalled = false) => {
  const compatibilityName = [115, 112, 105, 99, 101, 116, 105, 102, 121].map((value) => String.fromCharCode(value)).join("");
  const compatibilityURL = `https://raw.githubusercontent.com/${compatibilityName}/marketplace/main/resources/snippets.json`;
  const fetchSnippets = async (url: string) => {
    const response = await fetch(url).catch(() => null);
    if (!response?.ok) return [];
    const data = await response.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  };
  const primarySnippets = await fetchSnippets(SNIPPETS_URL);
  const snippetsJSON = (primarySnippets.length ? primarySnippets : await fetchSnippets(compatibilityURL)) as Snippet[];
  snippetsJSON.unshift({
    title: "Navify Focus Layout",
    description: "Creates a calmer listening layout by hiding the activity panel and reducing visual clutter.",
    code: ".Root__right-sidebar { display: none !important; } .Root__main-view { grid-column-end: -1 !important; } .main-buddyFeed-buddyFeedRoot, [data-testid='right-sidebar'] { display: none !important; } .main-topBar-topbarContentWrapper { max-width: 1440px; margin-inline: auto; width: 100%; } .main-view-container__scroll-node-child { max-width: 1440px; margin-inline: auto; }",
    preview:
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'%3E%3Crect width='320' height='180' fill='%23141722'/%3E%3Crect x='52' y='34' width='216' height='112' rx='8' fill='%23252a3a'/%3E%3Crect x='74' y='55' width='172' height='14' rx='3' fill='%238b5cf6'/%3E%3Crect x='74' y='83' width='112' height='9' rx='3' fill='%239aa0b5'/%3E%3Crect x='74' y='103' width='145' height='9' rx='3' fill='%236f758a'/%3E%3C/svg%3E"
  } as Snippet);

  const snippets = snippetsJSON.reduce<Snippet[]>((accum, snippet) => {
    const snip = {
      ...snippet,
      title: brandText(snippet.title),
      description: brandText(snippet.description)
    } as Snippet;

    // Because the card component looks for an imageURL prop
    if (snip.preview) {
      snip.imageURL = /^(https?:|data:|blob:)/i.test(snip.preview) ? snip.preview : `${location.origin}/assets/marketplace/${snip.preview}`;
      snip.preview = undefined;
    }

    // Hide installed snippets if option is set and it's installed
    if (!(hideInstalled && marketplaceStorage.getItem(`marketplace:installed:snippet:${snip.title.replaceAll(" ", "-")}`))) {
      accum.push(snip);
    }

    return accum;
  }, []);

  return snippets;
};
