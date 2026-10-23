import { admits, contentOf, fitOf } from "../agent/structure.js";
import { announce, h, icon, must, toast } from "../ui.js";
import { canEditStructure, selection } from "./state.js";
const LISTS = ["ul", "ol", "menu"];
/** Parts that read as one item: a new part goes beside them, not inside. */
const LEAVES = ["a", "button", "p", "h1", "h2", "h3", "h4", "h5", "h6", "span", "img", "label", "summary", "li"];
const INTERACTIVE_KINDS = ["link", "button", "dropdown"];
const PHRASING_KINDS = ["link", "button", "image", "icon"];
function upFrom(byId, node) {
    const out = [];
    for (let at = node; at && !out.includes(at); at = byId.get(at.parent ?? ""))
        out.push(at);
    return out;
}
/**
 * The menu item a selection belongs to, so "Add menu link" adds a sibling item: a new `li` after the
 * selected link's `li` in a list menu, or a new link after it in a row of links. A whole menu gets one
 * after its last item. A menu is a `nav`, or a list in a `header`. Null outside one, or when the menu
 * has no list or link to follow.
 */
export function menuSlot(nodes, element) {
    const byId = new Map(nodes.map((node) => [node.element, node]));
    const selected = byId.get(element);
    const chain = upFrom(byId, selected);
    const below = (node, root) => node !== root && upFrom(byId, node).includes(root);
    const menu = chain.find((node) => node.tag === "nav")
        ?? chain.find((node) => LISTS.includes(node.tag) && chain.slice(chain.indexOf(node)).some((up) => up.tag === "header"))
        ?? (selected && nodes.find((node) => node.tag === "nav" && below(node, selected)));
    if (!menu)
        return null;
    const accepts = (node) => node?.can.includes("n") ?? false;
    const within = chain.includes(menu) ? chain.slice(0, chain.indexOf(menu) + 1) : [];
    const item = within.find((node) => node.tag === "li" && LISTS.includes(byId.get(node.parent ?? "")?.tag ?? ""));
    if (item)
        return accepts(byId.get(item.parent ?? "")) ? { target: item.element, position: "after", like: item.element } : null;
    const link = within.find((node) => node.tag === "a");
    if (link)
        return accepts(byId.get(link.parent ?? "")) ? { target: link.element, position: "after", like: link.element } : null;
    const list = LISTS.includes(menu.tag) ? menu : nodes.find((node) => LISTS.includes(node.tag) && below(node, menu));
    if (list) {
        const items = nodes.filter((node) => node.parent === list.element && node.tag === "li");
        return accepts(list) ? { target: list.element, position: "inside", like: items[items.length - 1]?.element ?? null } : null;
    }
    const links = nodes.filter((node) => node.tag === "a" && below(node, menu) && !upFrom(byId, node).slice(1).some((up) => up.tag === "a"));
    const last = links[links.length - 1];
    return last && accepts(byId.get(last.parent ?? "")) ? { target: last.element, position: "after", like: last.element } : null;
}
/**
 * Why `kind` can't be added at `position` against the selected part, in the owner's words, or null when
 * it can. `tags` runs from the selected part up to the page. Mirrors the server's checks so the
 * panel never offers an insert the server refuses; the server still checks every one.
 */
