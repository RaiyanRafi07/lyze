// Shared iced styling: hex colors, custom-theme loading, widget styles.
// Contract: `theme_from_json` needs `bg`/`text`/`primary` hex strings (`name`
// optional); `success`/`danger` fall back to built-in defaults.
// Gotcha: only `#RGB` / `#RRGGBB` parse; anything else returns None / errors.
use iced::theme::Palette;
use iced::widget::{button, container, row, text, text_editor, text_input, Button, Container};
use iced::{Border, Color, Element, Length, Theme};

fn parse_channel(hex: &str) -> Option<u8> {
    u8::from_str_radix(hex, 16).ok()
}

/// Parse `#RGB` / `#RRGGBB` into an iced color.
pub fn parse_hex_color(raw: &str) -> Option<Color> {
    let hex = raw.trim().strip_prefix('#')?;
    let (r, g, b) = match hex.len() {
        3 => {
            let mut chars = hex.chars();
            let r = chars.next()?;
            let g = chars.next()?;
            let b = chars.next()?;
            (
                parse_channel(&format!("{r}{r}"))?,
                parse_channel(&format!("{g}{g}"))?,
                parse_channel(&format!("{b}{b}"))?,
            )
        }
        6 => (
            parse_channel(&hex[0..2])?,
            parse_channel(&hex[2..4])?,
            parse_channel(&hex[4..6])?,
        ),
        _ => return None,
    };
    Some(Color::from_rgb8(r, g, b))
}

/// Build a custom iced theme from user JSON:
/// `{"name": "...", "bg": "#...", "text": "#...", "primary": "#..."}`.
/// Optional `success` / `danger` fall back to the R4 defaults.
pub fn theme_from_json(raw: &str) -> Result<(String, Theme), String> {
    let value: serde_json::Value =
        serde_json::from_str(raw).map_err(|error| format!("Not theme JSON: {error}"))?;
    let get = |key: &str| {
        value
            .get(key)
            .and_then(|value| value.as_str())
            .ok_or_else(|| format!("Theme JSON needs a \"{key}\" string"))
    };
    let name = value
        .get("name")
        .and_then(|value| value.as_str())
        .unwrap_or("Custom")
        .to_owned();
    let background = parse_hex_color(get("bg")?).ok_or("bg is not #RGB or #RRGGBB")?;
    let text = parse_hex_color(get("text")?).ok_or("text is not #RGB or #RRGGBB")?;
    let primary = parse_hex_color(get("primary")?).ok_or("primary is not #RGB or #RRGGBB")?;
    let success = value
        .get("success")
        .and_then(|value| value.as_str())
        .and_then(parse_hex_color)
        .unwrap_or(Color::from_rgb8(0x0E, 0x7C, 0x66));
    let danger = value
        .get("danger")
        .and_then(|value| value.as_str())
        .and_then(parse_hex_color)
        .unwrap_or(Color::from_rgb8(0xC0, 0x05, 0x11));
    Ok((
        name,
        Theme::custom(
            "Custom".to_owned(),
            Palette {
                background,
                text,
                primary,
                success,
                danger,
            },
        ),
    ))
}

/// Dracula preset (S6 theme list). Fixed function/signal roles hold.
pub fn dracula() -> Theme {
    Theme::custom(
        "Dracula".to_owned(),
        Palette {
            background: Color::from_rgb8(0x28, 0x2A, 0x36),
            text: Color::from_rgb8(0xF8, 0xF8, 0xF2),
            primary: Color::from_rgb8(0xFF, 0xB8, 0x6C),
            success: Color::from_rgb8(0x50, 0xFA, 0x7B),
            danger: Color::from_rgb8(0xFF, 0x55, 0x55),
        },
    )
}

/// VS Code Dark+ port: editor background #1E1E1E, foreground #D4D4D4.
pub fn vscode_dark_plus() -> Theme {
    Theme::custom(
        "VS Code Dark+".to_owned(),
        Palette {
            background: Color::from_rgb8(0x1E, 0x1E, 0x1E),
            text: Color::from_rgb8(0xD4, 0xD4, 0xD4),
            primary: Color::from_rgb8(0x00, 0x7A, 0xCC),
            success: Color::from_rgb8(0x0E, 0x7C, 0x66),
            danger: Color::from_rgb8(0xFF, 0x6B, 0x6B),
        },
    )
}

