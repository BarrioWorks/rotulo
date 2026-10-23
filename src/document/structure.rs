//! Structural edits: where an element may go, and moving, inserting, copying, wrapping and
//! removing elements. A change the HTML parser would read back as a different tree, or one
//! that nests too deeply, is refused like any other rule.

use std::collections::{HashMap, HashSet};

use ego_tree::NodeId;
use html5ever::{Attribute, QualName};
use percent_encoding::percent_decode_str;
use scraper::{node::Element, Html, Node};
use serde::{Deserialize, Serialize};

use super::{
    clean_line, qual, remove_attr, set_attr, Document, EditError, ElementId, Plan, CAN_ATTR,
    ID_ATTR, NAME_ATTR, PHRASING,
};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Position {
    Before,
    After,
    Inside,
}

/// The parts `insert_element` creates, each from a fixed template.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum InsertKind {
    Paragraph,
    Heading,
    Container,
    Section,
    Link,
    Button,
    List,
    ListItem,
    Image,
    Columns,
    Footer,
    Dropdown,
    Table,
    Divider,
    Navigation,
    Icon,
}

const PLACEHOLDER_IMAGE: &str = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23e5e7eb'/%3E%3C/svg%3E";
const COLUMN: &str = "flex: 1 1 240px";

fn el(name: &str, attrs: &[(&str, &str)], children: Vec<Plan>) -> Plan {
    Plan::New {
        name: name.to_owned(),
        attrs: attrs
            .iter()
            .map(|(k, v)| ((*k).to_owned(), (*v).to_owned()))
            .collect(),
        children,
    }
}

fn text(name: &str, attrs: &[(&str, &str)], words: &str) -> Plan {
    el(name, attrs, vec![Plan::Text(words.to_owned())])
}

impl InsertKind {
    fn template(self) -> Plan {
        match self {
            Self::Paragraph => text("p", &[], "New paragraph"),
            Self::Heading => text("h2", &[], "New heading"),
            Self::Container => el("div", &[], vec![text("p", &[], "New text")]),
            Self::Section => el(
                "section",
                &[],
                vec![
                    text("h2", &[], "New section"),
                    text("p", &[], "Add your text here."),
                ],
            ),
            Self::Link => text("a", &[("href", "#")], "New link"),
            Self::Button => text("a", &[("class", "button"), ("href", "#")], "New button"),
            Self::List => el("ul", &[], vec![text("li", &[], "List item")]),
            Self::ListItem => text("li", &[], "List item"),
            Self::Image => el(
                "img",
                &[
                    ("src", PLACEHOLDER_IMAGE),
                    ("alt", ""),
                    ("width", "640"),
                    ("height", "360"),
                ],
                Vec::new(),
            ),
            Self::Columns => el(
                "div",
                &[("style", "display: flex; flex-wrap: wrap; gap: 24px")],
                vec![
                    el(
                        "div",
                        &[("style", COLUMN)],
                        vec![text("p", &[], "Column one")],
                    ),
                    el(
                        "div",
                        &[("style", COLUMN)],
                        vec![text("p", &[], "Column two")],
                    ),
                ],
            ),
            Self::Footer => el("footer", &[], vec![text("p", &[], "© Your business")]),
            Self::Table => el(
                "div",
                &[("style", "max-width: 100%; overflow-x: auto")],
                vec![el(
                    "table",
                    &[],
                    vec![
                        text("caption", &[], "Table title"),
                        el(
                            "thead",
                            &[],
                            vec![el(
                                "tr",
                                &[],
                                vec![
                                    text("th", &[("scope", "col")], "Column one"),
                                    text("th", &[("scope", "col")], "Column two"),
                                ],
                            )],
                        ),
                        el(
                            "tbody",
                            &[],
                            vec![el(
                                "tr",
                                &[],
                                vec![text("td", &[], "Cell one"), text("td", &[], "Cell two")],
                            )],
                        ),
                    ],
                )],
            ),
            Self::Divider => el("hr", &[], Vec::new()),
            Self::Navigation => el(
                "nav",
                &[("aria-label", "Navigation")],
                vec![el(
                    "ul",
                    &[(
                        "style",
                        "display: flex; flex-wrap: wrap; gap: 24px; list-style: none; padding: 0",
                    )],
                    vec![
                        el("li", &[], vec![text("a", &[("href", "#")], "Home")]),
                        el("li", &[], vec![text("a", &[("href", "#")], "About")]),
                    ],
                )],
            ),
            Self::Icon => text("span", &[("role", "img"), ("aria-label", "Star")], "★"),
            Self::Dropdown => el(
                "details",
                &[],
                vec![
                    text("summary", &[], "Menu"),
                    el(
                        "ul",
                        &[],
                        vec![el("li", &[], vec![text("a", &[("href", "#")], "Link")])],
                    ),
                ],
            ),
        }
    }
}

/// A class list without the classes that mark one item as the current page, such as `active`.
fn lasting_classes(class: &str) -> Option<String> {
    let kept: Vec<&str> = class
        .split_ascii_whitespace()
        .filter(|c| {
            let c = c.to_ascii_lowercase();
            !matches!(
                c.as_str(),
                "active"
                    | "current"
                    | "selected"
                    | "is-active"
                    | "is-current"
                    | "is-selected"
                    | "nav-active"
                    | "nav-current"
                    | "nav-selected"
                    | "current-menu-item"
                    | "current_page_item"
                    | "w--current"
            )
        })
        .collect();
    (!kept.is_empty()).then(|| kept.join(" "))
}

fn with_class(plan: Plan, class: Option<String>) -> Plan {
    match (plan, class) {
        (
            Plan::New {
                name,
                mut attrs,
                children,
            },
            Some(class),
        ) => {
            attrs.retain(|(k, _)| k != "class");
            attrs.push(("class".to_owned(), class));
            Plan::New {
                name,
                attrs,
                children,
            }
        }
        (plan, _) => plan,
    }
}

/// What an element's children may be.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub(super) enum Content {
    #[default]
    Nothing,
    Phrasing,
    Flow,
    ListItems,
}

/// Where an element may be placed.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum Fit {
    /// Required by its parent, such as a table row or a dropdown's label. Never moved.
    Fixed,
    ListItem,
    Phrasing,
    Flow,
}

const VOID: &[&str] = &[
    "area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param",
    "source", "track", "wbr",
];
/// Elements whose children only make sense as they are: tables, media, embedded documents.
const CLOSED: &[&str] = &[
    "", "html", "head", "picture", "svg", "video", "audio", "table", "thead", "tbody", "tfoot",
    "tr", "colgroup", "dl", "hgroup", "select", "datalist", "optgroup", "option", "textarea",
    "iframe", "object", "canvas", "math", "map", "ruby", "script", "style", "template", "noscript",
];
const PHRASING_PARENTS: &[&str] = &[
    "p", "h1", "h2", "h3", "h4", "h5", "h6", "pre", "summary", "legend", "caption", "dt", "button",
    "label",
];
const FIXED: &[&str] = &[
    "",
    "html",
    "head",
    "body",
    "main",
    "title",
    "caption",
    "colgroup",
    "col",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "td",
    "th",
    "dt",
    "dd",
    "summary",
    "legend",
    "figcaption",
    "source",
    "track",
    "option",
    "optgroup",
    "area",
    "param",
    "base",
    "link",
    "meta",
];
const PHRASING_PARTS: &[&str] = &[
    "img", "picture", "svg", "button", "label", "input", "select", "textarea", "iframe", "canvas",
    "object", "embed", "meter", "progress", "output", "video", "audio",
];
/// Parts a link or button may not contain.
const INTERACTIVE: &[&str] = &[
    "a", "button", "input", "select", "textarea", "label", "details", "iframe", "embed",
];
/// Parts that must stay the first child of their parent.
const FIRST_CHILD: &[&str] = &["summary", "legend"];
/// Attributes whose value names one element by its `id`.
const ID_REF: &[&str] = &[
    "for",
    "list",
    "form",
    "aria-activedescendant",
    "aria-details",
    "aria-errormessage",
    "popovertarget",
    "commandfor",
];
/// Attributes whose value is a space-separated list of `id`s.
const ID_REFS: &[&str] = &[
    "headers",
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-owns",
    "aria-flowto",
];

/// `None` for `a`, which takes the content of wherever it sits.
pub(super) fn own_content(name: &str) -> Option<Content> {
    Some(if VOID.contains(&name) || CLOSED.contains(&name) {
        Content::Nothing
    } else if matches!(name, "ul" | "ol" | "menu") {
        Content::ListItems
    } else if name == "a" {
        return None;
    } else if PHRASING_PARENTS.contains(&name) || PHRASING.contains(&name) {
        Content::Phrasing
    } else {
        Content::Flow
    })
}

