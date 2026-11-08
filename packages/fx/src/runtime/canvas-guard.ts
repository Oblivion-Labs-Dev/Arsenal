/**
 * Stops expensive canvas loops when the tab is in the background or the canvas
 * is far off-screen — major win for scroll jank and laptop fans.
 */
export function bindCanvasRunState(
  element: HTMLElement,
  onChange: (run: boolean) => void,
  options?: { rootMargin?: string },
): () => void {
  let tabVisible = !document.hidden
  let inView = true

  const emit = () => {
    onChange(tabVisible && inView)
  }

  const onVisibility = () => {
    tabVisible = !document.hidden
    emit()
  }
  document.addEventListener('visibilitychange', onVisibility)

  let io: IntersectionObserver | null = null
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        inView = e ? e.isIntersecting : false
        emit()
      },
      {
        root: null,
        rootMargin: options?.rootMargin ?? '120px 0px',
        threshold: 0,
      },
    )
    io.observe(element)
  }

  emit()

  return () => {
    document.removeEventListener('visibilitychange', onVisibility)
    io?.disconnect()
  }
}

/** Cap retina backing store — 2× costs 4× pixels with little gain on small canvases. */
export function canvasBackingDpr(max?: number): number {
  if (typeof window === 'undefined') return 1
  const cap = max ?? (window.innerWidth < 640 ? 1.25 : 1.5)
  return Math.min(window.devicePixelRatio || 1, cap)
}
