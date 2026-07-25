import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

/**
 * Renders its children directly into document.body via a React Portal.
 *
 * Why this exists: modals rendered inline inside components can get
 * visually trapped behind sibling content if any ancestor establishes
 * a CSS stacking context (position: sticky/fixed, transform, filter,
 * opacity < 1, will-change, etc.) — no z-index value can escape that
 * boundary from the inside. Portaling to <body> sidesteps the problem
 * entirely by detaching the modal's painted DOM location from wherever
 * it happens to sit in the component tree.
 */
export default function Portal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
