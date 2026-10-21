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

const PASSWORD_HINT = 'En az 6 karakter; büyük harf, küçük harf, rakam ve özel karakter içermeli.'

// Backend'deki Identity şifre kurallarının aynısı.
function isPasswordValid(password: string) {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  )
}

function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [emailTaken, setEmailTaken] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={from} replace />

  const fullNameError = showErrors && !fullName.trim()
  const emailInvalid = showErrors && !/^\S+@\S+\.\S+$/.test(email.trim())
  const passwordError = showErrors && !isPasswordValid(password)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    setError(null)
    if (!fullName.trim() || !/^\S+@\S+\.\S+$/.test(email.trim()) || !isPasswordValid(password)) return

    setSubmitting(true)
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password })
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError && ('DuplicateEmail' in err.errors || 'DuplicateUserName' in err.errors)) {
        setEmailTaken(true)
      } else if (err instanceof ApiError && err.status === 429) {
        setError(err.message)
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Bilgiler geçersiz. Lütfen alanları kontrol edin.')
      } else {
        setError('Kayıt yapılamadı. Lütfen daha sonra tekrar deneyin.')
      }
      setSubmitting(false)
    }
  }

  return (
    <Container maxWidth="xs" disableGutters>
      <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate>
        <Typography variant="h4" component="h1">
          Kayıt ol
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Ad soyad"
          autoComplete="name"
          required
          autoFocus
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fullNameError}
          helperText={fullNameError ? 'Ad soyad gerekli.' : undefined}
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          label="E-posta"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            setEmailTaken(false)
          }}
          error={emailInvalid || emailTaken}
          helperText={
            emailTaken
              ? 'Bu e-posta zaten kayıtlı.'
              : emailInvalid
                ? 'Geçerli bir e-posta girin.'
                : undefined
          }
        />
        <TextField
          label="Şifre"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          helperText={PASSWORD_HINT}
        />
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Kayıt yapılıyor…' : 'Kayıt ol'}
        </Button>
        <Typography variant="body2">
          Zaten hesabın var mı?{' '}
          <MuiLink component={Link} to="/login" state={location.state}>
            Giriş yap
          </MuiLink>
        </Typography>
      </Stack>
    </Container>
  )
}

export default RegisterPage
