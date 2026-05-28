(function () {
  if (window.matchMedia && !window.matchMedia("(pointer: fine)").matches) {
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  if (!root || !body) {
    return;
  }

  root.classList.add("has-custom-scrollbar");

  const scrollbar = document.createElement("div");
  scrollbar.className = "site-scrollbar is-hidden";
  scrollbar.setAttribute("aria-hidden", "true");

  const thumb = document.createElement("div");
  thumb.className = "site-scrollbar__thumb";
  scrollbar.appendChild(thumb);
  body.appendChild(scrollbar);

  let dragState = null;
  let isTicking = false;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function getMetrics() {
    const viewportHeight = window.innerHeight;
    const scrollHeight = Math.max(root.scrollHeight, body.scrollHeight);
    const maxScroll = Math.max(scrollHeight - viewportHeight, 0);
    const trackHeight = Math.max(window.innerHeight - 24, 0);
    const thumbHeight = clamp(trackHeight * (viewportHeight / scrollHeight), 56, trackHeight);
    const maxThumbOffset = Math.max(trackHeight - thumbHeight, 0);
    const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;

    return {
      maxScroll,
      trackHeight,
      thumbHeight,
      thumbOffset: maxThumbOffset * ratio
    };
  }

  function render() {
    const metrics = getMetrics();
    const isScrollable = metrics.maxScroll > 0 && metrics.trackHeight > 0;

    scrollbar.classList.toggle("is-hidden", !isScrollable);

    if (!isScrollable) {
      isTicking = false;
      return;
    }

    thumb.style.height = metrics.thumbHeight + "px";
    thumb.style.transform = "translateY(" + metrics.thumbOffset + "px)";

    isTicking = false;
  }

  function requestRender() {
    if (isTicking) {
      return;
    }

    isTicking = true;
    window.requestAnimationFrame(render);
  }

  function stopDrag() {
    if (!dragState) {
      return;
    }

    scrollbar.classList.remove("is-dragging");

    if (thumb.hasPointerCapture && thumb.hasPointerCapture(dragState.pointerId)) {
      thumb.releasePointerCapture(dragState.pointerId);
    }

    dragState = null;
  }

  thumb.addEventListener("pointerdown", function (event) {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();

    const metrics = getMetrics();
    dragState = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startScrollY: window.scrollY,
      maxScroll: metrics.maxScroll,
      maxThumbOffset: Math.max(metrics.trackHeight - metrics.thumbHeight, 1)
    };

    scrollbar.classList.add("is-dragging");
    thumb.setPointerCapture(event.pointerId);
  });

  thumb.addEventListener("pointermove", function (event) {
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();

    const deltaY = event.clientY - dragState.startY;
    const nextRatio = deltaY / dragState.maxThumbOffset;
    const nextScrollY = dragState.startScrollY + nextRatio * dragState.maxScroll;
    window.scrollTo({
      top: clamp(nextScrollY, 0, dragState.maxScroll),
      behavior: "auto"
    });
  });

  thumb.addEventListener("pointerup", stopDrag);
  thumb.addEventListener("pointercancel", stopDrag);

  scrollbar.addEventListener("pointerdown", function (event) {
    if (event.target === thumb || event.button !== 0) {
      return;
    }

    const metrics = getMetrics();
    const trackRect = scrollbar.getBoundingClientRect();
    const clickY = event.clientY - trackRect.top;
    const ratio = clamp((clickY - metrics.thumbHeight / 2) / Math.max(metrics.trackHeight - metrics.thumbHeight, 1), 0, 1);

    window.scrollTo({
      top: ratio * metrics.maxScroll,
      behavior: "smooth"
    });
  });

  window.addEventListener("scroll", requestRender, { passive: true });
  window.addEventListener("resize", requestRender);
  window.addEventListener("load", requestRender, { once: true });

  if (window.ResizeObserver) {
    const resizeObserver = new ResizeObserver(requestRender);
    resizeObserver.observe(root);
    resizeObserver.observe(body);
  }

  requestRender();
}());
