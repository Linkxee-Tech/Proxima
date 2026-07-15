export function Card({ className = '', children, ...props }) {
  return <article className={`social-preview-card ${className}`.trim()} {...props}>{children}</article>;
}
