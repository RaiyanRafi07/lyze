// Learn view and renderer-agnostic 2D walkthrough layout.
// Contract: `layout_scene` maps (diagram kind, layout JSON, frame state) to
// flat canvas-coordinate shapes with no iced types, so golden tests run headless.
// Unsupported states are shown verbatim via `UNSUPPORTED_NOTE`, never synthesized.
// Gotcha: below `NARROW_WIDTH` (700px) the split view stacks and transport wraps.
use crate::{paint, Message};
use iced::alignment::{Horizontal, Vertical};
use iced::widget::{
    button, column, container, progress_bar, row, scrollable, slider, text, Column,
};
use iced::{Color, Element, Fill, Length};
use leetlab_learning::{Frame, Language, Walkthrough};

/// Narrow-layout threshold in logical pixels. Below this width the Learn
/// split view stacks code over stage and the transport wraps to a second
/// row with a full-width scrub (web R4 `max-width: 600px` transport rule,
/// lifted to cover the whole stacked layout).
pub const NARROW_WIDTH: f32 = 700.0;

/// Pure width predicate so the breakpoint is unit-testable without a window.
pub fn is_narrow_width(width: f32) -> bool {
    width < NARROW_WIDTH
}

/// Honest unsupported states for the native Learn view. Shown verbatim in
/// the view footer; nothing here is synthesized.
pub const UNSUPPORTED_NOTE: &str = "Custom input, 3D overview, AI scenes, hover-linked highlights and comparison sparklines are unavailable in this native build. The frames above are the captured reference run.";

// ---------------------------------------------------------------------------
// Renderer-agnostic 2D layout model
// ---------------------------------------------------------------------------
//
// `layout_scene` maps (diagram kind, layout JSON, frame state) to a flat
// list of shapes in canvas coordinates. The model owns no iced types, so
// every golden-position/count test below runs headless. `scene_element`
// renders rects as bordered boxes grouped into rows; the rest render as
// labeled rows.

const PAD: f32 = 12.0;
const CELL_W: f32 = 52.0;
const CELL_H: f32 = 40.0;
const GAP: f32 = 8.0;
const CHAR_W: f32 = 40.0;
const BIT_W: f32 = 28.0;
const BIT_H: f32 = 34.0;
const BIT_GAP: f32 = 4.0;
const GRID_W: f32 = 46.0;
const GRID_H: f32 = 38.0;
const GRID_GAP: f32 = 6.0;
const NODE_R: f32 = 22.0;
const NODE_GAP: f32 = 30.0;
const LIST_W: f32 = 60.0;
const LIST_GAP: f32 = 30.0;
const IVL_W: f32 = 96.0;
const IVL_H: f32 = 34.0;
const LABEL_SIZE: f32 = 13.0;
const NOTE_SIZE: f32 = 12.0;
const NOTE_STEP: f32 = 18.0;

/// Concrete RGBA color in the layout model. Fixed theme-independent roles
/// (paper cells, ink labels, danger highlight borders) so golden tests can
/// pin colors without a theme; the canvas program uses them verbatim.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ShapeColor {
    pub r: f32,
    pub g: f32,
    pub b: f32,
    pub a: f32,
}

impl ShapeColor {
    pub const INK: Self = Self { r: 0.067, g: 0.067, b: 0.067, a: 1.0 };
    pub const PAPER: Self = Self { r: 0.968, g: 0.949, b: 0.905, a: 1.0 };
    pub const DANGER: Self = Self { r: 0.753, g: 0.02, b: 0.067, a: 1.0 };
    pub const MUTED: Self = Self { r: 0.42, g: 0.447, b: 0.502, a: 1.0 };

    fn iced(self) -> Color {
        Color { r: self.r, g: self.g, b: self.b, a: self.a }
    }
}

/// One 2D primitive in canvas coordinates. `Rect`/`Circle` carry a centered
/// label (drawn by the canvas program in a contrasting tone); free-standing
/// captions are `Text`.
#[derive(Debug, Clone, PartialEq)]
pub enum Shape {
    Rect {
        x: f32,
        y: f32,
        w: f32,
        h: f32,
        fill: ShapeColor,
        border: ShapeColor,
        border_width: f32,
        label: String,
        label_size: f32,
        active: bool,
    },
    Circle {
        cx: f32,
        cy: f32,
        r: f32,
        fill: ShapeColor,
        border: ShapeColor,
        border_width: f32,
        label: String,
        label_size: f32,
        active: bool,
    },
    Line {
        x1: f32,
        y1: f32,
        x2: f32,
        y2: f32,
        width: f32,
        color: ShapeColor,
    },
    Text {
        x: f32,
        y: f32,
        size: f32,
        content: String,
        color: ShapeColor,
        strong: bool,
    },
}

/// The full 2D scene for one frame: fixed logical size plus shapes.
/// `fallback` carries the honest empty-state note (rendered as canvas text
/// by the program); it is `None` for fully populated scenes.
#[derive(Debug, Clone, PartialEq)]
pub struct Scene {
    pub width: f32,
    pub height: f32,
    pub shapes: Vec<Shape>,
    pub fallback: Option<String>,
}

impl Scene {
    fn sized(width: f32, height: f32) -> Self {
        Self { width, height, shapes: Vec::new(), fallback: None }
    }

    fn with_fallback(message: impl Into<String>, width: f32, height: f32) -> Self {
        Self { width, height, shapes: Vec::new(), fallback: Some(message.into()) }
    }

    #[cfg(test)]
    pub fn rect_count(&self) -> usize {
        self.shapes.iter().filter(|shape| matches!(shape, Shape::Rect { .. })).count()
    }

    #[cfg(test)]
    pub fn circle_count(&self) -> usize {
        self.shapes.iter().filter(|shape| matches!(shape, Shape::Circle { .. })).count()
    }

    #[cfg(test)]
    pub fn line_count(&self) -> usize {
        self.shapes.iter().filter(|shape| matches!(shape, Shape::Line { .. })).count()
    }

    #[cfg(test)]
    pub fn text_count(&self) -> usize {
        self.shapes.iter().filter(|shape| matches!(shape, Shape::Text { .. })).count()
    }
}

/// Cell box with the shared highlight treatment: inactive cells are paper
/// with a 1px ink border; the active cell is ink-filled with a 2px danger
/// border (the canvas analogue of `paint::diagram_cell`).
fn cell_rect(x: f32, y: f32, w: f32, h: f32, label: String, active: bool) -> Shape {
    let (fill, border, border_width) = if active {
        (ShapeColor::INK, ShapeColor::DANGER, 2.0)
    } else {
        (ShapeColor::PAPER, ShapeColor::INK, 1.0)
    };
    Shape::Rect { x, y, w, h, fill, border, border_width, label, label_size: LABEL_SIZE, active }
}

