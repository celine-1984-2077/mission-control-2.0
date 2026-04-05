interface FlowArrowProps {
  active?: boolean
}

export function FlowArrow({ active = false }: FlowArrowProps) {
  return (
    <svg
      className={`flow-arrow ${active ? 'flow-arrow-active' : ''}`.trim()}
      width="24"
      height="16"
      viewBox="0 0 24 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M0 8h18M13 2l6 6-6 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
