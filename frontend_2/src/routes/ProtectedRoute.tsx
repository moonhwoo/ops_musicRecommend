import type { ReactNode } from "react";
import { Navigate, useLocation } from 'react-router-dom'
import { isLoggedIn } from '../services/auth'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const ok = isLoggedIn()
  const loc = useLocation()
  if (!ok) return <Navigate to="/login" replace state={{ from: loc.pathname }} />
  return <>{children}</>
}
