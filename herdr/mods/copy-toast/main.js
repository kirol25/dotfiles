// Shows a short toast when a terminal selection has been copied.
// Herdr itself copies on mouse release (settings.json copy_on_select); this
// mod only watches the focused terminal's selection and, once it has stopped
// changing, opens a small "Copied" pill just above the pointer. The copy in
// the layout (a floating block) draws nothing and only watches; the pill is
// this same mod opened as a window with props { pill: true }.

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { checking, closeOverlay, focused, openOverlay, props, theme } from "herdr";

const TICK = 150; // ms between looks
const SETTLE = 3; // unchanged looks before the selection counts as finished
const SHOWN = 1100; // ms the pill stays
const PILL_W = 80; // px, about the pill's width
const RISE = 58; // px from the pointer up to the pill's top

const keyOf = (f) => {
  const s = f?.selection;
  if (!s || !f.terminal) return null;
  // A bare click is not a selection worth announcing.
  if (s.start.row === s.end.row && s.start.col === s.end.col) return null;
  return `${f.terminal}:${s.start.row},${s.start.col}-${s.end.row},${s.end.col}`;
};

export default class CopyToast extends View {
  init(_props, cx) {
    this.last = null; // the selection seen on the previous look
    this.still = 0; // looks it has stayed the same
    this.told = null; // the selection already announced
    if (checking() || props()?.pill) return;
    cx.timer.every(TICK, (cx) => {
      const key = keyOf(focused());
      if (key !== this.last) {
        this.last = key;
        this.still = 0;
        if (!key) this.told = null;
        return;
      }
      if (!key || key === this.told) return;
      if (++this.still < SETTLE) return;
      this.told = key;
      // The drag ended at the pointer: put the pill just above it, inside the window.
      const m = window.mouse_position();
      const v = window.viewport_size();
      const x = Math.max(8, Math.min(m.x - PILL_W / 2, v.width - PILL_W - 8));
      const y = m.y - RISE >= 8 ? m.y - RISE : m.y + 24;
      const id = openOverlay({ mod: "copy-toast", props: { pill: true }, kind: "window", at: { x, y } });
      cx.timer.after(SHOWN, () => closeOverlay(id));
    });
  }

  render() {
    if (!props()?.pill) return div();
    const t = theme();
    return h_flex().px(10).gap(7).items_center()
      .child(div().size(6).rounded(3).flex_none().bg(t.done))
      .child(div().text_size(12).text_color(t.muted).child("Copied"));
  }
}
