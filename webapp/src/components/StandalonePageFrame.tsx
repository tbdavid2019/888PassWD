import type { ComponentChildren } from 'preact';
import { APP_VERSION } from '@shared/app-version';
import StandaloneLanguagePicker from './StandaloneLanguagePicker';

interface StandalonePageFrameProps {
  title?: string;
  eyebrow?: ComponentChildren;
  titleAccessory?: ComponentChildren;
  children: ComponentChildren;
}

export default function StandalonePageFrame(props: StandalonePageFrameProps) {
  return (
    <div className="standalone-shell">
      <div className="standalone-top-bar">
        <StandaloneLanguagePicker />
      </div>

      <div className="standalone-brand standalone-brand-outside">
        <img src="/nodewarden-logo.svg" alt="888 PassWD logo" className="standalone-brand-logo" />
        <div className="standalone-brand-title">
          <span className="brand-title-number">888</span>
          <span className="brand-title-word">PassWD</span>
        </div>
      </div>

      <div className="auth-card">
        {props.eyebrow && <div className="standalone-eyebrow">{props.eyebrow}</div>}
        {props.title ? (
          <div className="standalone-title-row">
            <h1 className="standalone-title">{props.title}</h1>
            {props.titleAccessory}
          </div>
        ) : null}
        {props.children}
      </div>

      <div className="standalone-footer">
        <a href="https://github.com/tbdavid2019/888PassWD" target="_blank" rel="noreferrer">888 PassWD Repository</a>
        <span> | </span>
        <a
          href="https://github.com/tbdavid2019/888PassWD/blob/main/CHANGELOG.md"
          target="_blank"
          rel="noreferrer"
          className="standalone-version"
        >
          v{APP_VERSION}
        </a>
      </div>
    </div>
  );
}
