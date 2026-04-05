interface TagProps {
  label: string
  onRemove?: () => void
}

export function Tag({ label, onRemove }: TagProps) {
  return (
    <span className="task-tag">
      {label}
      {onRemove && (
        <button className="task-tag-remove" onClick={onRemove} aria-label={`Remove tag ${label}`}>×</button>
      )}
    </span>
  )
}
