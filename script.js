const PortfolioApp = (() => {
  const THEME_KEY = "akshith-portfolio-theme";
  const THEMES = {
    dark: { label: "Dark", nextLabel: "Switch to light theme", meta: "#111318" },
    light: { label: "Light", nextLabel: "Switch to dark theme", meta: "#f7f8fa" }
  };

  // Central state keeps interactive UI predictable without forcing page reloads.
  const state = {
    navOpen: false,
    theme: "dark"
  };

  const elements = {
    root: document.documentElement,
    body: document.body,
    nav: document.querySelector("[data-nav]"),
    navToggle: document.querySelector("[data-nav-toggle]"),
    themeToggle: document.querySelector("[data-theme-toggle]"),
    themeLabel: document.querySelector("[data-theme-label]"),
    themeMeta: document.querySelector('meta[name="theme-color"]'),
    navLinks: Array.from(document.querySelectorAll(".site-nav a")),
    sections: Array.from(document.querySelectorAll("main section[id]")),
    revealItems: [],
    cursorDot: null,
    cursorRing: null
  };

  // localStorage is wrapped so private browsing or disabled storage cannot break the UI.
  const storage = {
    get(key) {
      try {
        return window.localStorage.getItem(key);
      } catch (error) {
        return null;
      }
    },
    set(key, value) {
      try {
        window.localStorage.setItem(key, value);
      } catch (error) {
        return false;
      }
      return true;
    }
  };

  function getPreferredTheme() {
    const savedTheme = storage.get(THEME_KEY);

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }

  function renderTheme() {
    const themeConfig = THEMES[state.theme];
    const isLight = state.theme === "light";

    elements.root.dataset.theme = state.theme;
    elements.themeToggle?.setAttribute("aria-pressed", String(isLight));
    elements.themeToggle?.setAttribute("aria-label", themeConfig.nextLabel);

    if (elements.themeLabel) {
      elements.themeLabel.textContent = themeConfig.label;
    }

    if (elements.themeMeta) {
      elements.themeMeta.setAttribute("content", themeConfig.meta);
    }
  }

  function setTheme(theme, shouldPersist = true, shouldAnimate = true) {
    if (!THEMES[theme]) {
      return;
    }

    if (shouldAnimate && theme !== state.theme) {
      elements.body.classList.add("theme-changing");
      elements.themeToggle?.classList.add("is-switching");
      window.setTimeout(() => {
        elements.body.classList.remove("theme-changing");
        elements.themeToggle?.classList.remove("is-switching");
      }, 430);
    }

    state.theme = theme;
    renderTheme();

    if (shouldPersist) {
      storage.set(THEME_KEY, theme);
    }
  }

  function toggleTheme() {
    setTheme(state.theme === "dark" ? "light" : "dark");
  }

  function renderNavigation() {
    elements.nav?.classList.toggle("open", state.navOpen);
    elements.body.classList.toggle("nav-open", state.navOpen);
    elements.navToggle?.setAttribute("aria-expanded", String(state.navOpen));
    elements.navToggle?.setAttribute("aria-label", state.navOpen ? "Close navigation" : "Open navigation");
  }

  function setNavigation(open) {
    state.navOpen = Boolean(open);
    renderNavigation();
  }

  function toggleNavigation() {
    setNavigation(!state.navOpen);
  }

  function bindEvents() {
    elements.themeToggle?.addEventListener("click", toggleTheme);
    elements.navToggle?.addEventListener("click", toggleNavigation);

    elements.navLinks.forEach((link) => {
      link.addEventListener("click", () => setNavigation(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.navOpen) {
        setNavigation(false);
        elements.navToggle?.focus();
      }
    });

    const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
    const handleSystemThemeChange = (event) => {
      if (!storage.get(THEME_KEY)) {
        setTheme(event.matches ? "light" : "dark", false);
      }
    };

    if (typeof systemTheme.addEventListener === "function") {
      systemTheme.addEventListener("change", handleSystemThemeChange);
    } else if (typeof systemTheme.addListener === "function") {
      systemTheme.addListener(handleSystemThemeChange);
    }
  }

  function setupRevealAnimations() {
    const revealSelector = ".hero > *, .section-heading, .content-block, .card, .project, .timeline article, .cert-list li, .contact-panel";
    elements.revealItems = Array.from(document.querySelectorAll(revealSelector));
    elements.revealItems.forEach((item) => item.classList.add("reveal"));

    if (!("IntersectionObserver" in window)) {
      elements.revealItems.forEach((item) => item.classList.add("visible"));
      return;
    }

    // IntersectionObserver avoids scroll listeners and keeps reveal animations inexpensive.
    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16 }
    );

    elements.revealItems.forEach((item) => revealObserver.observe(item));
  }

  function setupActiveNavigation() {
    if (!("IntersectionObserver" in window)) {
      return;
    }

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          elements.navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
          });
        });
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 }
    );

    elements.sections.forEach((section) => sectionObserver.observe(section));
  }

  function setupCustomCursor() {
    const supportsFinePointer = window.matchMedia("(pointer: fine)").matches;

    if (!supportsFinePointer) {
      return;
    }

    elements.cursorDot = document.createElement("span");
    elements.cursorRing = document.createElement("span");
    elements.cursorDot.className = "cursor-dot";
    elements.cursorRing.className = "cursor-ring";
    elements.cursorDot.setAttribute("aria-hidden", "true");
    elements.cursorRing.setAttribute("aria-hidden", "true");
    elements.body.append(elements.cursorDot, elements.cursorRing);
    elements.root.classList.add("has-custom-cursor");
    elements.body.classList.add("has-custom-cursor");

    let pointerX = 0;
    let pointerY = 0;
    let ringX = 0;
    let ringY = 0;
    let rafId = null;

    const moveCursor = () => {
      ringX += (pointerX - ringX) * 0.22;
      ringY += (pointerY - ringY) * 0.22;

      elements.cursorDot.style.transform = `translate(${pointerX}px, ${pointerY}px) translate(-50%, -50%)`;
      elements.cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      rafId = window.requestAnimationFrame(moveCursor);
    };

    document.addEventListener("pointermove", (event) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
      elements.body.classList.add("cursor-ready");

      if (!rafId) {
        ringX = pointerX;
        ringY = pointerY;
        rafId = window.requestAnimationFrame(moveCursor);
      }
    });

    document.addEventListener("pointerover", (event) => {
      elements.body.classList.toggle("cursor-interactive", Boolean(event.target.closest("a, button")));
    });

    document.addEventListener("pointerdown", () => elements.body.classList.add("cursor-down"));
    document.addEventListener("pointerup", () => elements.body.classList.remove("cursor-down"));
    document.addEventListener("pointerleave", () => elements.body.classList.remove("cursor-ready"));
  }

  function init() {
    elements.body.classList.add("js-enabled");
    setTheme(getPreferredTheme(), false, false);
    renderNavigation();
    bindEvents();
    setupRevealAnimations();
    setupActiveNavigation();
    setupCustomCursor();
  }

  return { init };
})();

PortfolioApp.init();
