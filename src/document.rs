//! One HTML page of a draft, with stable element ids and the edits a user can make to it.
//!
//! Every element inside `<body>` carries `data-ph-id`. Edits name an element by that id, so an
//! edit can only change the element it names. Publishing removes the ids again.

use std::collections::{BTreeMap, HashMap, HashSet};

use ego_tree::NodeId;
use html5ever::{ns, Attribute, LocalName, QualName};
use scraper::{node::Element, node::Text, Html, Node};
use serde::{Deserialize, Serialize};

pub const ID_ATTR: &str = "data-ph-id";
pub const CAN_ATTR: &str = "data-ph-can";
pub const HIDDEN_ATTR: &str = "data-ph-hidden";

#[derive(Debug, Clone, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(try_from = "String", into = "String")]
pub struct ElementId(String);

impl ElementId {
    fn from_number(mut n: u64) -> Self {
        const DIGITS: &[u8] = b"0123456789abcdefghijklmnopqrstuvwxyz";
        let mut out = Vec::new();
        loop {
            out.push(DIGITS[(n % 36) as usize]);
            n /= 36;
            if n == 0 {
                break;
            }
        }
        out.reverse();
        Self(String::from_utf8(out).expect("ascii"))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

impl TryFrom<String> for ElementId {
    type Error = String;

    fn try_from(value: String) -> Result<Self, Self::Error> {
        if (1..=10).contains(&value.len())
            && value
                .bytes()
                .all(|b| b.is_ascii_digit() || b.is_ascii_lowercase())
        {
            Ok(Self(value))
        } else {
            Err("invalid element id".to_owned())
        }
    }
}

impl From<ElementId> for String {
    fn from(value: ElementId) -> Self {
        value.0
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum StyleProperty {
    Color,
    BackgroundColor,
    FontSize,
    FontWeight,
    TextAlign,
    PaddingTop,
    PaddingBottom,
    PaddingLeft,
    PaddingRight,
    MarginTop,
    MarginBottom,
}

impl StyleProperty {
    pub fn css_name(self) -> &'static str {
        match self {
            Self::Color => "color",
            Self::BackgroundColor => "background-color",
            Self::FontSize => "font-size",
            Self::FontWeight => "font-weight",
            Self::TextAlign => "text-align",
            Self::PaddingTop => "padding-top",
            Self::PaddingBottom => "padding-bottom",
            Self::PaddingLeft => "padding-left",
            Self::PaddingRight => "padding-right",
            Self::MarginTop => "margin-top",
            Self::MarginBottom => "margin-bottom",
        }
    }

    fn accepts(self, value: &str) -> bool {
        match self {
            Self::Color | Self::BackgroundColor => is_hex_color(value),
            Self::FontSize => is_length(value, 4.0, 160.0, false),
            Self::FontWeight => matches!(
                value,
                "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900"
            ),
            Self::TextAlign => matches!(value, "left" | "center" | "right" | "justify"),
            Self::PaddingTop
            | Self::PaddingBottom
            | Self::PaddingLeft
            | Self::PaddingRight
            | Self::MarginTop
            | Self::MarginBottom => is_length(value, 0.0, 400.0, true),
        }
    }
}

fn is_hex_color(value: &str) -> bool {
    value.strip_prefix('#').is_some_and(|hex| {
        matches!(hex.len(), 3 | 4 | 6 | 8) && hex.bytes().all(|b| b.is_ascii_hexdigit())
    })
}

/// `12px`, `1.5rem`, `2em`, `10%`. `px` values are bounded by `min..=max`, relative units by a tenth of it.
fn is_length(value: &str, min: f64, max: f64, allow_zero: bool) -> bool {
    if allow_zero && value == "0" {
        return true;
    }
    let Some(split) = value.find(|c: char| c.is_ascii_alphabetic() || c == '%') else {
        return false;
    };
    let (number, unit) = value.split_at(split);
    if number.is_empty()
        || number.len() > 7
        || !number.bytes().all(|b| b.is_ascii_digit() || b == b'.')
    {
        return false;
    }
    let Ok(n) = number.parse::<f64>() else {
        return false;
    };
    match unit {
        "px" => n >= min && n <= max,
        "rem" | "em" => n >= min / 16.0 && n <= max / 10.0,
        "%" => n >= 0.0 && n <= 400.0,
        _ => false,
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Direction {
    Up,
    Down,
}

/// An edit to one page, as sent by the editor.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "op", rename_all = "snake_case", deny_unknown_fields)]
pub enum PageEdit {
    SetText {
        element: ElementId,
        html: String,
    },
    SetImage {
        element: ElementId,
        src: String,
        alt: String,
    },
    SetAlt {
        element: ElementId,
        alt: String,
    },
    SetLink {
        element: ElementId,
        href: String,
        new_tab: bool,
    },
    SetStyle {
        element: ElementId,
        styles: BTreeMap<StyleProperty, Option<String>>,
    },
    HideSection {
        element: ElementId,
        hidden: bool,
    },
    DuplicateSection {
        element: ElementId,
    },
    MoveSection {
        element: ElementId,
        direction: Direction,
    },
    RemoveSection {
        element: ElementId,
    },
    SetPageMeta {
        title: String,
        description: String,
    },
}

impl PageEdit {
    pub fn kind(&self) -> &'static str {
        match self {
            Self::SetText { .. } => "set_text",
            Self::SetImage { .. } => "set_image",
            Self::SetAlt { .. } => "set_alt",
            Self::SetLink { .. } => "set_link",
            Self::SetStyle { .. } => "set_style",
            Self::HideSection { .. } => "hide_section",
            Self::DuplicateSection { .. } => "duplicate_section",
            Self::MoveSection { .. } => "move_section",
            Self::RemoveSection { .. } => "remove_section",
            Self::SetPageMeta { .. } => "set_page_meta",
        }
    }

    pub fn element(&self) -> Option<&ElementId> {
        match self {
            Self::SetText { element, .. }
            | Self::SetImage { element, .. }
            | Self::SetAlt { element, .. }
            | Self::SetLink { element, .. }
            | Self::SetStyle { element, .. }
            | Self::HideSection { element, .. }
            | Self::DuplicateSection { element }
            | Self::MoveSection { element, .. }
            | Self::RemoveSection { element } => Some(element),
            Self::SetPageMeta { .. } => None,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, thiserror::Error)]
pub enum EditError {
    #[error(
        "That part of the page no longer exists. Reload the editor to see the latest version."
    )]
    NotFound,
    #[error("{0}")]
    NotAllowed(&'static str),
    #[error("{0}")]
    Invalid(&'static str),
}

/// What the editor may do with an element. Computed from the stored page, never from the browser.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Capabilities {
    pub text: bool,
    pub image: bool,
    pub link: bool,
    pub style: bool,
    pub section: bool,
    pub move_up: bool,
    pub move_down: bool,
    pub duplicate: bool,
}

impl Capabilities {
    fn encode(self) -> String {
        [
            (self.text, 't'),
            (self.image, 'i'),
            (self.link, 'l'),
            (self.style, 's'),
            (self.section, 'x'),
            (self.move_up, 'u'),
            (self.move_down, 'd'),
            (self.duplicate, 'c'),
        ]
        .iter()
        .filter_map(|(on, c)| on.then_some(*c))
        .collect()
    }
}

/// Phrasing elements that may appear inside an editable text element and keep their attributes.
const PHRASING: &[&str] = &[
    "a", "abbr", "b", "bdi", "bdo", "br", "cite", "code", "data", "dfn", "em", "i", "kbd", "mark",
    "q", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var", "wbr",
];
/// Inline content kept exactly as it was during a text edit.
const OPAQUE_INLINE: &[&str] = &["svg", "img", "picture"];
/// Formatting the text editor may create.
const NEW_FORMATTING: &[&str] = &[
    "b", "strong", "i", "em", "u", "s", "br", "a", "span", "sub", "sup", "small", "mark", "code",
];
/// Elements whose text a user edits as one unit.
const TEXT_BLOCKS: &[&str] = &[
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "li",
    "a",
    "button",
    "span",
    "label",
    "blockquote",
    "figcaption",
    "td",
    "th",
    "dt",
    "dd",
    "small",
    "strong",
    "em",
    "b",
    "i",
    "q",
    "cite",
    "summary",
    "legend",
    "caption",
    "div",
    "address",
    "time",
    "mark",
    "sub",
    "sup",
];
/// Elements never edited, along with everything inside them.
const SEALED: &[&str] = &[
    "script", "style", "template", "noscript", "textarea", "select", "option", "iframe", "object",
    "embed", "canvas", "math",
];
const NOT_SECTIONS: &[&str] = &[
    "script", "style", "template", "noscript", "link", "meta", "main", "br",
];

pub struct Document {
    html: Html,
}

fn qual(name: &str) -> QualName {
    QualName::new(None, ns!(), LocalName::from(name))
}

fn html_qual(name: &str) -> QualName {
    QualName::new(None, ns!(html), LocalName::from(name))
}

fn set_attr(element: &mut Element, name: &str, value: &str) {
    element.attrs.insert(qual(name), value.into());
}

fn remove_attr(element: &mut Element, name: &str) {
    element.attrs.shift_remove(&qual(name));
}

fn new_element(name: &str, attrs: &[(&str, &str)]) -> Node {
    Node::Element(Element::new(
        html_qual(name),
        attrs
            .iter()
            .map(|(k, v)| Attribute {
                name: qual(k),
                value: (*v).into(),
            })
            .collect(),
    ))
}

impl Document {
    pub fn parse(source: &str) -> Self {
        Self {
            html: Html::parse_document(source),
        }
    }

    pub fn serialize(&self) -> String {
        self.html.html()
    }

    /// Prepares an imported page: removes ids someone else wrote and gives every body element one.
    pub fn assign_ids(&mut self) {
        let all: Vec<NodeId> = self
            .html
            .tree
            .nodes()
            .filter(|n| n.value().is_element())
            .map(|n| n.id())
            .collect();
        for id in &all {
            self.with_element(*id, |element| {
                let foreign: Vec<QualName> = element
                    .attrs
                    .keys()
                    .filter(|name| name.local.starts_with("data-ph-"))
                    .cloned()
                    .collect();
                for name in foreign {
                    element.attrs.shift_remove(&name);
                }
            });
        }
        let mut next = 1;
        if let Some(body) = self.body() {
            let ids: Vec<NodeId> = self
                .html
                .tree
                .get(body)
                .expect("body")
                .descendants()
                .filter(|n| n.value().is_element())
                .map(|n| n.id())
                .collect();
            for id in ids {
                self.set_element_id(id, &ElementId::from_number(next));
                next += 1;
            }
        }
    }

    /// The published form: no editor ids, hidden sections left out.
    pub fn strip_editor_markup(&mut self) {
        let hidden: Vec<NodeId> = self
            .html
            .tree
            .nodes()
            .filter(|n| {
                n.value()
                    .as_element()
                    .is_some_and(|e| e.attr(HIDDEN_ATTR).is_some())
            })
            .map(|n| n.id())
            .collect();
        for id in hidden {
            if let Some(mut node) = self.html.tree.get_mut(id) {
                node.detach();
            }
        }
        let ids: Vec<NodeId> = self
            .html
            .tree
            .nodes()
            .filter(|n| n.value().is_element())
            .map(|n| n.id())
            .collect();
        for id in ids {
            self.with_element(id, |element| {
                remove_attr(element, ID_ATTR);
                remove_attr(element, CAN_ATTR);
            });
        }
    }

    /// The form served to the editor preview: every element says what may be done with it.
    pub fn annotate_for_editor(&mut self, agent_src: &str) {
        let ids: Vec<NodeId> = self
            .html
            .tree
            .nodes()
            .filter(|n| {
                n.value()
                    .as_element()
                    .is_some_and(|e| e.attr(ID_ATTR).is_some())
            })
            .map(|n| n.id())
            .collect();
        for id in ids {
            let can = self.capabilities_of(id).encode();
            self.with_element(id, |element| set_attr(element, CAN_ATTR, &can));
        }
        if let Some(head) = self.head() {
            let script = self
                .html
                .tree
                .orphan(new_element(
                    "script",
                    &[("type", "module"), ("src", agent_src), ("data-pagehaven", "agent")],
                ))
                .id();
            self.html
                .tree
                .get_mut(head)
                .expect("head")
                .prepend_id(script);
        }
    }

    fn element(&self, id: NodeId) -> Option<&Element> {
        self.html.tree.get(id).and_then(|n| n.value().as_element())
    }

    fn with_element<R>(&mut self, id: NodeId, f: impl FnOnce(&mut Element) -> R) -> Option<R> {
        let mut node = self.html.tree.get_mut(id)?;
        match node.value() {
            Node::Element(element) => Some(f(element)),
            _ => None,
        }
    }

    fn name(&self, id: NodeId) -> &str {
        self.element(id).map_or("", |e| e.name())
    }

    fn set_element_id(&mut self, id: NodeId, value: &ElementId) {
        self.with_element(id, |element| set_attr(element, ID_ATTR, value.as_str()));
    }

    fn find_child(&self, parent: NodeId, name: &str) -> Option<NodeId> {
        self.html
            .tree
            .get(parent)?
            .children()
            .find(|c| c.value().as_element().is_some_and(|e| e.name() == name))
            .map(|c| c.id())
    }

    fn html_element(&self) -> Option<NodeId> {
        self.find_child(self.html.tree.root().id(), "html")
    }

    fn head(&self) -> Option<NodeId> {
        self.find_child(self.html_element()?, "head")
    }

    fn body(&self) -> Option<NodeId> {
        self.find_child(self.html_element()?, "body")
    }

    fn find(&self, id: &ElementId) -> Option<NodeId> {
        self.html
            .tree
            .nodes()
            .find(|n| {
                n.value()
                    .as_element()
                    .is_some_and(|e| e.attr(ID_ATTR) == Some(id.as_str()))
            })
            .map(|n| n.id())
    }

    fn next_number(&self) -> u64 {
        self.html
            .tree
            .nodes()
            .filter_map(|n| {
                n.value()
                    .as_element()?
                    .attr(ID_ATTR)
                    .map(|v| u64::from_str_radix(v, 36).unwrap_or(0))
            })
            .max()
            .unwrap_or(0)
            + 1
    }

    fn ancestors(&self, id: NodeId) -> Vec<NodeId> {
        self.html
            .tree
            .get(id)
            .map(|n| n.ancestors().map(|a| a.id()).collect())
            .unwrap_or_default()
    }

    fn is_sealed(&self, id: NodeId) -> bool {
        std::iter::once(id).chain(self.ancestors(id)).any(|a| {
            let name = self.name(a);
            SEALED.contains(&name) || name == "head" || (name == "svg" && a != id)
        })
    }

    fn element_children(&self, id: NodeId) -> Vec<NodeId> {
        self.html
            .tree
            .get(id)
            .map(|n| {
                n.children()
                    .filter(|c| c.value().is_element())
                    .map(|c| c.id())
                    .collect()
            })
            .unwrap_or_default()
    }

    fn has_text(&self, id: NodeId) -> bool {
        self.html.tree.get(id).is_some_and(|n| {
            n.descendants().any(|d| match d.value() {
                Node::Text(text) => {
                    !text.trim().is_empty()
                        && !d.ancestors().any(|a| {
                            a.value()
                                .as_element()
                                .is_some_and(|e| OPAQUE_INLINE.contains(&e.name()))
                        })
                }
                _ => false,
            })
        })
    }

    /// Text editing needs content made only of phrasing elements, so no block is lost.
    fn is_text_editable(&self, id: NodeId) -> bool {
        let Some(node) = self.html.tree.get(id) else {
            return false;
        };
        if !TEXT_BLOCKS.contains(&self.name(id)) || !self.has_text(id) {
            return false;
        }
        let mut stack: Vec<_> = node.children().collect();
        while let Some(child) = stack.pop() {
            match child.value() {
                Node::Element(e) if OPAQUE_INLINE.contains(&e.name()) => {}
                Node::Element(e) if PHRASING.contains(&e.name()) => stack.extend(child.children()),
                Node::Element(_) => return false,
                _ => {}
            }
        }
        true
    }

    fn is_section(&self, id: NodeId) -> bool {
        if NOT_SECTIONS.contains(&self.name(id))
            || self.element(id).is_none_or(|e| e.attr(ID_ATTR).is_none())
        {
            return false;
        }
        let Some(parent) = self
            .html
            .tree
            .get(id)
            .and_then(|n| n.parent())
            .map(|p| p.id())
        else {
            return false;
        };
        let parent_name = self.name(parent);
        if parent_name == "body" || parent_name == "main" {
            return true;
        }
        // A single wrapper around the whole page, such as `<div id="app">`, counts as the body.
        let Some(grand) = self
            .html
            .tree
            .get(parent)
            .and_then(|n| n.parent())
            .map(|p| p.id())
        else {
            return false;
        };
        (self.name(grand) == "body" || self.name(grand) == "main")
            && self
                .element_children(grand)
                .iter()
                .filter(|c| !NOT_SECTIONS.contains(&self.name(**c)) || self.name(**c) == "main")
                .count()
                == 1
    }

    fn contains_script(&self, id: NodeId) -> bool {
        self.html.tree.get(id).is_some_and(|n| {
            n.descendants()
                .any(|d| d.value().as_element().is_some_and(|e| e.name() == "script"))
        })
    }

    fn sibling_section(&self, id: NodeId, direction: Direction) -> Option<NodeId> {
        let node = self.html.tree.get(id)?;
        let mut sibling = match direction {
            Direction::Up => node.prev_sibling(),
            Direction::Down => node.next_sibling(),
        };
        while let Some(s) = sibling {
            if s.value().is_element() {
                return self.is_section(s.id()).then(|| s.id());
            }
            sibling = match direction {
                Direction::Up => s.prev_sibling(),
                Direction::Down => s.next_sibling(),
            };
        }
        None
    }

    fn capabilities_of(&self, id: NodeId) -> Capabilities {
        if self.is_sealed(id) || self.element(id).is_none_or(|e| e.attr(ID_ATTR).is_none()) {
            return Capabilities::default();
        }
        let name = self.name(id);
        let section = self.is_section(id);
        Capabilities {
            text: self.is_text_editable(id),
            image: name == "img",
            link: name == "a",
            style: !matches!(name, "body" | "br" | "wbr" | "source" | "track") && name != "svg",
            section,
            move_up: section && self.sibling_section(id, Direction::Up).is_some(),
            move_down: section && self.sibling_section(id, Direction::Down).is_some(),
            duplicate: section && !self.contains_script(id),
        }
    }

    pub fn capabilities(&self, element: &ElementId) -> Option<Capabilities> {
        self.find(element).map(|id| self.capabilities_of(id))
    }

    pub fn title(&self) -> Option<String> {
        let title = self.find_child(self.head()?, "title")?;
        let text: String = self
            .html
            .tree
            .get(title)?
            .descendants()
            .filter_map(|d| d.value().as_text().map(|t| t.to_string()))
            .collect();
        let text = text.trim().to_owned();
        (!text.is_empty()).then_some(text)
    }

    pub fn description(&self) -> Option<String> {
        let head = self.head()?;
        self.html.tree.get(head)?.children().find_map(|c| {
            let e = c.value().as_element()?;
            (e.name() == "meta"
                && e.attr("name")
                    .is_some_and(|n| n.eq_ignore_ascii_case("description")))
            .then(|| e.attr("content").unwrap_or("").to_owned())
        })
    }

    /// The image that best represents the page: `og:image`, else the first `<img>` in the body.
    pub fn representative_image(&self) -> Option<String> {
        let og = self.head().and_then(|head| {
            self.html.tree.get(head)?.children().find_map(|c| {
                let e = c.value().as_element()?;
                (e.name() == "meta" && e.attr("property") == Some("og:image"))
                    .then(|| e.attr("content").map(str::to_owned))
                    .flatten()
            })
        });
        og.or_else(|| {
            let body = self.body()?;
            self.html.tree.get(body)?.descendants().find_map(|d| {
                let e = d.value().as_element()?;
                (e.name() == "img")
                    .then(|| e.attr("src").map(str::to_owned))
                    .flatten()
            })
        })
    }

    /// Rewrites every `href` for which `rewrite` returns a new value. Returns whether anything changed.
    pub fn rewrite_hrefs(&mut self, rewrite: impl Fn(&str) -> Option<String>) -> bool {
        let targets: Vec<(NodeId, String)> = self
            .html
            .tree
            .nodes()
            .filter_map(|n| {
                let e = n.value().as_element()?;
                (e.name() == "a")
                    .then(|| e.attr("href").and_then(&rewrite).map(|v| (n.id(), v)))
                    .flatten()
            })
            .collect();
        let changed = !targets.is_empty();
        for (id, value) in targets {
            self.with_element(id, |element| set_attr(element, "href", &value));
        }
        changed
    }

    pub fn apply(&mut self, edit: &PageEdit) -> Result<(), EditError> {
        if let PageEdit::SetPageMeta { title, description } = edit {
            return self.set_meta(title, description);
        }
        let element = edit.element().expect("element edits name an element");
        let id = self.find(element).ok_or(EditError::NotFound)?;
        let can = self.capabilities_of(id);
        match edit {
            PageEdit::SetText { html, .. } => {
                if !can.text {
                    return Err(EditError::NotAllowed(
                        "This part of the page can't be edited as text.",
                    ));
                }
                self.set_text(id, html)
            }
            PageEdit::SetImage { src, alt, .. } => {
                if !can.image {
                    return Err(EditError::NotAllowed("Only images can be replaced."));
                }
                self.set_image(id, src, alt)
            }
            PageEdit::SetAlt { alt, .. } => {
                if !can.image {
                    return Err(EditError::NotAllowed("Only images have a description."));
                }
                let alt = clean_line(alt, 300)?;
                self.with_element(id, |element| set_attr(element, "alt", &alt));
                Ok(())
            }
            PageEdit::SetLink { href, new_tab, .. } => {
                if !can.link {
                    return Err(EditError::NotAllowed(
                        "Only links and buttons have a destination.",
                    ));
                }
                let href = safe_href(href).ok_or(EditError::Invalid(
                    "Use a web address (https://…), an email (mailto:…), a phone number (tel:…) or a page of this website.",
                ))?;
                self.with_element(id, |element| {
                    set_attr(element, "href", &href);
                    if *new_tab {
                        set_attr(element, "target", "_blank");
                        set_attr(element, "rel", "noopener noreferrer");
                    } else if element.attr("target") == Some("_blank") {
                        remove_attr(element, "target");
                    }
                });
                Ok(())
            }
            PageEdit::SetStyle { styles, .. } => {
                if !can.style {
                    return Err(EditError::NotAllowed(
                        "This part of the page can't be styled.",
                    ));
                }
                for (property, value) in styles {
                    if let Some(value) = value {
                        if !property.accepts(value) {
                            return Err(EditError::Invalid("That style value isn't supported."));
                        }
                    }
                }
                self.with_element(id, |element| {
                    let style = merge_style(element.attr("style").unwrap_or(""), styles);
                    if style.is_empty() {
                        remove_attr(element, "style");
                    } else {
                        set_attr(element, "style", &style);
                    }
                });
                Ok(())
            }
            PageEdit::HideSection { hidden, .. } => {
                if !can.section {
                    return Err(EditError::NotAllowed("Only whole sections can be hidden."));
                }
                self.with_element(id, |element| {
                    if *hidden {
                        set_attr(element, HIDDEN_ATTR, "true");
                    } else {
                        remove_attr(element, HIDDEN_ATTR);
                    }
                });
                Ok(())
            }
            PageEdit::DuplicateSection { .. } => {
                if !can.duplicate {
                    return Err(EditError::NotAllowed(
                        "This section contains code, so it can't be duplicated safely.",
                    ));
                }
                self.duplicate(id);
                Ok(())
            }
            PageEdit::MoveSection { direction, .. } => {
                let sibling = can
                    .section
                    .then(|| self.sibling_section(id, *direction))
                    .flatten()
                    .ok_or(EditError::NotAllowed(
                        "This section can't move further in that direction.",
                    ))?;
                let mut node = self.html.tree.get_mut(sibling).expect("sibling");
                match direction {
                    Direction::Up => node.insert_id_before(id),
                    Direction::Down => node.insert_id_after(id),
                };
                Ok(())
            }
            PageEdit::RemoveSection { .. } => {
                if !can.section {
                    return Err(EditError::NotAllowed("Only whole sections can be removed."));
                }
                self.html.tree.get_mut(id).expect("element").detach();
                Ok(())
            }
            PageEdit::SetPageMeta { .. } => unreachable!("handled above"),
        }
    }

    fn set_meta(&mut self, title: &str, description: &str) -> Result<(), EditError> {
        let title = clean_line(title, 200)?;
        let description = clean_line(description, 500)?;
        let head = self
            .head()
            .ok_or(EditError::Invalid("This page has no head section."))?;
        let title_id = match self.find_child(head, "title") {
            Some(id) => id,
            None => {
                let id = self.html.tree.orphan(new_element("title", &[])).id();
                self.html.tree.get_mut(head).expect("head").append_id(id);
                id
            }
        };
        let children: Vec<NodeId> = self
            .html
            .tree
            .get(title_id)
            .expect("title")
            .children()
            .map(|c| c.id())
            .collect();
        for child in children {
            self.html.tree.get_mut(child).expect("child").detach();
        }
        self.html
            .tree
            .get_mut(title_id)
            .expect("title")
            .append(Node::Text(Text {
                text: title.as_str().into(),
            }));
        let meta = self
            .html
            .tree
            .get(head)
            .expect("head")
            .children()
            .find_map(|c| {
                let e = c.value().as_element()?;
                (e.name() == "meta"
                    && e.attr("name")
                        .is_some_and(|n| n.eq_ignore_ascii_case("description")))
                .then(|| c.id())
            });
        match (meta, description.is_empty()) {
            (Some(id), false) => {
                self.with_element(id, |element| set_attr(element, "content", &description));
            }
            (Some(id), true) => self.html.tree.get_mut(id).expect("meta").detach(),
            (None, false) => {
                let id = self
                    .html
                    .tree
                    .orphan(new_element(
                        "meta",
                        &[("name", "description"), ("content", &description)],
                    ))
                    .id();
                self.html
                    .tree
                    .get_mut(title_id)
                    .expect("title")
                    .insert_id_after(id);
            }
            (None, true) => {}
        }
        Ok(())
    }

    fn set_image(&mut self, id: NodeId, src: &str, alt: &str) -> Result<(), EditError> {
        let alt = clean_line(alt, 300)?;
        self.with_element(id, |element| {
            set_attr(element, "src", src);
            set_attr(element, "alt", &alt);
            remove_attr(element, "srcset");
            remove_attr(element, "sizes");
        });
        // Inside <picture>, a <source> would keep showing the old image.
        let parent = self
            .html
            .tree
            .get(id)
            .and_then(|n| n.parent())
            .map(|p| p.id());
        if let Some(parent) = parent.filter(|p| self.name(*p) == "picture") {
            let sources: Vec<NodeId> = self
                .element_children(parent)
                .into_iter()
                .filter(|c| self.name(*c) == "source")
                .collect();
            for source in sources {
                self.html.tree.get_mut(source).expect("source").detach();
            }
        }
        Ok(())
    }

    fn duplicate(&mut self, id: NodeId) {
        let mut next = self.next_number();
        let copy = self.clone_subtree(id, &mut next);
        self.html
            .tree
            .get_mut(id)
            .expect("section")
            .insert_id_after(copy);
    }

    /// Copies a subtree with fresh editor ids and without HTML `id`s, which must stay unique.
    fn clone_subtree(&mut self, id: NodeId, next: &mut u64) -> NodeId {
        let mut value = self.html.tree.get(id).expect("node").value().clone();
        if let Node::Element(element) = &mut value {
            let mut attrs: Vec<Attribute> = element
                .attrs
                .iter()
                .filter(|(name, _)| !matches!(&*name.local, "id" | ID_ATTR | CAN_ATTR))
                .map(|(name, value)| Attribute {
                    name: name.clone(),
                    value: value.clone(),
                })
                .collect();
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
            let child_copy = self.clone_subtree(child, next);
            self.html
                .tree
                .get_mut(copy)
                .expect("copy")
                .append_id(child_copy);
        }
        copy
    }

    /// Replaces the content of a text element with sanitized markup from the editor.
    fn set_text(&mut self, id: NodeId, markup: &str) -> Result<(), EditError> {
        if markup.len() > 64 * 1024 {
            return Err(EditError::Invalid("That text is too long."));
        }
        let existing: HashMap<String, NodeId> = self
            .html
            .tree
            .get(id)
            .expect("element")
            .descendants()
            .skip(1)
            .filter_map(|d| Some((d.value().as_element()?.attr(ID_ATTR)?.to_owned(), d.id())))
            .collect();
        let fragment = Html::parse_fragment(markup);
        let root = fragment
            .tree
            .root()
            .children()
            .find(|c| c.value().as_element().is_some_and(|e| e.name() == "html"));
        let mut used = HashSet::new();
        let plan = match root {
            Some(root) => plan_children(root, &existing, &mut used, self, 0)?,
            None => Vec::new(),
        };
        let old_children: Vec<NodeId> = self
            .html
            .tree
            .get(id)
            .expect("element")
            .children()
            .map(|c| c.id())
            .collect();
        for child in old_children {
            self.html.tree.get_mut(child).expect("child").detach();
        }
        let mut next = self.next_number();
        self.build(id, plan, &mut next);
        Ok(())
    }

    fn build(&mut self, parent: NodeId, plan: Vec<Plan>, next: &mut u64) {
        for item in plan {
            let child = match item {
                Plan::Text(text) => self
                    .html
                    .tree
                    .orphan(Node::Text(Text {
                        text: text.as_str().into(),
                    }))
                    .id(),
                Plan::Keep { node, children } => {
                    self.html.tree.get_mut(node).expect("kept").detach();
                    if let Some(children) = children {
                        let old: Vec<NodeId> = self
                            .html
                            .tree
                            .get(node)
                            .expect("kept")
                            .children()
                            .map(|c| c.id())
                            .collect();
                        for c in old {
                            self.html.tree.get_mut(c).expect("child").detach();
                        }
                        self.build(node, children, next);
                    }
                    node
                }
                Plan::New {
                    name,
                    attrs,
                    children,
                } => {
                    let mut all: Vec<(&str, &str)> = attrs
                        .iter()
                        .map(|(k, v)| (k.as_str(), v.as_str()))
                        .collect();
                    let number = ElementId::from_number(*next);
                    *next += 1;
                    all.push((ID_ATTR, number.as_str()));
                    let node = self.html.tree.orphan(new_element(&name, &all)).id();
                    self.build(node, children, next);
                    node
                }
            };
            self.html
                .tree
                .get_mut(parent)
                .expect("parent")
                .append_id(child);
        }
    }
}

enum Plan {
    Text(String),
    /// An element that already existed. `None` keeps its original children too.
    Keep {
        node: NodeId,
        children: Option<Vec<Plan>>,
    },
    New {
        name: String,
        attrs: Vec<(String, String)>,
        children: Vec<Plan>,
    },
}

fn plan_children(
    parent: ego_tree::NodeRef<'_, Node>,
    existing: &HashMap<String, NodeId>,
    used: &mut HashSet<String>,
    doc: &Document,
    depth: usize,
) -> Result<Vec<Plan>, EditError> {
    if depth > 32 {
        return Err(EditError::Invalid("That text has too much formatting."));
    }
    let mut plan = Vec::new();
    for child in parent.children() {
        match child.value() {
            Node::Text(text) => plan.push(Plan::Text(text.to_string())),
            Node::Element(element) => {
                let name = element.name();
                if SEALED.contains(&name) {
                    continue;
                }
                let known = element
                    .attr(ID_ATTR)
                    .and_then(|v| existing.get(v).map(|n| (v, *n)))
                    .filter(|(v, n)| !used.contains(*v) && doc.name(*n) == name);
                if let Some((value, node)) = known {
                    used.insert(value.to_owned());
                    if OPAQUE_INLINE.contains(&name) {
                        plan.push(Plan::Keep {
                            node,
                            children: None,
                        });
                    } else {
                        plan.push(Plan::Keep {
                            node,
                            children: Some(plan_children(child, existing, used, doc, depth + 1)?),
                        });
                    }
                } else if NEW_FORMATTING.contains(&name) {
                    let mut attrs = Vec::new();
                    if name == "a" {
                        let href =
                            element
                                .attr("href")
                                .and_then(safe_href)
                                .ok_or(EditError::Invalid(
                                    "A link in that text uses an address Pagehaven doesn't allow.",
                                ))?;
                        attrs.push(("href".to_owned(), href));
                        if element.attr("target") == Some("_blank") {
                            attrs.push(("target".to_owned(), "_blank".to_owned()));
                            attrs.push(("rel".to_owned(), "noopener noreferrer".to_owned()));
                        }
                    }
                    let children = if name == "br" {
                        Vec::new()
                    } else {
                        plan_children(child, existing, used, doc, depth + 1)?
                    };
                    plan.push(Plan::New {
                        name: name.to_owned(),
                        attrs,
                        children,
                    });
                } else {
                    // Blocks a browser inserts on Enter become line breaks. Anything else is unwrapped.
                    if matches!(name, "div" | "p") && !plan.is_empty() {
                        plan.push(Plan::New {
                            name: "br".to_owned(),
                            attrs: Vec::new(),
                            children: Vec::new(),
                        });
                    }
                    plan.extend(plan_children(child, existing, used, doc, depth + 1)?);
                }
            }
            _ => {}
        }
    }
    Ok(plan)
}

fn clean_line(value: &str, max: usize) -> Result<String, EditError> {
    let value: String = value
        .chars()
        .map(|c| if c.is_control() { ' ' } else { c })
        .collect();
    let value = value.trim().to_owned();
    if value.chars().count() > max {
        return Err(EditError::Invalid("That text is too long."));
    }
    Ok(value)
}

/// Accepts web, email and phone links, fragments and paths within the site.
pub fn safe_href(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > 2048
        || value
            .chars()
            .any(|c| c.is_control() || c.is_whitespace() && c != ' ')
    {
        return None;
    }
    let scheme_end = value.find(':');
    let first_delimiter = value.find(['/', '?', '#']);
    let has_scheme = match (scheme_end, first_delimiter) {
        (Some(colon), Some(delimiter)) => colon < delimiter,
        (Some(_), None) => true,
        _ => false,
    };
    if has_scheme {
        let scheme = value[..scheme_end.expect("has scheme")].to_ascii_lowercase();
        if !matches!(scheme.as_str(), "http" | "https" | "mailto" | "tel") {
            return None;
        }
        if matches!(scheme.as_str(), "http" | "https")
            && !value[scheme.len() + 1..].starts_with("//")
        {
            return None;
        }
    }
    if value.starts_with("\\\\") || value.starts_with("/\\") {
        return None;
    }
    Some(value.replace(' ', "%20"))
}

/// Splits `a: b; c: url(x;y)` into declarations, respecting parentheses and quotes.
fn split_declarations(style: &str) -> Vec<&str> {
    let mut out = Vec::new();
    let (mut depth, mut quote, mut start) = (0i32, None, 0);
    for (i, c) in style.char_indices() {
        match (quote, c) {
            (Some(q), c) if c == q => quote = None,
            (Some(_), _) => {}
            (None, '"' | '\'') => quote = Some(c),
            (None, '(') => depth += 1,
            (None, ')') => depth -= 1,
            (None, ';') if depth <= 0 => {
                out.push(&style[start..i]);
                start = i + 1;
            }
            _ => {}
        }
    }
    out.push(&style[start..]);
    out.into_iter().filter(|d| !d.trim().is_empty()).collect()
}

/// Sets or removes only the properties the user changed and keeps every other declaration as written.
fn merge_style(existing: &str, changes: &BTreeMap<StyleProperty, Option<String>>) -> String {
    let mut declarations: Vec<String> = split_declarations(existing)
        .into_iter()
        .filter(|d| {
            let name = d
                .split(':')
                .next()
                .unwrap_or("")
                .trim()
                .to_ascii_lowercase();
            !changes.keys().any(|p| p.css_name() == name)
        })
        .map(|d| d.trim().to_owned())
        .collect();
    for (property, value) in changes {
        if let Some(value) = value {
            declarations.push(format!("{}: {value}", property.css_name()));
        }
    }
    declarations.join("; ")
}

#[cfg(test)]
mod tests {
    use super::*;

    const PAGE: &str = r##"<!DOCTYPE html><html lang="en"><head><title>Harbor</title></head><body>
<header><nav><a href="/">Home</a><a href="menu.html">Menu</a></nav></header>
<main>
<section class="hero"><h1 class="display">Fresh bread, <span class="accent">every</span> morning</h1>
<p>Baked at <a href="about.html">our harbour shop</a> since 1998.</p>
<a class="button" href="#order">Order <svg viewBox="0 0 1 1"><path d="M0 0"></path></svg></a>
<picture><source srcset="hero.webp"><img src="hero.jpg" srcset="hero@2x.jpg 2x" width="1600" height="900" alt="Bread"></picture></section>
<section id="menu"><h2>Menu</h2><div class="grid"><div class="card"><h3>Sourdough</h3></div></div><script>window.x=1</script></section>
<section id="story" style="background: url(a;b.png); color: red"><h2>Our story</h2></section>
</main>
<footer><p>© Harbor</p></footer>
</body></html>"##;

    fn doc() -> Document {
        let mut doc = Document::parse(PAGE);
        doc.assign_ids();
        doc
    }

    fn first_of(doc: &Document, tag: &str) -> ElementId {
        let id = doc
            .html
            .tree
            .nodes()
            .find(|n| n.value().as_element().is_some_and(|e| e.name() == tag))
            .unwrap()
            .id();
        ElementId(doc.element(id).unwrap().attr(ID_ATTR).unwrap().to_owned())
    }

    fn element_by_tag_text(doc: &Document, tag: &str, text: &str) -> ElementId {
        let id = doc
            .html
            .tree
            .nodes()
            .find(|n| {
                n.value().as_element().is_some_and(|e| e.name() == tag)
                    && n.descendants()
                        .filter_map(|d| d.value().as_text())
                        .map(|t| t.to_string())
                        .collect::<String>()
                        .contains(text)
            })
            .unwrap()
            .id();
        ElementId(doc.element(id).unwrap().attr(ID_ATTR).unwrap().to_owned())
    }

    #[test]
    fn imported_ids_are_replaced_and_every_body_element_gets_one() {
        let mut doc = Document::parse(
            r#"<html><head><meta data-ph-id="9"></head><body><p data-ph-id="1" data-ph-can="t">a</p><p>b</p></body></html>"#,
        );
        doc.assign_ids();
        let html = doc.serialize();
        assert!(html.contains(r#"<meta>"#), "{html}");
        assert!(
            html.contains(r#"<body data-ph-id="1"><p data-ph-id="2">a</p><p data-ph-id="3">b</p>"#),
            "{html}"
        );
    }

    #[test]
    fn editing_a_headline_keeps_its_styled_parts_and_attributes() {
        let mut doc = doc();
        let h1 = element_by_tag_text(&doc, "h1", "Fresh bread");
        let span = element_by_tag_text(&doc, "span", "every");
        doc.apply(&PageEdit::SetText {
            element: h1.clone(),
            html: format!(
                r#"Warm loaves, <span data-ph-id="{}" class="evil" onclick="x()">each</span> day"#,
                span.as_str()
            ),
        })
        .unwrap();
        let html = doc.serialize();
        assert!(html.contains(&format!(r#"<h1 class="display" data-ph-id="{}">Warm loaves, <span class="accent" data-ph-id="{}">each</span> day</h1>"#, h1.as_str(), span.as_str())), "{html}");
        assert!(!html.contains("onclick"));
    }

    #[test]
    fn text_edits_cannot_inject_scripts_handlers_or_dangerous_links() {
        let mut doc = doc();
        let p = element_by_tag_text(&doc, "p", "Baked at");
        doc.apply(&PageEdit::SetText {
            element: p.clone(),
            html: r#"Hi <script>alert(1)</script><img src=x onerror=alert(1)><b onmouseover="x">bold</b><div>line</div>"#.to_owned(),
        })
        .unwrap();
        let html = doc.serialize();
        assert!(!html.contains("alert"), "{html}");
        assert!(!html.contains("onmouseover"), "{html}");
        assert!(html.contains("<b data-ph-id="), "{html}");
        let err = doc.apply(&PageEdit::SetText {
            element: p,
            html: r#"<a href="javascript:alert(1)">x</a>"#.to_owned(),
        });
        assert!(matches!(err, Err(EditError::Invalid(_))));
    }

    #[test]
    fn a_button_with_an_icon_keeps_the_icon_when_its_label_changes() {
        let mut doc = doc();
        let button = element_by_tag_text(&doc, "a", "Order");
        doc.apply(&PageEdit::SetText {
            element: button.clone(),
            html: "Visit us ".to_owned(),
        })
        .unwrap();
        // The icon was not sent back, so it is dropped: only what the editor sends survives.
        assert!(!doc.serialize().contains("<path"));
        let mut doc = self::doc();
        let svg_id = first_of(&doc, "svg");
        doc.apply(&PageEdit::SetText {
            element: button,
            html: format!(r#"Visit us <svg data-ph-id="{}"></svg>"#, svg_id.as_str()),
        })
        .unwrap();
        assert!(
            doc.serialize().contains(r#"<path d="M0 0""#),
            "{}",
            doc.serialize()
        );
    }

    #[test]
    fn blocks_and_sealed_elements_are_not_text_editable() {
        let mut doc = doc();
        let section = element_by_tag_text(&doc, "section", "Menu");
        assert!(!doc.capabilities(&section).unwrap().text);
        let err = doc.apply(&PageEdit::SetText {
            element: section,
            html: "gone".to_owned(),
        });
        assert!(matches!(err, Err(EditError::NotAllowed(_))));
    }

    #[test]
    fn replacing_an_image_keeps_its_size_and_drops_alternate_sources() {
        let mut doc = doc();
        let img = first_of(&doc, "img");
        doc.apply(&PageEdit::SetImage {
            element: img,
            src: "images/new.jpg".to_owned(),
            alt: "New loaf".to_owned(),
        })
        .unwrap();
        let html = doc.serialize();
        assert!(
            html.contains(r#"<img src="images/new.jpg" width="1600" height="900" alt="New loaf""#),
            "{html}"
        );
        assert!(!html.contains("srcset"), "{html}");
    }

    #[test]
    fn links_accept_web_mail_phone_and_site_paths_only() {
        for good in [
            "https://example.com/x",
            "mailto:hi@example.com",
            "tel:+15551234",
            "/menu.html",
            "menu.html#top",
            "#order",
            "//cdn.example.com",
        ] {
            assert!(safe_href(good).is_some(), "{good}");
        }
        for bad in [
            "javascript:alert(1)",
            " JaVaScRiPt:alert(1)",
            "java\tscript:alert(1)",
            "data:text/html,x",
            "vbscript:x",
            "file:///etc/passwd",
            "http:evil",
            "\\\\evil",
        ] {
            assert!(safe_href(bad).is_none(), "{bad}");
        }
        let mut doc = doc();
        let a = element_by_tag_text(&doc, "a", "Order");
        doc.apply(&PageEdit::SetLink {
            element: a.clone(),
            href: "https://order.example.com".to_owned(),
            new_tab: true,
        })
        .unwrap();
        assert!(
            doc.serialize()
                .contains(r#"href="https://order.example.com" data-ph-id="#)
                || doc
                    .serialize()
                    .contains(r#"href="https://order.example.com""#)
        );
        assert!(doc
            .serialize()
            .contains(r#"target="_blank" rel="noopener noreferrer""#));
        let h1 = element_by_tag_text(&doc, "h1", "Fresh");
        assert!(doc
            .apply(&PageEdit::SetLink {
                element: h1,
                href: "/".to_owned(),
                new_tab: false
            })
            .is_err());
    }

    #[test]
    fn style_edits_change_only_the_named_properties() {
        let mut doc = doc();
        let story = element_by_tag_text(&doc, "section", "Our story");
        let mut styles = BTreeMap::new();
        styles.insert(StyleProperty::Color, Some("#1a2b3c".to_owned()));
        styles.insert(StyleProperty::PaddingTop, Some("48px".to_owned()));
        doc.apply(&PageEdit::SetStyle {
            element: story.clone(),
            styles,
        })
        .unwrap();
        assert!(
            doc.serialize()
                .contains(r#"style="background: url(a;b.png); color: #1a2b3c; padding-top: 48px""#),
            "{}",
            doc.serialize()
        );
        let mut bad = BTreeMap::new();
        bad.insert(
            StyleProperty::Color,
            Some("red; background: url(javascript:x)".to_owned()),
        );
        assert!(doc
            .apply(&PageEdit::SetStyle {
                element: story,
                styles: bad
            })
            .is_err());
    }

    #[test]
    fn sections_move_duplicate_hide_and_publish_without_editor_markup() {
        let mut doc = doc();
        let story = element_by_tag_text(&doc, "section", "Our story");
        let hero = element_by_tag_text(&doc, "section", "Fresh bread");
        let menu = element_by_tag_text(&doc, "section", "Menu");
        assert!(
            !doc.capabilities(&menu).unwrap().duplicate,
            "a section with a script is not duplicated"
        );
        assert!(!doc.capabilities(&hero).unwrap().move_up);
        doc.apply(&PageEdit::MoveSection {
            element: story.clone(),
            direction: Direction::Up,
        })
        .unwrap();
        let html = doc.serialize();
        assert!(
            html.find("Our story").unwrap()
                < html
                    .find("<h2")
                    .unwrap_or(usize::MAX)
                    .max(html.find("Menu</h2>").unwrap())
        );
        doc.apply(&PageEdit::DuplicateSection {
            element: story.clone(),
        })
        .unwrap();
        assert_eq!(doc.serialize().matches("Our story").count(), 2);
        assert_eq!(
            doc.serialize().matches(r#"id="story""#).count(),
            1,
            "HTML ids stay unique"
        );
        doc.apply(&PageEdit::HideSection {
            element: hero,
            hidden: true,
        })
        .unwrap();
        let mut published = Document::parse(&doc.serialize());
        published.strip_editor_markup();
        let out = published.serialize();
        assert!(!out.contains("data-ph-"), "{out}");
        assert!(!out.contains("Fresh bread"), "hidden sections are left out");
        assert_eq!(out.matches("Our story").count(), 2);
    }

    #[test]
    fn edits_to_a_missing_element_fail_without_changing_the_page() {
        let mut doc = doc();
        let before = doc.serialize();
        let err = doc.apply(&PageEdit::SetText {
            element: ElementId("zzzz".to_owned()),
            html: "x".to_owned(),
        });
        assert_eq!(err, Err(EditError::NotFound));
        assert_eq!(doc.serialize(), before);
    }

    #[test]
    fn page_title_and_description_can_be_set() {
        let mut doc = doc();
        doc.apply(&PageEdit::SetPageMeta {
            title: "Harbor Bakery".to_owned(),
            description: "Bread & coffee".to_owned(),
        })
        .unwrap();
        assert_eq!(doc.title().as_deref(), Some("Harbor Bakery"));
        assert_eq!(doc.description().as_deref(), Some("Bread & coffee"));
    }

    #[test]
    fn the_preview_marks_what_can_be_edited_and_loads_the_agent_first() {
        let mut doc = doc();
        doc.annotate_for_editor("/__pagehaven/agent.js");
        let html = doc.serialize();
        assert!(
            html.contains(
                r#"<head><script type="module" src="/__pagehaven/agent.js" data-pagehaven="agent"></script>"#
            ),
            "{html}"
        );
        assert!(
            html.contains(r#"data-ph-can="ts""#) || html.contains(r#"data-ph-can="t"#),
            "{html}"
        );
    }
}
