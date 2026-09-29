// The one empty-state treatment (CMP-07): optional icon, title, one line, actions.
export function EmptyState({ icon: Icon, title, children, actions }) {
  return (
    <div className="empty-state">
      {Icon && <Icon size={24} strokeWidth={1.75} aria-hidden="true" />}
      {title && <h3>{title}</h3>}
      {children && <p>{children}</p>}
      {actions && <div className="button-row">{actions}</div>}
    </div>
  );
}
