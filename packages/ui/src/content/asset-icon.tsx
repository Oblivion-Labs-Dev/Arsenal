import { cn } from '../lib/cn';

/** `${basePath}/${name}.${ext}` with exactly one slash between parts. */
export function assetIconSrc(basePath: string, name: string, ext = 'webp'): string {
  if (!name) throw new Error('assetIconSrc: name is required');
  const base = basePath.replace(/\/+$/, '');
  return `${base}/${encodeURIComponent(name)}.${ext.replace(/^\./, '')}`;
}

export interface AssetIconProps {
  /** File name without extension, e.g. "trend-up". */
  name: string;
  /** Folder that holds the icons, e.g. "/assets/icons". */
  basePath: string;
  ext?: string;
  size?: number;
  className?: string;
}

/**
 * A decorative raster icon from a folder of same-sized images (clay, 3D or illustrated sets).
 * Hidden from assistive technology: always say the same thing in text next to it.
 */
export function AssetIcon({ name, basePath, ext = 'webp', size = 40, className }: AssetIconProps) {
  return (
    <span
      aria-hidden="true"
      data-icon={name}
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <img
        src={assetIconSrc(basePath, name, ext)}
        alt=""
        width={size}
        height={size}
        decoding="async"
        loading="lazy"
        draggable={false}
        className="block h-full w-full object-contain"
      />
    </span>
  );
}
