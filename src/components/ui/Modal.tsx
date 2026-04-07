import { useEffect, type MouseEvent, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  wide?: boolean
  children: ReactNode
  noBackdropClose?: boolean
}

export function Modal({ open, onClose, wide = false, children, noBackdropClose = false }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function handleBackdrop(e: MouseEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return
    if (noBackdropClose) return
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={handleBackdrop} role="dialog" aria-modal>
      <div className={`modal-card ${wide ? 'modal-card-wide' : ''}`.trim()}>
        {children}
      </div>
    </div>
  )
}