/// VS Code Light+ port: editor background #FFFFFF, foreground #000000.
pub fn vscode_light_plus() -> Theme {
    Theme::custom(
        "VS Code Light+".to_owned(),
        Palette {
            background: Color::from_rgb8(0xFF, 0xFF, 0xFF),
            text: Color::from_rgb8(0x00, 0x00, 0x00),
            primary: Color::from_rgb8(0x00, 0x7A, 0xCC),
            success: Color::from_rgb8(0x0E, 0x7C, 0x66),
            danger: Color::from_rgb8(0xC0, 0x05, 0x11),
        },
    )
}

fn port(name: &str, bg: (u8, u8, u8), text: (u8, u8, u8), accent: (u8, u8, u8)) -> Theme {
    // Spec S6 gallery: paper/text/accent come straight from the web
    // `BUILTIN_PORTS` vars; signal roles stay R4 (light red text /
    // dark light-red text) so verdicts read in every port.
    let dark = (bg.0 as u32 + bg.1 as u32 + bg.2 as u32) < 3 * 128;
    Theme::custom(
        name.to_owned(),
        Palette {
            background: Color::from_rgb8(bg.0, bg.1, bg.2),
            text: Color::from_rgb8(text.0, text.1, text.2),
            primary: Color::from_rgb8(accent.0, accent.1, accent.2),
            success: Color::from_rgb8(0x0E, 0x7C, 0x66),
            danger: if dark {
                Color::from_rgb8(0xFF, 0x6B, 0x6B)
            } else {
                Color::from_rgb8(0xC0, 0x05, 0x11)
            },
        },
    )
}

/// Catppuccin Mocha (web port).
pub fn catppuccin_mocha() -> Theme {
    port("Catppuccin Mocha", (0x1E, 0x1E, 0x2E), (0xCD, 0xD6, 0xF4), (0xCB, 0xA6, 0xF7))
}

/// Catppuccin Macchiato (web port).
pub fn catppuccin_macchiato() -> Theme {
    port("Catppuccin Macchiato", (0x24, 0x27, 0x3A), (0xCA, 0xD3, 0xF5), (0xC6, 0xA0, 0xF6))
}

/// Catppuccin Frappé (web port).
pub fn catppuccin_frappe() -> Theme {
    port("Catppuccin Frappe", (0x30, 0x34, 0x46), (0xC6, 0xD0, 0xF5), (0xCA, 0x9E, 0xE6))
}

/// Catppuccin Latte (web port, light).
pub fn catppuccin_latte() -> Theme {
    port("Catppuccin Latte", (0xEF, 0xF1, 0xF5), (0x4C, 0x4F, 0x69), (0x88, 0x39, 0xEF))
}

/// Night Owl (web port).
pub fn night_owl() -> Theme {
    port("Night Owl", (0x01, 0x16, 0x27), (0xD6, 0xDE, 0xEB), (0x82, 0xAA, 0xFF))
}

/// Tokyo Night (web port).
pub fn tokyo_night() -> Theme {
    port("Tokyo Night", (0x1A, 0x1B, 0x26), (0xC0, 0xCA, 0xF5), (0x7A, 0xA2, 0xF7))
}

/// One Dark Pro (web port).
pub fn one_dark_pro() -> Theme {
    port("One Dark Pro", (0x28, 0x2C, 0x34), (0xAB, 0xB2, 0xBF), (0x61, 0xAF, 0xEF))
}

/// Monokai (web port).
pub fn monokai() -> Theme {
    port("Monokai", (0x27, 0x28, 0x22), (0xF8, 0xF8, 0xF2), (0xA6, 0xE2, 0x2E))
}

/// Nord (web port).
pub fn nord() -> Theme {
    port("Nord", (0x2E, 0x34, 0x40), (0xD8, 0xDE, 0xE9), (0x88, 0xC0, 0xD0))
}

/// GitHub Dark (web port).
pub fn github_dark() -> Theme {
    port("GitHub Dark", (0x0D, 0x11, 0x17), (0xE6, 0xED, 0xF3), (0x1F, 0x6F, 0xEB))
}

