export default function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['bg-gray-200 animate-pulse rounded-md', className].join(' ')} />
}