/// Node disc with the same highlight treatment as [`cell_rect`].
fn node_circle(cx: f32, cy: f32, label: String, active: bool) -> Shape {
    let (fill, border, border_width) = if active {
        (ShapeColor::INK, ShapeColor::DANGER, 2.0)
    } else {
        (ShapeColor::PAPER, ShapeColor::INK, 1.5)
    };
    Shape::Circle {
        cx,
        cy,
        r: NODE_R,
        fill,
        border,
        border_width,
        label,
        label_size: LABEL_SIZE,
        active,
    }
}

fn note(x: f32, y: f32, content: String, strong: bool) -> Shape {
    Shape::Text { x, y, size: NOTE_SIZE, content, color: ShapeColor::INK, strong }
}

/// Pure layout entry point: deterministic 2D geometry for every diagram
/// kind. Missing or empty backing data yields an honest `fallback` scene
/// instead of invented geometry.
pub fn layout_scene(
    kind: &str,
    layout: &serde_json::Value,
    frame: &Frame,
) -> Scene {
    match kind {
        "array" => layout_array(layout, frame),
        "string" => layout_string(layout, frame),
        "grid" => layout_grid(layout, frame),
        "stack" => layout_stack(frame),
        "tree" => layout_nodes(kind, layout, frame),
        "graph" => layout_nodes(kind, layout, frame),
        "linked-list" => layout_linked_list(frame),
        "intervals" => layout_intervals(frame),
        "median-two-heaps" => layout_median_two_heaps(frame),
        "bits" => layout_bits(layout, frame),
        _ => Scene::with_fallback("Diagram renderer unavailable.", 320.0, 64.0),
    }
}

/// Append `vars` / `pointers` caption lines at `y`, returning the cursor
/// just past the last line.
fn push_notes(scene: &mut Scene, frame: &Frame, mut y: f32) -> f32 {
    if let Some(vars) = vars_summary(frame) {
        scene.shapes.push(note(PAD, y, vars, false));
        y += NOTE_STEP;
    }
    if let Some(pointers) = pointers_summary(frame) {
        scene.shapes.push(note(PAD, y, pointers, false));
        y += NOTE_STEP;
    }
    y
}

fn layout_array(layout: &serde_json::Value, frame: &Frame) -> Scene {
    let values: &[serde_json::Value] =
        layout.get("values").and_then(serde_json::Value::as_array).map(Vec::as_slice).unwrap_or(&[]);
    if values.is_empty() {
        let mut scene = Scene::with_fallback("Array is empty in this frame.", 320.0, 64.0);
        let bottom = push_notes(&mut scene, frame, PAD + NOTE_STEP);
        scene.height = (bottom + PAD).max(64.0);
        return scene;
    }
    let count = values.len();
    let width = PAD * 2.0 + count as f32 * CELL_W + (count.saturating_sub(1)) as f32 * GAP;
    let mut scene = Scene::sized(width, PAD * 2.0 + CELL_H);
    for (index, value) in values.iter().enumerate() {
        let x = PAD + index as f32 * (CELL_W + GAP);
        scene.shapes.push(cell_rect(
            x,
            PAD,
            CELL_W,
            CELL_H,
            str_val(value),
            highlighted(frame, &index.to_string()),
        ));
    }
    let bottom = push_notes(&mut scene, frame, PAD + CELL_H + 10.0);
    scene.height = bottom + PAD;
    scene
}

fn layout_string(layout: &serde_json::Value, frame: &Frame) -> Scene {
    let chars: &[serde_json::Value] = frame
        .state
        .get("chars")
        .and_then(serde_json::Value::as_array)
        .or_else(|| layout.get("chars").and_then(serde_json::Value::as_array))
        .map(Vec::as_slice)
        .unwrap_or(&[]);
    if chars.is_empty() {
        let mut scene = Scene::with_fallback("String unavailable.", 320.0, 64.0);
        let bottom = push_notes(&mut scene, frame, PAD + NOTE_STEP);
        scene.height = (bottom + PAD).max(64.0);
        return scene;
    }
    let count = chars.len();
    let width = PAD * 2.0 + count as f32 * CHAR_W + (count.saturating_sub(1)) as f32 * GAP;
    let mut scene = Scene::sized(width, PAD * 2.0 + CELL_H);
    for (index, item) in chars.iter().enumerate() {
        let x = PAD + index as f32 * (CHAR_W + GAP);
        scene.shapes.push(cell_rect(
            x,
            PAD,
            CHAR_W,
            CELL_H,
            str_val(item),
            highlighted(frame, &index.to_string()),
        ));
    }
    let bottom = push_notes(&mut scene, frame, PAD + CELL_H + 10.0);
    scene.height = bottom + PAD;
    scene
}

fn layout_grid(layout: &serde_json::Value, frame: &Frame) -> Scene {
    let rows: &[serde_json::Value] =
        layout.get("cells").and_then(serde_json::Value::as_array).map(Vec::as_slice).unwrap_or(&[]);
    if rows.is_empty() {
        return Scene::with_fallback("Grid unavailable.", 320.0, 64.0);
    }
    let columns = rows
        .iter()
        .filter_map(serde_json::Value::as_array)
        .map(Vec::len)
        .max()
        .unwrap_or(0);
    if columns == 0 {
        return Scene::with_fallback("Grid unavailable.", 320.0, 64.0);
    }
    let current = &frame.state["current"];
    let width =
        PAD * 2.0 + columns as f32 * GRID_W + (columns.saturating_sub(1)) as f32 * GRID_GAP;
    let height = PAD * 2.0 + rows.len() as f32 * GRID_H + (rows.len().saturating_sub(1)) as f32 * GRID_GAP;
    let mut scene = Scene::sized(width, height);
    for (y, row_values) in rows.iter().enumerate() {
        let cells: &[serde_json::Value] =
            row_values.as_array().map(Vec::as_slice).unwrap_or(&[]);
        for (x, value) in cells.iter().enumerate() {
            let key = format!("{y},{x}");
            let active = (current.get(0).and_then(serde_json::Value::as_u64) == Some(y as u64)
                && current.get(1).and_then(serde_json::Value::as_u64) == Some(x as u64))
                || highlighted(frame, &key);
            scene.shapes.push(cell_rect(
                PAD + x as f32 * (GRID_W + GRID_GAP),
                PAD + y as f32 * (GRID_H + GRID_GAP),
                GRID_W,
                GRID_H,
                str_val(value),
                active,
            ));
        }
    }
    let bottom = push_notes(&mut scene, frame, height + 10.0 - PAD);
    scene.height = bottom + PAD;
    scene
}