/// The content of a link inside a parent with `parent` content.
pub(super) fn transparent(parent: Content) -> Content {
    match parent {
        Content::Flow => Content::Flow,
        Content::Nothing => Content::Nothing,
        Content::Phrasing | Content::ListItems => Content::Phrasing,
    }
}

pub(super) fn fit(name: &str) -> Fit {
    if name == "li" {
        Fit::ListItem
    } else if FIXED.contains(&name) {
        Fit::Fixed
    } else if PHRASING.contains(&name) || PHRASING_PARTS.contains(&name) {
        Fit::Phrasing
    } else {
        Fit::Flow
    }
}

fn admits(content: Content, fit: Fit) -> Result<(), EditError> {
    match (content, fit) {
        (_, Fit::Fixed) => Err(EditError::NotAllowed(
            "This part belongs where it is and can't be placed elsewhere.",
        )),
        (Content::ListItems, Fit::ListItem) => Ok(()),
        (Content::ListItems, _) => Err(EditError::NotAllowed(
            "Only list items can go directly inside a list.",
        )),
        (_, Fit::ListItem) => Err(EditError::NotAllowed(
            "List items can only go inside a list.",
        )),
        (Content::Flow, _) | (Content::Phrasing, Fit::Phrasing) => Ok(()),
        (Content::Phrasing, Fit::Flow) => Err(EditError::NotAllowed(
            "Only text-level parts, such as links and images, can go inside text.",
        )),
        (Content::Nothing, _) => Err(EditError::NotAllowed("Nothing can be placed there.")),
    }
}

/// A place in the page: the parent and where among its children.
#[derive(Debug, Clone, Copy)]
struct Destination {
    parent: NodeId,
    anchor: Anchor,
}

#[derive(Debug, Clone, Copy)]
enum Anchor {
    Before(NodeId),
    After(NodeId),
    End,
}

impl Document {
    fn parent_of(&self, id: NodeId) -> Option<NodeId> {
        self.html.tree.get(id)?.parent().map(|p| p.id())
    }

    fn has_editor_id(&self, id: NodeId) -> bool {
        self.element(id).is_some_and(|e| e.attr(ID_ATTR).is_some())
    }

    pub(super) fn content_of(&self, id: NodeId) -> Content {
        if self.is_sealed(id) {
            return Content::Nothing;
        }
        let mut links = 0;
        let mut node = id;
        loop {
            if let Some(content) = own_content(self.name(node)) {
                return (0..links).fold(content, |c, _| transparent(c));
            }
            links += 1;
            match self.parent_of(node) {
                Some(parent) => node = parent,
                None => return Content::Nothing,
            }
        }
    }

    pub(super) fn is_movable(&self, id: NodeId) -> bool {
        self.has_editor_id(id)
            && !self.is_sealed(id)
            && fit(self.name(id)) != Fit::Fixed
            && self
                .parent_of(id)
                .is_some_and(|p| self.content_of(p) != Content::Nothing)
    }

    /// A link wrapping blocks, such as a whole card, is placed as a block.
    fn subtree_fit(&self, id: NodeId) -> Fit {
        let own = fit(self.name(id));
        if own != Fit::Phrasing {
            return own;
        }
        let mut stack = vec![id];
        while let Some(node) = stack.pop() {
            if own_content(self.name(node)) == Some(Content::Nothing) {
                continue;
            }
            for child in self.element_children(node) {
                if fit(self.name(child)) != Fit::Phrasing {
                    return Fit::Flow;
                }
                stack.push(child);
            }
        }
        Fit::Phrasing
    }

    fn subtree_has(&self, id: NodeId, names: &[&str]) -> bool {
        self.html.tree.get(id).is_some_and(|n| {
            n.descendants().any(|d| {
                d.value()
                    .as_element()
                    .is_some_and(|e| names.contains(&e.name()))
            })
        })
    }

    fn within(&self, id: NodeId, names: &[&str]) -> bool {
        std::iter::once(id)
            .chain(self.ancestors(id))
            .any(|a| names.contains(&self.name(a)))
    }

    fn destination(&self, target: NodeId, position: Position) -> Result<Destination, EditError> {
        if !self.has_editor_id(target) || self.is_sealed(target) {
            return Err(EditError::NotAllowed("Nothing can be placed there."));
        }
        let (parent, anchor) = match position {
            Position::Inside => (target, Anchor::End),
            Position::Before | Position::After => {
                let parent = self
                    .parent_of(target)
                    .filter(|p| self.has_editor_id(*p))
                    .ok_or(EditError::NotAllowed(
                        "Nothing can be placed outside the page.",
                    ))?;
                if position == Position::Before && FIRST_CHILD.contains(&self.name(target)) {
                    return Err(EditError::NotAllowed(
                        "Nothing can be placed before this part.",
                    ));
                }
                let anchor = if position == Position::Before {
                    Anchor::Before(target)
                } else {
                    Anchor::After(target)
                };
                (parent, anchor)
            }
        };
        if self.content_of(parent) == Content::Nothing {
            return Err(EditError::NotAllowed("Nothing can be placed there."));
        }
        Ok(Destination { parent, anchor })
    }

    /// Whether the subtree at `subject` may sit at `to`. `subject` itself may be unattached.
    fn admit(&self, subject: NodeId, to: Destination) -> Result<(), EditError> {
        if std::iter::once(to.parent)
            .chain(self.ancestors(to.parent))
            .any(|a| a == subject)
        {
            return Err(EditError::NotAllowed("An element can't go inside itself."));
        }
        admits(self.content_of(to.parent), self.subtree_fit(subject))?;
        if self.subtree_has(subject, INTERACTIVE) && self.within(to.parent, &["a", "button"]) {
            return Err(EditError::NotAllowed(
                "Links and buttons can't contain other links, buttons or form fields.",
            ));
        }
        if self.subtree_has(subject, &["header", "footer"])
            && self.within(to.parent, &["header", "footer"])
        {
            return Err(EditError::NotAllowed(
                "A header or footer can't go inside another header or footer.",
            ));
        }
        if self.subtree_has(subject, &["form"]) && self.within(to.parent, &["form"]) {
            return Err(EditError::NotAllowed(
                "A form can't go inside another form.",
            ));
        }
        Ok(())
    }

    fn place(&mut self, subject: NodeId, to: Destination) {
        match to.anchor {
            Anchor::Before(target) => {
                self.html
                    .tree
                    .get_mut(target)
                    .expect("target")
                    .insert_id_before(subject);
            }
            Anchor::After(target) => {
                self.html
                    .tree
                    .get_mut(target)
                    .expect("target")
                    .insert_id_after(subject);
            }
            Anchor::End => {
                self.html
                    .tree
                    .get_mut(to.parent)
                    .expect("parent")
                    .append_id(subject);
            }
        }
    }

    fn movable(&self, id: NodeId, refusal: &'static str) -> Result<(), EditError> {
        if self.is_movable(id) {
            Ok(())
        } else {
            Err(EditError::NotAllowed(refusal))
        }
    }

    fn resolve(&self, element: &ElementId) -> Result<NodeId, EditError> {
        self.find(element).ok_or(EditError::NotFound)
    }

    pub(super) fn move_element(
        &mut self,
        id: NodeId,
        target: &ElementId,
        position: Position,
    ) -> Result<(), EditError> {
        self.movable(id, "This part of the page can't be moved.")?;
        let target = self.resolve(target)?;
        if target == id && position != Position::Inside {
            return Ok(());
        }
        let to = self.destination(target, position)?;
        self.admit(id, to)?;
        self.place(id, to);
        self.check_reparse()
    }

    pub(super) fn insert_element(
        &mut self,
        target: NodeId,
        position: Position,
        kind: InsertKind,
        like: Option<&ElementId>,
    ) -> Result<(), EditError> {
        let to = self.destination(target, position)?;
        let (item_class, link_class) = match like {
            Some(like) => self.menu_classes(self.resolve(like)?, to, kind)?,
            None => (None, None),
        };
        let mut next = self.next_number();
        let mut template = with_class(kind.template(), link_class);
        if self.content_of(to.parent) == Content::ListItems && kind != InsertKind::ListItem {
            template = with_class(el("li", &[], vec![template]), item_class);
        }
        let subject = self.build_one(template, &mut next);
        self.admit(subject, to)?;
        self.place(subject, to);
        self.check_reparse()
    }

