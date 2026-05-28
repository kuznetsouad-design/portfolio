(() => {
  const doc = document;

  if (!doc.body || doc.querySelector(".back-to-top")) {
    return;
  }

  const button = doc.createElement("button");
  button.type = "button";
  button.className = "back-to-top";
  button.setAttribute("aria-label", "Наверх");
  button.setAttribute("title", "Наверх");
  button.innerHTML = `
    <svg class="back-to-top__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 15.2V4.8M10 4.8L5.6 9.2M10 4.8L14.4 9.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
  `;

  doc.body.appendChild(button);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const visibilityThreshold = 360;
  let scrollResetId = 0;

  const updateVisibility = () => {
    const maxScroll = doc.documentElement.scrollHeight - window.innerHeight;
    const shouldShow = maxScroll > visibilityThreshold && window.scrollY > visibilityThreshold;
    button.classList.toggle("is-visible", shouldShow);
  };

  button.addEventListener("click", () => {
    if (scrollResetId) {
      window.clearTimeout(scrollResetId);
      scrollResetId = 0;
    }

    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    });

    if (!reducedMotion) {
      scrollResetId = window.setTimeout(() => {
        if (window.scrollY > 4) {
          window.scrollTo(0, 0);
        }

        scrollResetId = 0;
      }, 900);
    }
  });

  window.addEventListener("scroll", updateVisibility, { passive: true });
  window.addEventListener("resize", updateVisibility, { passive: true });
  updateVisibility();
})();