fn layout_stack(frame: &Frame) -> Scene {
    let items: Vec<serde_json::Value> =
        frame.state.get("items").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let minima: Vec<serde_json::Value> =
        frame.state.get("minima").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let depth = items.len().max(minima.len());
    if depth == 0 {
        let mut scene = Scene::with_fallback("Stack is empty in this frame.", 320.0, 64.0);
        if let Some(result) = frame.state.get("ret").filter(|value| !value.is_null()) {
            scene.shapes.push(note(PAD, PAD + NOTE_STEP, format!("returns {}", str_val(result)), true));
        }
        let bottom = push_notes(&mut scene, frame, PAD + NOTE_STEP * 2.0);
        scene.height = (bottom + PAD).max(64.0);
        return scene;
    }
    let left_x = PAD;
    let separator_x = PAD + CELL_W + 6.0;
    let right_x = PAD + CELL_W + 28.0;
    let width = right_x + CELL_W + PAD;
    let rows_top = PAD + 22.0;
    let mut scene = Scene::sized(width, rows_top + depth as f32 * (CELL_H + GAP));
    scene.shapes.push(note(left_x, PAD, "stack".into(), true));
    scene.shapes.push(note(right_x, PAD, "mins".into(), true));
    // Row 0 is the top of the stack so the visual order matches a stack
    // growing downward from its head.
    for row in 0..depth {
        let index = depth - 1 - row;
        let y = rows_top + row as f32 * (CELL_H + GAP);
        let left = items.get(index).map(str_val).unwrap_or_else(|| "·".into());
        let right = minima.get(index).map(str_val).unwrap_or_else(|| "·".into());
        scene.shapes.push(cell_rect(left_x, y, CELL_W, CELL_H, left, false));
        scene.shapes.push(Shape::Text {
            x: separator_x,
            y: y + 10.0,
            size: 14.0,
            content: "|".into(),
            color: ShapeColor::MUTED,
            strong: false,
        });
        scene.shapes.push(cell_rect(right_x, y, CELL_W, CELL_H, right, false));
    }
    let mut cursor = rows_top + depth as f32 * (CELL_H + GAP) + 10.0;
    if let Some(result) = frame.state.get("ret").filter(|value| !value.is_null()) {
        scene.shapes.push(note(PAD, cursor, format!("returns {}", str_val(result)), true));
        cursor += NOTE_STEP;
    }
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

/// Tree and graph scenes: the fixture carries no canvas positions, so nodes
/// are placed on a deterministic left-to-right, top-to-bottom grid
/// (`ceil(sqrt(n))` columns). Edges join node centers with plain segments;
/// directed graphs intentionally get no arrowheads rather than invented
/// glyph geometry.
fn layout_nodes(
    kind: &str,
    layout: &serde_json::Value,
    frame: &Frame,
) -> Scene {
    let nodes: Vec<serde_json::Value> = layout
        .get("nodes")
        .and_then(serde_json::Value::as_array)
        .cloned()
        .unwrap_or_default();
    if nodes.is_empty() {
        return Scene::with_fallback(
            format!("{kind} has no nodes in this frame."),
            320.0,
            64.0,
        );
    }
    let count = nodes.len();
    let columns = (count as f32).sqrt().ceil() as usize;
    let span = NODE_R * 2.0 + NODE_GAP;
    let width = PAD * 2.0 + columns as f32 * NODE_R * 2.0 + (columns.saturating_sub(1)) as f32 * NODE_GAP;
    let rows = count.div_ceil(columns);
    let grid_bottom = PAD + rows as f32 * NODE_R * 2.0 + (rows.saturating_sub(1)) as f32 * NODE_GAP;
    let mut scene = Scene::sized(width, grid_bottom + PAD);

    let id_of = |position: usize, node: &serde_json::Value| {
        node.get("id").and_then(serde_json::Value::as_u64).unwrap_or(position as u64)
    };
    let center = |position: usize| {
        (
            PAD + NODE_R + (position % columns) as f32 * span,
            PAD + NODE_R + (position / columns) as f32 * span,
        )
    };
    let current = frame.state.get("current").and_then(serde_json::Value::as_u64);
    let on_path = |id: u64| {
        frame
            .state
            .get("path")
            .and_then(serde_json::Value::as_array)
            .is_some_and(|path| path.iter().any(|entry| entry.as_u64() == Some(id)))
    };
    let visited = |id: u64| {
        frame
            .state
            .get("visited")
            .and_then(serde_json::Value::as_array)
            .is_some_and(|list| list.iter().any(|entry| entry.as_u64() == Some(id)))
    };
    let label_of = |id: u64| {
        nodes
            .iter()
            .find(|node| node.get("id").and_then(serde_json::Value::as_u64) == Some(id))
            .map(|node| {
                node.get("label")
                    .or_else(|| node.get("value"))
                    .map(str_val)
                    .unwrap_or_else(|| format!("#{id}"))
            })
            .unwrap_or_else(|| format!("#{id}"))
    };
    for (position, node) in nodes.iter().enumerate() {
        let id = id_of(position, node);
        let (cx, cy) = center(position);
        scene.shapes.push(node_circle(
            cx,
            cy,
            label_of(id),
            Some(id) == current || on_path(id) || visited(id),
        ));
    }
    let position_of = |id: u64| {
        nodes.iter().position(|node| node.get("id").and_then(serde_json::Value::as_u64) == Some(id))
    };
    let edges: Vec<(u64, u64)> = layout
        .get("edges")
        .and_then(serde_json::Value::as_array)
        .map(|list| {
            list.iter()
                .filter_map(|pair| {
                    let ends = pair.as_array()?;
                    Some((ends.first()?.as_u64()?, ends.get(1)?.as_u64()?))
                })
                .collect()
        })
        .unwrap_or_default();
    for (from, to) in &edges {
        if let (Some(a), Some(b)) = (position_of(*from), position_of(*to)) {
            let (x1, y1) = center(a);
            let (x2, y2) = center(b);
            scene.shapes.push(Shape::Line {
                x1,
                y1,
                x2,
                y2,
                width: 1.5,
                color: ShapeColor::INK,
            });
        }
    }
    let mut cursor = grid_bottom + 10.0;
    if let Some(result) = frame.state.get("result").filter(|mark| !mark.is_null()) {
        scene.shapes.push(note(PAD, cursor, format!("result {}", str_val(result)), true));
        cursor += NOTE_STEP;
    }
    if let Some(answer) = frame.state.get("answer") {
        scene.shapes.push(note(PAD, cursor, format!("answer {}", str_val(answer)), true));
        cursor += NOTE_STEP;
    }
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

fn layout_linked_list(frame: &Frame) -> Scene {
    let nodes: Vec<serde_json::Value> =
        frame.state.get("nodes").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    if nodes.is_empty() {
        let mut scene = Scene::with_fallback("Linked list is empty in this frame.", 320.0, 64.0);
        let bottom = push_notes(&mut scene, frame, PAD + NOTE_STEP);
        scene.height = (bottom + PAD).max(64.0);
        return scene;
    }
    let count = nodes.len();
    let width = PAD * 2.0 + count as f32 * LIST_W + (count.saturating_sub(1)) as f32 * LIST_GAP;
    let mut scene = Scene::sized(width, PAD * 2.0 + CELL_H);
    let current = frame.state.get("current").and_then(serde_json::Value::as_u64);
    for (position, node) in nodes.iter().enumerate() {
        let id = node
            .get("id")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or(position as u64);
        let active = Some(id) == current
            || frame
                .state
                .get("path")
                .and_then(serde_json::Value::as_array)
                .is_some_and(|path| path.iter().any(|entry| entry.as_u64() == Some(id)));
        let x = PAD + position as f32 * (LIST_W + LIST_GAP);
        scene.shapes.push(cell_rect(
            x,
            PAD,
            LIST_W,
            CELL_H,
            str_val(node.get("value").unwrap_or(&serde_json::Value::Null)),
            active,
        ));
        if position + 1 < count {
            scene.shapes.push(Shape::Text {
                x: x + LIST_W + 7.0,
                y: PAD + 9.0,
                size: 14.0,
                content: "→".into(),
                color: ShapeColor::INK,
                strong: false,
            });
        }
    }
    let cursor = PAD + CELL_H + 10.0;
    // Pointer captions come from the shared push_notes pass below
    // (pointers_summary), so the layout itself stays geometry-only.
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

fn layout_intervals(frame: &Frame) -> Scene {
    let merged: Vec<serde_json::Value> =
        frame.state.get("merged").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let sorted: Vec<serde_json::Value> =
        frame.state.get("sorted").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    if merged.is_empty() && sorted.is_empty() {
        return Scene::with_fallback("No intervals in this frame.", 320.0, 64.0);
    }
    let current = frame.state.get("current");
    let row_width = |items: &[serde_json::Value]| {
        if items.is_empty() {
            0.0
        } else {
            items.len() as f32 * IVL_W + (items.len().saturating_sub(1)) as f32 * GAP
        }
    };
    let width = PAD * 2.0 + row_width(&merged).max(row_width(&sorted));
    let mut scene = Scene::sized(width, PAD * 2.0);
    let mut cursor = PAD;
    let push_row = |scene: &mut Scene, cursor: &mut f32, header: &str, items: &[serde_json::Value]| {
        if items.is_empty() {
            return;
        }
        scene.shapes.push(note(PAD, *cursor, header.into(), true));
        *cursor += 20.0;
        for (index, item) in items.iter().enumerate() {
            scene.shapes.push(cell_rect(
                PAD + index as f32 * (IVL_W + GAP),
                *cursor,
                IVL_W,
                IVL_H,
                str_val(item),
                Some(item) == current,
            ));
        }
        *cursor += IVL_H + 10.0;
    };
    push_row(&mut scene, &mut cursor, "merged", &merged);
    push_row(&mut scene, &mut cursor, "sorted", &sorted);
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

fn layout_median_two_heaps(frame: &Frame) -> Scene {
    let low: Vec<serde_json::Value> =
        frame.state.get("lo").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let high: Vec<serde_json::Value> =
        frame.state.get("hi").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let median = frame.state.get("median").filter(|mark| !mark.is_null());
    if low.is_empty() && high.is_empty() && median.is_none() {
        return Scene::with_fallback("Both heaps are empty in this frame.", 320.0, 64.0);
    }
    let row_width = |items: &[serde_json::Value]| {
        if items.is_empty() {
            0.0
        } else {
            items.len() as f32 * CELL_W + (items.len().saturating_sub(1)) as f32 * GAP
        }
    };
    let width = PAD * 2.0 + row_width(&low).max(row_width(&high)).max(IVL_W);
    let mut scene = Scene::sized(width, PAD * 2.0);
    let mut cursor = PAD;
    let push_heap = |scene: &mut Scene, cursor: &mut f32, header: &str, items: &[serde_json::Value]| {
        scene.shapes.push(note(PAD, *cursor, header.into(), true));
        *cursor += 20.0;
        for (index, value) in items.iter().enumerate() {
            scene.shapes.push(cell_rect(
                PAD + index as f32 * (CELL_W + GAP),
                *cursor,
                CELL_W,
                CELL_H,
                str_val(value),
                false,
            ));
        }
        *cursor += CELL_H + 10.0;
    };
    push_heap(&mut scene, &mut cursor, "lo (max)", &low);
    push_heap(&mut scene, &mut cursor, "hi (min)", &high);
    if let Some(value) = median {
        scene.shapes.push(note(PAD, cursor, format!("median {}", str_val(value)), true));
        cursor += NOTE_STEP;
    }
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

fn layout_bits(layout: &serde_json::Value, frame: &Frame) -> Scene {
    let input: Vec<serde_json::Value> =
        layout.get("inBits").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    let output: Vec<serde_json::Value> =
        frame.state.get("outBits").and_then(serde_json::Value::as_array).cloned().unwrap_or_default();
    if input.is_empty() && output.is_empty() {
        return Scene::with_fallback("No bits in this frame.", 320.0, 64.0);
    }
    let row_width = |items: &[serde_json::Value]| {
        if items.is_empty() {
            0.0
        } else {
            items.len() as f32 * BIT_W + (items.len().saturating_sub(1)) as f32 * BIT_GAP
        }
    };
    let width = PAD * 2.0 + row_width(&input).max(row_width(&output));
    let mut scene = Scene::sized(width, PAD * 2.0);
    let mut cursor = PAD;
    let read = frame.state.get("readPos").and_then(serde_json::Value::as_u64);
    let written = frame.state.get("writePos").and_then(serde_json::Value::as_u64);
    let push_bits = |scene: &mut Scene,
                         cursor: &mut f32,
                         header: &str,
                         items: &[serde_json::Value],
                         hot: Option<u64>| {
        scene.shapes.push(note(PAD, *cursor, header.into(), true));
        *cursor += 20.0;
        for (index, bit) in items.iter().enumerate() {
            scene.shapes.push(cell_rect(
                PAD + index as f32 * (BIT_W + BIT_GAP),
                *cursor,
                BIT_W,
                BIT_H,
                str_val(bit),
                hot == Some(index as u64),
            ));
        }
        *cursor += BIT_H + 10.0;
    };
    push_bits(&mut scene, &mut cursor, "in", &input, read);
    push_bits(&mut scene, &mut cursor, "out", &output, written);
    if let Some(result) = frame.state.get("res") {
        scene.shapes.push(note(PAD, cursor, format!("res = {result}"), true));
        cursor += NOTE_STEP;
    }
    let bottom = push_notes(&mut scene, frame, cursor);
    scene.height = bottom + PAD;
    scene
}

// ---------------------------------------------------------------------------
// iced canvas program
// ---------------------------------------------------------------------------

/// Canvas program that draws a [`Scene`]. Stateless: every frame rebuilds
/// its geometry from the current scene, so stepping never shows stale art.
#[derive(Debug, Clone)]
#[cfg(test)]
pub struct SceneProgram {
    pub scene: Scene,
}

fn shape_cell(shape: &Shape) -> Element<'static, Message> {
    match shape {
        Shape::Rect { w, h, fill, border, border_width, label, label_size, .. } => {
            let fill = *fill;
            let border = *border;
            let border_width = *border_width;
            container(
                text(label.clone())
                    .size(*label_size)
                    .font(paint::mono())
                    .align_x(Horizontal::Center),
            )
            .width(Length::Fixed(*w))
            .height(Length::Fixed(*h))
            .align_x(Horizontal::Center)
            .align_y(Vertical::Center)
            .style(move |_: &crate::Theme| container::Style {
                background: Some(fill.iced().into()),
                border: iced::Border {
                    color: border.iced(),
                    width: border_width,
                    radius: 0.0.into(),
                    ..Default::default()
                },
                ..Default::default()
            })
            .into()
        }
        // Circles, lines, and free text have no box primitive: they render
        // as their label, so trees/graphs keep the honest node-list style
        // while the layout model still owns their geometry for tests.
        Shape::Circle { label, .. } => text(label.clone())
            .size(LABEL_SIZE)
            .font(paint::mono())
            .into(),
        Shape::Line { .. } => text("—")
            .size(LABEL_SIZE)
            .font(paint::mono())
            .into(),
        Shape::Text { content, size, strong, .. } => text(content.clone())
            .size(*size)
            .font(if *strong { paint::bold() } else { paint::regular() })
            .into(),
    }
}

fn scene_element<'a>(walkthrough: &'a Walkthrough, frame: &'a Frame) -> Element<'a, Message> {
    let scene = layout_scene(walkthrough.kind.as_str(), &walkthrough.layout, frame);
    if let Some(message) = scene.fallback.clone() {
        return column![text(message).size(13)].spacing(6).into();
    }
    // Bucket rects into visual rows by y (2px tolerance); every other
    // shape kind renders as a labeled row beneath. Row order follows y.
    let mut rows: Vec<(i32, Vec<&Shape>)> = Vec::new();
    let mut loose: Vec<&Shape> = Vec::new();
    for shape in &scene.shapes {
        match shape {
            Shape::Rect { y, .. } => {
                let key = (*y / 2.0).round() as i32;
                match rows.iter_mut().find(|(row_key, _)| *row_key == key) {
                    Some((_, bucket)) => bucket.push(shape),
                    None => rows.push((key, vec![shape])),
                }
            }
            _ => loose.push(shape),
        }
    }
    rows.sort_by_key(|(key, _)| *key);
    let mut out = Column::new().spacing(6);
    for (_, bucket) in rows {
        let mut row = row![].spacing(6);
        for shape in bucket {
            row = row.push(shape_cell(shape));
        }
        out = out.push(row);
    }
    for shape in loose {
        out = out.push(shape_cell(shape));
    }
    out.into()
}

pub fn view<'a>(
    walkthrough: &'a Walkthrough,
    index: usize,
    language: Language,
    explain_on: bool,
    narrow: bool,
    playing: bool,
    speed_label: &'a str,
) -> Element<'a, Message> {
    let total = walkthrough.frames.len();
    let frame_index = index.min(total.saturating_sub(1));
    let Some(frame) = walkthrough.frame(frame_index) else {
        return text("No frame available.").into();
    };
    let highlighted = walkthrough.highlighted_line(frame_index, language);
    let has_notes = walkthrough
        .code(language)
        .iter()
        .any(|line| line.explain.as_deref().is_some_and(|note| !note.is_empty()));
    // Code list: the frame's step keeps the same index highlight in every
    // language (web `.lc-line.on` contract: ink fill, orange line number).
    // Explain notes come from the captured per-line entries, never from a
    // step map (web `renderCode` contract).
    let show_notes = explain_on && has_notes;
    let mut lines = Column::new().spacing(2);
    for (line_index, line) in walkthrough.code(language).iter().enumerate() {
        let number = format!("{:>3}", line_index + 1);
        let row = row![
            text(number).font(paint::mono()).size(12),
            text(&line.text).font(paint::mono()).size(13),
        ]
        .spacing(10);
        let active = highlighted == Some(line_index);
        lines = lines.push(
            container(row)
                .width(Fill)
                .padding([4, 6])
                .style(move |theme| paint::reference_line(theme, active)),
        );
        if show_notes {
            if let Some(note) = line.explain.as_deref().filter(|note| !note.is_empty()) {
                lines = lines.push(
                    container(text(note).size(12))
                        .width(Fill)
                        .padding([2, 6])
                        .style(paint::surface),
                );
            }
        }
    }
    let languages = row![
        language_button("Java", Language::Java, language),
        language_button("C++", Language::Cpp, language),
        language_button("Pseudocode", Language::Pseudo, language),
    ]
    .spacing(3);
    let mut reference = column![paint::kicker("Reference solution"), languages].spacing(6);
    if has_notes {
        reference = reference.push(
            button(
                text(if explain_on {
                    "Explain: on"
                } else {
                    "Explain: off"
                })
                .size(14),
            )
            .padding([7, 9])
            .style(move |theme: &iced::Theme, status: button::Status| {
                paint::button_style(theme, status, explain_on)
            })
            .on_press(Message::Explain(!explain_on)),
        );
    } else {
        reference = reference.push(text("Line notes unavailable for this lesson.").size(12));
    }
    // Transport: Restart / Previous / Play-Pause toggle / Next / speed
    // cycler plus a full-width step scrub. Buttons use the 44px touch floor
    // from the R4 `max-width: 600px` transport rule; the scrub keeps keyboard
    // focus so arrow keys step without a pointer. The Play toggle and speed
    // cycler are always enabled here: this branch only runs when at least
    // one frame exists, and stepping/timing state lives in the app.
    let transport_button = |label: &'static str, message: Option<Message>| {
        button(text(label).size(14))
            .padding([11, 12])
            .style(|theme: &iced::Theme, status: button::Status| {
                paint::button_style(theme, status, false)
            })
            .on_press_maybe(message)
    };
    let controls = row![
        transport_button("Restart", (frame_index != 0).then_some(Message::Frame(0))),
        transport_button(
            "Previous step",
            frame_index.checked_sub(1).map(Message::Frame)
        ),
        button(text(if playing { "Pause" } else { "Play" }).size(14))
            .padding([11, 12])
            .style(move |theme: &iced::Theme, status: button::Status| {
                paint::button_style(theme, status, playing)
            })
            .on_press(Message::PlayToggle),
        transport_button(
            "Next step",
            (frame_index + 1 < total).then_some(Message::Frame(frame_index + 1))
        ),
        button(text(speed_label).size(14))
            .padding([11, 12])
            .style(|theme: &iced::Theme, status: button::Status| {
                paint::button_style(theme, status, false)
            })
            .on_press(Message::PlaySpeed),
    ]
    .spacing(6)
    .align_y(iced::Alignment::Center);
    let count = text(format!("Step {}/{}", frame_index + 1, total)).size(14);
    let scrub_max = total.saturating_sub(1).max(1) as f32;
    let scrub = slider(
        0.0..=scrub_max,
        (frame_index as f32).min(scrub_max),
        |value| Message::Frame(value.round() as usize),
    )
    .step(1.0)
    .width(Fill);
    let transport: Element<'_, Message> = if narrow {
        column![
            controls,
            row![scrub, count]
                .spacing(8)
                .align_y(iced::Alignment::Center),
        ]
        .spacing(6)
        .into()
    } else {
        row![controls, scrub, count]
            .spacing(6)
            .align_y(iced::Alignment::Center)
            .into()
    };
    let progress = progress_bar(
        0.0..=1.0,
        if total > 1 {
            frame_index as f32 / (total - 1) as f32
        } else {
            0.0
        },
    )
    .height(8)
    .style(|theme: &iced::Theme| progress_bar::Style {
        background: theme.palette().background.into(),
        bar: theme.palette().text.into(),
        border: iced::Border {
            color: theme.palette().text,
            width: 1.0,
            ..Default::default()
        },
    });
    let diagram = column![
        paint::step_badge(format!("STEP {}/{}", frame_index + 1, total)),
        text(&frame.label).size(19),
        text(&frame.note),
        scene_element(walkthrough, frame),
        progress,
    ]
    .spacing(10);
    // Split view: side-by-side code/stage when wide, stacked code-over-stage
    // when narrow. Both branches move the same panes; only one runs.
    let split: Element<'_, Message> = if narrow {
        column![
            column![reference, scrollable(lines).height(Fill)]
                .spacing(8)
                .width(Fill),
            scrollable(diagram).height(Fill).width(Fill),
        ]
        .spacing(14)
        .height(Fill)
        .into()
    } else {
        row![
            column![reference, scrollable(lines).height(Fill)]
                .spacing(8)
                .width(Length::FillPortion(3)),
            scrollable(diagram)
                .height(Fill)
                .width(Length::FillPortion(2)),
        ]
        .spacing(14)
        .height(Fill)
        .into()
    };
    column![
        text("Walkthrough").size(14),
        split,
        transport,
        text(UNSUPPORTED_NOTE).size(12),
    ]
    .spacing(8)
    .height(Fill)
    .into()
}

