import { cn } from '../lib/cn';
import { AVATAR_HUES, avatarColor, initialsFor } from './avatar';

export interface InitialsAvatarProps {
  /** Person or sender name; an email works too. */
  name: string;
  /** What decides the color; defaults to `name`. Use a domain to color a whole company alike. */
  seed?: string;
  size?: number;
  /** How many initials to show. Default 1. */
  letters?: number;
  palette?: readonly string[];
  /** Announce the name to screen readers. Off when the name is already shown beside it. */
  label?: boolean;
  className?: string;
}

/** Round avatar with initials on a deterministic deep hue. */
export function InitialsAvatar({
  name,
  seed,
  size = 28,
  letters = 1,
  palette = AVATAR_HUES,
  label = false,
  className,
}: InitialsAvatarProps) {
  const text = initialsFor(name, letters);
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label ? name : undefined}
      aria-hidden={label ? undefined : true}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold leading-none text-white',
        'shadow-[0_1px_2px_rgba(0,0,0,0.12)] ring-1 ring-inset ring-black/10',
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: avatarColor(seed ?? name, palette),
        fontSize: Math.max(10, Math.round(size * (text.length > 1 ? 0.38 : 0.46))),
      }}
    >
      {text}
    </span>
  );
}
