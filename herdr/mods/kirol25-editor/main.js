// A VSCode-style editor pane for one file. Props: { file: absolute path, on: machine | null, label?: shown path }.
// Local files are editable (save: the Save button, or cmd-s via keys.json "mod:kirol25-editor");
// files on another machine are read-only. An unmodified file follows changes made on disk.
import { View, div } from "gpui-kit";
import { v_flex, h_flex, Editor, EditorState } from "gpui-base";
import { props, readTextFile, writeTextFile, nextCommand, theme, settings, checking } from "herdr";

const LANG = { ts: "js", tsx: "js", mts: "js", cts: "js", jsx: "js", mjs: "js", toml: "yaml", jsonc: "json", svelte: "html", vue: "html",
  // No HCL grammar: Ruby's gives Terraform its comments, strings, numbers and booleans.
  tf: "ruby", tfvars: "ruby", hcl: "ruby", md: "markdown", mdx: "markdown", py: "python", yml: "yaml" };
const NAMES = { ts: "TypeScript", tsx: "TypeScript JSX", js: "JavaScript", jsx: "JavaScript JSX", mjs: "JavaScript", py: "Python", rs: "Rust", go: "Go",
  css: "CSS", html: "HTML", json: "JSON", md: "Markdown", yaml: "YAML", yml: "YAML", toml: "TOML", sh: "Shell Script", dart: "Dart", tf: "Terraform", txt: "Plain Text" };

export default class FileEditor extends View {
  init(_props, cx) {
    const p = props() ?? {};
    this.file = p.file ?? null; this.on = p.on ?? null; this.label = p.label ?? this.file ?? "";
    this.code = null; this.saved = null; this.dirty = false; this.error = this.file ? null : "No file"; this.note = null;
    if (!this.file) return;
    this.load(cx);
    // Follow the disk while there are no unsaved edits (an agent may be changing the file).
    if (!checking()) cx.timer.every(2500, (cx) => { if (this.code && !this.dirty && !this.busy) this.load(cx); });
    cx.spawn(async (cx) => { for (;;) { const c = await nextCommand(); if (c === "save") this.save(cx); else if (c === "focus") this.code?.focus(); } });
  }

  ext() { const name = this.file.split("/").pop(); return name.includes(".") ? name.split(".").pop().toLowerCase() : "txt"; }

  load(cx) {
    cx.spawn(async (cx) => {
      try {
        const text = await readTextFile(this.file, { on: this.on });
        if (text === null) { if (!this.code) this.error = "This file does not exist (deleted or moved)"; else this.note = "Deleted on disk"; cx.notify(); return; }
        if (text.includes("\0")) { this.error = "Binary file, no text view"; cx.notify(); return; }
        if (this.code) {
          if (text === this.saved || this.dirty) return;
          this.saved = text; this.code.set_value(text); this.dirty = false; this.note = null;
        } else {
          const t = theme(), ext = this.ext();
          this.saved = text;
          this.code = EditorState.new({ language: LANG[ext] ?? ext, value: text, readonly: Boolean(this.on),
            font_family: settings().font_family, font_size: 13,
            syntax: { keyword: t.ansi5, string: t.ansi2, comment: t.dim, function: t.ansi4, type: t.ansi3, number: t.ansi1, constant: t.ansi6, boolean: t.ansi1 } });
          this.code.on("change", (_e, cx) => { const dirty = this.code.value() !== this.saved; if (dirty !== this.dirty) { this.dirty = dirty; cx.notify(); } });
          this.error = null;
          if (!checking()) this.code.focus();
        }
        cx.notify();
      } catch (e) { if (!this.code) { this.error = `Cannot open this file (too large or unreadable): ${e}`; cx.notify(); } }
    });
  }

  save(cx) {
    if (!this.code || this.on || !this.dirty || this.busy) return;
    const text = this.code.value();
    this.busy = true;
    cx.spawn(async (cx) => {
      try { await writeTextFile(this.file, text, this.saved); this.saved = text; this.dirty = this.code.value() !== text; this.note = null; }
      catch (e) { this.note = "Not saved: the file changed on disk"; }
      finally { this.busy = false; cx.notify(); }
    });
  }

  close() { this.code?.release(); }

  render() {
    const t = theme(), parts = this.label.split("/").filter(Boolean), name = parts.pop() ?? "untitled";
    const ext = this.file ? this.ext() : "txt", lines = this.code ? this.saved.split("\n").length : 0;
    const state = this.on ? "Read-only" : this.busy ? "Saving…" : this.dirty ? "Modified" : "Saved";
    const cell = (text) => div().flex_none().child(text);
    return v_flex().id("editor").size_full().min_h(0).bg(t.background).text_color(t.foreground).text_size(12)
      // Tab strip: one active tab, accent line on top, dot while modified.
      .child(h_flex().h(34).flex_none().bg(t.chrome).border_b(1).border_color(t.border)
        .child(h_flex().h_full().px(12).gap(8).items_center().bg(t.background).border_t(1).border_color(t.accent).border_r(1)
          .child(div().text_size(10).font_semibold().text_color(t.ansi4).child(ext.slice(0, 3).toUpperCase()))
          .child(div().text_size(13).child(name))
          .child(div().w(8).h(8).rounded(4).flex_none().when(this.dirty, (e) => e.bg(t.foreground))))
        .child(div().flex_1())
        .when(Boolean(this.code) && !this.on, (e) => e.child(h_flex().h_full().px(10).items_center()
          .child(div().id("save").px(10).h(22).flex().items_center().rounded(5).text_size(11)
            .bg(this.dirty ? t.solid : t.raised).text_color(this.dirty ? t.solid_foreground : t.dim)
            .when(this.dirty, (b) => b.cursor_pointer()).on_click((_e, cx) => this.save(cx)).child("Save")))))
      // Breadcrumbs.
      .child(h_flex().h(24).flex_none().px(14).gap(6).items_center().text_size(11).text_color(t.dim).overflow_hidden()
        .children(parts.flatMap((p) => [cell(p), cell("›")])).child(div().text_color(t.muted).truncate().child(name)))
      .child(this.code ? Editor.new(this.code).flex_1().min_h(0) : div().flex_1().p(16).text_color(t.dim).child(this.error || "Loading file…"))
      // Status bar.
      .child(h_flex().h(22).flex_none().px(12).gap(16).items_center().bg(t.chrome).border_t(1).border_color(t.border).text_size(11).text_color(t.muted)
        .child(cell(this.note ?? state).when(Boolean(this.note), (e) => e.text_color(t.ansi1)))
        .child(div().flex_1())
        .when(Boolean(this.on), (e) => e.child(cell(this.on)))
        .when(Boolean(this.code), (e) => e.child(cell(`${lines} lines`)))
        .child(cell("UTF-8")).child(cell(NAMES[ext] ?? ext.toUpperCase())));
  }
}
