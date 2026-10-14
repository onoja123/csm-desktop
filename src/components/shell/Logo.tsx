import { LogoMark } from './LogoMark';

export function Logo() {
  return (
    <span className="logo" aria-label="csm">
      <LogoMark />

      <span className="logo__word" aria-hidden="true">
        csm
      </span>
    </span>
  );
}
