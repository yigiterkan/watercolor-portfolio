import { startTransition, useState, type FormEvent } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api/client.ts'
import { createOrder } from '../api/orders.ts'
import { useCart } from '../cart/CartContext.ts'
import { useCartLines } from '../cart/useCartLines.ts'
import Loading from '../components/Loading.tsx'
import { formatPrice } from '../utils/format.ts'
import { variantLabel } from '../utils/variant.ts'

function CheckoutPage() {
  const { items, clear } = useCart()
  const { lines, total, hasStockProblem, loading, error: loadError } = useCartLines()
  const navigate = useNavigate()

  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (items.length === 0) return <Navigate to="/cart" replace />
  if (loadError) return <Alert severity="error">Sepet yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
  if (loading) return <Loading />
  if (hasStockProblem) return <Navigate to="/cart" replace />

  const addressError = showErrors && !address.trim()
  const cityError = showErrors && !city.trim()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    setError(null)
    if (!address.trim() || !city.trim()) return

    setSubmitting(true)
    try {
      const order = await createOrder({
        items: lines.map((line) => ({ variantId: line.variant.id, quantity: line.quantity })),
        shippingAddress: address.trim(),
        shippingCity: city.trim(),
      })
      // Sipariş sayfası açılınca kullanıcı oradan ödeme sayfasına yönlendirilir.
      navigate(`/orders/${order.id}`, { replace: true, state: { startPayment: true } })
      // Sepeti, sayfa geçişiyle aynı transition'da boşalt; yoksa yukarıdaki
      // "sepet boşsa /cart'a git" kontrolü araya girer.
      startTransition(clear)
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? `${err.message} Lütfen sepetinizi güncelleyin.`
          : 'Sipariş oluşturulamadı. Lütfen daha sonra tekrar deneyin.',
      )
      setSubmitting(false)
    }
  }

  return (
    <Stack component="form" spacing={3} onSubmit={handleSubmit} noValidate sx={{ maxWidth: 720 }}>
      <Typography variant="h4" component="h1">
        Siparişi tamamla
      </Typography>
      {error && (
        <Alert
          severity="error"
          action={
            <Button component={Link} to="/cart" color="inherit" size="small">
              Sepete dön
            </Button>
          }
        >
          {error}
        </Alert>
      )}
      <Paper variant="outlined" sx={{ px: 2 }}>
        <Stack divider={<Divider />}>
          {lines.map((line) => (
            <Stack
              key={line.variant.id}
              direction="row"
              spacing={2}
              sx={{ py: 1.5, justifyContent: 'space-between' }}
            >
              <Stack sx={{ minWidth: 0 }}>
                <Typography sx={{ overflowWrap: 'anywhere' }}>
                  {line.artwork.title}
                  {line.quantity > 1 && ` × ${line.quantity}`}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {variantLabel(line.variant.type, line.variant.widthCm, line.variant.heightCm)}
                </Typography>
              </Stack>
              <Typography sx={{ flexShrink: 0 }}>{formatPrice(line.variant.price * line.quantity)}</Typography>
            </Stack>
          ))}
          <Stack direction="row" sx={{ py: 1.5, justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 500 }}>Toplam</Typography>
            <Typography sx={{ fontWeight: 500 }}>{formatPrice(total)}</Typography>
          </Stack>
        </Stack>
      </Paper>
      <TextField
        label="Teslimat adresi"
        autoComplete="street-address"
        required
        multiline
        minRows={3}
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        error={addressError}
        helperText={addressError ? 'Teslimat adresi gerekli.' : undefined}
        slotProps={{ htmlInput: { maxLength: 500 } }}
      />
      <TextField
        label="Şehir"
        autoComplete="address-level1"
        required
        value={city}
        onChange={(event) => setCity(event.target.value)}
        error={cityError}
        helperText={cityError ? 'Şehir gerekli.' : undefined}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <Typography variant="body2" color="text.secondary">
        Kart bilgileriniz bu sitede değil, güvenli ödeme sağlayıcısının sayfasında alınır.
      </Typography>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button component={Link} to="/cart" size="large">
          Sepete dön
        </Button>
        <Button type="submit" variant="contained" size="large" disabled={submitting}>
          {submitting ? 'Sipariş oluşturuluyor…' : 'Ödemeye geç'}
        </Button>
      </Stack>
    </Stack>
  )
}

export default CheckoutPage
