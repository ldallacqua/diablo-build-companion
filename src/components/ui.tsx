import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowUpRight,
  Check,
  Diamond,
  Sparkles,
  Swords,
  Shield,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../app/store';
import { fallbackAsset, resolveAsset } from '../services/assets';
import { FrameOrnaments } from './gameTheme';
export function FocusScope({
  children,
  className,
  onEscape,
}: {
  children: ReactNode;
  className: string;
  onEscape?: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const controls = () =>
      Array.from(
        root.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,textarea,select,[tabindex="0"],summary',
        ) ?? [],
      );
    controls()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
      }
      if (event.key !== 'Tab') return;
      const elements = controls().filter((e) => e.offsetParent !== null);
      const first = elements[0],
        last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [onEscape]);
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
export function Logo() {
  return (
    <svg viewBox="0 0 44 48" aria-hidden="true">
      <path d="M22 3 39 13v22L22 45 5 35V13Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="m22 9 11 23H11Zm0 10v19M15 26h14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M22 1v4M22 43v4" stroke="currentColor" />
    </svg>
  );
}
export function Button({
  children,
  onClick,
  variant = 'secondary',
  disabled = false,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`button ${variant} ${className}`}
    >
      {children}
    </button>
  );
}
export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Panel({
  children,
  title,
  eyebrow,
  action,
  className = '',
}: {
  children: ReactNode;
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <FrameOrnaments />
      {(title || eyebrow) && (
        <div className="panel-head">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {title && <h2>{title}</h2>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Empty({
  icon: Icon = Sparkles,
  title,
  children,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-emblem">
        <Icon size={30} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className="meter">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}
export function AssetIcon({
  id,
  icon: Icon,
  className = '',
}: {
  id: string;
  icon?: LucideIcon;
  className?: string;
}) {
  const { state } = useApp();
  const [source, setSource] = useState<string | null>(null);
  const asset = resolveAsset(id, state.assets, state.builds[state.active]?.patch ?? '*');
  useEffect(() => {
    let cancelled = false;
    setSource(null);
    if (asset && window.sanctum)
      void window.sanctum.readAsset(id).then((src) => {
        if (!cancelled) setSource(src);
      });
    return () => {
      cancelled = true;
    };
  }, [id, asset?.checksum]);
  const Fallback =
    Icon ?? { spark: Sparkles, sword: Swords, shield: Shield, diamond: Diamond }[fallbackAsset(id)];
  return (
    <div className={`asset-icon ${className}`}>
      {source ? <img src={source} alt="" /> : <Fallback aria-hidden="true" size={26} />}
    </div>
  );
}
export function CheckRow({
  checked,
  label,
  detail,
  onChange,
}: {
  checked: boolean;
  label: string;
  detail?: string;
  onChange: () => void;
}) {
  return (
    <button
      className={`check-row ${checked ? 'done' : ''}`}
      onClick={onChange}
      aria-pressed={checked}
    >
      <span className="checkbox">{checked && <Check size={14} />}</span>
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  );
}
export function LinkAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button className="link-action" onClick={onClick}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  );
}