fn language_button(
    name: &str,
    language: Language,
    active: Language,
) -> iced::widget::Button<'_, Message> {
    paint::control(name, language == active).on_press(Message::ReferenceLanguage(language))
}

/// Compact scalar rendering: strings bare, arrays bracketed, null as middle dot.
fn str_val(value: &serde_json::Value) -> String {
    match value {
        serde_json::Value::Null => "·".into(),
        serde_json::Value::Bool(mark) => mark.to_string(),
        serde_json::Value::Number(number) => number.to_string(),
        serde_json::Value::String(text) => text.clone(),
        serde_json::Value::Array(items) => {
            format!(
                "[{}]",
                items.iter().map(str_val).collect::<Vec<_>>().join(",")
            )
        }
        serde_json::Value::Object(_) => "{…}".into(),
    }
}

/// A highlights entry marks a cell active; any non-null value counts.
fn highlighted(frame: &Frame, key: &str) -> bool {
    frame
        .state
        .get("highlights")
        .is_some_and(|marks| marks.get(key).is_some_and(|mark| !mark.is_null()))
}

/// One-line `k = v` summary of a vars object, if present.
fn vars_summary(frame: &Frame) -> Option<String> {
    let vars = frame.state.get("vars")?.as_object()?;
    if vars.is_empty() {
        return None;
    }
    Some(
        vars.iter()
            .map(|(key, value)| format!("{key} = {}", str_val(value)))
            .collect::<Vec<_>>()
            .join("   "),
    )
}

