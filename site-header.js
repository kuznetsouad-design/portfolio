(function () {
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  const headers = document.querySelectorAll(".site-header");
  const menuIcon = '<span class="header-menu-toggle__icon" aria-hidden="true"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path stroke="none" d="M0 0h24v24H0z" fill="none"></path><path d="M4 6l16 0"></path><path d="M4 12l16 0"></path><path d="M4 18l16 0"></path></svg></span>';
  const closeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6l-12 12"></path></svg>';

  if (!headers.length) {
    return;
  }

  const getLang = () => (document.documentElement.lang || "").toLowerCase().startsWith("en") ? "en" : "ru";

  headers.forEach((header, index) => {
    if (header.dataset.mobileHeaderReady === "true") {
      return;
    }

    const nav = header.querySelector(".header-nav");
    const brand = header.querySelector(".brand");
    const languageToggle = nav ? nav.querySelector(".language-toggle") : null;

    if (!nav || !brand) {
      return;
    }

    const lang = getLang();
    const menuId = header.getAttribute("data-mobile-menu-id") || "header-mobile-menu" + (index ? "-" + index : "");
    const linkSelector = ".header-nav > .header-link, .header-nav__links > .header-link";
    const navLinks = Array.from(header.querySelectorAll(linkSelector));
    let controls = nav.querySelector(".header-nav__controls");

    if (!controls) {
      controls = document.createElement("div");
      controls.className = "header-nav__controls";

      if (languageToggle) {
        controls.appendChild(languageToggle);
      }

      nav.appendChild(controls);
    }

    let toggle = controls.querySelector(".header-menu-toggle");

    if (!toggle) {
      toggle = document.createElement("button");
      toggle.className = "header-menu-toggle";
      toggle.type = "button";
      toggle.setAttribute("aria-label", lang === "en" ? "Open contacts menu" : "Открыть меню контактов");
      toggle.innerHTML = menuIcon;
      controls.appendChild(toggle);
    }

    toggle.setAttribute("aria-controls", menuId);
    toggle.setAttribute("aria-expanded", "false");

    let menu = document.getElementById(menuId);

    if (!menu) {
      menu = document.createElement("div");
      menu.className = "header-mobile-menu";
      menu.id = menuId;
      menu.hidden = true;

      const top = document.createElement("div");
      top.className = "header-mobile-menu__top";

      const menuBrand = brand.cloneNode(true);
      menuBrand.className = "header-mobile-menu__brand";

      const closeButton = document.createElement("button");
      closeButton.className = "header-mobile-menu__close";
      closeButton.type = "button";
      closeButton.innerHTML = closeIcon;
      closeButton.setAttribute("aria-label", lang === "en" ? "Close menu" : "Закрыть меню");

      const content = document.createElement("div");
      content.className = "header-mobile-menu__content";

      navLinks.forEach((link) => {
        content.appendChild(link.cloneNode(true));
      });

      top.append(menuBrand, closeButton);
      menu.append(top, content);
      document.body.appendChild(menu);
    }

    const closeButton = menu.querySelector(".header-mobile-menu__close");

    const openMenu = () => {
      if (!mobileQuery.matches) {
        return;
      }

      document.body.classList.add("is-site-menu-open", "is-menu-open");
      toggle.setAttribute("aria-expanded", "true");
      menu.hidden = false;

      requestAnimationFrame(() => {
        menu.classList.add("is-open");
      });
    };

    const closeMenu = () => {
      menu.classList.remove("is-open");
      document.body.classList.remove("is-site-menu-open", "is-menu-open");
      toggle.setAttribute("aria-expanded", "false");
      menu.hidden = true;
    };

    toggle.addEventListener("click", () => {
      if (menu.classList.contains("is-open")) {
        closeMenu();
        return;
      }

      openMenu();
    });

    if (closeButton) {
      closeButton.addEventListener("click", closeMenu);
    }

    menu.addEventListener("click", (event) => {
      const link = event.target.closest("a");

      if (link) {
        link.classList.add("is-pressing");
        window.setTimeout(() => {
          link.classList.remove("is-pressing");
        }, 140);
        window.setTimeout(() => {
          closeMenu();
        }, 300);
      }
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
      }
    });

    mobileQuery.addEventListener("change", (event) => {
      if (!event.matches) {
        closeMenu();
      }
    });

    header.dataset.mobileHeaderReady = "true";
  });
}());
