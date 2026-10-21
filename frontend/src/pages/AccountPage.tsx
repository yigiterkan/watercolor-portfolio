import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { useAuth } from '../auth/AuthContext.ts'

function AccountPage() {
  const { user } = useAuth()
  if (!user) return null

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Hesabım
      </Typography>
      <Typography variant="h6" component="p" sx={{ overflowWrap: 'anywhere' }}>
        {user.fullName}
      </Typography>
      <Typography color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
        {user.email}
      </Typography>
      {user.roles.includes('Admin') && <Chip label="Yönetici" color="primary" size="small" />}
    </Stack>
  )
}

export default AccountPage
