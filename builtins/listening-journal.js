(() => {
  "use strict";

  const storageKey = "navify.listening-journal";

  const readEntries = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  };

  const currentTrack = () => {
    const item = Navify.Player?.data?.item;
    const artists = item?.artists?.map((artist) => artist.name).join(", ") || "Unknown artist";
    return {
      uri: item?.uri || "",
      title: item?.name || "Current track",
      artist: artists,
      image: item?.album?.images?.[0]?.url || "",
    };
  };

  const openJournal = () => {
    const track = currentTrack();
    if (!track.uri) {
      Navify.showNotification("Play a track before adding a journal entry");
      return;
    }

    const content = document.createElement("div");
    content.className = "navify-journal-modal";

    const trackName = document.createElement("strong");
    trackName.textContent = track.title;

    const artist = document.createElement("span");
    artist.textContent = track.artist;

    const input = document.createElement("textarea");
    input.placeholder = "What stands out about this track?";
    input.maxLength = 500;
    input.rows = 5;

    const save = document.createElement("button");
    save.textContent = "Save note";
    save.addEventListener("click", () => {
      const note = input.value.trim();
      if (!note) {
        Navify.showNotification("Write a note first");
        return;
      }

      const entries = readEntries();
      entries.unshift({
        id: `${Date.now()}`,
        ...track,
        note,
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem(storageKey, JSON.stringify(entries.slice(0, 250)));
      window.dispatchEvent(new Event("navify-journal-change"));
      Navify.PopupModal.hide();
      Navify.showNotification("Journal entry saved");
    });

    content.append(trackName, artist, input, save);
    Navify.PopupModal.display({ title: "Listening Journal", content });
    setTimeout(() => input.focus(), 0);
  };

  const start = () => {
    if (!window.Navify?.Mousetrap || !window.Navify?.PopupModal) {
      setTimeout(start, 250);
      return;
    }

    const style = document.createElement("style");
    style.textContent = ".navify-journal-modal{display:grid;gap:10px;min-width:min(460px,80vw)}.navify-journal-modal span{color:var(--spice-subtext)}.navify-journal-modal textarea{resize:vertical;border:1px solid rgba(255,255,255,.16);border-radius:6px;background:#12141d;color:#fff;padding:12px;font:inherit}.navify-journal-modal button{justify-self:end;border:0;border-radius:6px;background:var(--spice-button);color:var(--spice-button-active);padding:10px 16px;font-weight:700}";
    document.head.appendChild(style);
    Navify.Mousetrap.bind("ctrl+shift+n", openJournal);
  };

  start();
})();
