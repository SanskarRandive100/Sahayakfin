export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['bg-tint animate-pulse rounded-md', className].join(' ')} />
}
