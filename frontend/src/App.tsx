import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSession } from './state/session'
import AppShell from './app/AppShell'
import WizardLayout from './app/WizardLayout'
import Language from './screens/Language'
import Login from './screens/Login'
import Consent from './screens/Consent'
import Connect from './screens/Connect'
import Processing from './screens/Processing'
import Review from './screens/Review'
import Dashboard from './screens/Dashboard'
import Loans from './screens/Loans'
import MyLoan from './screens/MyLoan'
import Money from './screens/Money'
import Privacy from './screens/Privacy'
import NotFound from './screens/NotFound'

const Landing = lazy(() => import('./site/Landing'))
const FairnessLab = lazy(() => import('./site/FairnessLab'))
const ChartsGallery = lazy(() => import('./site/ChartsGallery'))
const LenderLogin = lazy(() => import('./screens/LenderLogin'))
const LenderDashboard = lazy(() => import('./screens/LenderDashboard'))

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useSession()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

const redirects: Record<string, string> = {
  '/app/start': '/language',
  '/score': '/app/dashboard',
  '/review': '/app/transactions',
  '/loans': '/app/loans',
  '/loan': '/app/loan',
  '/money': '/app/money',
  '/privacy': '/app/privacy',
}

export default function App() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted">…</div>}>
      <Routes>
        <Route path="/" element={<Landing />} />
        {Object.entries(redirects).map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route element={<WizardLayout />}>
          <Route path="/language" element={<Language />} />
          <Route path="/login" element={<Login />} />
          <Route path="/consent" element={<RequireAuth><Consent /></RequireAuth>} />
          <Route path="/connect" element={<RequireAuth><Connect /></RequireAuth>} />
          <Route path="/processing" element={<RequireAuth><Processing /></RequireAuth>} />
        </Route>
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="transactions" element={<Review />} />
          <Route path="loans" element={<Loans />} />
          <Route path="loan" element={<MyLoan />} />
          <Route path="money" element={<Money />} />
          <Route path="privacy" element={<Privacy />} />
        </Route>
        <Route path="/fairness" element={<FairnessLab />} />
        <Route path="/dev/charts" element={<ChartsGallery />} />
        <Route path="/lender/login" element={<LenderLogin />} />
        <Route path="/lender" element={<LenderDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}