export function insertProblem(chain, kind, position) {
    const [self, ...above] = chain;
    if (!self)
        return "Select a part of your page first.";
    const parents = position === "inside" ? chain : above;
    const parent = parents[0];
    if (!parent)
        return "Nothing can be placed outside the page.";
    if (position === "inside" && (!self.can.includes("n") || LEAVES.includes(self.tag)))
        return "This part can't hold other parts. Choose Before or After.";
    if (position === "before" && self.tag === "summary")
        return "Nothing can be placed before this part.";
    if (!parent.can.includes("n"))
        return "Nothing can be placed there.";
    const tags = parents.map((node) => node.tag);
    const content = contentOf(tags);
    if (kind === "list_item" && content !== "list")
        return "A list item can only go in a list. Select a list item and choose Before or After.";
    if (content === "phrasing" && !PHRASING_KINDS.includes(kind))
        return "Only links, buttons, images and icons can go inside text.";
    if (INTERACTIVE_KINDS.includes(kind) && tags.some((tag) => tag === "a" || tag === "button"))
        return "Links and buttons can't hold other links or buttons. Choose Before or After.";
    if (kind === "footer" && tags.some((tag) => tag === "header" || tag === "footer"))
        return "A footer can't go inside a header or footer.";
    return null;
}
export function createStructure({ store, canvas, edits }) {
    let nodes = [];
    let byId = new Map();
    let children = new Map();
    let shapes = new Map();
    let busy = false;
    let clipboard = null;
    let dragged = null;
    let pendingNew = null;
    /** A new menu link whose label opens for typing as soon as the canvas selects it. */
    let pendingText = null;
    let placedFor = null;
    /** False from a canvas load until its tree arrives, so no menu action reads the last page's tree. */
    let fresh = true;
    let page = store.get().path;
    const expanded = new Set();
    const listeners = new Set();
    const rows = new Map();
    const trigger = h("button", { class: "btn btn-ghost btn-sm", attrs: { type: "button", "aria-expanded": "false", "aria-controls": "structure-panel", "data-structure-toggle": "", "aria-label": "Page structure", title: "Page structure" } }, icon("folder", "icon-sm"), h("span", { class: "structure-toggle-label", text: "Structure" }));
    must(document, ".ed-top-left").append(trigger);
    const close = h("button", { class: "btn btn-ghost btn-icon btn-sm", attrs: { type: "button", "aria-label": "Close structure" } }, icon("close"));
    const status = h("p", { class: "structure-status", text: "Select a part of your page to move or add content.", attrs: { role: "status" } });
    const tree = h("div", { class: "structure-tree", attrs: { "aria-label": "Page hierarchy" } });
    const actions = h("div", { class: "structure-actions" });
    const panel = h("section", { class: "structure-panel material-sheet", hidden: true, attrs: { id: "structure-panel", "aria-labelledby": "structure-title", "data-structure-panel": "" } }, h("div", { class: "structure-head" }, h("h2", { text: "Page structure", attrs: { id: "structure-title" } }), close), status);
    const template = h("select", { class: "input", attrs: { id: "structure-kind" } });
    const templates = [["paragraph", "Text"], ["heading", "Heading"], ["link", "Link"], ["button", "Button"], ["image", "Image"], ["container", "Container / footer column"], ["section", "Section"], ["columns", "Responsive columns"], ["list", "List"], ["list_item", "List item"], ["dropdown", "Dropdown menu"], ["footer", "Footer"], ["navigation", "Navigation"], ["table", "Table"], ["divider", "Divider"], ["icon", "Star icon"]];
    template.append(...templates.map(([value, label]) => h("option", { text: label, attrs: { value } })));
    const placement = h("select", { class: "input", attrs: { id: "structure-position" } }, h("option", { text: "Inside selection", attrs: { value: "inside" } }), h("option", { text: "Before selection", attrs: { value: "before" } }), h("option", { text: "After selection", attrs: { value: "after" } }));
    const add = button("Add element", () => {
        const sel = current();
        if (!sel || problem(kind(), position()))
            return;
        const where = position();
        const slot = kind() === "link" ? menuSlotOf(sel.element) : null;
        const menuItem = sel.tag === "a" || sel.tag === "li";
        if (slot && (where === "inside" || menuItem))
            void run({ op: "insert_element", element: slot.target, position: where === "inside" ? slot.position : where, kind: "link", ...(slot.like ? { like: slot.like } : {}) }, "Menu link added", true, true);
        else
            void run({ op: "insert_element", element: sel.element, position: where, kind: kind() }, "Element added", true);
    });
    const reason = h("p", { class: "structure-status", attrs: { id: "structure-insert-reason", "aria-live": "polite" } });
    add.setAttribute("aria-describedby", "structure-insert-reason");
    const menuLink = button("Add menu link", () => { const sel = current(); if (sel)
        addMenuLink(sel.element); });
    menuLink.classList.replace("btn-ghost", "btn-primary");
    const insert = h("div", { class: "structure-insert" }, menuLink, h("label", { text: "Add to your page", attrs: { for: "structure-kind" } }), template, h("label", { text: "Placement", attrs: { for: "structure-position" } }), placement, add, reason);
    const name = h("input", { class: "input", attrs: { id: "structure-name", maxlength: "80", placeholder: "Name in this editor" } });
    const rename = button("Rename", () => {
        const sel = current();
        if (sel)
            void run({ op: "rename_element", element: sel.element, name: name.value.trim() }, "Name updated");
    });
    const renameForm = h("form", { class: "structure-rename" }, h("label", { text: "Editor name", attrs: { for: "structure-name" } }), name, rename);
    renameForm.addEventListener("submit", (event) => { event.preventDefault(); rename.click(); });
    const locate = button("Locate", () => { const sel = current(); if (sel)
        canvas.send({ type: "reveal", element: sel.element, pulse: true }); });
    const parent = button("Select parent", () => canvas.send({ type: "select_relative", direction: "parent" }));
    const duplicate = button("Duplicate", duplicateSelected);
    const copy = button("Copy", () => copySelected("copy"));
    const cut = button("Move to…", () => copySelected("move"));
    const paste = button("Paste here", pasteSelected);
    const up = button("Move earlier", () => moveSibling(-1));
    const down = button("Move later", () => moveSibling(1));
    const wrap = button("Wrap in container", () => { const sel = current(); if (sel)
        void run({ op: "wrap_element", element: sel.element }, "Container added", true); });
    const unwrap = button("Unwrap container", () => { const sel = current(); if (sel)
        void run({ op: "unwrap_element", element: sel.element }, "Container removed"); });
    const remove = button("Delete", removeSelected);
    remove.classList.add("structure-delete");
    actions.append(duplicate, cut, up, down, remove);
    const insertion = h("details", { class: "structure-disclosure" }, h("summary", { text: "Add an element" }), insert);
    const extra = h("div", { class: "structure-actions" }, locate, parent, copy, paste, wrap, unwrap);
    const advanced = h("details", { class: "structure-disclosure" }, h("summary", { text: "More actions" }), extra, renameForm);
    panel.append(tree, actions, insertion, advanced);
    must(document, "#editor").append(panel);
    trigger.addEventListener("click", () => setOpen(Boolean(panel.hidden)));
    close.addEventListener("click", () => { setOpen(false); trigger.focus(); });
    panel.addEventListener("keydown", (event) => { if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        trigger.focus();
    } });
    function button(label, action) {
        const result = h("button", { class: "btn btn-ghost btn-sm", text: label, attrs: { type: "button" } });
        result.addEventListener("click", action);
        return result;
    }
    function position() { return placement.value === "before" ? "before" : placement.value === "after" ? "after" : "inside"; }
    function kind() { return templates.find(([value]) => value === template.value)?.[0] ?? "paragraph"; }
    function problem(what, where) { return insertProblem(upFrom(byId, current() ?? undefined), what, where); }
    function supported() { return canEditStructure(store.get().editSupport); }
    function menuSlotOf(element) { return fresh ? menuSlot(nodes, element) : null; }
    function addMenuLink(element) {
        const slot = menuSlotOf(element);
        if (!slot) {
            toast("Select a link in your menu first.");
            return;
        }
        void run({ op: "insert_element", element: slot.target, position: slot.position, kind: "link", ...(slot.like ? { like: slot.like } : {}) }, "Menu link added. Type its name, then choose Link to set where it goes.", true, true);
    }
    /** On a new selection: the first placement that works, After for a single part, and Link inside a menu. */
    function placeFor(sel) {
        if (!sel || sel.element === placedFor)
            return;
        placedFor = sel.element;
        if (menuSlotOf(sel.element) && template.value === "paragraph")
            template.value = "link";
        const order = LEAVES.includes(sel.tag) || !sel.can.includes("n") ? ["after", "before", "inside"] : ["inside", "after", "before"];
        placement.value = order.find((where) => !problem(kind(), where)) ?? order[0] ?? "after";
    }
    function current() { return byId.get(selection(store.get())?.element ?? "") ?? null; }
    function setOpen(open) {
        panel.hidden = !open;
        trigger.setAttribute("aria-expanded", String(open));
        if (open) {
            canvas.send({ type: "request_structure" });
            render();
        }
    }
    function copySelected(kind) {
        const sel = current();
        if (!sel?.can.includes("m"))
            return;
        clipboard = { kind, element: sel.element, page: store.get().path };
        status.textContent = kind === "move" ? "Select a destination, choose its placement, then choose Move here." : "Copied. Select a destination and choose Paste here.";
        paste.textContent = kind === "move" ? "Move here" : "Paste here";
        sync();
        if (kind === "move")
            setOpen(true);
    }
    function pasteSelected() {
        const target = current();
        if (!target || !clipboard)
            return;
        if (clipboard.page !== store.get().path || !byId.has(clipboard.element)) {
            toast("Copy an element from this page first.");
            return;
        }
        if (clipboard.kind === "move") {
            void run({ op: "move_element", element: clipboard.element, target: target.element, position: position() }, "Element moved");
            clipboard = null;
        }
        else
            void run({ op: "duplicate_element", element: clipboard.element, target: target.element, position: position() }, "Element pasted", true);
    }
    function duplicateSelected() { const sel = current(); if (sel)
        void run({ op: "duplicate_element", element: sel.element }, "Element duplicated", true); }
    function removeSelected() { const sel = current(); if (sel)
        void run({ op: "remove_element", element: sel.element }, "Element deleted"); }
    function moveSibling(delta) {
        const sel = current();
        if (!sel)
            return;
        const siblings = children.get(sel.parent) ?? [];
        const target = siblings[siblings.indexOf(sel) + delta];
        if (target)
            void move(sel.element, target.element, delta < 0 ? "before" : "after");
    }
    async function run(edit, message, selectNew = false, type = false) {
        if (!supported()) {
            toast("This server can't change the page structure. Reload the editor to see what it supports.");
            return;
        }
        if (busy || store.get().canvasLoading || store.get().mode !== "edit" || store.get().saves.problem || store.get().saves.pending > 0)
            return;
        const commandPage = store.get().path;
        busy = true;
        sync();
        try {
            if (!await canvas.finishText())
                return;
            if (store.get().path !== commandPage)
                return;
            if (selectNew)
                pendingNew = { page: commandPage, ids: new Set(byId.keys()), preferredTag: edit.op === "insert_element" && (edit.kind === "link" || edit.kind === "button") ? "a" : edit.op === "insert_element" && edit.kind === "image" ? "img" : null, type };
            const ok = await edits.save(edit, { page: commandPage, reload: true, select: true, pulse: true });
            if (ok) {
                announce(message);
                status.textContent = message;
            }
            else
                pendingNew = null;
        }
        finally {
            busy = false;
            sync();
        }
    }
    function validMove(element, target, where) {
        const source = byId.get(element);
        const destination = byId.get(target);
        if (!source?.can.includes("m") || !destination || element === target)
            return false;
        if (where === "inside" && !destination.can.includes("n"))
            return false;
        let parent = where === "inside" ? destination : byId.get(destination.parent ?? "");
        if (!parent?.can.includes("n"))
            return false;
        const sourceShape = shapes.get(element);
        const tags = [];
        const visited = new Set();
        while (parent && !visited.has(parent.element)) {
            if (parent.element === element)
                return false;
            visited.add(parent.element);
            tags.push(parent.tag);
            parent = byId.get(parent.parent ?? "");
        }
        return sourceShape !== undefined && admits(contentOf(tags), fitOf(sourceShape));
    }
    function move(element, target, where) {
        if (!validMove(element, target, where)) {
            toast("Choose a compatible container outside this element.");
            return Promise.resolve();
        }
        return run({ op: "move_element", element, target, position: where }, "Element moved");
    }
    function sync() {
        const state = store.get();
        const sel = current();
        const disabled = busy || state.mode !== "edit" || state.saves.pending > 0 || state.saves.problem !== null || state.canvasLoading;
        for (const control of panel.querySelectorAll(".structure-actions button, .structure-insert button, .structure-rename button"))
            control.disabled = disabled || !sel;
        const mutable = sel?.can.includes("m") ?? false;
        for (const control of [duplicate, copy, cut, remove, wrap, unwrap, up, down])
            control.disabled ||= !mutable;
        paste.disabled ||= clipboard === null;
        placeFor(sel);
        for (const option of placement.options)
            option.disabled = sel !== null && problem(kind(), option.value) !== null;
        const why = !sel ? "Select a part of your page first." : state.saves.problem ? "Saving stopped. Retry or reload before changing the structure."
            : state.saves.pending > 0 || busy ? "Wait for saving to finish." : state.canvasLoading ? "Wait for the page to load." : problem(kind(), position());
        add.disabled ||= problem(kind(), position()) !== null;
        reason.textContent = add.disabled ? why ?? "" : "";
        menuLink.hidden = !sel || !menuSlotOf(sel.element);
        trigger.hidden = !supported();
        if (!supported() && !panel.hidden)
            setOpen(false);
        name.disabled = disabled || !sel;
        if (document.activeElement !== name)
            name.value = sel?.name ?? "";
        for (const [id, row] of rows)
            row.setAttribute("aria-current", String(id === sel?.element));
        trigger.disabled = state.mode !== "edit";
        if (state.mode !== "edit")
            setOpen(false);
    }
    placement.addEventListener("change", sync);
    template.addEventListener("change", () => {
        if (problem(kind(), position())) {
            const fit = ["after", "before", "inside"].find((where) => !problem(kind(), where));
            if (fit)
                placement.value = fit;
        }
        sync();
    });
    function render() {
        if (panel.hidden)
            return;
        rows.clear();
        const active = current();
        let ancestor = active;
        const seen = new Set();
        while (ancestor?.parent && !seen.has(ancestor.element)) {
            seen.add(ancestor.element);
            expanded.add(ancestor.parent);
            ancestor = byId.get(ancestor.parent) ?? null;
        }
        const renderNode = (node, depth) => {
            const row = h("button", { class: "structure-node", text: node.name || node.tag, attrs: { type: "button", "data-node": node.element, "aria-current": String(active?.element === node.element), title: `${node.tag}${node.can.includes("m") ? ". Drag to move" : ". Structure is protected"}` } });
            rows.set(node.element, row);
            row.draggable = node.can.includes("m");
            row.addEventListener("click", () => { canvas.send({ type: "select_element", element: node.element }); canvas.send({ type: "reveal", element: node.element, pulse: false }); });
            row.addEventListener("dragstart", (event) => { if (busy)
                return event.preventDefault(); dragged = node.element; event.dataTransfer?.setData("text/plain", node.element); if (event.dataTransfer)
                event.dataTransfer.effectAllowed = "move"; });
            row.addEventListener("dragend", clearDrag);
            const where = (event) => {
                const rect = row.getBoundingClientRect();
                const fraction = (event.clientY - rect.top) / Math.max(1, rect.height);
                return fraction < .25 ? "before" : fraction > .75 ? "after" : node.can.includes("n") ? "inside" : "after";
            };
            row.addEventListener("dragover", (event) => {
                if (!dragged)
                    return;
                const place = where(event);
                if (!validMove(dragged, node.element, place)) {
                    row.dataset["drop"] = "invalid";
                    if (event.dataTransfer)
                        event.dataTransfer.dropEffect = "none";
                    return;
                }
                event.preventDefault();
                row.dataset["drop"] = place;
                if (event.dataTransfer)
                    event.dataTransfer.dropEffect = "move";
                const rect = tree.getBoundingClientRect();
                if (event.clientY < rect.top + 32)
                    tree.scrollTop -= 14;
                if (event.clientY > rect.bottom - 32)
                    tree.scrollTop += 14;
            });
            row.addEventListener("dragleave", () => delete row.dataset["drop"]);
            row.addEventListener("drop", (event) => { event.preventDefault(); const source = dragged; clearDrag(); if (source)
                void move(source, node.element, where(event)); });
            const nested = children.get(node.element) ?? [];
            if (nested.length === 0 || depth >= 64)
                return h("div", { class: "structure-leaf" }, row);
            const open = expanded.has(node.element);
            const toggle = h("button", { class: "structure-expand", attrs: { type: "button", "aria-label": `Expand ${node.name || node.tag}`, "aria-expanded": String(open) } }, icon("chevron-right", "icon-sm"));
            const body = h("div", { class: "structure-children", hidden: !open });
            const populate = () => { if (!body.childElementCount)
                body.append(...nested.map((child) => renderNode(child, depth + 1))); };
            if (open)
                populate();
            toggle.addEventListener("click", () => {
                const next = !expanded.has(node.element);
                if (next) {
                    expanded.add(node.element);
                    populate();
                }
                else
                    expanded.delete(node.element);
                body.hidden = !next;
                toggle.setAttribute("aria-expanded", String(next));
            });
            return h("div", { class: "structure-branch" }, h("div", { class: "structure-entry" }, toggle, row), body);
        };
        tree.replaceChildren(...(children.get(null) ?? []).map((node) => renderNode(node, 0)));
        sync();
    }
    function clearDrag() { dragged = null; for (const row of rows.values())
        delete row.dataset["drop"]; }
    function update(next, truncated) {
        nodes = next;
        fresh = true;
        byId = new Map(nodes.map((node) => [node.element, node]));
        children = new Map();
        shapes = new Map(nodes.map((node) => [node.element, { localName: node.tag, children: [] }]));
        for (const node of nodes) {
            const siblings = children.get(node.parent) ?? [];
            siblings.push(node);
            children.set(node.parent, siblings);
            const shape = shapes.get(node.element);
            if (shape && node.parent)
                shapes.get(node.parent)?.children.push(shape);
        }
        if (pendingNew) {
            const pending = pendingNew;
            pendingNew = null;
            const addedNodes = pending.page === store.get().path ? nodes.filter((node) => !pending.ids.has(node.element)) : [];
            const added = addedNodes.find((node) => node.tag === pending.preferredTag) ?? addedNodes[0];
            if (added) {
                pendingText = pending.type ? added.element : null;
                canvas.send({ type: "select_element", element: added.element });
                canvas.send({ type: "reveal", element: added.element, pulse: true });
            }
        }
        if (truncated)
            status.textContent = "This large page shows its first 5,000 elements. Select other elements on the page.";
        render();
        for (const listener of listeners)
            listener();
    }
    store.subscribe((state, previous) => {
        if (state.path !== page) {
            page = state.path;
            pendingNew = null;
            pendingText = null;
            clipboard = null;
            expanded.clear();
            update([], false);
        }
        if (state.canvasLoading && !previous?.canvasLoading) {
            fresh = false;
            for (const listener of listeners)
                listener();
        }
        const selected = selection(state)?.element ?? null;
        if (selected !== (previous ? selection(previous)?.element ?? null : null)) {
            if (pendingText && selected === pendingText) {
                pendingText = null;
                canvas.startText();
            }
            else if (selected !== null)
                pendingText = null;
            render();
        }
        sync();
    });
    document.addEventListener("keydown", (event) => {
        if (event.defaultPrevented || !supported() || store.get().mode !== "edit" || store.get().editing.active || event.target instanceof Element && event.target.closest("input,textarea,select,[contenteditable],dialog"))
            return;
        const key = event.key.toLowerCase();
        const mod = event.ctrlKey || event.metaKey;
        if (mod && event.shiftKey && key === "l") {
            event.preventDefault();
            setOpen(Boolean(panel.hidden));
            return;
        }
        if (!current())
            return;
        if (mod && key === "d") {
            event.preventDefault();
            duplicateSelected();
        }
        else if (mod && key === "c") {
            event.preventDefault();
            copySelected("copy");
        }
        else if (mod && key === "x") {
            event.preventDefault();
            copySelected("move");
        }
        else if (mod && key === "v") {
            event.preventDefault();
            pasteSelected();
        }
        else if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            removeSelected();
        }
        else if (event.altKey && event.shiftKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
            moveSibling(event.key === "ArrowUp" ? -1 : 1);
        }
    }, true);
    return {
        update, move,
        open: () => setOpen(true),
        openInsert() { setOpen(true); insertion.open = true; },
        addMenuLink,
        menuSlot: menuSlotOf,
        /** Runs after every new page tree, which can arrive after the selection it describes. */
        onUpdate(listener) { listeners.add(listener); },
        duplicate(element) { void run({ op: "duplicate_element", element }, "Element duplicated", true); },
        remove(element) { void run({ op: "remove_element", element }, "Element deleted"); },
        moveSibling,
    };
}
