// The Files panel's right-click menu, opened as a popup with props
// { target: { root, path, name, dir, on } } (path "" is the folder shown).
// It acts on the entry itself and tells the tree what changed through shared state.
import { div } from "gpui-kit";
import { v_flex, h_flex, InputState, Input } from "gpui-base";
import { exec, closeOverlay, notify, setShared, theme, window } from "herdr";

export const CHANGED = "kirol25-files.changed";
const CLAUDE = "#D97757";
const exists = 'if [ -e "$1" ] || [ -L "$1" ]; then echo "\\"${1##*/}\\" already exists" >&2; exit 1; fi; ';
const DUPLICATE = 'src=$1; dir=${src%/*}; name=${src##*/}; base=$name; ext=; if [ ! -d "$src" ]; then case $name in ?*.*) base=${name%.*}; ext=.${name##*.};; esac; fi; n=1; dst="$dir/$base copy$ext"; while [ -e "$dst" ] || [ -L "$dst" ]; do n=$((n+1)); dst="$dir/$base copy $n$ext"; done; cp -R -- "$src" "$dst"';

export class FileMenu {
  constructor(p, cx) {
    this.overlay = p.overlay; this.target = p.target; this.mode = "menu";
    this.handle = cx.focus_handle();
  }

  get full() { const { root, path } = this.target; return path ? `${root}/${path}` : root; }
  get parent() { const { path } = this.target; return path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : ""; }
  // Where "New file" lands: inside a folder, beside a file.
  get home() { return this.target.dir ? this.target.path : this.parent; }
  get trash() { return !this.target.on && window()?.platform === "macos"; }

  close() { closeOverlay(this.overlay); }

  async sh(script, ...args) {
    const r = await exec("sh", ["-c", script, "files", ...args], { on: this.target.on });
    if (r.code !== 0) throw new Error(r.stderr.trim() || "The command failed");
  }

  // Runs one change, then tells the tree; errors become a toast.
  act(cx, title, work, change) {
    if (this.busy) return;
    this.busy = true;
    cx.spawn(async () => {
      try { await work(); setShared(CHANGED, { at: Date.now(), root: this.target.root, ...change }); }
      catch (e) { notify({ title, body: String(e?.message ?? e), level: "error" }); }
      finally { this.close(); }
    });
  }

  copy(cx, text) { cx.write_to_clipboard(text); this.close(); }

  ask(cx, mode, value, select) {
    this.mode = mode; this.text = value; this.problem = null;
    this.input = InputState.new({ value });
    if (value) this.input.set_selected_range({ start: 0, end: select ?? value.length });
    this.input.on("change", (_e, cx) => { this.text = this.input.value(); this.problem = null; cx.notify(); });
    this.input.on("submit", (_e, cx) => this.submit(cx));
    this.input.focus();
    cx.timer.after(300, () => this.input?.focus());
    cx.notify();
  }

  submit(cx) {
    const name = (this.text ?? "").trim(), { root } = this.target, nested = this.mode !== "rename";
    const parts = name.split("/");
    if (!name || name.startsWith("/") || parts.some(p => !p || p === "." || p === "..") || (!nested && parts.length > 1)) {
      this.problem = nested ? "Enter a name (folders with /)" : "Enter a name without /";
      return cx.notify();
    }
    const join = (dir, n) => dir ? `${dir}/${n}` : n;
    if (this.mode === "rename") {
      if (name === this.target.name) return this.close();
      const to = join(this.parent, name);
      // Only a change of letter case may land on an existing name (case-insensitive disks).
      const guard = name.toLowerCase() === this.target.name.toLowerCase() ? 'shift; ' : exists + 'shift; ';
      return this.act(cx, "Rename failed", () => this.sh('set -- "$2" "$1" "$2"; ' + guard + 'mv -- "$1" "$2"', this.full, `${root}/${to}`), { from: this.target.path, to });
    }
    const to = join(this.home, name), dest = `${root}/${to}`;
    const make = this.mode === "folder" ? 'mkdir -p -- "$1"' : 'mkdir -p -- "$(dirname -- "$1")" && : > "$1"';
    this.act(cx, this.mode === "folder" ? "New folder failed" : "New file failed", () => this.sh(exists + make, dest),
      { open: to.includes("/") ? to.slice(0, to.lastIndexOf("/")) : "", show: this.mode === "file" ? to : null });
  }

