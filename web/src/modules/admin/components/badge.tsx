interface BadgeProps {
  children: React.ReactNode;
  className?: string;
}

export function Badge({ children, className = '' }: BadgeProps) {
  return (
    <span className={`px-2 py-1 rounded-full text-sm ${className}`}>
      {children}
    </span>
  );
}