    /// The classes a new link copies from `like`: a link, or a list item holding one, beside the new link.
    fn menu_classes(
        &self,
        like: NodeId,
        to: Destination,
        kind: InsertKind,
    ) -> Result<(Option<String>, Option<String>), EditError> {
        if kind != InsertKind::Link || self.parent_of(like) != Some(to.parent) {
            return Err(EditError::Invalid(
                "Only a new link can copy the look of a link beside it.",
            ));
        }
        let class = |id: NodeId| {
            self.element(id)
                .and_then(|e| e.attr("class"))
                .and_then(lasting_classes)
        };
        match self.name(like) {
            "a" => Ok((None, class(like))),
            "li" => {
                let link = self
                    .element_children(like)
                    .into_iter()
                    .find(|c| self.name(*c) == "a");
                Ok((class(like), link.and_then(class)))
            }
            _ => Err(EditError::Invalid(
                "Only a new link can copy the look of a link beside it.",
            )),
        }
    }

    pub(super) fn duplicate_element(
        &mut self,
        id: NodeId,
        target: Option<&ElementId>,
        position: Option<Position>,
    ) -> Result<(), EditError> {
        self.movable(id, "This part of the page can't be duplicated.")?;
        if self.contains_script(id) {
            return Err(EditError::NotAllowed(
                "This part contains code, so it can't be duplicated safely.",
            ));
        }
        if self.subtree_has(id, &["style"]) {
            return Err(EditError::NotAllowed(
                "This part has its own style sheet, so it can't be duplicated safely.",
            ));
        }
        if self.subtree_has(
            id,
            &[
                "animate",
                "animateMotion",
                "animateTransform",
                "set",
                "discard",
            ],
        ) {
            return Err(EditError::NotAllowed(
                "This part contains SVG animation timing and values that can't be copied safely. Add a new element instead.",
            ));
        }
        let target = match target {
            Some(target) => self.resolve(target)?,
            None => id,
        };
        let to = self.destination(target, position.unwrap_or(Position::After))?;
        self.admit(id, to)?;
        let copy = self.copy_subtree(id)?;
        self.place(copy, to);
        self.check_reparse()
    }

    pub(super) fn remove_element(&mut self, id: NodeId) -> Result<(), EditError> {
        self.movable(id, "This part of the page can't be removed.")?;
        self.html.tree.get_mut(id).expect("element").detach();
        Ok(())
    }

    pub(super) fn wrap_element(&mut self, id: NodeId) -> Result<(), EditError> {
        self.movable(id, "This part of the page can't be wrapped.")?;
        let parent = self.parent_of(id).expect("movable elements have a parent");
        let name = match self.content_of(parent) {
            Content::Flow => "div",
            Content::Phrasing => "span",
            Content::ListItems | Content::Nothing => {
                return Err(EditError::NotAllowed(
                    "List items can't be wrapped. Wrap the whole list instead.",
                ))
            }
        };
        let mut next = self.next_number();
        let wrapper = self.build_one(el(name, &[], Vec::new()), &mut next);
        self.html
            .tree
            .get_mut(id)
            .expect("element")
            .insert_id_before(wrapper);
        self.html
            .tree
            .get_mut(wrapper)
            .expect("wrapper")
            .append_id(id);
        self.check_reparse()
    }

    pub(super) fn unwrap_element(&mut self, id: NodeId) -> Result<(), EditError> {
        self.movable(id, "This part of the page can't be unwrapped.")?;
        let parent = self.parent_of(id).expect("movable elements have a parent");
        let content = self.content_of(parent);
        let children: Vec<NodeId> = self
            .html
            .tree
            .get(id)
            .expect("element")
            .children()
            .map(|c| c.id())
            .collect();
        for &child in &children {
            match self.html.tree.get(child).expect("child").value() {
                Node::Element(_) => admits(content, self.subtree_fit(child))?,
                Node::Text(t) if !t.trim().is_empty() && content != Content::Phrasing => {
                    return Err(EditError::NotAllowed(
                        "Its text would be left without a paragraph around it.",
                    ))
                }
                _ => {}
            }
        }
        for child in children {
            self.html
                .tree
                .get_mut(id)
                .expect("element")
                .insert_id_before(child);
        }
        self.html.tree.get_mut(id).expect("element").detach();
        self.check_reparse()
    }

    pub(super) fn rename_element(&mut self, id: NodeId, name: &str) -> Result<(), EditError> {
        if self.is_sealed(id) {
            return Err(EditError::NotAllowed(
                "This part of the page can't be renamed.",
            ));
        }
        let name = clean_line(name, 80)?;
        self.with_element(id, |element| {
            if name.is_empty() {
                remove_attr(element, NAME_ATTR);
            } else {
                set_attr(element, NAME_ATTR, &name);
            }
        });
        Ok(())
    }

    /// An unattached copy of `id` with fresh editor ids. HTML `id`s inside it get new unique
    /// values, and references between parts of the copy follow them.
    pub(super) fn copy_subtree(&mut self, id: NodeId) -> Result<NodeId, EditError> {
        let mut taken: HashSet<String> = self
            .html
            .tree
            .root()
            .descendants()
            .filter_map(|n| n.value().as_element()?.attr("id").map(str::to_owned))
            .collect();
        let inside: Vec<String> = self
            .html
            .tree
            .get(id)
            .expect("element")
            .descendants()
            .filter_map(|n| n.value().as_element()?.attr("id").map(str::to_owned))
            .collect();
        let mut renamed = HashMap::new();
        for old in inside {
            if renamed.contains_key(&old) {
                continue;
            }
            let fresh = (1..)
                .map(|n| match n {
                    1 => format!("{old}-copy"),
                    n => format!("{old}-copy-{n}"),
                })
                .find(|candidate| !taken.contains(candidate))
                .expect("unbounded");
            taken.insert(fresh.clone());
            renamed.insert(old, fresh);
        }
        if !renamed.is_empty() {
            self.page_styles_ignore(&renamed)?;
        }
        let mut next = self.next_number();
        self.clone_with(id, &renamed, &mut next)
    }

    /// Refuses when the page's style sheets might select the copied ids, since the copy's new
    /// ids would lose that styling. Linked sheets must come from the stored project files.
    fn page_styles_ignore(&self, renamed: &HashMap<String, String>) -> Result<(), EditError> {
        const UNCHECKED: EditError = EditError::NotAllowed(
            "This part has styling that can't be checked safely. Add a new element instead of duplicating it.",
        );
        let mut seen = HashSet::new();
        let mut bytes = 0_usize;
        let has_base = self.html.tree.root().descendants().any(|n| {
            n.value()
                .as_element()
                .is_some_and(|e| e.name() == "base" && e.attr("href").is_some())
        });
        for n in self.html.tree.root().descendants() {
            let Some(element) = n.value().as_element() else {
                continue;
            };
            let inline;
            let css = match element.name() {
                "link"
                    if element.attr("rel").is_some_and(|rel| {
                        rel.split_ascii_whitespace()
                            .any(|r| r.eq_ignore_ascii_case("stylesheet"))
                    }) =>
                {
                    if has_base {
                        return Err(UNCHECKED);
                    }
                    let href = element.attr("href").ok_or(UNCHECKED)?;
                    if !seen.insert(href) {
                        continue;
                    }
                    self.copy_stylesheets.get(href).ok_or(UNCHECKED)?.as_str()
                }
                "style" => {
                    inline = n
                        .descendants()
                        .filter_map(|t| t.value().as_text().map(|t| &**t))
                        .collect::<String>();
                    &inline
                }
                _ => continue,
            };
            bytes = bytes.checked_add(css.len()).ok_or(UNCHECKED)?;
            if bytes > 8 * 1024 * 1024 {
                return Err(UNCHECKED);
            }
            if css_may_select(css, renamed) {
                return Err(EditError::NotAllowed(
                    "The page's style sheet styles this part by its id, so a copy would look different. It can't be duplicated.",
                ));
            }
        }
        Ok(())
    }