pub fn theme(dark: bool) -> Theme {
    let (background, text) = if dark {
        (
            Color::from_rgb8(35, 39, 51),
            Color::from_rgb8(216, 211, 198),
        )
    } else {
        (
            Color::from_rgb8(247, 242, 231),
            Color::from_rgb8(17, 17, 17),
        )
    };
    Theme::custom(
        if dark { "R4 Dark" } else { "R4 Light" }.to_owned(),
        Palette {
            background,
            text,
            primary: if dark {
                Color::from_rgb8(255, 128, 66)
            } else {
                Color::from_rgb8(194, 65, 12)
            },
            success: Color::from_rgb8(14, 124, 102),
            danger: if dark {
                Color::from_rgb8(255, 107, 107)
            } else {
                Color::from_rgb8(192, 5, 17)
            },
        },
    )
}

fn black() -> iced::Font {
    iced::Font {
        weight: iced::font::Weight::Black,
        ..iced::Font::default()
    }
}

/// Reading weight (spec S0: body 13–14px/1.6). The system grotesk in Black
/// everywhere is what reads "clunky"; prose drops to Normal here.
pub fn regular() -> iced::Font {
    iced::Font {
        weight: iced::font::Weight::Normal,
        ..iced::Font::default()
    }
}

/// Spec row/label weight (800-ish titles inside rows and cards).
pub fn bold() -> iced::Font {
    iced::Font {
        weight: iced::font::Weight::Bold,
        ..iced::Font::default()
    }
}

/// Code face: bundled Fira Code (geometric mono in the JetBrains Mono
/// spirit; loaded in `main`). Falls back to Consolas where the bundle
/// cannot load, so code never renders in a proportional font.
pub fn mono() -> iced::Font {
    iced::Font {
        family: iced::font::Family::Name("Fira Code"),
        ..iced::Font::default()
    }
}

pub fn black_font() -> iced::Font {
    black()
}

/// R4 kicker: uppercase 10px 900. Letterspacing is not expressible with the
/// toolkit's text primitive, so weight + case carry the role.
pub fn kicker<'a>(label: &str) -> iced::widget::Text<'a> {
    text(label.to_uppercase()).size(10).font(black())
}

pub fn title(label: &str) -> iced::widget::Text<'static> {
    text(label.to_owned()).size(26).font(black())
}

pub fn subtitle(label: &str) -> iced::widget::Text<'static> {
    text(label.to_owned()).size(10).font(black())
}

/// Red step badge (light: signal on paper; dark: deep fill).
pub fn step_badge(label: String) -> Container<'static, crate::Message> {
    container(text(label).size(10).font(black()))
        .padding([2, 8])
        .style(|theme: &Theme| {
            let bg = if is_dark(theme) {
                Color::from_rgb8(0xA8, 0x00, 0x0E)
            } else {
                Color::from_rgb8(0xE3, 0x06, 0x11)
            };
            container::Style {
                background: Some(bg.into()),
                text_color: Some(Color::WHITE.into()),
                ..Default::default()
            }
        })
}

fn is_dark(theme: &Theme) -> bool {
    let bg = theme.palette().background;
    (bg.r + bg.g + bg.b) / 3.0 < 0.5
}

/// 2px verdict card with a green/red left edge.
pub fn verdict_card<'a>(
    ok: bool,
    body: Element<'a, crate::Message>,
) -> Container<'a, crate::Message> {
    let edge = if ok {
        Color::from_rgb8(0x0E, 0x7C, 0x66)
    } else {
        Color::from_rgb8(0xC0, 0x05, 0x11)
    };
    let stripe: Element<'a, crate::Message> = container(text("").size(1))
        .width(Length::Fixed(8.0))
        .height(Length::Fill)
        .style(move |_theme: &Theme| container::Style {
            background: Some(edge.into()),
            ..Default::default()
        })
        .into();
    container(row![stripe, container(body).padding(8).width(Length::Fill)]).style(
        |theme: &Theme| container::Style {
            background: Some(theme.palette().background.into()),
            border: square_border(theme.palette().text),
            ..Default::default()
        },
    )
}

/// Icon rail glyph button (48px rail, 8px rail padding: 32px button
/// lands exactly). Glyph size is per-button: the three-stroke logo wraps
/// at 15px in a 20px content box, so it renders at 11px.
pub fn rail_button<'a>(
    glyph: &'a str,
    size: u16,
    selected: bool,
    message: crate::Message,
) -> Button<'a, crate::Message> {
    button(text(glyph).font(icon_font()).size(size))
        .width(Length::Fixed(32.0))
        .padding(6)
        .style(move |theme: &Theme, status: button::Status| button_style(theme, status, selected))
        .on_press(message)
}