  remove(cx) {
    this.act(cx, "Delete failed", async () => {
      if (!this.trash) return this.sh('rm -rf -- "$1"', this.full);
      const r = await exec("/usr/bin/trash", [this.full]);
      if (r.code !== 0) throw new Error(r.stderr.trim() || "Cannot move to Trash");
    }, { from: this.target.path });
  }

  render() {
    const t = theme(), { target } = this, entry = Boolean(target.path), mac = !target.on && window()?.platform === "macos";
    const heading = (text, tone) => h_flex().h(22).flex_none().gap(6).items_center()
      .child(div().flex_initial().min_w(0).truncate().font_semibold().text_size(12).text_color(tone).child(text.toUpperCase()))
      .child(div().flex_1().min_w(8).h(1).bg(tone + "55"));
    const root = v_flex().id("file-menu").track_focus(this.handle).w_full().p(5).bg(t.popover).text_color(t.foreground).text_size(12.8);
    const button = (id, text, primary, action) => h_flex().id(id).h(24).px(10).items_center().border(1)
      .border_color(primary ? tone : t.dim + "99").bg(primary ? tone + "26" : t.popover).text_color(primary ? tone : t.muted)
      .font_semibold().text_size(10.5).cursor_pointer().hover(s => s.bg(primary ? tone + "44" : t.hover)).on_click(action).child(text.toUpperCase());
    const tone = this.mode === "delete" ? t.blocked : CLAUDE;
    if (this.mode === "delete") return root.p(12).gap(10)
      .on_key_down((e, cx) => { if (e.key === "enter") { this.remove(cx); cx.stop_propagation(); } })
      .child(heading(this.trash ? "Move to Trash?" : "Delete permanently?", t.blocked))
      .child(div().text_size(12).text_color(t.muted).child(`${target.name}${target.dir ? " and everything in it" : ""}`))
      .child(h_flex().gap(8).justify_end()
        .child(button("fm-no", "Cancel", false, () => this.close()))
        .child(button("fm-yes", this.trash ? "Move to Trash" : "Delete", true, (_e, cx) => this.remove(cx))));
    if (this.mode !== "menu") return root.p(12).gap(8)
      .child(heading(this.mode === "rename" ? "Rename" : this.mode === "folder" ? "New folder" : "New file", CLAUDE))
      .child(Input.new(this.input).h(30).px(8).rounded(3).border_1().border_color(this.problem ? t.blocked : t.accent).bg(t.background).text_color(t.foreground))
      .child(div().text_size(11).text_color(this.problem ? t.blocked : t.dim).child(this.problem ?? (this.mode === "rename" ? "Enter renames, Esc cancels" : `In ${this.home || target.root.split("/").pop()} · Enter creates`)));
    const item = (id, text, action, color) => h_flex().id(id).h(27).px(8).items_center().rounded(4).cursor_pointer()
      .when(Boolean(color), el => el.text_color(color)).hover(s => s.bg(t.hover)).on_click(action).child(text);
    const line = () => div().mx(7).my(4).h(1).flex_none().bg(t.border);
    const dot = target.dir ? -1 : target.name.lastIndexOf(".");
    return root
      .child(div().px(8).pt(2).pb(3).child(heading(target.name, CLAUDE)))
      .child(item("fm-file", "New file…", (_e, cx) => this.ask(cx, "file", "")))
      .child(item("fm-folder", "New folder…", (_e, cx) => this.ask(cx, "folder", "")))
      .child(line())
      .child(item("fm-path", "Copy path", (_e, cx) => this.copy(cx, this.full)))
      .when(entry, el => el
        .child(item("fm-rel", "Copy relative path", (_e, cx) => this.copy(cx, target.path)))
        .child(item("fm-name", "Copy name", (_e, cx) => this.copy(cx, target.name))))
      .when(mac, el => el.child(item("fm-reveal", "Reveal in Finder", () => { exec("open", entry ? ["-R", this.full] : [this.full]); this.close(); })))
      .when(entry, el => el
        .child(line())
        .child(item("fm-rename", "Rename…", (_e, cx) => this.ask(cx, "rename", target.name, dot > 0 ? dot : undefined)))
        .child(item("fm-dup", "Duplicate", (_e, cx) => this.act(cx, "Duplicate failed", () => this.sh(DUPLICATE, this.full), {})))
        .child(line())
        .child(item("fm-delete", this.trash ? "Move to Trash…" : "Delete…", (_e, cx) => { this.mode = "delete"; this.handle.focus(); cx.notify(); }, t.blocked)));
  }
}
