/**
 * Similar / Recommended Books Widget
 * IIT Jammu Central Library — Course Guide Mini OPAC
 *
 * Drop this file (and recommendations.json) into your site's root folder,
 * then add this before </body> on every course page:
 *
 *   <div id="similar-books-root"></div>
 *   <script src="/similar-books-widget.js"></script>
 *
 * The widget figures out which course page it's on from the URL
 * (e.g. "Artificial_Intelligence_CSE_UG.html"), looks that key up in
 * recommendations.json, and renders a "You Might Also Like" section.
 * If there's no data for the current page, it renders nothing.
 */
(function () {
  const DATA_URL = "/recommendations.json"; // adjust path if hosted elsewhere
  const MOUNT_ID = "similar-books-root";
  const COVER_CACHE_KEY = "sb_cover_cache_v1";
  const COVER_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

  function currentPageKey() {
    if (window.__SB_PAGE_KEY) return window.__SB_PAGE_KEY; // optional test override
    const path = window.location.pathname;
    return decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
  }

  function opacHref(book) {
    if (book.opac_link) return book.opac_link;
    const q = encodeURIComponent(`${book.title} ${book.author || ""}`.trim());
    return `https://libopac.iitjammu.ac.in/cgi-bin/koha/opac-search.pl?q=${q}`;
  }

  function reasonLabel(reason) {
    return reason === "more_by_author" ? "More by this author" : "Related reading";
  }

  // ---- Cover lookup (Open Library — free, no API key, no scraping) ----
  function loadCoverCache() {
    try {
      const raw = localStorage.getItem(COVER_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }
  function saveCoverCache(cache) {
    try {
      localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      /* storage full or unavailable — fail silently, covers just won't cache */
    }
  }
  function coverCacheKey(book) {
    return `${(book.title || "").toLowerCase().trim()}|${(book.author || "").toLowerCase().trim()}`;
  }

  const coverCache = loadCoverCache();

  function getCoverUrl(book) {
    const key = coverCacheKey(book);
    const cached = coverCache[key];
    if (cached && Date.now() - cached.ts < COVER_CACHE_TTL_MS) {
      return Promise.resolve(cached.url); // url may be null (known: no cover found)
    }

    const authorLastName = (book.author || "").split(",")[0].trim();
    const params = new URLSearchParams({
      title: book.title || "",
      author: authorLastName,
      limit: "1",
      fields: "cover_i,isbn",
    });

    return fetch(`https://openlibrary.org/search.json?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        let url = null;
        const doc = data && data.docs && data.docs[0];
        if (doc && doc.cover_i) {
          url = `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
        } else if (doc && doc.isbn && doc.isbn.length) {
          url = `https://covers.openlibrary.org/b/isbn/${doc.isbn[0]}-M.jpg`;
        }
        coverCache[key] = { url, ts: Date.now() };
        saveCoverCache(coverCache);
        return url;
      })
      .catch(() => {
        coverCache[key] = { url: null, ts: Date.now() };
        saveCoverCache(coverCache);
        return null;
      });
  }

  const PLACEHOLDER_SVG =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="150" viewBox="0 0 120 150">
        <rect width="120" height="150" rx="6" fill="#0e2748"/>
        <rect x="10" y="10" width="100" height="130" rx="3" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="3 3"/>
        <path d="M35 55 L85 55 M35 70 L85 70 M35 85 L65 85" stroke="#3f6488" stroke-width="3" stroke-linecap="round"/>
        <circle cx="60" cy="30" r="10" fill="none" stroke="#3f6488" stroke-width="2.5"/>
      </svg>
    `);

  function render(mount, books) {
    if (!books || !books.length) return;

    const style = document.createElement("style");
    style.textContent = `
      .sb-section { max-width: 900px; margin: 50px auto; padding: 0 20px; }
      .sb-title { font-size: 22px; font-weight: 700; color: #ffffff;
        text-align: center; margin-bottom: 22px; letter-spacing: 0.3px; }
      .sb-title span { color: #22d3ee; }
      .sb-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 18px; }
      .sb-card { background: linear-gradient(160deg, #0b1f3a, #06142b);
        border: 1px solid rgba(34, 211, 238, 0.25); border-radius: 14px;
        padding: 18px; color: #e5edf5; box-shadow: 0 6px 16px rgba(0,0,0,0.25);
        display: flex; flex-direction: column; gap: 8px; transition: transform .2s, border-color .2s; }
      .sb-card:hover { transform: translateY(-3px); border-color: #22d3ee; }
      .sb-cover-wrap { display: flex; justify-content: center; margin-bottom: 4px; }
      .sb-cover { width: 90px; height: 112px; object-fit: cover; border-radius: 4px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.4); background: #0e2748; }
      .sb-tag { align-self: flex-start; font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.5px; color: #06142b; background: #22d3ee; padding: 3px 9px; border-radius: 20px; }
      .sb-book-title { font-size: 15px; font-weight: 600; line-height: 1.35; }
      .sb-book-subtitle { font-size: 12.5px; color: #9fb3c8; line-height: 1.3; }
      .sb-book-author { font-size: 13px; color: #b7c9db; font-style: italic; margin-top: 2px; }
      .sb-link { margin-top: auto; padding-top: 8px; font-size: 13px; font-weight: 600;
        color: #22d3ee; text-decoration: none; }
      .sb-link:hover { text-decoration: underline; }
    `;
    document.head.appendChild(style);

    const section = document.createElement("div");
    section.className = "sb-section";

    const heading = document.createElement("div");
    heading.className = "sb-title";
    heading.innerHTML = `You Might Also <span>Like</span>`;
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.className = "sb-grid";

    books.forEach((book) => {
      const card = document.createElement("div");
      card.className = "sb-card";

      const coverWrap = document.createElement("div");
      coverWrap.className = "sb-cover-wrap";
      const cover = document.createElement("img");
      cover.className = "sb-cover";
      cover.alt = book.title;
      cover.src = PLACEHOLDER_SVG;
      coverWrap.appendChild(cover);
      card.appendChild(coverWrap);

      getCoverUrl(book).then((url) => {
        if (url) {
          const test = new Image();
          test.onload = () => (cover.src = url);
          test.onerror = () => {}; // keep placeholder
          test.src = url;
        }
      });

      const tag = document.createElement("div");
      tag.className = "sb-tag";
      tag.textContent = reasonLabel(book.reason);
      card.appendChild(tag);

      const title = document.createElement("div");
      title.className = "sb-book-title";
      title.textContent = book.title;
      card.appendChild(title);

      if (book.subtitle) {
        const sub = document.createElement("div");
        sub.className = "sb-book-subtitle";
        sub.textContent = book.subtitle;
        card.appendChild(sub);
      }

      if (book.author) {
        const author = document.createElement("div");
        author.className = "sb-book-author";
        author.textContent = book.author;
        card.appendChild(author);
      }

      const link = document.createElement("a");
      link.className = "sb-link";
      link.href = opacHref(book);
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "Check Availability →";
      card.appendChild(link);

      grid.appendChild(card);
    });

    section.appendChild(grid);
    mount.appendChild(section);
  }

  function init() {
    let mount = document.getElementById(MOUNT_ID);
    if (!mount) {
      // Fallback: auto-create a mount point right before the footer if the
      // page owner forgot to add the <div id="similar-books-root"></div>
      mount = document.createElement("div");
      mount.id = MOUNT_ID;
      const footer = document.querySelector("footer");
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(mount, footer);
      } else {
        document.body.appendChild(mount);
      }
    }

    fetch(DATA_URL)
      .then((r) => r.json())
      .then((data) => {
        const key = currentPageKey();
        const books = data[key];
        render(mount, books);
      })
      .catch((err) => {
        console.warn("Similar Books widget: could not load recommendations.json", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
