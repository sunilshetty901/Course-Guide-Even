/**
 * Koha Live Availability Badge
 * IIT Jammu Central Library — Course Guide
 * Uses: https://libopac.iitjammu.ac.in (Live Koha)
 *
 * HOW TO USE:
 * 1. Add this line before </body> in every course HTML page:
 *    <script src="koha-availability.js"></script>
 *
 * 2. Make sure each book card link contains ?biblionumber=XXX
 *    Example:
 *    <a href="https://libopac.iitjammu.ac.in/cgi-bin/koha/opac-detail.pl?biblionumber=2381">
 *
 * No other HTML changes needed — script auto-detects all .book-card elements!
 */

(function () {

  // ============================================================
  //  CONFIG — Live IIT Jammu Koha
  // ============================================================
  const KOHA_BASE_URL = "https://libopac.iitjammu.ac.in";
  // ============================================================

  /**
   * Fetch availability via Koha REST API (Koha 25.x)
   */
  async function fetchAvailability(biblioId) {
    try {
      const res = await fetch(
        `${KOHA_BASE_URL}/api/v1/public/biblios/${biblioId}/items`,
        { headers: { "Accept": "application/json" } }
      );

      if (!res.ok) return { status: "unknown", available: 0, total: 0 };

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0)
        return { status: "unknown", available: 0, total: 0 };

      const total = items.length;
      const available = items.filter(
        (item) =>
          !item.checked_out_date &&
          item.lost_status === 0 &&
          item.withdrawn === 0 &&
          item.damaged_status === 0 &&
          item.not_for_loan_status === 0
      ).length;

      return {
        status: available > 0 ? "available" : "checkedout",
        available,
        total,
      };
    } catch (e) {
      return { status: "unknown", available: 0, total: 0 };
    }
  }

  /**
   * Build badge HTML
   */
  function buildBadge({ status, available, total }, biblioId) {
    if (status === "available") {
      const count = total > 0
        ? `<span class="avail-count">${available} of ${total} ${total === 1 ? "copy" : "copies"} available</span>`
        : "";
      return `<span class="avail-badge avail-yes">
        <i class="fa-solid fa-circle-check"></i> Available ${count}
      </span>`;
    }
    if (status === "checkedout") {
      const count = total > 0
        ? `<span class="avail-count">0 of ${total} available</span>`
        : "";
      return `<span class="avail-badge avail-no">
        <i class="fa-solid fa-circle-xmark"></i> All Checked Out ${count}
      </span>`;
    }
    if (status === "loading") {
      return `<span class="avail-badge avail-loading">
        <i class="fa-solid fa-spinner fa-spin"></i> Checking availability…
      </span>`;
    }
    // unknown / error — link to OPAC instead
    return `<a class="avail-badge avail-unknown"
      href="${KOHA_BASE_URL}/cgi-bin/koha/opac-detail.pl?biblionumber=${biblioId}"
      target="_blank">
      <i class="fa-solid fa-arrow-up-right-from-square"></i> Check in OPAC
    </a>`;
  }

  /**
   * Inject CSS once
   */
  function injectStyles() {
    if (document.getElementById("koha-avail-style")) return;
    const s = document.createElement("style");
    s.id = "koha-avail-style";
    s.textContent = `
      .avail-wrap { width:100%; margin-bottom:.38rem; }
      .avail-badge {
        display:inline-flex; align-items:center; gap:.38rem;
        font-size:.72rem; font-weight:600; padding:.3rem .82rem;
        border-radius:100px; font-family:'DM Sans',sans-serif;
        letter-spacing:.01em; text-decoration:none; cursor:default;
      }
      .avail-count { font-weight:400; opacity:.82; }
      .avail-yes  { background:rgba(34,197,94,.13); border:1px solid rgba(34,197,94,.4); color:#15803d; }
      .avail-no   { background:rgba(239,68,68,.10); border:1px solid rgba(239,68,68,.32); color:#b91c1c; }
      .avail-loading { background:rgba(0,180,216,.09); border:1px solid rgba(0,180,216,.28); color:#0284c7; }
      .avail-unknown { background:rgba(26,75,140,.08); border:1px solid rgba(26,75,140,.25); color:#1a4b8c; cursor:pointer; }
      .avail-unknown:hover { background:rgba(26,75,140,.14); }
      .avail-badge i { font-size:.68rem; }
    `;
    document.head.appendChild(s);
  }

  /**
   * Main
   */
  async function init() {
    injectStyles();

    document.querySelectorAll(".book-card").forEach(async (card) => {
      const link = card.querySelector(".book-actions a[href*='biblionumber=']");
      if (!link) return;

      const match = link.href.match(/biblionumber=(\d+)/);
      if (!match) return;

      const biblioId = match[1];
      const actionsDiv = card.querySelector(".book-actions");
      if (!actionsDiv) return;

      // Show loading badge
      const wrap = document.createElement("div");
      wrap.className = "avail-wrap";
      wrap.innerHTML = buildBadge({ status: "loading" }, biblioId);
      actionsDiv.parentNode.insertBefore(wrap, actionsDiv);

      // Fetch and update
      const result = await fetchAvailability(biblioId);
      wrap.innerHTML = buildBadge(result, biblioId);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
