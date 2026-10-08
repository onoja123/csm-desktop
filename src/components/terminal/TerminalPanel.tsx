import { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { api } from '@/lib/api';
import { decodeBase64, encodeBase64, outputBus } from '@/lib/output-bus';

const THEME = {
  background: '#050505',
  foreground: '#d4d4d4',
  cursor: '#f5f5f5',
  cursorAccent: '#050505',
  selectionBackground: 'rgba(255,255,255,0.18)',
  black: '#101010',
  brightBlack: '#525252',
  white: '#d4d4d4',
  brightWhite: '#ffffff',
  red: '#f87171',
  brightRed: '#f87171',
  green: '#4ade80',
  brightGreen: '#4ade80',
  yellow: '#fbbf24',
  brightYellow: '#fbbf24',
  blue: '#a3a3a3',
  brightBlue: '#d4d4d4',
  magenta: '#a3a3a3',
  brightMagenta: '#d4d4d4',
  cyan: '#a3a3a3',
  brightCyan: '#d4d4d4',
};

// The panel is a plain terminal over the run's pseudo-terminal: bytes in, bytes out, nothing interpreted in between.
export function TerminalPanel({ runId, live, onResize }: { runId: string; live: boolean; onResize?: (cols: number, rows: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;

    const term = new Terminal({
      theme: THEME,
      fontFamily: "'JetBrains Mono Variable', 'JetBrains Mono', ui-monospace, Menlo, monospace",
      fontSize: 12.5,
      lineHeight: 1.35,
      letterSpacing: 0,
      cursorBlink: live,
      cursorStyle: 'bar',
      scrollback: 20000,
      allowProposedApi: true,
      macOptionIsMeta: true,
      disableStdin: !live,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(el);
    termRef.current = term;

    let disposed = false;
    const doFit = () => {
      if (disposed) return;
      fit.fit();
      onResize?.(term.cols, term.rows);
    };

    const ro = new ResizeObserver(() => doFit());
    ro.observe(el);
    doFit();

    const inputDisposable = term.onData((data) => {
      if (!live) return;
      void api.sendBytes(runId, encodeBase64(new TextEncoder().encode(data)));
    });

    let replayed = false;
    const buffered: Uint8Array[] = [];
    const unsubscribe = outputBus.subscribe(runId, (bytes) => {
      if (replayed) term.write(bytes);
      else buffered.push(bytes);
    });

    void api
      .runOutput(runId)
      .then((res) => {
        if (disposed) return;
        if (res.data) term.write(decodeBase64(res.data));
      })
      .catch(() => undefined)
      .finally(() => {
        if (disposed) return;
        replayed = true;
        for (const b of buffered) term.write(b);
        buffered.length = 0;
        term.scrollToBottom();
        if (live) term.focus();
      });

    return () => {
      disposed = true;
      unsubscribe();
      inputDisposable.dispose();
      ro.disconnect();
      term.dispose();
      termRef.current = null;
    };
    // The terminal is bound to one run; live only flips when it exits, handled by disableStdin on remount.
  }, [runId, live, onResize]);

  return <div ref={host} className="terminal" data-testid="terminal" />;
}
