const initialized = new WeakSet<HTMLElement>();

export function initNavigation(): void {
  const header = document.querySelector<HTMLElement>(".site-header");
  const toggle = header?.querySelector<HTMLButtonElement>("#site-menu-toggle");
  const panel = header?.querySelector<HTMLElement>("#site-navigation");
  if (!header || !toggle || !panel || initialized.has(header)) return;
  initialized.add(header);

  const mobile = window.matchMedia("(max-width: 1100px)");
  const close = (restoreFocus = false) => {
    document.body.classList.remove("site-menu-open");
    toggle.setAttribute("aria-expanded", "false");
    if (restoreFocus) toggle.focus();
  };
  header.classList.add("navigation-ready");
  toggle.hidden = false;
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") !== "true";
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("site-menu-open", open);
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      toggle.getAttribute("aria-expanded") === "true"
    ) {
      event.preventDefault();
      close(true);
    }
  });
  document.addEventListener("click", (event) => {
    if (event.target instanceof Node && !header.contains(event.target)) close();
  });
  header.addEventListener("focusout", (event) => {
    // Pointer activation can briefly focus body; only close for a known outside target.
    if (
      event.relatedTarget instanceof Node &&
      !header.contains(event.relatedTarget)
    )
      close();
  });
  panel.addEventListener("click", (event) => {
    // Let the anchor activate before hiding its panel; moving focus here can cancel navigation.
    if (event.target instanceof Element && event.target.closest("a[href]")) {
      window.setTimeout(() => close(), 0);
    }
  });
  mobile.addEventListener("change", () => {
    const focusInPanel = panel.contains(document.activeElement);
    close(mobile.matches && focusInPanel);
  });

  const path = window.location.pathname.replace(/\/$/, "") || "/";
  panel
    .querySelectorAll<HTMLAnchorElement>(".primary-nav a")
    .forEach((link) => {
      const active =
        (new URL(link.href).pathname.replace(/\/$/, "") || "/") === path;
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
}
