function closeMenus(except) {
    for (const menu of document.querySelectorAll("details[data-menu][open]")) {
        if (menu !== except)
            menu.open = false;
    }
}
document.addEventListener("click", (event) => {
    const target = event.target instanceof Element ? event.target : null;
    closeMenus(target?.closest("details[data-menu]") ?? undefined);
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
        closeMenus();
});
for (const form of document.querySelectorAll("form[data-submit-once]")) {
    form.addEventListener("submit", () => {
        const button = form.querySelector('button[type="submit"]');
        if (!button)
            return;
        window.setTimeout(() => {
            button.disabled = true;
            button.prepend(Object.assign(document.createElement("span"), { className: "spinner" }));
        }, 0);
    });
}
document.addEventListener("error", (event) => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-thumb"))
        return;
    const placeholder = img.parentElement?.querySelector(".placeholder-thumb");
    img.remove();
    if (placeholder)
        placeholder.hidden = false;
}, true);
const header = document.querySelector("[data-app-header]");
if (header) {
    const update = () => header.style.borderBottomColor = window.scrollY > 4 ? "var(--line)" : "transparent";
    window.addEventListener("scroll", update, { passive: true });
    update();
}
export {};