/// Difficulty pill text: `EASY` / `MED` / `HARD` 10px 900.
pub fn difficulty(label: &str) -> iced::widget::Text<'static> {
    text(label.to_owned()).size(10).font(black())
}

/// Due pill (orange fill): `DUE`.
pub fn due_pill(label: &str) -> Container<'static, crate::Message> {
    container(text(label.to_owned()).size(10).font(black()))
        .padding([1, 5])
        .style(|_theme: &Theme| container::Style {
            background: Some(Color::from_rgb8(0xFF, 0x5A, 0x00).into()),
            text_color: Some(Color::WHITE.into()),
            ..Default::default()
        })
}

/// Icon font for rail glyphs and symbol buttons. The default UI font does
/// not cover these codepoints, so they render tofu without an explicit
/// family (verified on Windows via system font cmap probing).
pub fn icon_font() -> iced::Font {
    iced::Font {
        family: iced::font::Family::Name(if cfg!(windows) {
            "Segoe UI Symbol"
        } else {
            // Verified on the first Linux boot (clean-VM gate); DejaVu
            // Sans ships with Ubuntu desktops and is expected to cover
            // U+2261/U+2699/U+2600/U+263E/U+25B6/U+25BC/U+2715.
            "DejaVu Sans"
        }),
        ..iced::Font::default()
    }
}

/// Symbol text in the icon font (rail glyphs, run arrows, close cross,
/// drawer chevrons). All codepoints used here are verified present in
/// Segoe UI Symbol; Linux coverage is a clean-VM screenshot item.
pub fn icon(label: &str, size: u16) -> iced::widget::Text<'static> {
    text(label.to_owned()).font(icon_font()).size(size)
}
/// Solved check (✓ renders in the base UI font on all platforms).
pub fn solved_check() -> iced::widget::Text<'static> {
    text("✓").size(12).font(black())
}

/// Numbered step label for the steps list. Function-ink (not the mock's
/// pure function orange) so 11px numerals keep a passing contrast.
pub fn step_no(n: usize) -> iced::widget::Text<'static> {
    text(format!("{n:02}"))
        .size(11)
        .font(black())
        .color(Color::from_rgb8(0xC2, 0x41, 0x0C))
}

/// Drawer header: boxed title bar for a collapsible section.
pub fn drawer_head(label: String) -> Container<'static, crate::Message> {
    container(text(label).size(11).font(black()))
        .width(Length::Fill)
        .padding([8, 10])
}

fn square_border(color: Color) -> Border {
    Border {
        color,
        width: 1.0,
        ..Default::default()
    }
}

/// Hairline rule between flat list rows (web catalog rhythm: content
/// carries the hierarchy, rules only separate). 1px so the grid never
/// overpowers the text.
pub fn hairline() -> iced::widget::Rule<'static, iced::Theme> {
    iced::widget::horizontal_rule(1)
}

/// Borderless tab button for use inside a framed tabs row (the outer frame
/// and dividers carry the 2px grid; inner buttons must not double it).
pub fn tab_button<'a>(
    content: impl Into<Element<'a, crate::Message>>,
    selected: bool,
    message: crate::Message,
) -> Button<'a, crate::Message> {
    button(content)
        .width(Length::Fill)
        .padding([7, 4])
        .style(move |theme: &Theme, status: button::Status| {
            let palette = theme.palette();
            let hovered = matches!(status, button::Status::Hovered);
            button::Style {
                background: Some(
                    if selected {
                        palette.text
                    } else {
                        palette.background
                    }
                    .into(),
                ),
                text_color: if selected {
                    palette.background
                } else if hovered {
                    palette.primary
                } else {
                    palette.text
                }
                .into(),
                ..Default::default()
            }
        })
        .on_press(message)
}

/// 1px vertical divider for the framed tabs row. Shrink height: a Fill
/// divider forces the whole tabs row to absorb the workspace height,
/// which rendered the three tabs as giant empty boxes.
pub fn tab_divider() -> Container<'static, crate::Message> {
    container(text("").size(1))
        .width(Length::Fixed(1.0))
        .height(Length::Shrink)
        .style(|theme: &Theme| container::Style {
            background: Some(theme.palette().text.into()),
            ..Default::default()
        })
}

