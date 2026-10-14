import { memo, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { SearchAddon } from '@xterm/addon-search';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Unicode11Addon } from '@xterm/addon-unicode11';
import { WebglAddon } from '@xterm/addon-webgl';
import { openUrl } from '@tauri-apps/plugin-opener';
import '@xterm/xterm/css/xterm.css';
import { handles } from '@/terminal/handles';
import { parseOsc7 } from '@/terminal/osc';
import { pty } from '@/terminal/pty';
import { useTerminal } from '@/terminal/store';
import type { ShellPane, TerminalSettings } from '@/types';
import { Button } from '@/components/ui';

const THEME = {
  background: '#0a0a0a',
  foreground: '#d4d4d0',
  cursor: '#ededea',
  cursorAccent: '#0a0a0a',
  selectionBackground: 'rgba(255,255,255,0.2)',
  selectionInactiveBackground: 'rgba(255,255,255,0.12)',
  black: '#101010',
  brightBlack: '#565653',
  white: '#d4d4d0',
  brightWhite: '#ffffff',
  red: '#f87171',
  brightRed: '#fca5a5',
  green: '#4ade80',
  brightGreen: '#86efac',
  yellow: '#fbbf24',
  brightYellow: '#fde68a',
  blue: '#93c5fd',
  brightBlue: '#bfdbfe',
  magenta: '#c4b5fd',
  brightMagenta: '#ddd6fe',
  cyan: '#67e8f9',
  brightCyan: '#a5f3fc',
};

let autorunDone = false;

// One xterm instance per shell pane. The renderer owns the buffer; React only knows the pane's title, cwd and exit state.
export const ShellTerminal = memo(function ShellTerminal({
  pane,
  active,
  settings,
}: {
  pane: ShellPane;
  active: boolean;
  settings: TerminalSettings;
}) {
  const host = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>(null);
  const { setPaneTitle, setPaneCwd, focusPane, restartShell } = useTerminal();
  const sessionId = pane.sessionId;

  useEffect(() => {
    const el = host.current;

    if (!el || !sessionId) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      lineHeight: settings.lineHeight,
      cursorStyle: settings.cursorStyle,
      cursorBlink: settings.cursorBlink,
      scrollback: settings.scrollback,
      allowProposedApi: true,
      macOptionIsMeta: true,
      macOptionClickForcesSelection: true,
      scrollOnUserInput: true,
      smoothScrollDuration: 0,
      minimumContrastRatio: 1,
    });

    const fit = new FitAddon();
    const search = new SearchAddon();

    term.loadAddon(fit);
    term.loadAddon(search);
    term.loadAddon(new Unicode11Addon());
    term.unicode.activeVersion = '11';
    term.loadAddon(new WebLinksAddon((_e, uri) => void openUrl(uri).catch(() => undefined)));
    term.open(el);

    try {
      const webgl = new WebglAddon();

      webgl.onContextLoss(() => webgl.dispose());
      term.loadAddon(webgl);
    } catch {
      // the DOM renderer is the fallback
    }

    termRef.current = term;
    handles.set(pane.id, { term, search, fit: () => fit.fit() });

    const doFit = () => {
      try {
        fit.fit();
        void pty.resize(sessionId, term.cols, term.rows);
      } catch {
        // detached
      }
    };

    const ro = new ResizeObserver(() => doFit());

    ro.observe(el);
    doFit();

    const disposables = [
      term.onData((d) => void pty.writeText(sessionId, d)),
      term.onBinary(
        (d) =>
          void pty.writeBytes(
            sessionId,
            Uint8Array.from(d, (c) => c.charCodeAt(0)),
          ),
      ),
      term.onTitleChange((t) => setPaneTitle(pane.id, t)),
      term.onSelectionChange(() => {
        if (settings.copyOnSelect && term.hasSelection())
          void navigator.clipboard.writeText(term.getSelection()).catch(() => undefined);
      }),
      term.parser.registerOscHandler(7, (data) => {
        const cwd = parseOsc7(data);

        if (cwd) setPaneCwd(pane.id, cwd);

        return true;
      }),
      term.parser.registerOscHandler(133, () => true),
    ];

    const onFocus = () => focusPane(pane.id);

    term.textarea?.addEventListener('focus', onFocus);

    let unlisten: (() => void) | undefined;
    let disposed = false;

    void pty
      .onOutput(sessionId, (bytes) => term.write(bytes))
      .then(async (fn) => {
        unlisten = fn;
        if (disposed) return fn();

        const held = await pty.attach(sessionId).catch(() => new Uint8Array());

        if (!disposed && held.length) term.write(held);
      });

    // Development only: type a command into the first shell so a dev session can be screenshotted without a keyboard.
    const autorun = import.meta.env.DEV
      ? (import.meta.env.VITE_TERMINAL_AUTORUN as string | undefined)
      : undefined;

    if (autorun && !autorunDone) {
      autorunDone = true;
      setTimeout(() => void pty.writeText(sessionId, autorun + '\n'), 1500);
    }

    return () => {
      disposed = true;
      unlisten?.();
      disposables.forEach((d) => d.dispose());
      term.textarea?.removeEventListener('focus', onFocus);
      ro.disconnect();
      handles.delete(pane.id);
      term.dispose();
      termRef.current = null;
    };
    // Settings that change renderer options are applied in the effect below; a new session remounts the terminal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, pane.id]);

  useEffect(() => {
    const term = termRef.current;

    if (!term) return;

    term.options.fontFamily = settings.fontFamily;
    term.options.fontSize = settings.fontSize;
    term.options.lineHeight = settings.lineHeight;
    term.options.cursorStyle = settings.cursorStyle;
    term.options.cursorBlink = settings.cursorBlink;
    term.options.scrollback = settings.scrollback;
    handles.get(pane.id)?.fit();
  }, [settings, pane.id]);

  useEffect(() => {
    if (active) termRef.current?.focus();
  }, [active, sessionId]);

  return (
    <div
      className={`shell-pane ${active ? 'shell-pane--active' : ''}`}
      onMouseDown={() => focusPane(pane.id)}
    >
      <div ref={host} className="shell-pane__term" />

      {pane.exited ? (
        <div className="shell-pane__exited">
          <span>
            Terminal process exited{pane.exited.code !== null ? ` (${pane.exited.code})` : ''}
          </span>

          <Button size="sm" variant="primary" onClick={() => void restartShell(pane.id)}>
            Restart shell
          </Button>
        </div>
      ) : null}
    </div>
  );
});
