import { useEffect, useState } from 'react';
import { Toggle } from '@/components/ui';
import { desktop } from '@/lib/api';
import { minuteOfDay, timeOfDay } from '@/lib/menubar';
import type { LoginItem, MenuBarPrefs, MenuBarPrefsView, NotificationPrefs } from '@/types';

const KINDS: { key: keyof Omit<NotificationPrefs, 'enabled' | 'quiet_hours'>; label: string }[] = [
  { key: 'approvals', label: 'Approval requests' },
  { key: 'failures', label: 'An agent fails' },
  { key: 'rate_limits', label: 'A usage limit is reached' },
  { key: 'auth', label: 'An account needs signing in' },
  { key: 'handoffs', label: 'A handoff fails' },
  { key: 'recovery', label: 'A session moves to another account' },
  { key: 'completed', label: 'An agent finishes' },
];

const DEFAULT_QUIET = { start_minute: 22 * 60, end_minute: 7 * 60 };

function Setting({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="menubar-setting">
      <div className="menubar-setting__text">
        <span className="menubar-setting__label">{label}</span>
        {hint ? <span className="menubar-setting__hint">{hint}</span> : null}
      </div>
      {children}
    </div>
  );
}

export function MenuBarSettings() {
  const [view, setView] = useState<MenuBarPrefsView>();
  const [login, setLogin] = useState<LoginItem>();
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void desktop
      .prefs()
      .then(setView)
      .catch((e) => setError(String(e)));

    void desktop
      .loginItem()
      .then(setLogin)
      .catch((e) => setError(String(e)));
  }, []);

  const save = async (prefs: MenuBarPrefs) => {
    setSaving(true);
    setError(undefined);

    try {
      setView(await desktop.setPrefs(prefs));
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const toggleLogin = async (enabled: boolean) => {
    setError(undefined);

    try {
      setLogin(await desktop.setLoginItem(enabled));
    } catch (e) {
      setError(String(e));
    }
  };

  if (!view) {
    return <p className="menubar__empty">{error ?? 'Loading settings…'}</p>;
  }

  const { prefs } = view;
  const n = prefs.notifications;

  const setNotifications = (patch: Partial<NotificationPrefs>) =>
    void save({ ...prefs, notifications: { ...n, ...patch } });

  return (
    <div className="menubar-settings" aria-busy={saving}>
      {error ? <p className="menubar__error">{error}</p> : null}

      <section className="menubar__section">
        <h4 className="menubar__label">Notifications</h4>

        <Setting
          label="Show notifications"
          hint="macOS also decides whether they appear: System Settings › Notifications."
        >
          <Toggle
            checked={n.enabled}
            label="Show notifications"
            onChange={(v) => setNotifications({ enabled: v })}
          />
        </Setting>

        {KINDS.map((k) => (
          <Setting key={k.key} label={k.label}>
            <Toggle
              checked={n.enabled && n[k.key]}
              label={k.label}
              onChange={(v) => setNotifications({ [k.key]: v })}
            />
          </Setting>
        ))}

        <Setting
          label="Quiet hours"
          hint="No CSM notifications in this window; the menu bar count still updates."
        >
          <Toggle
            checked={!!n.quiet_hours}
            label="Quiet hours"
            onChange={(v) => setNotifications({ quiet_hours: v ? DEFAULT_QUIET : null })}
          />
        </Setting>

        {n.quiet_hours ? (
          <div className="menubar-setting menubar-setting--times">
            <label>
              From
              <input
                type="time"
                value={timeOfDay(n.quiet_hours.start_minute)}
                onChange={(e) =>
                  setNotifications({
                    quiet_hours: { ...n.quiet_hours!, start_minute: minuteOfDay(e.target.value) },
                  })
                }
              />
            </label>
            <label>
              to
              <input
                type="time"
                value={timeOfDay(n.quiet_hours.end_minute)}
                onChange={(e) =>
                  setNotifications({
                    quiet_hours: { ...n.quiet_hours!, end_minute: minuteOfDay(e.target.value) },
                  })
                }
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="menubar__section">
        <h4 className="menubar__label">Menu bar</h4>

        <Setting label="Recently finished" hint="How many finished sessions the panel lists.">
          <select
            className="menubar-select"
            value={prefs.recent_limit}
            aria-label="Recently finished sessions shown"
            onChange={(e) => void save({ ...prefs, recent_limit: Number(e.target.value) })}
          >
            {[0, 3, 5, 10].map((v) => (
              <option key={v} value={v}>
                {v === 0 ? 'None' : v}
              </option>
            ))}
          </select>
        </Setting>

        {view.dock_supported ? (
          <Setting
            label="Show CSM in the Dock"
            hint="When off, CSM lives only in the menu bar; Open CSM still brings the window back."
          >
            <Toggle
              checked={prefs.show_in_dock}
              label="Show CSM in the Dock"
              onChange={(v) => void save({ ...prefs, show_in_dock: v })}
            />
          </Setting>
        ) : null}

        <Setting
          label="Open at login"
          hint={
            login?.error
              ? login.error
              : login?.supported === false
                ? 'Not available for this installation.'
                : 'Starts CSM in the menu bar when you log in.'
          }
        >
          <Toggle
            checked={!!login?.enabled}
            label="Open at login"
            onChange={(v) => void toggleLogin(v)}
          />
        </Setting>
      </section>
    </div>
  );
}
