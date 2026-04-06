/**
 * Koha Live Availability Badge
 * IIT Jammu Central Library — Course Guide
 * 
 * HOW TO USE:
 * 1. Add this script to any course guide HTML page (before </body>)
 * 2. Replace KOHA_BASE_URL with your actual ngrok URL
 * 3. Each book-card must have a link with ?biblionumber=XXX in its href
 *    (your pages already have this — no changes needed to HTML!)
 */

(function () {
  // ============================================================
  //  CONFIG — Replace with your ngrok URL when it changes
  // ============================================================
  const KOHA_BASE_URL = "https://lailah-cometical-diego.ngrok-free.dev";
  // ============================================================

  /**
   * Fetch availability for a single biblio and return a status object
   */
  async function fetchAvailability(biblioId) {
    try {
      const res = await fetch(
        `${KOHA_BASE_URL}/api/v1/public/biblios/${biblioId}/items`,
        { headers: { "ngrok-skip-browser-warning": "true" } }
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
          item.damaged_status === 0
      ).length;

      return {
        status: available > 0 ? "available" : "checkedout",
        available,
        total,
      };
    } catch (e) {
      return { status: "error", available: 0, total: 0 };
    }
  }

  /**
   * Build the badge HTML based on availability
   */
  function buildBadge({ status, available, total }) {
    if (status === "available") {
      return `
        <span class="avail-badge avail-yes">
          <i class="fa-solid fa-circle-check"></i>
          Available &nbsp;<span class="avail-count">${available}/${total} copies</span>
        </span>`;
    } else if (status === "checkedout") {
      return `
        <span class="avail-badge avail-no">
          <i class="fa-solid fa-circle-xmark"></i>
          All Checked Out &nbsp;<span class="avail-count">0/${total} copies</span>
        </span>`;
    } else if (status === "loading") {
      return `
        <span class="avail-badge avail-loading">
          <i class="fa-solid fa-spinner fa-spin"></i>
          Checking availability…
        </span>`;
    } else {
      return `
        <span class="avail-badge avail-unknown">
          <i class="fa-solid fa-circle-question"></i>
          Status unavailable
        </span>`;
    }
  }

  /**
   * Inject CSS styles once
   */
  function injectStyles() {
    if (document.getElementById("koha-avail-style")) return;
    const style = document.createElement("style");
    style.id = "koha-avail-style";
    style.textContent = `
      .avail-badge {
        display: inline-flex;
        align-items: center;
        gap: .35rem;
        font-size: .72rem;
        font-weight: 600;
        padding: .28rem .75rem;
        border-radius: 100px;
        font-family: 'DM Sans', sans-serif;
        letter-spacing: .01em;
        margin-top: .1rem;
      }
      .avail-count {
        font-weight: 400;
        opacity: .85;
      }
      .avail-yes {
        background: rgba(34, 197, 94, .12);
        border: 1px solid rgba(34, 197, 94, .35);
        color: #16a34a;
      }
      .avail-no {
        background: rgba(239, 68, 68, .10);
        border: 1px solid rgba(239, 68, 68, .30);
        color: #dc2626;
      }
      .avail-loading {
        background: rgba(0, 180, 216, .08);
        border: 1px solid rgba(0, 180, 216, .25);
        color: #0284c7;
      }
      .avail-unknown {
        background: rgba(107, 140, 174, .10);
        border: 1px solid rgba(107, 140, 174, .25);
        color: #6b8cae;
      }
      .avail-badge i { font-size: .68rem; }
    `;
    document.head.appendChild(style);
  }

  /**
   * Main — find all book cards, extract biblionumber, inject badges
   */
  async function init() {
    injectStyles();

    // Find every book card on the page
    const cards = document.querySelectorAll(".book-card");

    cards.forEach(async (card) => {
      // Extract biblionumber from the first link inside .book-actions
      const link = card.querySelector(".book-actions a[href*='biblionumber=']");
      if (!link) return;

      const match = link.href.match(/biblionumber=(\d+)/);
      if (!match) return;

      const biblioId = match[1];

      // Find the .book-actions div — we'll prepend the badge before the buttons
      const actionsDiv = card.querySelector(".book-actions");
      if (!actionsDiv) return;

      // Create badge container
      const badgeWrap = document.createElement("div");
      badgeWrap.style.cssText = "width:100%; margin-bottom:.3rem;";
      badgeWrap.innerHTML = buildBadge({ status: "loading" });

      // Insert badge above buttons
      actionsDiv.parentNode.insertBefore(badgeWrap, actionsDiv);

      // Fetch real availability
      const availability = await fetchAvailability(biblioId);
      badgeWrap.innerHTML = buildBadge(availability);
    });
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
