import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useSession } from './state/session'
import PhoneFrame from './components/PhoneFrame'
import Language from './screens/Language'
import Login from './screens/Login'
import Consent from './screens/Consent'
import Connect from './screens/Connect'
import Processing from './screens/Processing'
import Review from './screens/Review'
import Score from './screens/Score'
import Loans from './screens/Loans'
import MyLoan from './screens/MyLoan'
import NotFound from './screens/NotFound'

function RequireAuth({ children }: { children: JSX.Element }) {
  const { token } = useSession()
  const location = useLocation()
  if (!token) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}

function RootRedirect() {
  const { token, language } = useSession()
  if (!language) return <Navigate to="/language" replace />
  if (!token) return <Navigate to="/login" replace />
  return <Navigate to="/score" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route element={<PhoneFrame />}>
        <Route path="/language" element={<Language />} />
        <Route path="/login" element={<Login />} />
        <Route path="/consent" element={<RequireAuth><Consent /></RequireAuth>} />
        <Route path="/connect" element={<RequireAuth><Connect /></RequireAuth>} />
        <Route path="/processing" element={<RequireAuth><Processing /></RequireAuth>} />
        <Route path="/review" element={<RequireAuth><Review /></RequireAuth>} />
        <Route path="/score" element={<RequireAuth><Score /></RequireAuth>} />
        <Route path="/loans" element={<RequireAuth><Loans /></RequireAuth>} />
        <Route path="/loan" element={<RequireAuth><MyLoan /></RequireAuth>} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
