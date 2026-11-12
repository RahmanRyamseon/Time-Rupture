"""Progress-over-time chart as inline SVG (numbers and ISO dates only, so the same
drawing works in both languages; zone names go in an HTML legend)."""
from __future__ import annotations

from datetime import date
from html import escape

PALETTE = ("#b2182b", "#2166ac", "#7b3294", "#1b7837", "#e08214", "#01665e", "#8c510a", "#4d4d4d")


def zone_color(index: int) -> str:
    return PALETTE[index % len(PALETTE)]


def progress_chart_svg(epochs: list[dict], highlight_surface_id: str | None = None) -> str | None:
    """`epochs` is the `epochs` list of services.analysis.site_progress()."""
    points = [e for e in epochs if e["zones"]]
    if len(points) < 2:
        return None
    width, height, left, right, top, bottom = 640, 300, 46, 14, 14, 44
    plot_w, plot_h = width - left - right, height - top - bottom
    days = [date.fromisoformat(e["survey_date"]).toordinal() for e in points]
    d0, d1 = min(days), max(days)
    span = max(d1 - d0, 1)
    values = [
        (z["progress"] + (z["progress_pm"] or 0)) * 100
        for e in points for z in e["zones"] if z["progress"] is not None
    ]
    top_value = max(100.0, max(values, default=100.0))
    step = 20 if top_value <= 140 else 50
    y_max = step * -(-top_value // step)

    def x(day: int) -> float:
        return left + plot_w * (day - d0) / span

    def y(percent: float) -> float:
        return top + plot_h * (1 - percent / y_max)

    out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" font-family="Noto Sans, sans-serif" font-size="11">']
    tick = 0
    while tick <= y_max:
        yy = y(tick)
        heavy = tick == 100
        stroke = "#7a8794" if heavy else "#d9dee5"
        dash = ' stroke-dasharray="4 3"' if heavy else ""
        out.append(f'<line x1="{left}" x2="{width - right}" y1="{yy:.1f}" y2="{yy:.1f}" stroke="{stroke}"{dash}/>')
        out.append(f'<text x="{left - 6}" y="{yy + 4:.1f}" text-anchor="end" fill="#5f6b7a">{tick:g}%</text>')
        tick += step
    for e, day in zip(points, days):
        xx = x(day)
        current = e["surface_id"] == highlight_surface_id
        if current:
            out.append(f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="{top}" y2="{top + plot_h}" stroke="#e08a00" stroke-width="1.5"/>')
        weight = ' font-weight="700"' if current else ""
        out.append(f'<text x="{xx:.1f}" y="{height - 26}" text-anchor="middle" fill="#1f2933"{weight}>{escape(e["survey_date"])}</text>')

    zone_ids: list[str] = []
    for e in points:
        for z in e["zones"]:
            if z["zone_id"] not in zone_ids:
                zone_ids.append(z["zone_id"])
    for index, zone_id in enumerate(zone_ids):
        color = zone_color(index)
        series = [
            (x(day), z)
            for e, day in zip(points, days) for z in e["zones"]
            if z["zone_id"] == zone_id and z["progress"] is not None
        ]
        if not series:
            continue
        path = " ".join(f'{"M" if i == 0 else "L"}{xx:.1f},{y(z["progress"] * 100):.1f}' for i, (xx, z) in enumerate(series))
        out.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="2"/>')
        for xx, z in series:
            p, pm = z["progress"] * 100, (z["progress_pm"] or 0) * 100
            if pm > 0:
                lo, hi = y(max(p - pm, 0)), y(min(p + pm, y_max))
                out.append(f'<line x1="{xx:.1f}" x2="{xx:.1f}" y1="{lo:.1f}" y2="{hi:.1f}" stroke="{color}" stroke-width="1.2"/>')
                out.append(f'<line x1="{xx - 4:.1f}" x2="{xx + 4:.1f}" y1="{lo:.1f}" y2="{lo:.1f}" stroke="{color}" stroke-width="1.2"/>')
                out.append(f'<line x1="{xx - 4:.1f}" x2="{xx + 4:.1f}" y1="{hi:.1f}" y2="{hi:.1f}" stroke="{color}" stroke-width="1.2"/>')
            out.append(f'<circle cx="{xx:.1f}" cy="{y(p):.1f}" r="3.5" fill="#fff" stroke="{color}" stroke-width="2"/>')
    out.append("</svg>")
    return "".join(out)
