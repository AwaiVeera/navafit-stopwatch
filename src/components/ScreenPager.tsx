import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

interface ScreenPagerProps {
  children: ReactNode
  ariaLabel?: string
  /** Optional controlled starting page index. */
  initialPage?: number
}

/**
 * Horizontal, scroll-free pager. Each child should be a <ScreenPage>.
 * Pages snap one-per-viewport; a dot indicator reflects and controls position.
 */
export function ScreenPager({ children, ariaLabel, initialPage = 0 }: ScreenPagerProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(initialPage)

  const pages = Children.toArray(children).filter(isValidElement)
  const pageCount = pages.length

  const scrollToPage = useCallback((index: number) => {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    const track = trackRef.current
    if (!track || initialPage <= 0) return
    track.scrollLeft = initialPage * track.clientWidth
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) return
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null
      const track = trackRef.current
      if (!track || track.clientWidth === 0) return
      const next = Math.round(track.scrollLeft / track.clientWidth)
      setActiveIndex((prev) => (prev === next ? prev : next))
    })
  }, [])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <div className="screen-pager" role="group" aria-label={ariaLabel}>
      {pageCount > 1 && (
        <PageDots count={pageCount} activeIndex={activeIndex} onSelect={scrollToPage} />
      )}
      <div className="screen-pager-track" ref={trackRef} onScroll={handleScroll}>
        {pages}
      </div>
    </div>
  )
}

interface ScreenPageProps {
  children: ReactNode
  /** Optional single CTA pinned to the bottom of the page. */
  cta?: ReactNode
  className?: string
}

export function ScreenPage({ children, cta, className }: ScreenPageProps) {
  return (
    <section className={`screen-page${className ? ` ${className}` : ''}`}>
      <div className="screen-page-inner">{children}</div>
      {cta ? <div className="screen-page-cta">{cta}</div> : null}
    </section>
  )
}

interface PageDotsProps {
  count: number
  activeIndex: number
  onSelect: (index: number) => void
}

export function PageDots({ count, activeIndex, onSelect }: PageDotsProps) {
  return (
    <div className="page-dots" role="tablist" aria-label="Pages">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          role="tab"
          aria-selected={index === activeIndex}
          aria-label={`Go to page ${index + 1}`}
          className={`page-dot${index === activeIndex ? ' page-dot--active' : ''}`}
          onClick={() => onSelect(index)}
        />
      ))}
    </div>
  )
}
