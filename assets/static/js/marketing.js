/** The homepage demo: a tablist of editing steps, each showing its own screenshots. */
/** The step a key moves to, or null when the key does not move the selection. Arrows wrap. */
export function stepForKey(key, current, count) {
    switch (key) {
        case "ArrowRight":
        case "ArrowDown":
            return (current + 1) % count;
        case "ArrowLeft":
        case "ArrowUp":
            return (current - 1 + count) % count;
        case "Home":
            return 0;
        case "End":
            return count - 1;
        default:
            return null;
    }
}
function mountSteps(root) {
    const list = root.querySelector("[role=tablist]");
    const tabs = [...root.querySelectorAll("[role=tab]")];
    const panels = tabs.map((tab) => document.getElementById(tab.getAttribute("aria-controls") ?? ""));
    if (!list || tabs.length === 0 || panels.some((panel) => !panel))
        return;
    const select = (index, focus) => {
        tabs.forEach((tab, i) => {
            const on = i === index;
            tab.setAttribute("aria-selected", String(on));
            tab.tabIndex = on ? 0 : -1;
            panels[i].hidden = !on;
        });
        if (focus)
            tabs[index].focus();
    };
    tabs.forEach((tab, i) => {
        tab.addEventListener("click", () => select(i, false));
        tab.addEventListener("keydown", (event) => {
            const next = stepForKey(event.key, i, tabs.length);
            if (next === null)
                return;
            event.preventDefault();
            select(next, true);
        });
    });
    list.hidden = false;
    root.classList.add("is-tabbed");
    select(0, false);
}
if (typeof document !== "undefined") {
    for (const root of document.querySelectorAll("[data-steps]"))
        mountSteps(root);
}