    fn clone_with(
        &mut self,
        id: NodeId,
        renamed: &HashMap<String, String>,
        next: &mut u64,
    ) -> Result<NodeId, EditError> {
        let mut value = self.html.tree.get(id).expect("node").value().clone();
        if let Node::Element(element) = &mut value {
            let mut attrs: Vec<Attribute> = element
                .attrs
                .iter()
                .filter(|(name, _)| !matches!(&*name.local, ID_ATTR | CAN_ATTR))
                .map(|(name, value)| {
                    Ok(Attribute {
                        name: name.clone(),
                        value: remap_references(name, value, renamed)?.into(),
                    })
                })
                .collect::<Result<_, EditError>>()?;
            attrs.push(Attribute {
                name: qual(ID_ATTR),
                value: ElementId::from_number(*next).as_str().into(),
            });
            *next += 1;
            value = Node::Element(Element::new(element.name.clone(), attrs));
        }
        let children: Vec<NodeId> = self
            .html
            .tree
            .get(id)
            .expect("node")
            .children()
            .map(|c| c.id())
            .collect();
        let copy = self.html.tree.orphan(value).id();
        for child in children {
            let child_copy = self.clone_with(child, renamed, next)?;
            self.html
                .tree
                .get_mut(copy)
                .expect("copy")
                .append_id(child_copy);
        }
        Ok(copy)
    }

    /// Each editor id with its parent's, in document order, as the HTML parser builds them.
    fn shape(html: &Html) -> Vec<(String, Option<String>)> {
        let id_of = |n: ego_tree::NodeRef<'_, Node>| {
            n.value()
                .as_element()
                .and_then(|e| e.attr(ID_ATTR))
                .map(str::to_owned)
        };
        html.tree
            .root()
            .descendants()
            .filter_map(|n| Some((id_of(n)?, n.parent().and_then(id_of))))
            .collect()
    }

    /// Refuses a tree that would come back different after saving, as a `<div>` inside a `<p>` does.
    fn check_reparse(&self) -> Result<(), EditError> {
        if Self::shape(&self.html) == Self::shape(&Html::parse_document(&self.serialize())) {
            Ok(())
        } else {
            Err(EditError::NotAllowed(
                "That would break the page's HTML structure, so nothing changed.",
            ))
        }
    }
}

fn remap_references(
    name: &QualName,
    value: &str,
    renamed: &HashMap<String, String>,
) -> Result<String, EditError> {
    let local = &*name.local;
    let rename = |id: &str| renamed.get(id).cloned().unwrap_or_else(|| id.to_owned());
    if local == "id" || ID_REF.contains(&local) {
        return Ok(rename(value));
    }
    if ID_REFS.contains(&local) {
        return Ok(value
            .split_ascii_whitespace()
            .map(rename)
            .collect::<Vec<_>>()
            .join(" "));
    }
    if matches!(local, "begin" | "end") && !renamed.is_empty() {
        let names_copied = |t: &str| {
            t.contains('\\')
                || renamed.keys().any(|id| {
                    t.strip_prefix(id.as_str())
                        .is_some_and(|r| r.starts_with('.'))
                })
        };
        if value.split(';').any(|t| names_copied(t.trim())) {
            return Err(EditError::NotAllowed(
                "This part's animation timing refers to parts by id in a way the editor can't copy, so it can't be duplicated.",
            ));
        }
    }
    if local == "href" {
        if addresses_copied_id(value.trim_matches(CSS_SPACE), renamed) {
            return Err(EditError::NotAllowed(
                "This part links to its own parts through a page address, which the editor can't copy safely, so it can't be duplicated.",
            ));
        }
        if let Some(fresh) = value
            .trim_matches(CSS_SPACE)
            .strip_prefix('#')
            .and_then(|id| renamed_to(id, renamed))
        {
            return Ok(format!("#{fresh}"));
        }
    }
    if CSS_VALUED.contains(&local) {
        return remap_urls(value, renamed);
    }
    Ok(value.to_owned())
}

/// The new id for a fragment naming a copied id, read as written or percent-decoded, the
/// same two ways a browser tries a URL fragment.
fn renamed_to<'a>(fragment: &str, renamed: &'a HashMap<String, String>) -> Option<&'a String> {
    renamed.get(fragment).or_else(|| {
        let decoded = percent_decode_str(fragment).decode_utf8().ok()?;
        renamed.get(&*decoded)
    })
}

/// Whether a URL with a path, such as `index.html#shape`, names a copied id. The page's own
/// address isn't known here, so it might point at the original instead of the copy.
fn addresses_copied_id(url: &str, renamed: &HashMap<String, String>) -> bool {
    url.split_once('#')
        .is_some_and(|(path, fragment)| !path.is_empty() && renamed_to(fragment, renamed).is_some())
}

/// Conservatively checks selectors and fragment references without treating escaped text as selectors.
fn css_may_select(css: &str, renamed: &HashMap<String, String>) -> bool {
    fn scan(
        input: &mut cssparser::Parser<'_, '_>,
        renamed: &HashMap<String, String>,
        attribute: bool,
        depth: usize,
    ) -> bool {
        use cssparser::Token;
        if depth > 128 {
            return true;
        }
        while let Ok(token) = input.next_including_whitespace_and_comments().cloned() {
            match token {
                Token::Hash(id) | Token::IDHash(id)
                    if renamed.keys().any(|key| key.eq_ignore_ascii_case(&id)) =>
                {
                    return true
                }
                Token::Ident(id) if attribute && id.eq_ignore_ascii_case("id") => return true,
                Token::AtKeyword(name) if name.eq_ignore_ascii_case("import") => return true,
                Token::QuotedString(value) | Token::UnquotedUrl(value)
                    if value
                        .split_once('#')
                        .is_some_and(|(_, fragment)| renamed_to(fragment, renamed).is_some()) =>
                {
                    return true
                }
                Token::BadString(_) | Token::BadUrl(_) => return true,
                Token::SquareBracketBlock
                | Token::CurlyBracketBlock
                | Token::ParenthesisBlock
                | Token::Function(_) => {
                    let attr = matches!(token, Token::SquareBracketBlock);
                    let unsafe_nested = input.parse_nested_block(|nested| {
                        Ok::<_, cssparser::ParseError<'_, ()>>(scan(
                            nested,
                            renamed,
                            attr,
                            depth + 1,
                        ))
                    });
                    if unsafe_nested.unwrap_or(true) {
                        return true;
                    }
                }
                _ => {}
            }
        }
        false
    }
    scan(
        &mut cssparser::Parser::new(&mut cssparser::ParserInput::new(css)),
        renamed,
        false,
        0,
    )
}

/// Attributes read as CSS, where `url(#id)` points at an SVG paint server, filter, clip or mask.
const CSS_VALUED: &[&str] = &[
    "style",
    "fill",
    "stroke",
    "filter",
    "clip-path",
    "mask",
    "marker-start",
    "marker-mid",
    "marker-end",
];
const CSS_SPACE: &[char] = &[' ', '\t', '\n', '\r', '\x0c'];

