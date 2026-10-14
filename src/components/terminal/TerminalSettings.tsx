import { Panel, Row, Toggle } from '@/components/ui';
import { useTerminal } from '@/terminal/store';
import { DEFAULT_SETTINGS } from '@/terminal/types';

const FONTS = [
  { label: 'Geist Mono', value: DEFAULT_SETTINGS.fontFamily },
  { label: 'JetBrains Mono', value: "'JetBrains Mono Variable', 'JetBrains Mono', 'SF Mono', ui-monospace, Menlo, monospace" },
  { label: 'SF Mono', value: "'SF Mono', ui-monospace, Menlo, monospace" },
  { label: 'Menlo', value: 'Menlo, monospace' },
  { label: 'IBM Plex Mono', value: "'IBM Plex Mono', ui-monospace, monospace" },
  { label: 'Cascadia Code', value: "'Cascadia Code', ui-monospace, monospace" },
  { label: 'Iosevka', value: 'Iosevka, ui-monospace, monospace' },
];

export function TerminalSettingsPanel() {
  const { settings, updateSettings, shells, homeDir } = useTerminal();
  return (
    <Panel>
      <Row label="Font">
        <select className="input input--sm" value={settings.fontFamily} onChange={(e) => updateSettings({ fontFamily: e.target.value })}>
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Font size">
        <input className="input input--sm" style={{ width: 80 }} type="number" min={9} max={24} value={settings.fontSize} onChange={(e) => updateSettings({ fontSize: Number(e.target.value) || 13 })} />
      </Row>
      <Row label="Line height">
        <input className="input input--sm" style={{ width: 80 }} type="number" step={0.05} min={1} max={2} value={settings.lineHeight} onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) || 1.3 })} />
      </Row>
      <Row label="Cursor">
        <div className="segmented">
          {(['bar', 'block', 'underline'] as const).map((c) => (
            <button key={c} className={`segmented__item ${settings.cursorStyle === c ? 'segmented__item--active' : ''}`} onClick={() => updateSettings({ cursorStyle: c })}>
              {c}
            </button>
          ))}
        </div>
      </Row>
      <Row label="Cursor blink">
        <Toggle checked={settings.cursorBlink} onChange={(v) => updateSettings({ cursorBlink: v })} />
      </Row>
      <Row label="Scrollback">
        <select className="input input--sm" value={settings.scrollback} onChange={(e) => updateSettings({ scrollback: Number(e.target.value) as 10000 })}>
          {[10000, 25000, 50000, 100000].map((n) => (
            <option key={n} value={n}>
              {n.toLocaleString()} lines
            </option>
          ))}
        </select>
      </Row>
      <Row label="Shell">
        <select className="input input--sm" value={settings.shell} onChange={(e) => updateSettings({ shell: e.target.value })}>
          <option value="">Default ({shells.find((s) => s.is_default)?.name ?? 'login shell'})</option>
          {shells.map((s) => (
            <option key={s.path} value={s.path}>
              {s.name} · {s.path}
            </option>
          ))}
        </select>
      </Row>
      <Row label="Working directory">
        <input className="input input--sm mono" value={settings.defaultCwd} placeholder={homeDir || '~'} onChange={(e) => updateSettings({ defaultCwd: e.target.value })} />
      </Row>
      <Row label="Copy on select">
        <Toggle checked={settings.copyOnSelect} onChange={(v) => updateSettings({ copyOnSelect: v })} />
      </Row>
      <Row label="Confirm closing a running process">
        <Toggle checked={settings.confirmCloseRunning} onChange={(v) => updateSettings({ confirmCloseRunning: v })} />
      </Row>
    </Panel>
  );
}
