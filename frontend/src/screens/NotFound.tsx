import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3 p-8">
      <div className="text-5xl font-bold text-muted">404</div>
      <Link to="/" className="text-brand underline">SahayakFin</Link>
    </div>
  )
}