pub fn button_style(theme: &Theme, status: button::Status, active: bool) -> button::Style {
    let palette = theme.palette();
    let selected = active || status == button::Status::Pressed;
    let border = if status == button::Status::Hovered {
        palette.primary
    } else {
        palette.text
    };
    // Disabled keeps its 2px frame (mock shows every control boxed) and
    // signals state through dimmed text instead of a missing border.
    let dimmed = |color: Color| Color {
        r: (color.r + palette.background.r) / 2.0,
        g: (color.g + palette.background.g) / 2.0,
        b: (color.b + palette.background.b) / 2.0,
        a: 1.0,
    };
    button::Style {
        background: Some(
            if selected {
                palette.text
            } else {
                palette.background
            }
            .into(),
        ),
        text_color: if selected {
            palette.background
        } else if status == button::Status::Disabled {
            dimmed(palette.text)
        } else {
            palette.text
        }
        .into(),
        border: square_border(border),
        ..Default::default()
    }
}

/// Primary "go" button: fixed function-ink fill, white text (5.18:1 in
/// both modes). Reserved for the single primary action per toolbar.
/// Fixed, not theme primary: the dark primary is a light orange tuned
/// for text-on-dark, which fails as a fill behind white text.
pub fn go(label: &str) -> Button<'static, crate::Message> {
    button(text(label.to_owned()).size(14).font(black()))
        .padding([7, 9])
        .style(|_theme: &Theme, _status: button::Status| {
            let fill = Color::from_rgb8(0xC2, 0x41, 0x0C);
            button::Style {
                background: Some(fill.into()),
                text_color: iced::Color::WHITE,
                border: square_border(fill),
                ..Default::default()
            }
        })
}

pub fn control<'a>(label: &'a str, selected: bool) -> Button<'a, crate::Message> {
    iced::widget::button(iced::widget::text(label).size(14))
        .padding([7, 9])
        .style(move |theme: &Theme, status: button::Status| button_style(theme, status, selected))
}

pub fn surface(theme: &Theme) -> container::Style {
    container::Style {
        background: Some(theme.palette().background.into()),
        border: square_border(theme.palette().text),
        ..Default::default()
    }
}

pub fn reference_line(theme: &Theme, active: bool) -> container::Style {
    if active {
        container::Style {
            background: Some(theme.palette().text.into()),
            text_color: Some(theme.palette().background.into()),
            ..Default::default()
        }
    } else {
        container::Style::default()
    }
}

pub fn diagram_cell(theme: &Theme, active: bool) -> container::Style {
    if active {
        let mut style = reference_line(theme, true);
        style.border = square_border(theme.palette().danger);
        style
    } else {
        surface(theme)
    }
}

pub fn search(theme: &Theme, status: text_input::Status) -> text_input::Style {
    let mut style = text_input::default(theme, status);
    let palette = theme.palette();
    style.border = square_border(if status == text_input::Status::Focused {
        palette.primary
    } else {
        palette.text
    });
    style
}

pub fn editor(theme: &Theme, status: text_editor::Status) -> text_editor::Style {
    let mut style = text_editor::default(theme, status);
    let palette = theme.palette();
    style.border = square_border(if status == text_editor::Status::Focused {
        palette.primary
    } else {
        palette.text
    });
    style
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hex_colors_parse() {
        assert_eq!(
            parse_hex_color("#FF5A00"),
            Some(Color::from_rgb8(0xFF, 0x5A, 0x00))
        );
        assert_eq!(
            parse_hex_color("#f40"),
            Some(Color::from_rgb8(0xFF, 0x44, 0x00))
        );
        assert!(parse_hex_color("not-a-color").is_none());
        assert!(parse_hex_color("#12345").is_none());
    }

    #[test]
    fn theme_import_round_trips() {
        let raw = r##"{"name":"Test","bg":"#1a1b26","text":"#c0caf5","primary":"#ff9e64"}"##;
        let (name, theme) = theme_from_json(raw).expect("valid theme");
        assert_eq!(name, "Test");
        assert_eq!(
            theme.palette().background,
            Color::from_rgb8(0x1A, 0x1B, 0x26)
        );
        assert!(theme_from_json("{}").is_err());
        assert!(theme_from_json("{bad json").is_err());
    }
}
