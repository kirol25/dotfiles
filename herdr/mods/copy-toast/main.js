// Shows a short toast when a terminal selection has been copied.
// Herdr itself copies on mouse release (settings.json copy_on_select); this
// mod only watches the focused terminal's selection and, once it has stopped
// changing, says so in a small pill of its own (a floating block, so it
// takes no room while hidden).

import { View, div } from "gpui-kit";
import { h_flex } from "gpui-base";
import { checking, focused, theme } from "herdr";

const TICK = 150; // ms between looks
const SETTLE = 3; // unchanged looks before the selection counts as finished
const SHOWN = 1100; // ms the pill stays

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
    if (checking()) return;
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
      const shown = (this.shown = (this.shown ?? 0) + 1);
      cx.notify();
      cx.timer.after(SHOWN, (cx) => {
        if (this.shown !== shown) return; // a newer copy is showing
        this.shown = 0;
        cx.notify();
      });
    });
  }

  render() {
    if (!this.shown) return div();
    const t = theme();
    return h_flex().px(10).gap(7).items_center()
      .child(div().size(6).rounded(3).flex_none().bg(t.done))
      .child(div().text_size(12).text_color(t.muted).child("Copied"));
  }
}
