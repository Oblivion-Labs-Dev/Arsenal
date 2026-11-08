import { cn } from '../lib/cn';
import type { TocItem } from './reading';

export interface TableOfContentsProps {
  items: readonly TocItem[];
  /** "minimal": quiet rail with an "On this page" label. "default": a boxed "Contents" list. */
  variant?: 'minimal' | 'default';
  title?: string;
  /** Id of the section currently in view, highlighted in the list. */
  activeId?: string;
  className?: string;
}

/** In-page navigation for long articles. Renders nothing when there are no headings. */
export function TableOfContents({
  items,
  variant = 'minimal',
  title,
  activeId,
  className,
}: TableOfContentsProps) {
  if (items.length === 0) return null;
  const minimal = variant === 'minimal';
  const heading = title ?? (minimal ? 'On this page' : 'Contents');

  return (
    <nav
      aria-label={heading}
      className={cn(
        'text-sm',
        !minimal && 'rounded-arsenal border border-arsenal-border bg-arsenal-surface p-4',
        className,
      )}
    >
      <p
        className={cn(
          'm-0 mb-3 font-medium',
          minimal
            ? 'text-xs uppercase tracking-[0.12em] text-arsenal-muted'
            : 'text-arsenal-primary',
        )}
      >
        {heading}
      </p>
      <ul className={cn('m-0 list-none p-0', minimal && 'border-l border-arsenal-border')}>
        {items.map((item) => {
          const active = item.id === activeId;
          return (
            <li key={item.id} className={cn(item.level === 3 && (minimal ? 'pl-3' : 'pl-4'))}>
              <a
                href={`#${item.id}`}
                aria-current={active ? 'location' : undefined}
                className={cn(
                  'block py-1 no-underline transition-colors hover:text-arsenal-primary',
                  minimal && '-ml-px border-l pl-3',
                  minimal && (active ? 'border-arsenal-accent' : 'border-transparent'),
                  item.level === 3 && 'text-[13px]',
                  active ? 'text-arsenal-primary' : 'text-arsenal-secondary',
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
