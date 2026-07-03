(function() {
  function injectStyles() {
    if (document.getElementById('book-tracking-styles')) return;
    const style = document.createElement('style');
    style.id = 'book-tracking-styles';
    style.textContent = `
      .book-card { position: relative; }
      .popular-badge {
        position: absolute;
        top: 10px;
        right: 12px;
        background: var(--dark-blue, #0A1628);
        color: #FFD166;
        font-size: .62rem;
        font-weight: 700;
        letter-spacing: .04em;
        padding: .3rem .65rem;
        border-radius: 100px;
        display: flex;
        align-items: center;
        gap: .3rem;
        box-shadow: 0 3px 10px rgba(0,0,0,.2);
        z-index: 3;
      }
      .view-count-badge {
        position: absolute;
        bottom: 10px;
        right: 14px;
        font-size: .7rem;
        color: var(--muted, #6B8CAE);
        display: flex;
        align-items: center;
        gap: .35rem;
        font-weight: 600;
        z-index: 3;
      }
      .view-count-badge i {
        font-size: .85rem;
      }
    `;
    document.head.appendChild(style);
  }

  function slugify(text) {
    return text.toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function waitForDb() {
    let tries = 0;
    while (!window.db && tries < 50) {
      await new Promise(r => setTimeout(r, 100));
      tries++;
    }
    return window.db;
  }

  // Kept separate: raw page-view count, useful for staff analytics later,
  // but no longer what's shown on the card.
  async function trackPageView(bookId) {
    const key = `viewed_${bookId}_${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");

    const db = await waitForDb();
    if (!db) return;
    const { doc, setDoc, increment, serverTimestamp } = window.fbHelpers;
    try {
      await setDoc(doc(db, "bookStats", bookId), {
        pageViews: increment(1),
        lastViewed: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to track page view:", e);
    }
  }

  async function trackAvailabilityClick(bookId, card) {
    const db = await waitForDb();
    if (!db) return;
    const { doc, setDoc, increment } = window.fbHelpers;

    // Optimistic UI update — bump the number immediately, don't wait on network
    const badge = card.querySelector('.view-count-badge span');
    if (badge) {
      const current = parseInt(badge.textContent, 10) || 0;
      badge.textContent = current + 1;
      checkPopularBadge(current + 1, card);
    }

    try {
      await setDoc(doc(db, "bookStats", bookId), {
        availabilityClicks: increment(1)
      }, { merge: true });
    } catch (e) {
      console.error("Failed to track click:", e);
    }
  }

  function checkPopularBadge(count, card) {
    if (count >= 100 && !card.querySelector('.popular-badge')) {
      const badge = document.createElement('div');
      badge.className = 'popular-badge';
      badge.innerHTML = '⭐ Student Choice';
      card.appendChild(badge);
    }
  }

  async function renderStats(bookId, card) {
    const db = await waitForDb();
    if (!db) return;
    const { doc, getDoc } = window.fbHelpers;
    try {
      const snap = await getDoc(doc(db, "bookStats", bookId));
      const clicks = snap.exists() ? (snap.data().availabilityClicks || 0) : 0;

      checkPopularBadge(clicks, card);

      if (!card.querySelector('.view-count-badge')) {
        const viewBadge = document.createElement('div');
        viewBadge.className = 'view-count-badge';
        viewBadge.innerHTML = `<i class="fa-regular fa-eye"></i> <span>${clicks}</span>`;
        card.appendChild(viewBadge);
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }

  function init() {
    injectStyles();
    document.querySelectorAll('.book-card').forEach(card => {
      const titleEl = card.querySelector('.book-title-text');
      if (!titleEl) return;
      const bookId = slugify(titleEl.textContent);
      card.dataset.bookId = bookId;

      trackPageView(bookId);
      renderStats(bookId, card);

      const availBtn = card.querySelector('.book-btn.primary');
      if (availBtn) {
        availBtn.addEventListener('click', () => trackAvailabilityClick(bookId, card));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