fn pointers_summary(frame: &Frame) -> Option<String> {
    let pointers = frame.state.get("pointers")?.as_object()?;
    if pointers.is_empty() {
        return None;
    }
    Some(
        pointers
            .iter()
            .map(|(name, value)| {
                format!(
                    "{name}={}",
                    value
                        .as_u64()
                        .map(|n| n.to_string())
                        .unwrap_or_else(|| str_val(value))
                )
            })
            .collect::<Vec<_>>()
            .join("   "),
    )
}

fn cell(label: String, active: bool) -> Element<'static, Message> {
    container(text(label).font(paint::mono()))
        .padding([7, 10])
        .style(move |theme| paint::diagram_cell(theme, active))
        .into()
}

/// Trace-in-Learn view: one `k = v` row per field of the trace event at
/// `index`, reusing the diagram `cell` renderer. Object events render one
/// cell per field; scalar/array events render a single cell; missing or
/// empty events render an honest fallback instead of panicking. Pure
/// construction, so it stays headless-testable like the scenes above.
pub fn trace_view(events: &[serde_json::Value], index: usize) -> Element<'_, Message> {
    let Some(event) = events.get(index) else {
        return text("No trace event at this step.").size(13).into();
    };
    match event.as_object() {
        Some(map) if !map.is_empty() => map
            .iter()
            .fold(Column::new().spacing(4), |list, (key, value)| {
                list.push(cell(format!("{key} = {}", str_val(value)), false))
            })
            .into(),
        Some(_) => text("Empty trace event.").size(13).into(),
        None => cell(str_val(event), false).into(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const FIXTURE: &[u8] = include_bytes!("../../../fixtures/catalog-extra.json");

    fn frame_with(state: serde_json::Value) -> Frame {
        Frame {
            step: "s".into(),
            label: "L".into(),
            note: "N".into(),
            state,
        }
    }

    fn layout(raw: serde_json::Value) -> serde_json::Value {
        raw
    }

    /// Every captured walkthrough must render every frame without panicking.
    /// Element construction is pure, so this exercises all ten diagram kinds.
    #[test]
    fn all_fixture_frames_render() {
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        let mut covered: std::collections::BTreeMap<&str, usize> = Default::default();
        for lesson in &catalog.lessons {
            let Some(walkthrough) = &lesson.walkthrough else {
                continue;
            };
            *covered.entry(walkthrough.kind.as_str()).or_default() += 1;
            for index in 0..walkthrough.frames.len() {
                for language in [Language::Java, Language::Cpp, Language::Pseudo] {
                    let _ = view(walkthrough, index, language, false, false, false, "Normal");
                }
            }
        }
        for kind in [
            "array",
            "string",
            "grid",
            "stack",
            "tree",
            "linked-list",
            "graph",
            "intervals",
            "median-two-heaps",
            "bits",
        ] {
            assert!(covered.contains_key(kind), "no walkthrough covers {kind}");
        }
    }

    #[test]
    fn trace_view_renders_every_event_shape_without_a_window() {
        let events = vec![
            serde_json::json!({"i": 0, "lo": 1, "alive": true, "holes": null}),
            serde_json::json!([1, 2, 3]),
            serde_json::json!("done"),
            serde_json::json!({}),
        ];
        for index in 0..events.len() {
            let _ = trace_view(&events, index);
        }
        // Out-of-range and empty inputs render honest fallbacks, never panic.
        let _ = trace_view(&events, events.len());
        let _ = trace_view(&[], 0);
    }

    #[test]
    fn narrow_breakpoint_matches_r4_transport_rule() {
        assert!(is_narrow_width(390.0));
        assert!(is_narrow_width(699.0));
        assert!(!is_narrow_width(700.0));
        assert!(!is_narrow_width(1280.0));
    }

    #[test]
    fn unsupported_note_names_every_missing_capability() {
        for capability in [
            "Custom input",
            "3D overview",
            "AI scenes",
            "hover-linked highlights",
            "comparison sparklines",
        ] {
            assert!(
                UNSUPPORTED_NOTE.contains(capability),
                "missing honest state for {capability}"
            );
        }
    }

    #[test]
    fn two_sum_explain_notes_come_from_captured_lines() {
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        let lesson = catalog.lesson("two-sum").expect("two-sum fixture");
        let walkthrough = lesson.walkthrough.as_ref().expect("two-sum walkthrough");
        assert_eq!(walkthrough.frames.len(), 8);
        for language in [Language::Java, Language::Cpp, Language::Pseudo] {
            let notes = walkthrough
                .code(language)
                .iter()
                .filter(|line| line.explain.as_deref().is_some_and(|note| !note.is_empty()))
                .count();
            assert!(notes > 0, "no captured explain notes for {language:?}");
        }
        let java_notes = walkthrough
            .code(Language::Java)
            .iter()
            .filter(|line| line.explain.as_deref().is_some_and(|note| !note.is_empty()))
            .count();
        assert_eq!(java_notes, 13);
        // Every frame's step resolves to the same code line the web pane
        // highlights, in all three languages (brushing & linking parity).
        for (index, frame) in walkthrough.frames.iter().enumerate() {
            for language in [Language::Java, Language::Cpp, Language::Pseudo] {
                if let Some(line) = walkthrough.highlighted_line(index, language) {
                    assert_eq!(
                        walkthrough.code(language)[line].step,
                        frame.step,
                        "two-sum frame {index} in {language:?}"
                    );
                }
            }
        }
    }

    #[test]
    fn all_fixture_frames_render_narrow_and_explained() {
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        let mut covered: std::collections::BTreeMap<&str, usize> = Default::default();
        for lesson in &catalog.lessons {
            let Some(walkthrough) = &lesson.walkthrough else {
                continue;
            };
            *covered.entry(walkthrough.kind.as_str()).or_default() += 1;
            for index in 0..walkthrough.frames.len() {
                for language in [Language::Java, Language::Cpp, Language::Pseudo] {
                    for (explain_on, narrow) in
                        [(false, false), (true, false), (false, true), (true, true)]
                    {
                        let _ = view(
                            walkthrough,
                            index,
                            language,
                            explain_on,
                            narrow,
                            false,
                            "Normal",
                        );
                    }
                }
            }
        }
        assert_eq!(
            covered.len(),
            10,
            "expected ten diagram kinds, got {covered:?}"
        );
    }

    // --- Layout-model golden tests (headless: no window, no renderer) ---

    #[test]
    fn array_layout_matches_cell_grid() {
        let scene = layout_scene(
            "array",
            &layout(serde_json::json!({"values": [3, 1, 2]})),
            &frame_with(serde_json::json!({"highlights": {"1": true}, "vars": {"i": 1}})),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 3);
        assert_eq!(scene.text_count(), 1);
        assert_eq!(scene.shapes.len(), 4);
        // Golden positions: PAD + i * (CELL_W + GAP).
        match &scene.shapes[0] {
            Shape::Rect { x, y, w, h, label, active, fill, .. } => {
                assert_eq!((*x, *y, *w, *h), (12.0, 12.0, 52.0, 40.0));
                assert_eq!(label, "3");
                assert!(!active);
                assert_eq!(*fill, ShapeColor::PAPER);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        match &scene.shapes[1] {
            Shape::Rect { x, label, active, fill, border, border_width, .. } => {
                assert_eq!(*x, 72.0);
                assert_eq!(label, "1");
                assert!(active);
                assert_eq!(*fill, ShapeColor::INK);
                assert_eq!(*border, ShapeColor::DANGER);
                assert_eq!(*border_width, 2.0);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 196.0);
        assert_eq!(scene.height, 92.0);
        match &scene.shapes[3] {
            Shape::Text { content, .. } => assert_eq!(content, "i = 1"),
            other => panic!("expected vars text, got {other:?}"),
        }
    }

    #[test]
    fn string_layout_tracks_pointers() {
        let scene = layout_scene(
            "string",
            &layout(serde_json::json!({"chars": ["a", "b"]})),
            &frame_with(
                serde_json::json!({"chars": ["a", "b"], "pointers": {"l": 0, "r": 1},
                    "highlights": {"0": true}}),
            ),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 2);
        assert_eq!(scene.text_count(), 1);
        match &scene.shapes[0] {
            Shape::Rect { x, w, label, active, .. } => {
                assert_eq!((*x, *w), (12.0, 40.0));
                assert_eq!(label, "a");
                assert!(active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        match &scene.shapes[1] {
            Shape::Rect { x, active, .. } => {
                assert_eq!(*x, 60.0);
                assert!(!active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        match &scene.shapes[2] {
            Shape::Text { content, .. } => assert_eq!(content, "l=0   r=1"),
            other => panic!("expected pointers text, got {other:?}"),
        }
    }

    #[test]
    fn grid_layout_marks_current_cell() {
        let scene = layout_scene(
            "grid",
            &layout(serde_json::json!({"cells": [[1, 2, 3], [4, 5, 6]]})),
            &frame_with(serde_json::json!({"current": [0, 1], "vars": {"r": 0}})),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 6);
        assert_eq!(scene.text_count(), 1);
        // Cell (0,1): PAD + 1 * (46 + 6) = 64.
        match &scene.shapes[1] {
            Shape::Rect { x, y, label, active, .. } => {
                assert_eq!((*x, *y), (64.0, 12.0));
                assert_eq!(label, "2");
                assert!(active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 174.0);
        assert_eq!(scene.height, 134.0);
    }

    #[test]
    fn stack_layout_stacks_head_on_top() {
        let scene = layout_scene(
            "stack",
            &layout(serde_json::json!({})),
            &frame_with(
                serde_json::json!({"items": [3, 1, 0], "minima": [0, 0, 0], "ret": 0}),
            ),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 6);
        // 2 headers + 3 separators + 1 returns note.
        assert_eq!(scene.text_count(), 6);
        // Top visual row shows the head (last item).
        match &scene.shapes[2] {
            Shape::Rect { x, y, label, .. } => {
                assert_eq!((*x, *y), (12.0, 34.0));
                assert_eq!(label, "0");
            }
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 156.0);
        assert_eq!(scene.height, 218.0);
    }

    #[test]
    fn tree_layout_places_nodes_on_a_grid() {
        let scene = layout_scene(
            "tree",
            &layout(serde_json::json!({
                "nodes": [{"id": 1, "label": "a"}, {"id": 2, "label": "b"}, {"id": 3, "label": "c"}],
                "edges": [[1, 2], [1, 3]],
                "directed": true,
            })),
            &frame_with(
                serde_json::json!({"current": 2, "visited": [1], "path": [1, 2],
                    "result": "ok", "vars": {"d": 2}}),
            ),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.circle_count(), 3);
        assert_eq!(scene.line_count(), 2);
        assert_eq!(scene.text_count(), 2);
        match &scene.shapes[0] {
            Shape::Circle { cx, cy, r, label, active, .. } => {
                assert_eq!((*cx, *cy, *r), (34.0, 34.0, 22.0));
                assert_eq!(label, "a");
                assert!(active);
            }
            other => panic!("expected circle, got {other:?}"),
        }
        match &scene.shapes[3] {
            Shape::Line { x1, y1, x2, y2, .. } => {
                assert_eq!((*x1, *y1, *x2, *y2), (34.0, 34.0, 108.0, 34.0));
            }
            other => panic!("expected line, got {other:?}"),
        }
        assert_eq!(scene.width, 142.0);
        assert_eq!(scene.height, 188.0);
    }

    #[test]
    fn linked_list_layout_links_cells_with_arrows() {
        let scene = layout_scene(
            "linked-list",
            &layout(serde_json::json!({})),
            &frame_with(serde_json::json!({
                "nodes": [{"id": 1, "value": "a"}, {"id": 2, "value": "b"}],
                "current": 1,
                "pointers": {"head": 1},
            })),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 2);
        assert_eq!(scene.text_count(), 2);
        match &scene.shapes[1] {
            Shape::Text { content, x, .. } => {
                assert_eq!(content, "→");
                assert_eq!(*x, 79.0);
            }
            other => panic!("expected arrow text, got {other:?}"),
        }
        match &scene.shapes[2] {
            Shape::Rect { x, active, .. } => {
                assert_eq!(*x, 102.0);
                assert!(!active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 174.0);
        assert_eq!(scene.height, 92.0);
    }

    #[test]
    fn graph_layout_draws_edges_and_answer() {
        let scene = layout_scene(
            "graph",
            &layout(serde_json::json!({
                "nodes": [{"id": 5, "label": "x"}, {"id": 6, "label": "y"}],
                "edges": [[5, 6]],
            })),
            &frame_with(serde_json::json!({"answer": 42})),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.circle_count(), 2);
        assert_eq!(scene.line_count(), 1);
        assert_eq!(scene.text_count(), 1);
        assert_eq!(scene.width, 142.0);
        assert_eq!(scene.height, 96.0);
        match scene.shapes.iter().find_map(|shape| match shape {
            Shape::Text { content, .. } => Some(content.clone()),
            _ => None,
        }) {
            Some(content) => assert_eq!(content, "answer 42"),
            None => panic!("expected answer text"),
        }
    }

    #[test]
    fn intervals_layout_marks_current_row() {
        let scene = layout_scene(
            "intervals",
            &layout(serde_json::json!({})),
            &frame_with(serde_json::json!({
                "merged": [[1, 3]],
                "sorted": [[1, 3], [2, 4]],
                "current": [2, 4],
            })),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 3);
        assert_eq!(scene.text_count(), 2);
        // Sorted row, second cell is the current interval.
        match &scene.shapes[4] {
            Shape::Rect { label, active, .. } => {
                assert_eq!(label, "[2,4]");
                assert!(active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 224.0);
    }

    #[test]
    fn median_layout_shows_two_heaps() {
        let scene = layout_scene(
            "median-two-heaps",
            &layout(serde_json::json!({})),
            &frame_with(serde_json::json!({"lo": [5, 3], "hi": [7, 9], "median": 6})),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 4);
        assert_eq!(scene.text_count(), 3);
        assert_eq!(scene.width, 136.0);
        assert_eq!(scene.height, 182.0);
        match &scene.shapes[6] {
            Shape::Text { content, strong, .. } => {
                assert_eq!(content, "median 6");
                assert!(strong);
            }
            other => panic!("expected median text, got {other:?}"),
        }
    }

    #[test]
    fn bits_layout_marks_read_and_write_heads() {
        let scene = layout_scene(
            "bits",
            &layout(serde_json::json!({"inBits": [1, 0, 1]})),
            &frame_with(
                serde_json::json!({"outBits": [1, 0], "readPos": 1, "writePos": 0, "res": 5}),
            ),
        );
        assert!(scene.fallback.is_none());
        assert_eq!(scene.rect_count(), 5);
        assert_eq!(scene.text_count(), 3);
        // Second input bit is the read head.
        match &scene.shapes[2] {
            Shape::Rect { label, active, .. } => {
                assert_eq!(label, "0");
                assert!(active);
            }
            other => panic!("expected rect, got {other:?}"),
        }
        // First output bit is the write head.
        match &scene.shapes[5] {
            Shape::Rect { active, .. } => assert!(active),
            other => panic!("expected rect, got {other:?}"),
        }
        assert_eq!(scene.width, 116.0);
        assert_eq!(scene.height, 170.0);
    }

    #[test]
    fn empty_states_stay_honest_for_every_kind() {
        let empty_frame = frame_with(serde_json::json!({}));
        let cases = [
            ("array", serde_json::json!({})),
            ("array", serde_json::json!({"values": []})),
            ("string", serde_json::json!({})),
            ("grid", serde_json::json!({})),
            ("stack", serde_json::json!({})),
            ("tree", serde_json::json!({})),
            ("graph", serde_json::json!({})),
            ("linked-list", serde_json::json!({})),
            ("intervals", serde_json::json!({})),
            ("median-two-heaps", serde_json::json!({})),
            ("bits", serde_json::json!({})),
            ("mystery-kind", serde_json::json!({})),
        ];
        for (kind, layout_value) in cases {
            let scene = layout_scene(kind, &layout_value, &empty_frame);
            assert!(
                scene.fallback.is_some(),
                "expected honest fallback for {kind}"
            );
        }
    }

    #[test]
    fn scene_program_keeps_every_shape() {
        let scene = layout_scene(
            "array",
            &layout(serde_json::json!({"values": [3, 1, 2]})),
            &frame_with(serde_json::json!({})),
        );
        let program = SceneProgram { scene };
        assert_eq!(program.scene.rect_count(), 3);
        assert!(program.scene.fallback.is_none());
    }

    #[test]
    fn transport_controls_construct_headless() {
        let catalog = leetlab_learning::Catalog::from_json(FIXTURE).unwrap();
        let lesson = catalog.lesson("two-sum").expect("two-sum fixture");
        let walkthrough = lesson.walkthrough.as_ref().expect("two-sum walkthrough");
        for language in [Language::Java, Language::Cpp, Language::Pseudo] {
            for playing in [false, true] {
                for narrow in [false, true] {
                    for speed in ["Slow 1200ms", "Normal 600ms", "Fast 300ms"] {
                        for index in 0..walkthrough.frames.len() {
                            let _ = view(
                                walkthrough,
                                index,
                                language,
                                true,
                                narrow,
                                playing,
                                speed,
                            );
                        }
                    }
                }
            }
        }
    }
}
