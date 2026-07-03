(function() {
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

  async function trackView(bookId) {
    const key = `viewed_${bookId}_${new Date().toDateString()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");

    const db = await waitForDb();
    if (!db) return;
    const { doc, setDoc, increment, serverTimestamp } = window.fbHelpers;
    try {
      await setDoc(doc(db, "bookStats", bookId), {
        views: increment(1),
        lastViewed: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error("Failed to track view:", e);
    }
  }

  async function trackAvailabilityClick(bookId) {
    const db = await waitForDb();
    if (!db) return;
    const { doc, setDoc, increment } = window.fbHelpers;
    try {
      await setDoc(doc(db, "bookStats", bookId), {
        availabilityClicks: increment(1)
      }, { merge: true });
    } catch (e) {
      console.error("Failed to track click:", e);
    }
  }

  async function renderBadge(bookId, card) {
    const db = await waitForDb();
    if (!db) return;
    const { doc, getDoc } = window.fbHelpers;
    try {
      const snap = await getDoc(doc(db, "bookStats", bookId));
      const views = snap.exists() ? (snap.data().views || 0) : 0;
      if (views >= 100) {
        const tag = card.querySelector('.book-type-tag');
        if (tag && !tag.querySelector('.popular-badge')) {
          const badge = document.createElement('span');
          badge.className = 'popular-badge';
          badge.textContent = ' 🔥 Student Choice';
          badge.style.cssText = 'color:#00c2cb;font-weight:600;margin-left:6px;';
          tag.appendChild(badge);
        }
      }
    } catch (e) {
      console.error("Failed to fetch stats:", e);
    }
  }

  function init() {
    document.querySelectorAll('.book-card').forEach(card => {
      const titleEl = card.querySelector('.book-title-text');
      if (!titleEl) return;
      const bookId = slugify(titleEl.textContent);
      card.dataset.bookId = bookId;

      trackView(bookId);
      renderBadge(bookId, card);

      const availBtn = card.querySelector('.book-btn.primary');
      if (availBtn) {
        availBtn.addEventListener('click', () => trackAvailabilityClick(bookId));
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
