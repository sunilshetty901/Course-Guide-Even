/**
 * Similar / Recommended Books Widget — v2
 * IIT Jammu Central Library — Course Guide Mini OPAC
 *
 * Same install as before — nothing to change on your HTML pages:
 *
 *   <div id="similar-books-root"></div>
 *   <script src="/similar-books-widget.js"></script>
 *
 * What's new in v2:
 *  - Automatically finds the page's "Textbooks" / "Reference Books" blocks
 *    and places "You Might Also Like" as a sticky sidebar to their right,
 *    instead of a full-width block at the bottom of the page.
 *  - Visual style now matches the live site exactly (Playfair Display +
 *    DM Sans, cyan/navy palette, same card language as book-card/os-card).
 *  - Falls back to the old full-width placement (at #similar-books-root)
 *    on any page where the Textbooks/Reference Books blocks aren't found,
 *    so nothing breaks on pages with a different layout.
 */
(function () {
  const DATA_URL = "/recommendations.json";
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

  function reasonIcon(reason) {
    return reason === "more_by_author" ? "fa-user-pen" : "fa-layer-group";
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
      /* storage full or unavailable — covers just won't cache */
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
      return Promise.resolve(cached.url);
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

  // ---- Styles — matches the live site's design tokens exactly ----
  function injectStyles() {
    if (document.getElementById("sb-styles")) return;
    const style = document.createElement("style");
    style.id = "sb-styles";
    style.textContent = `
      .sb-layout { display: grid; grid-template-columns: 1fr 440px; gap: 1.8rem;
        align-items: start; padding: 0 clamp(1.5rem,5vw,4rem); }
      .sb-left { min-width: 0; }
      .sb-right { position: sticky; top: 90px; }

      .sb-panel { background: var(--white, #fff); border: 1px solid var(--light-line, #D0E4F5);
        border-radius: 18px; box-shadow: var(--card-shadow, 0 4px 24px rgba(0,100,180,.09));
        overflow: hidden; opacity: 0; animation: sbFadeUp .5s ease forwards; animation-delay: .1s; }
      .sb-panel-head { background: linear-gradient(135deg, var(--dark-blue-2, #0D1F3C), #112040);
        padding: 1.4rem 1.6rem; border-bottom: 2px solid var(--cyan, #00B4D8);
        display: flex; align-items: center; gap: .75rem; }
      .sb-panel-head i { color: var(--cyan, #00B4D8); font-size: 1.15rem; }
      .sb-panel-title { font-family: 'Playfair Display', serif; font-size: 1.2rem; font-weight: 700;
        color: #fff; line-height: 1.3; }
      .sb-panel-sub { font-size: .7rem; letter-spacing: .1em; text-transform: uppercase;
        color: var(--cyan-light, #48CAE4); margin-top: .2rem; font-weight: 600; }

      .sb-list { display: flex; flex-direction: column; }
      .sb-item { display: flex; gap: 1rem; padding: 1.2rem 1.6rem; border-bottom: 1px solid var(--light-line, #D0E4F5);
        text-decoration: none; color: inherit; transition: background .2s; opacity: 0;
        animation: sbFadeUp .45s ease forwards; }
      .sb-item:last-child { border-bottom: none; }
      .sb-item:hover { background: rgba(0,180,216,.05); }
      .sb-cover-wrap { flex-shrink: 0; width: 60px; height: 80px; border-radius: 6px; overflow: hidden;
        background: linear-gradient(160deg, var(--dark-blue-2, #0D1F3C), #112040);
        border: 1px solid rgba(0,180,216,.3); display: flex; align-items: center; justify-content: center; }
      .sb-cover-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .sb-cover-wrap i { color: var(--cyan, #00B4D8); font-size: 1.25rem; }
      .sb-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: .32rem; }
      .sb-reason { display: inline-flex; align-items: center; gap: .35rem; font-size: .62rem;
        letter-spacing: .08em; text-transform: uppercase; font-weight: 700; color: var(--medium-blue, #1A4B8C);
        width: fit-content; }
      .sb-reason i { font-size: .62rem; color: var(--cyan, #00B4D8); }
      .sb-item-title { font-family: 'Playfair Display', serif; font-size: .96rem; font-weight: 600;
        color: var(--dark-blue, #0A1628); line-height: 1.35; }
      .sb-item-author { font-size: .78rem; color: var(--muted, #6B8CAE); font-style: italic; }
      .sb-item-link { font-size: .7rem; font-weight: 700; color: var(--cyan, #00B4D8);
        margin-top: .15rem; display: inline-flex; align-items: center; gap: .3rem; }
      .sb-item:hover .sb-item-link { text-decoration: underline; }

      .sb-item:nth-child(1){animation-delay:.05s}.sb-item:nth-child(2){animation-delay:.12s}
      .sb-item:nth-child(3){animation-delay:.19s}.sb-item:nth-child(4){animation-delay:.26s}
      .sb-item:nth-child(5){animation-delay:.33s}.sb-item:nth-child(6){animation-delay:.40s}
      @keyframes sbFadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

      /* Fallback full-width layout (used only if Textbooks/Reference blocks aren't found) */
      .sb-fallback-section { max-width: 1000px; margin: 0 auto; padding: 2.5rem clamp(1.5rem,5vw,4rem); }
      .sb-fallback-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; }
      .sb-fallback-grid .sb-panel { animation-delay: 0s; }

      @media (max-width: 960px) {
        .sb-layout { grid-template-columns: 1fr; }
        .sb-right { position: static; }
      }
    `;
    document.head.appendChild(style);
  }

  // ---- Build a single sidebar item ----
  function buildItem(book) {
    const a = document.createElement("a");
    a.className = "sb-item";
    a.href = opacHref(book);
    a.target = "_blank";
    a.rel = "noopener";

    const coverWrap = document.createElement("div");
    coverWrap.className = "sb-cover-wrap";
    coverWrap.innerHTML = `<i class="fa-solid fa-book"></i>`;
    a.appendChild(coverWrap);

    getCoverUrl(book).then((url) => {
      if (!url) return;
      const test = new Image();
      test.onload = () => {
        coverWrap.innerHTML = "";
        const img = document.createElement("img");
        img.src = url;
        img.alt = book.title;
        coverWrap.appendChild(img);
      };
      test.src = url;
    });

    const body = document.createElement("div");
    body.className = "sb-item-body";

    const reason = document.createElement("div");
    reason.className = "sb-reason";
    reason.innerHTML = `<i class="fa-solid ${reasonIcon(book.reason)}"></i> ${reasonLabel(book.reason)}`;
    body.appendChild(reason);

    const title = document.createElement("div");
    title.className = "sb-item-title";
    title.textContent = book.title;
    body.appendChild(title);

    if (book.author) {
      const author = document.createElement("div");
      author.className = "sb-item-author";
      author.textContent = book.author;
      body.appendChild(author);
    }

    const link = document.createElement("div");
    link.className = "sb-item-link";
    link.innerHTML = `Check Availability <i class="fa-solid fa-arrow-right" style="font-size:.6rem"></i>`;
    body.appendChild(link);

    a.appendChild(body);
    return a;
  }

  function buildPanel(books) {
    const panel = document.createElement("div");
    panel.className = "sb-panel";

    const head = document.createElement("div");
    head.className = "sb-panel-head";
    head.innerHTML = `
      <i class="fa-solid fa-star"></i>
      <div>
        <div class="sb-panel-title">You Might Also Like</div>
        <div class="sb-panel-sub">Curated from the library catalog</div>
      </div>`;
    panel.appendChild(head);

    const list = document.createElement("div");
    list.className = "sb-list";
    books.forEach((book) => list.appendChild(buildItem(book)));
    panel.appendChild(list);

    return panel;
  }

  // ---- Find the Textbooks / Reference Books blocks to sit beside ----
  function findBookSections() {
    const labels = Array.from(document.querySelectorAll(".section-label"));
    const matches = [];
    labels.forEach((label) => {
      const span = label.querySelector("span");
      const text = (span ? span.textContent : label.textContent || "").toLowerCase();
      if (text.includes("textbook") || text.includes("reference book")) {
        const body = label.nextElementSibling;
        if (body && body.classList.contains("page-body")) {
          matches.push(label, body);
        }
      }
    });
    return matches;
  }

  function renderSideBySide(nodes, books) {
    const first = nodes[0];
    const parent = first.parentNode;

    const layout = document.createElement("div");
    layout.className = "sb-layout";
    const left = document.createElement("div");
    left.className = "sb-left";
    const right = document.createElement("div");
    right.className = "sb-right";
    right.appendChild(buildPanel(books));
    layout.appendChild(left);
    layout.appendChild(right);

    parent.insertBefore(layout, first);
    nodes.forEach((n) => left.appendChild(n)); // moves existing nodes into the left column
  }

  function renderFallback(mount, books) {
    const section = document.createElement("div");
    section.className = "sb-fallback-section";
    const inner = document.createElement("div");
    inner.style.maxWidth = "340px";
    inner.appendChild(buildPanel(books));
    section.appendChild(inner);
    mount.appendChild(section);
  }

  function render(mount, books) {
    if (!books || !books.length) return;
    injectStyles();
    const sectionNodes = findBookSections();
    if (sectionNodes.length) {
      renderSideBySide(sectionNodes, books);
    } else {
      renderFallback(mount, books);
    }
  }

  function init() {
    let mount = document.getElementById(MOUNT_ID);
    if (!mount) {
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
