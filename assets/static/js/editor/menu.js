import { h, icon } from "../ui.js";
let current = null;
export function closeMenus(restoreFocus = false) {
    current?.close(restoreFocus);
}
export function menuOpen() {
    return current !== null;
}
/**
 * Opens a menu under (or above) its trigger, in the app layer. Arrow keys, Home and End move,
 * a letter jumps to the next item starting with it, Escape and Tab close it, and focus returns
 * to the trigger when the menu closes by keyboard or after a choice.
 */
export function openMenu(trigger, items, options) {
    const wasOpen = current?.trigger === trigger;
    closeMenus();
    if (wasOpen)
        return;
    const menu = h("div", { class: "menu ed-menu", attrs: { role: "menu", "aria-label": options.label } });
    const buttons = [];
    for (const item of items) {
        if (item === "separator") {
            menu.append(h("div", { class: "menu-sep", attrs: { role: "separator" } }));
            continue;
        }
        const role = item.checked === undefined ? "menuitem" : "menuitemradio";
        const b = h("button", { class: `menu-item${item.danger ? " danger" : ""}`, attrs: { type: "button", role, tabindex: "-1" } }, item.icon ? icon(item.icon, "icon-sm") : null, h("span", { class: "grow truncate", text: item.label }), item.detail ? h("span", { class: "ed-menu-detail", text: item.detail }) : null, item.checked ? icon("check", "icon-sm") : null);
        if (item.checked !== undefined)
            b.setAttribute("aria-checked", String(item.checked));
        b.addEventListener("click", () => {
            close(true);
            item.run();
        });
        buttons.push(b);
        menu.append(b);
    }
    document.body.append(menu);
    const r = trigger.getBoundingClientRect();
    const w = menu.offsetWidth;
    const hgt = menu.offsetHeight;
    let left = options.align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    let top = r.bottom + 6;
    if (top + hgt > window.innerHeight - 8 && r.top - hgt - 6 > 8)
        top = r.top - hgt - 6;
    menu.style.left = `${Math.round(left)}px`;
    menu.style.top = `${Math.round(Math.max(8, top))}px`;
    trigger.setAttribute("aria-expanded", "true");
    const focusAt = (i) => buttons[(i + buttons.length) % buttons.length]?.focus();
    const checked = buttons.findIndex((b) => b.getAttribute("aria-checked") === "true");
    if (options.focusFirst !== false)
        focusAt(checked >= 0 ? checked : 0);
    function close(restore) {
        if (current?.menu !== menu)
            return;
        current = null;
        menu.remove();
        trigger.setAttribute("aria-expanded", "false");
        document.removeEventListener("pointerdown", outside, true);
        if (restore && trigger.isConnected)
            trigger.focus();
    }
    function outside(event) {
        if (event.target instanceof Node && (menu.contains(event.target) || trigger.contains(event.target)))
            return;
        close(false);
    }
    document.addEventListener("pointerdown", outside, true);
    menu.addEventListener("keydown", (event) => {
        const index = buttons.indexOf(document.activeElement);
        if (event.key === "ArrowDown")
            focusAt(index + 1);
        else if (event.key === "ArrowUp")
            focusAt(index - 1);
        else if (event.key === "Home")
            focusAt(0);
        else if (event.key === "End")
            focusAt(buttons.length - 1);
        else if (event.key === "Escape")
            close(true);
        else if (event.key === "Tab") {
            close(true);
            return;
        }
        else if (event.key.length === 1 && /\S/.test(event.key)) {
            const letter = event.key.toLowerCase();
            const next = buttons.findIndex((b, i) => i > index && b.textContent?.trim().toLowerCase().startsWith(letter));
            const wrap = buttons.findIndex((b) => b.textContent?.trim().toLowerCase().startsWith(letter));
            if (next >= 0 || wrap >= 0)
                focusAt(next >= 0 ? next : wrap);
        }
        else
            return;
        event.preventDefault();
        event.stopPropagation();
    });
    current = { menu, trigger, close };
}
