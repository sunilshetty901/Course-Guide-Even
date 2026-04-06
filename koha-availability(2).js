/**
 * Koha Live Availability Badge
 * IIT Jammu Central Library — Course Guide
 *
 * SETUP:
 * 1. Keep ngrok running on your VM:  ngrok http 8001
 * 2. Update KOHA_NGROK_URL if ngrok URL changes
 * 3. Upload this file to render.com alongside your HTML files
 * 4. Add before </body> in each course HTML page:
 *      <script src="koha-availability.js"></script>
 */

(function () {

  // ============================================================
  //  ⚙️  UPDATE THIS when ngrok URL changes
  // ============================================================
  const KOHA_NGROK_URL = "https://lailah-cometical-diego.ngrok-free.dev";
  // ============================================================

  async function fetchAvailability(biblioId) {
    try {
      const res = await fetch(
        `${KOHA_NGROK_URL}/api/v1/public/biblios/${biblioId}/items`,
        {
          headers: {
            "Accept": "application/json",
            "ngrok-skip-browser-warning": "true"
          }
        }
      );
      if (!res.ok) return { status: "unknown", available: 0, total: 0 };

      const items = await res.json();
      if (!Array.isArray(items) || items.length === 0)
        return { status: "unknown", available: 0, total: 0 };

      const total = items.length;
      const available = items.filter(item =>
        !item.checked_out_date &&
        item.lost_status === 0 &&
        item.withdrawn === 0 &&
        item.damaged_status === 0 &&
        item.not_for_loan_status === 0
      ).length;

      return {
        status: available > 0 ? "available" : "checkedout",
        available,
        total
      };
    } catch (e) {
      return { status: "error", available: 0, total: 0 };
    }
  }

  function buildBadge({ status, available, total }) {
    if (status === "available")
      return `<span class="avail-badge avail-yes"><i class="fa-solid fa-circle-check"></i> Available <span class="avail-count">${available} of ${total} ${total === 1 ? "copy" : "copies"}</span></span>`;
    if (status === "checkedout")
      return `<span class="avail-badge avail-no"><i class="fa-solid fa-circle-xmark"></i> All Checked Out <span class="avail-count">0 of ${total}</span></span>`;
    if (status === "loading")
      return `<span class="avail-badge avail-loading"><i class="fa-solid fa-spinner fa-spin"></i> Checking availability…</span>`;
    return `<span class="avail-badge avail-unknown"><i class="fa-solid fa-circle-question"></i> Status unavailable</span>`;
  }

  function injectStyles() {
    if (document.getElementById("koha-avail-style")) return;
    const s = document.createElement("style");
    s.id = "koha-avail-style";
    s.textContent = `
      .avail-wrap{width:100%;margin-bottom:.4rem}
      .avail-badge{display:inline-flex;align-items:center;gap:.38rem;font-size:.72rem;font-weight:600;padding:.3rem .82rem;border-radius:100px;font-family:'DM Sans',sans-serif}
      .avail-count{font-weight:400;opacity:.82}
      .avail-yes{background:rgba(34,197,94,.13);border:1px solid rgba(34,197,94,.4);color:#15803d}
      .avail-no{background:rgba(239,68,68,.10);border:1px solid rgba(239,68,68,.32);color:#b91c1c}
      .avail-loading{background:rgba(0,180,216,.09);border:1px solid rgba(0,180,216,.28);color:#0284c7}
      .avail-unknown{background:rgba(107,140,174,.10);border:1px solid rgba(107,140,174,.28);color:#6b8cae}
      .avail-badge i{font-size:.68rem}
    `;
    document.head.appendChild(s);
  }

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
      const wrap = document.createElement("div");
      wrap.className = "avail-wrap";
      wrap.innerHTML = buildBadge({ status: "loading" });
      actionsDiv.parentNode.insertBefore(wrap, actionsDiv);
      const result = await fetchAvailability(biblioId);
      wrap.innerHTML = buildBadge(result);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