/// Rewrites the target of each CSS `url(...)` that names a renamed id, keeping its quotes and
/// spacing. Refuses CSS this reader can't follow exactly, such as escapes or unclosed `url(`,
/// rather than copy a reference that would still point at the original.
fn remap_urls(value: &str, renamed: &HashMap<String, String>) -> Result<String, EditError> {
    const UNSUPPORTED: EditError = EditError::NotAllowed(
        "This part's styling uses references the editor can't copy safely, so it can't be duplicated.",
    );
    if renamed.is_empty() {
        return Ok(value.to_owned());
    }
    if value.contains('\\') {
        return Err(UNSUPPORTED);
    }
    let lower = value.to_ascii_lowercase();
    let skip_space =
        |at: usize| at + value[at..].len() - value[at..].trim_start_matches(CSS_SPACE).len();
    let mut out = String::with_capacity(value.len());
    let mut copied = 0;
    let mut from = 0;
    while from < value.len() {
        let rest = &value[from..];
        if rest.starts_with("/*") {
            from += rest.find("*/").ok_or(UNSUPPORTED)? + 2;
            continue;
        }
        let first = rest.chars().next().expect("nonempty CSS");
        if matches!(first, '\'' | '"') {
            from += 1 + rest[1..].find(first).ok_or(UNSUPPORTED)? + 1;
            continue;
        }
        if !lower[from..].starts_with("url(") {
            from += first.len_utf8();
            continue;
        }
        let start = from;
        from = start + 4;
        let ident_before = value[..start]
            .chars()
            .next_back()
            .is_some_and(|c| c.is_alphanumeric() || matches!(c, '-' | '_') || !c.is_ascii());
        if ident_before {
            continue;
        }
        let open = skip_space(from);
        let (target, after) = match value[open..].chars().next() {
            Some(quote @ ('"' | '\'')) => {
                let inner = open + 1;
                let close = value[inner..].find(quote).ok_or(UNSUPPORTED)? + inner;
                if value[inner..close].contains('\n') {
                    return Err(UNSUPPORTED);
                }
                (inner..close, close + 1)
            }
            _ => {
                let end = value[open..]
                    .find(|c: char| c == ')' || CSS_SPACE.contains(&c))
                    .map_or(value.len(), |n| n + open);
                if value[open..end].contains(['"', '\'', '(']) {
                    return Err(UNSUPPORTED);
                }
                (open..end, end)
            }
        };
        let close = skip_space(after);
        if !value[close..].starts_with(')') {
            return Err(UNSUPPORTED);
        }
        if addresses_copied_id(&value[target.clone()], renamed) {
            return Err(UNSUPPORTED);
        }
        if let Some(fresh) = value[target.clone()]
            .strip_prefix('#')
            .and_then(|id| renamed_to(id, renamed))
        {
            out.push_str(&value[copied..target.start]);
            out.push('#');
            out.push_str(fresh);
            copied = target.end;
        }
        from = close + 1;
    }
    out.push_str(&value[copied..]);
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::super::{Capabilities, PageEdit};
    use super::*;

    #[test]
    fn copying_css_keeps_literal_strings_and_comments() {
        let renamed = HashMap::from([("g".to_owned(), "g-copy".to_owned())]);
        let value = r##"content: "url(#g)"; fill: url( '#g' ); /* url(#g) */"##;
        assert_eq!(
            remap_urls(value, &renamed).unwrap(),
            r##"content: "url(#g)"; fill: url( '#g-copy' ); /* url(#g) */"##
        );
    }

    #[test]
    fn stored_local_stylesheets_allow_class_styled_copies_and_refuse_id_styling() {
        let html =
            r#"<link rel="stylesheet" href="site.css"><div id="art" class="card">Artwork</div>"#;
        let mut safe = page(html);
        safe.set_copy_stylesheets(HashMap::from([(
            "site.css".to_owned(),
            ".card { background: red }".to_owned(),
        )]));
        duplicate(&mut safe, "art").unwrap();
        assert_eq!(
            safe.element(node(&safe, "art-copy")).unwrap().attr("class"),
            Some("card")
        );
        let mut unsafe_copy = page(html);
        unsafe_copy.set_copy_stylesheets(HashMap::from([(
            "site.css".to_owned(),
            "#art { background: red }".to_owned(),
        )]));
        let before = unsafe_copy.serialize();
        assert!(duplicate(&mut unsafe_copy, "art").is_err());
        assert_eq!(unsafe_copy.serialize(), before);
    }

    const FIXTURE: &str = include_str!("../../fixtures/sites/editor-structure/index.html");
    const FLEX_NAV: &str = r##"<!DOCTYPE html><html><head><title>t</title></head><body>
<header><nav><a id="home" href="/">Home</a><a id="menu" href="menu.html">Menu</a></nav></header>
<main id="main"><section id="one"><h2 id="one-title">One</h2><p id="text">Plain <span id="word">words</span> here.</p>
<form id="signup"><label for="email" id="email-label">Email</label><input id="email" aria-describedby="email-help email-label"><small id="help">Help</small>
<svg><defs><linearGradient id="g"></linearGradient></defs><rect fill="url(#g)" style="fill: url('#g')"></rect></svg><a href="#email">Jump</a><a href="#elsewhere">Away</a></form></section>
<section id="two"><h2>Two</h2><ul id="list"><li id="first">First</li><li id="second">Second</li></ul><table><tbody><tr id="row"><td id="cell">x</td></tr></tbody></table>
<details id="faq"><summary id="question">Q</summary><p>A</p></details><div id="coded"><p>Has code</p><script>1</script></div></section>
</main><footer id="foot"><p id="copy">© Us</p></footer></body></html>"##;

    fn page(source: &str) -> Document {
        let mut doc = Document::parse(source);
        doc.assign_ids();
        doc
    }

    fn node(doc: &Document, html_id: &str) -> NodeId {
        doc.html
            .tree
            .root()
            .descendants()
            .find(|n| {
                n.value()
                    .as_element()
                    .is_some_and(|e| e.attr("id") == Some(html_id))
            })
            .unwrap_or_else(|| panic!("no #{html_id}"))
            .id()
    }

    fn id(doc: &Document, html_id: &str) -> ElementId {
        editor_id(doc, node(doc, html_id))
    }

    fn editor_id(doc: &Document, node: NodeId) -> ElementId {
        ElementId(doc.element(node).unwrap().attr(ID_ATTR).unwrap().to_owned())
    }

    fn first(doc: &Document, tag: &str) -> ElementId {
        let node = doc
            .html
            .tree
            .root()
            .descendants()
            .find(|n| n.value().as_element().is_some_and(|e| e.name() == tag))
            .unwrap()
            .id();
        editor_id(doc, node)
    }

    fn parent_html_id(doc: &Document, html_id: &str) -> String {
        let parent = doc.parent_of(node(doc, html_id)).unwrap();
        doc.element(parent)
            .unwrap()
            .attr("id")
            .unwrap_or("")
            .to_owned()
    }

    fn edit(value: serde_json::Value) -> PageEdit {
        serde_json::from_value(value).unwrap()
    }

    fn editor_ids_are_unique(doc: &Document) {
        let ids: Vec<_> = doc
            .html
            .tree
            .root()
            .descendants()
            .filter_map(|n| n.value().as_element()?.attr(ID_ATTR))
            .collect();
        assert_eq!(ids.len(), ids.iter().collect::<HashSet<_>>().len());
        let html_ids: Vec<_> = doc
            .html
            .tree
            .root()
            .descendants()
            .filter_map(|n| n.value().as_element()?.attr("id"))
            .collect();
        assert_eq!(
            html_ids.len(),
            html_ids.iter().collect::<HashSet<_>>().len()
        );
    }

    fn can(doc: &Document, html_id: &str) -> Capabilities {
        doc.capabilities(&id(doc, html_id)).unwrap()
    }

    #[test]
    fn nested_moves_keep_the_element_and_its_attributes() {
        let mut doc = page(FIXTURE);
        let button = id(&doc, "hero-button");
        let before = doc.element(node(&doc, "hero-button")).unwrap().clone();
        doc.apply(&edit(serde_json::json!({"op":"move_element","element":button,"target":id(&doc,"hero-target"),"position":"inside"}))).unwrap();
        assert_eq!(parent_html_id(&doc, "hero-button"), "hero-target");
        assert_eq!(doc.element(node(&doc, "hero-button")).unwrap(), &before);
        doc.apply(&edit(serde_json::json!({"op":"move_element","element":id(&doc,"card-c"),"target":id(&doc,"card-a"),"position":"before"}))).unwrap();
        let cards: Vec<_> = doc
            .element_children(node(&doc, "card-grid"))
            .into_iter()
            .map(|c| doc.element(c).unwrap().attr("id").unwrap().to_owned())
            .collect();
        assert_eq!(cards, ["card-c", "card-a", "card-b"]);
        doc.apply(&edit(serde_json::json!({"op":"move_element","element":id(&doc,"moving-image"),"target":id(&doc,"image-target"),"position":"inside"}))).unwrap();
        assert_eq!(parent_html_id(&doc, "moving-image"), "image-target");
        doc.apply(&edit(serde_json::json!({"op":"move_element","element":id(&doc,"footer-links"),"target":id(&doc,"footer-about"),"position":"before"}))).unwrap();
        let li: Vec<_> = doc.element_children(node(&doc, "nav-items"));
        let (first, last) = (editor_id(&doc, li[0]), editor_id(&doc, li[2]));
        doc.apply(&PageEdit::MoveElement {
            element: last.clone(),
            target: first,
            position: Position::Before,
        })
        .unwrap();
        assert_eq!(
            doc.element_children(node(&doc, "nav-items"))[0],
            doc.find(&last).unwrap()
        );
        editor_ids_are_unique(&doc);
    }

    #[test]
    fn structural_edits_that_break_the_page_are_refused_and_change_nothing() {
        let mut doc = page(FLEX_NAV);
        let body = first(&doc, "body");
        let refused = [
            serde_json::json!({"op":"move_element","element":id(&doc,"one"),"target":id(&doc,"one-title"),"position":"after"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"one"),"target":id(&doc,"one"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":body,"target":id(&doc,"foot"),"position":"after"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"main"),"target":id(&doc,"foot"),"position":"after"}),
            serde_json::json!({"op":"insert_element","element":body,"position":"before","kind":"paragraph"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"first"),"target":id(&doc,"two"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"text"),"target":id(&doc,"list"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"one-title"),"target":id(&doc,"word"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"menu"),"target":id(&doc,"home"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"signup"),"target":id(&doc,"signup"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"row"),"target":id(&doc,"two"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"cell"),"target":id(&doc,"two"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"text"),"target":id(&doc,"row"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"question"),"target":id(&doc,"two"),"position":"inside"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"question"),"position":"before","kind":"paragraph"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"text"),"position":"inside","kind":"paragraph"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"home"),"position":"inside","kind":"button"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"foot"),"position":"inside","kind":"footer"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"two"),"position":"inside","kind":"list_item"}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"email"),"position":"inside","kind":"paragraph"}),
            serde_json::json!({"op":"duplicate_element","element":id(&doc,"coded")}),
            serde_json::json!({"op":"duplicate_element","element":id(&doc,"one"),"target":id(&doc,"text"),"position":"after"}),
            serde_json::json!({"op":"remove_element","element":body}),
            serde_json::json!({"op":"wrap_element","element":id(&doc,"first")}),
            serde_json::json!({"op":"unwrap_element","element":id(&doc,"list")}),
            serde_json::json!({"op":"unwrap_element","element":id(&doc,"faq")}),
            serde_json::json!({"op":"unwrap_element","element":id(&doc,"copy")}),
            serde_json::json!({"op":"unwrap_element","element":body}),
        ];
        let before = doc.serialize();
        for value in refused {
            let result = doc.apply(&edit(value.clone()));
            assert!(
                matches!(result, Err(EditError::NotAllowed(_))),
                "{value}: {result:?}"
            );
            assert_eq!(doc.serialize(), before, "{value} changed the page");
        }
        let sealed = doc
            .html
            .tree
            .root()
            .descendants()
            .find(|n| n.value().as_element().is_some_and(|e| e.name() == "script"))
            .unwrap()
            .id();
        let script = editor_id(&doc, sealed);
        for value in [
            serde_json::json!({"op":"move_element","element":script,"target":id(&doc,"one"),"position":"inside"}),
            serde_json::json!({"op":"move_element","element":id(&doc,"text"),"target":script,"position":"inside"}),
            serde_json::json!({"op":"insert_element","element":script,"position":"after","kind":"paragraph"}),
            serde_json::json!({"op":"rename_element","element":script,"name":"Code"}),
        ] {
            assert!(doc.apply(&edit(value.clone())).is_err(), "{value}");
        }
        assert_eq!(doc.serialize(), before);
    }

    #[test]
    fn moves_that_would_nest_too_deeply_are_refused() {
        let chain = |name: &str| {
            format!(
                "<div id=\"{name}\">{}<p id=\"{name}-end\">x</p>{}</div>",
                "<div>".repeat(300),
                "</div>".repeat(300)
            )
        };
        let mut doc = page(&format!("<body>{}{}</body>", chain("a"), chain("b")));
        let before = doc.serialize();
        let result = doc.apply(&PageEdit::MoveElement {
            element: id(&doc, "b"),
            target: id(&doc, "a-end"),
            position: Position::After,
        });
        assert!(matches!(result, Err(EditError::Invalid(_))), "{result:?}");
        assert_eq!(doc.serialize(), before);
    }

    #[test]
    fn insertions_fit_lists_flex_navigation_and_footers() {
        let mut doc = page(FIXTURE);
        let nav = id(&doc, "nav-items");
        doc.apply(&PageEdit::InsertElement {
            element: nav.clone(),
            position: Position::Inside,
            kind: InsertKind::Link,
            like: None,
        })
        .unwrap();
        let items = doc.element_children(node(&doc, "nav-items"));
        assert_eq!(items.len(), 4);
        let added = doc.html.tree.get(items[3]).unwrap();
        assert_eq!(doc.name(added.id()), "li");
        let link = added.first_child().unwrap();
        assert_eq!(doc.element(link.id()).unwrap().name(), "a");
        assert_eq!(doc.element(link.id()).unwrap().attr("href"), Some("#"));
        assert!(doc.capabilities_of(link.id()).text && doc.capabilities_of(link.id()).link);
        doc.apply(&PageEdit::InsertElement {
            element: editor_id(&doc, items[0]),
            position: Position::After,
            kind: InsertKind::ListItem,
            like: None,
        })
        .unwrap();
        assert_eq!(doc.element_children(node(&doc, "nav-items")).len(), 5);
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "footer-links"),
            position: Position::After,
            kind: InsertKind::Container,
            like: None,
        })
        .unwrap();
        assert_eq!(doc.element_children(node(&doc, "footer-columns")).len(), 3);
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "contact"),
            position: Position::Before,
            kind: InsertKind::Footer,
            like: None,
        })
        .unwrap();
        assert!(doc.serialize().contains("<footer data-ph-id="));
        for kind in [
            InsertKind::Paragraph,
            InsertKind::Heading,
            InsertKind::Section,
            InsertKind::Button,
            InsertKind::List,
            InsertKind::Image,
            InsertKind::Columns,
            InsertKind::Dropdown,
            InsertKind::Table,
            InsertKind::Divider,
            InsertKind::Navigation,
            InsertKind::Icon,
        ] {
            doc.apply(&PageEdit::InsertElement {
                element: id(&doc, "hero-target"),
                position: Position::Inside,
                kind,
                like: None,
            })
            .unwrap();
        }
        editor_ids_are_unique(&doc);

        let mut doc = page(FLEX_NAV);
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "menu"),
            position: Position::After,
            kind: InsertKind::Link,
            like: None,
        })
        .unwrap();
        let nav = doc.parent_of(node(&doc, "menu")).unwrap();
        let names: Vec<_> = doc
            .element_children(nav)
            .iter()
            .map(|c| doc.name(*c).to_owned())
            .collect();
        assert_eq!(
            names,
            ["a", "a", "a"],
            "a flex navigation gets a plain link"
        );
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "text"),
            position: Position::Inside,
            kind: InsertKind::Link,
            like: None,
        })
        .unwrap();
        assert!(
            can(&doc, "text").text,
            "a paragraph with a new link stays editable as text"
        );
    }

    #[test]
    fn a_new_menu_link_looks_like_its_neighbours() {
        assert_eq!(
            lasting_classes(
                "interactive text-current active:scale-95 active is-current w--current"
            ),
            Some("interactive text-current active:scale-95".to_owned())
        );
        let mut doc = page(
            r##"<body><nav><ul id="list" class="menu"><li id="home" class="item active"><a id="home-link" class="link is-current" href="/">Home</a></li><li id="about" class="item"><a id="about-link" class="link" href="/about">About</a></li></ul></nav>
<nav id="flex"><a id="one" class="nav-link" href="/">One</a><a id="two" class="nav-link current" href="/two">Two</a></nav></body>"##,
        );
        doc.apply(&edit(serde_json::json!({"op":"insert_element","element":id(&doc,"about"),"position":"after","kind":"link","like":id(&doc,"about")}))).unwrap();
        let items = doc.element_children(node(&doc, "list"));
        assert_eq!(items.len(), 3);
        let added = doc.element(items[2]).unwrap();
        assert_eq!((added.name(), added.attr("class")), ("li", Some("item")));
        let link = doc.element_children(items[2])[0];
        assert_eq!(doc.element(link).unwrap().attr("class"), Some("link"));
        assert_eq!(doc.element_children(link).len(), 0, "no nested link");

        doc.apply(&edit(serde_json::json!({"op":"insert_element","element":id(&doc,"list"),"position":"inside","kind":"link","like":id(&doc,"home")}))).unwrap();
        let items = doc.element_children(node(&doc, "list"));
        assert_eq!(
            doc.element(items[3]).unwrap().attr("class"),
            Some("item"),
            "active is not copied"
        );
        let link = doc.element_children(items[3])[0];
        assert_eq!(
            doc.element(link).unwrap().attr("class"),
            Some("link"),
            "is-current is not copied"
        );

        doc.apply(&edit(serde_json::json!({"op":"insert_element","element":id(&doc,"two"),"position":"after","kind":"link","like":id(&doc,"two")}))).unwrap();
        let links = doc.element_children(node(&doc, "flex"));
        assert_eq!(links.len(), 3);
        assert_eq!(
            doc.element(links[2]).unwrap().attr("class"),
            Some("nav-link")
        );
        editor_ids_are_unique(&doc);

        let before = doc.serialize();
        for refused in [
            serde_json::json!({"op":"insert_element","element":id(&doc,"two"),"position":"after","kind":"button","like":id(&doc,"two")}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"about"),"position":"after","kind":"link","like":id(&doc,"two")}),
            serde_json::json!({"op":"insert_element","element":id(&doc,"two"),"position":"after","kind":"link","like":id(&doc,"flex")}),
        ] {
            assert!(doc.apply(&edit(refused.clone())).is_err(), "{refused}");
            assert_eq!(doc.serialize(), before, "{refused}");
        }
    }

    #[test]
    fn duplicates_get_fresh_ids_and_keep_their_internal_references() {
        let mut doc = page(FLEX_NAV);
        doc.apply(&PageEdit::DuplicateElement {
            element: id(&doc, "signup"),
            target: None,
            position: None,
        })
        .unwrap();
        editor_ids_are_unique(&doc);
        let copy = doc
            .html
            .tree
            .get(node(&doc, "signup"))
            .unwrap()
            .next_sibling()
            .unwrap()
            .id();
        assert_eq!(doc.element(copy).unwrap().attr("id"), Some("signup-copy"));
        let attr = |html_id: &str, name: &str| {
            doc.element(node(&doc, html_id))
                .unwrap()
                .attr(name)
                .map(str::to_owned)
        };
        assert_eq!(
            attr("email-label-copy", "for").as_deref(),
            Some("email-copy")
        );
        assert_eq!(
            attr("email-copy", "aria-describedby").as_deref(),
            Some("email-help email-label-copy")
        );
        let html = doc.serialize();
        assert!(
            html.contains(r##"fill="url(#g-copy)" style="fill: url('#g-copy')""##),
            "{html}"
        );
        assert!(
            html.contains(r##"href="#email-copy""##)
                && html.matches(r##"href="#elsewhere""##).count() == 2
        );
        assert_eq!(
            attr("email-label", "for").as_deref(),
            Some("email"),
            "the original is untouched"
        );

        doc.apply(&PageEdit::DuplicateElement {
            element: id(&doc, "first"),
            target: Some(id(&doc, "second")),
            position: Some(Position::After),
        })
        .unwrap();
        let items: Vec<_> = doc
            .element_children(node(&doc, "list"))
            .iter()
            .map(|c| doc.element(*c).unwrap().attr("id").unwrap().to_owned())
            .collect();
        assert_eq!(items, ["first", "second", "first-copy"]);
        doc.apply(&PageEdit::DuplicateElement {
            element: id(&doc, "signup"),
            target: None,
            position: None,
        })
        .unwrap();
        assert!(doc.serialize().contains(r#"id="signup-copy-2""#));
        editor_ids_are_unique(&doc);
    }

    const PAINT: &str = r##"<!DOCTYPE html><html><head><title>t</title></head><body><main>
<div id="art"><svg><defs><linearGradient id="g"></linearGradient><clipPath id="c"></clipPath></defs>
<rect id="r" fill="url( #g )" stroke='url( "#g" )' clip-path="URL('#c')" style="fill:url( '#g' ) ;stroke: url(#elsewhere)" title="url(#g)"></rect>
<use href=" #r"></use></svg></div>
<div id="sheet"><svg><style>#g2 { stop-color: red }</style><linearGradient id="g2"></linearGradient></svg></div>
<div id="escaped"><svg><linearGradient id="g3"></linearGradient><rect style="fill: url(\23 g3)"></rect></svg></div>
<div id="unclosed"><svg><linearGradient id="g4"></linearGradient><rect fill="url(#g4"></rect></svg></div>
</main></body></html>"##;

    fn duplicate(doc: &mut Document, html_id: &str) -> Result<(), EditError> {
        doc.apply(&PageEdit::DuplicateElement {
            element: id(doc, html_id),
            target: None,
            position: None,
        })
    }

    #[test]
    fn inserted_table_cells_and_navigation_links_are_editable() {
        let mut doc = page(FIXTURE);
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "hero-target"),
            position: Position::Inside,
            kind: InsertKind::Table,
            like: None,
        })
        .unwrap();
        let cell = first(&doc, "td");
        doc.apply(&PageEdit::SetText {
            element: cell,
            html: "Updated cell".to_owned(),
        })
        .unwrap();
        doc.apply(&PageEdit::InsertElement {
            element: id(&doc, "hero-target"),
            position: Position::Inside,
            kind: InsertKind::Navigation,
            like: None,
        })
        .unwrap();
        let mut published = Document::parse(&doc.serialize());
        published.strip_editor_markup();
        let html = published.serialize();
        assert!(html.contains("Updated cell"));
        assert!(html.contains("scope=\"col\""));
        assert!(html.contains("aria-label=\"Navigation\""));
        assert!(!html.contains("data-ph-"));
        editor_ids_are_unique(&doc);
    }

    #[test]
    fn duplicated_paint_references_follow_the_copy_after_the_original_is_gone() {
        let mut doc = page(PAINT);
        duplicate(&mut doc, "art").unwrap();
        let original = doc.element(node(&doc, "r")).unwrap().clone();
        assert_eq!(
            original.attr("fill"),
            Some("url( #g )"),
            "original untouched"
        );
        doc.apply(&PageEdit::RemoveElement {
            element: id(&doc, "art"),
        })
        .unwrap();
        editor_ids_are_unique(&doc);

        let rect = doc.element(node(&doc, "r-copy")).unwrap();
        assert_eq!(rect.attr("fill"), Some("url( #g-copy )"));
        assert_eq!(rect.attr("stroke"), Some(r##"url( "#g-copy" )"##));
        assert_eq!(rect.attr("clip-path"), Some("URL('#c-copy')"));
        assert_eq!(
            rect.attr("style"),
            Some("fill:url( '#g-copy' ) ;stroke: url(#elsewhere)")
        );
        assert_eq!(rect.attr("title"), Some("url(#g)"), "plain text stays text");
        let html = doc.serialize();
        assert!(html.contains(r##"href="#r-copy""##), "{html}");
        for target in ["g-copy", "c-copy", "r-copy"] {
            node(&doc, target);
        }
        let gone = |html_id: &str| {
            !doc.html.tree.root().descendants().any(|n| {
                n.value()
                    .as_element()
                    .is_some_and(|e| e.attr("id") == Some(html_id))
            })
        };
        assert!(gone("g") && gone("art"), "the original is removed");
    }

    #[test]
    fn duplicates_with_css_the_editor_cannot_follow_are_refused_whole() {
        let mut doc = page(PAINT);
        let before = doc.serialize();
        for (html_id, reason) in [
            ("sheet", "style sheet"),
            ("escaped", "references"),
            ("unclosed", "references"),
        ] {
            let refused = duplicate(&mut doc, html_id).unwrap_err().to_string();
            assert!(refused.contains(reason), "{html_id}: {refused}");
            assert_eq!(doc.serialize(), before, "{html_id} changed the page");
        }
    }

    #[test]
    fn percent_encoded_links_follow_the_copy_after_the_original_is_gone() {
        let mut doc = page(
            r##"<!DOCTYPE html><html><head><title>t</title></head><body><main>
<div id="art"><svg><path id="shape" d="M0 0h9v9z"></path><use href="#%73hape"></use></svg></div>
</main></body></html>"##,
        );
        duplicate(&mut doc, "art").unwrap();
        doc.apply(&PageEdit::RemoveElement {
            element: id(&doc, "art"),
        })
        .unwrap();
        let html = doc.serialize();
        assert!(html.contains(r##"<use href="#shape-copy""##), "{html}");
        node(&doc, "shape-copy");
    }

    #[test]
    fn copies_whose_ids_page_styles_or_animations_name_are_refused_whole() {
        let body = r##"<main>
<div id="art"><svg><rect id="shape"></rect></svg></div>
<div id="timed"><svg><rect id="mover"><animate begin="mover.click+0.5s" dur="1s"></animate></rect></svg></div>
<div id="paced"><svg><rect><animate begin="0.5s; click" end="indefinite" dur="1s"></animate></rect></svg></div>
<div id="dotted"><svg><rect id="shape.dot"><animate begin="shape.dot.click" dur="1s"></animate></rect></svg></div>
<div id="addressed"><svg><path id="spot"></path><use href="index.html#%73pot"></use></svg></div>
<div id="painted"><svg><linearGradient id="g"></linearGradient><rect fill="url( 'index.html#g' )"></rect></svg></div>
<div id="outward"><svg><path id="local"></path><use href="other.html#elsewhere"></use><rect fill="url(index.html#far)"></rect></svg></div>
<div class="card"><p>No ids</p></div></main></body></html>"##;
        let with_head = |head: &str| {
            page(&format!(
                "<!DOCTYPE html><html><head><title>t</title>{head}</head><body>{body}"
            ))
        };
        for (head, html_id, reason) in [
            ("", "timed", "animation timing"),
            ("", "dotted", "animation timing"),
            ("", "addressed", "page address"),
            ("", "painted", "references"),
            (
                "<style>#art { padding: 1em }</style>",
                "art",
                "styles this part by its id",
            ),
            (
                "<style>svg #SHAPE { fill: red }</style>",
                "art",
                "styles this part by its id",
            ),
            (
                "<style>[ id^=sh ] { fill: red }</style>",
                "art",
                "styles this part by its id",
            ),
            (
                "<style>@import 'more.css';</style>",
                "art",
                "styles this part by its id",
            ),
            (
                "<style>#\\61rt { padding: 1em }</style>",
                "art",
                "styles this part by its id",
            ),
            (
                r#"<link rel="Preload StyleSheet" href="site.css">"#,
                "art",
                "styling that can't be checked safely",
            ),
        ] {
            let mut doc = with_head(head);
            let before = doc.serialize();
            let refused = duplicate(&mut doc, html_id).unwrap_err().to_string();
            assert!(refused.contains(reason), "{head} {html_id}: {refused}");
            assert_eq!(doc.serialize(), before, "{head} {html_id} changed the page");
        }

        let mut doc = with_head("<style>.card { color: #fafafa; } #artwork { fill: red }</style>");
        duplicate(&mut doc, "art").unwrap();
        assert!(duplicate(&mut doc, "paced").is_err());
        duplicate(&mut doc, "outward").unwrap();
        let html = doc.serialize();
        assert_eq!(html.matches(r#"href="other.html#elsewhere""#).count(), 2);
        assert_eq!(html.matches(r#"fill="url(index.html#far)""#).count(), 2);
        let mut doc = with_head(r#"<link rel="stylesheet" href="site.css">"#);
        let card = first(&doc, "p");
        let card = doc.parent_of(doc.resolve(&card).unwrap()).unwrap();
        doc.apply(&PageEdit::DuplicateElement {
            element: editor_id(&doc, card),
            target: None,
            position: None,
        })
        .unwrap();
        assert_eq!(doc.serialize().matches("No ids").count(), 2);
    }

    #[test]
    fn svg_animation_value_dependencies_are_refused_without_changing_the_page() {
        for animation in [
            "<set attributeName=fill to='url(#g)' begin='0s'/>",
            "<animate attributeName=fill values='url(#g);red' dur='1s'/>",
            "<animateTransform attributeName=transform type=rotate from=0 to=90 dur='1s'/>",
            "<animateMotion path='M0,0 L10,10' dur='1s'/>",
        ] {
            let mut doc = page(&format!("<!doctype html><html><body><div id=art><svg><defs><linearGradient id=g></linearGradient></defs><rect>{animation}</rect></svg></div></body></html>"));
            let before = doc.serialize();
            assert!(duplicate(&mut doc, "art")
                .unwrap_err()
                .to_string()
                .contains("SVG animation"));
            assert_eq!(doc.serialize(), before);
        }
    }

    #[test]
    fn repeated_stylesheets_are_scanned_once_and_base_urls_are_refused() {
        let links = "<link rel=stylesheet href=site.css>".repeat(1024);
        let html = format!(
            "<!doctype html><html><head>{links}</head><body><div id=art>Copy</div></body></html>"
        );
        let mut doc = page(&html);
        let css = format!(
            "/*{}*/.card::after {{ content: \"\\2192\" }}",
            "x".repeat(1024 * 1024)
        );
        doc.set_copy_stylesheets(HashMap::from([("site.css".to_owned(), css)]));
        duplicate(&mut doc, "art").unwrap();
        assert_eq!(doc.serialize().matches("id=\"art-copy\"").count(), 1);

        let html = "<!doctype html><html><head><base href=/theme/><link rel=stylesheet href=site.css></head><body><div id=art>Copy</div></body></html>";
        let mut doc = page(html);
        doc.set_copy_stylesheets(HashMap::from([(
            "site.css".to_owned(),
            ".card { color: red }".to_owned(),
        )]));
        let before = doc.serialize();
        assert!(duplicate(&mut doc, "art")
            .unwrap_err()
            .to_string()
            .contains("can't be checked safely"));
        assert_eq!(doc.serialize(), before);
    }

    #[test]
    fn copy_stylesheet_validation_has_a_cumulative_budget() {
        let html = "<!doctype html><html><head><link rel=stylesheet href=a.css><link rel=stylesheet href=b.css></head><body><div id=art>Copy</div></body></html>";
        let mut doc = page(html);
        doc.set_copy_stylesheets(HashMap::from([
            ("a.css".to_owned(), " ".repeat(4 * 1024 * 1024)),
            ("b.css".to_owned(), " ".repeat(4 * 1024 * 1024 + 1)),
        ]));
        let before = doc.serialize();
        assert!(duplicate(&mut doc, "art")
            .unwrap_err()
            .to_string()
            .contains("can't be checked safely"));
        assert_eq!(doc.serialize(), before);
    }

    #[test]
    fn the_fixture_card_with_class_only_styles_duplicates() {
        let mut doc = page(FIXTURE);
        duplicate(&mut doc, "card-a").unwrap();
        let cards: Vec<_> = doc
            .element_children(node(&doc, "card-grid"))
            .iter()
            .map(|c| doc.element(*c).unwrap().attr("id").unwrap().to_owned())
            .collect();
        assert_eq!(cards, ["card-a", "card-a-copy", "card-b", "card-c"]);
    }

    #[test]
    fn wrapping_unwrapping_removing_and_naming() {
        let mut doc = page(FIXTURE);
        let original = doc.serialize();
        doc.apply(&PageEdit::WrapElement {
            element: id(&doc, "card-a"),
        })
        .unwrap();
        let wrapper = doc.parent_of(node(&doc, "card-a")).unwrap();
        assert_eq!(doc.name(wrapper), "div");
        assert_eq!(parent_html_id(&doc, "card-a"), "");
        doc.apply(&PageEdit::UnwrapElement {
            element: editor_id(&doc, wrapper),
        })
        .unwrap();
        assert_eq!(
            doc.serialize(),
            original,
            "unwrapping the new wrapper restores the page"
        );
        let span = doc
            .html
            .tree
            .root()
            .descendants()
            .find(|n| n.value().as_element().is_some_and(|e| e.name() == "h1"))
            .unwrap()
            .id();
        doc.apply(&PageEdit::WrapElement {
            element: editor_id(&doc, span),
        })
        .unwrap();
        doc.apply(&PageEdit::UnwrapElement {
            element: id(&doc, "hero-copy"),
        })
        .unwrap();
        assert_eq!(
            doc.parent_of(node(&doc, "hero-button"))
                .map(|p| doc.name(p).to_owned())
                .as_deref(),
            Some("section")
        );

        doc.apply(&PageEdit::RenameElement {
            element: id(&doc, "card-b"),
            name: "  Second\ncard ".to_owned(),
        })
        .unwrap();
        assert_eq!(
            doc.element(node(&doc, "card-b")).unwrap().attr(NAME_ATTR),
            Some("Second card")
        );
        doc.apply(&PageEdit::RemoveElement {
            element: id(&doc, "card-c"),
        })
        .unwrap();
        assert!(!doc.serialize().contains("Card C"));
        let mut published = Document::parse(&doc.serialize());
        published.strip_editor_markup();
        assert!(
            !published.serialize().contains("data-ph-"),
            "{}",
            published.serialize()
        );
        let mut reimported = page(&doc.serialize());
        reimported.assign_ids();
        assert!(!reimported.serialize().contains(NAME_ATTR));
        doc.apply(&PageEdit::RenameElement {
            element: id(&doc, "card-b"),
            name: String::new(),
        })
        .unwrap();
        assert!(!doc.serialize().contains(NAME_ATTR));
    }

    #[test]
    fn capabilities_say_what_may_move_and_what_takes_children() {
        let doc = page(FLEX_NAV);
        for movable in [
            "one", "text", "word", "first", "home", "signup", "email", "faq", "foot",
        ] {
            assert!(can(&doc, movable).movable, "{movable}");
        }
        for fixed in ["main", "row", "cell", "question"] {
            assert!(!can(&doc, fixed).movable, "{fixed}");
        }
        assert!(!doc.capabilities(&first(&doc, "body")).unwrap().movable);
        assert!(doc.capabilities(&first(&doc, "body")).unwrap().container);
        for container in ["one", "text", "list", "home", "cell", "foot"] {
            assert!(can(&doc, container).container, "{container}");
        }
        for closed in ["email", "row", "g"] {
            assert!(!can(&doc, closed).container, "{closed}");
        }
        assert!(can(&doc, "first").duplicate && !can(&doc, "coded").duplicate);
        assert_eq!(
            Capabilities {
                movable: true,
                container: true,
                ..Default::default()
            }
            .encode(),
            "mn"
        );
    }
}
