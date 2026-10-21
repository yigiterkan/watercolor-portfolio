import { useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import MuiLink from '@mui/material/Link'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client.ts'
import { useAuth } from '../auth/AuthContext.ts'

function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={from} replace />

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login({ email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      setError(
        err instanceof ApiError && (err.status === 401 || err.status === 400)
          ? 'E-posta veya şifre hatalı.'
          : err instanceof ApiError && err.status === 429
            ? err.message
            : 'Giriş yapılamadı. Lütfen daha sonra tekrar deneyin.',
      )
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="xs" disableGutters>
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        <Typography variant="h4" component="h1">
          Giriş yap
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="E-posta"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <TextField
          label="Şifre"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting || !email || !password}>
          {submitting ? 'Giriş yapılıyor…' : 'Giriş yap'}
        </Button>
        <Typography variant="body2">
          Hesabın yok mu?{' '}
          <MuiLink component={Link} to="/register" state={location.state}>
            Kayıt ol
          </MuiLink>
        </Typography>
      </Stack>
    </Container>
  )
}

export default LoginPage
