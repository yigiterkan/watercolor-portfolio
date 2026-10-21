import Alert from '@mui/material/Alert'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import type { Role } from '../auth/types.ts'

function ProtectedRoute({ role }: { role?: Role }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (role && !user.roles.includes(role)) {
    return <Alert severity="error">Bu sayfayı görüntüleme yetkiniz yok.</Alert>
  }

  return <Outlet />
}

export default ProtectedRoute
