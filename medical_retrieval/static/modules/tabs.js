/* tabs.js — Tab switching with a registration pattern to avoid circular imports */

const handlers = {};

/** Feature modules call this to register an activation callback for their tab. */
export function onTab(name, fn) {
  handlers[name] = fn;
}

export function setupTabs() {
  const navBtns     = document.querySelectorAll('.nav-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`tab-${tab}`).classList.add('active');
      handlers[tab]?.();
    });
  });
}
