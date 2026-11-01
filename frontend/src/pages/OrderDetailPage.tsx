import { useEffect, useRef, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client.ts'
import { cancelOrder, getOrder, startPayment, type Order } from '../api/orders.ts'
import Loading from '../components/Loading.tsx'
import OrderStatusChip from '../components/OrderStatusChip.tsx'
import { formatDate, formatPrice, formatTime } from '../utils/format.ts'
import { canCustomerCancel } from '../utils/orderStatus.ts'
import { variantLabel } from '../utils/variant.ts'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'loaded'; order: Order }

function OrderDetail({ id }: { id: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  // Ödeme sağlayıcısından dönüşte ?payment=success|failed gelir; yeni siparişte ödeme otomatik başlar.
  const [arrival] = useState(() => ({
    startPayment: (location.state as { startPayment?: boolean } | null)?.startPayment === true,
    payment: searchParams.get('payment'),
  }))
  const paymentStarted = useRef(false)
  const [paying, setPaying] = useState(arrival.startPayment)
  const [payError, setPayError] = useState<string | null>(null)
  const [state, setState] = useState<State>(
    Number.isInteger(id) ? { status: 'loading' } : { status: 'notFound' },
  )
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [cancelResult, setCancelResult] = useState<{ ok: boolean; message: string } | null>(null)

  // Mesajlar bir kez gösterilsin; sayfa yenilenince tekrar çıkmasın ya da ödeme yeniden başlamasın.
  useEffect(() => {
    if (arrival.startPayment || arrival.payment) navigate(location.pathname, { replace: true, state: null })
  }, [arrival, navigate, location.pathname])

  const redirectToPayment = (orderId: number) =>
    startPayment(orderId)
      .then(({ paymentPageUrl }) => window.location.assign(paymentPageUrl))
      .catch((err) => {
        setPayError(
          err instanceof ApiError && err.status === 409 ? err.message : 'Ödeme sayfası açılamadı. Lütfen tekrar deneyin.',
        )
        setPaying(false)
      })

  useEffect(() => {
    if (state.status !== 'loaded' || !arrival.startPayment || paymentStarted.current) return
    paymentStarted.current = true
    if (state.order.status === 'AwaitingPayment') redirectToPayment(state.order.id)
  }, [state, arrival])

  useEffect(() => {
    if (!Number.isInteger(id)) return

    getOrder(id)
      .then((order) => setState(order ? { status: 'loaded', order } : { status: 'notFound' }))
      .catch(() => setState({ status: 'error' }))
  }, [id])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') {
    return <Alert severity="error">Sipariş yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
  }
  if (state.status === 'notFound') return <Alert severity="warning">Bu sipariş bulunamadı.</Alert>

  const { order } = state

  const handleCancel = async () => {
    setCancelling(true)
    try {
      setState({ status: 'loaded', order: await cancelOrder(order.id) })
      setCancelResult({ ok: true, message: 'Siparişiniz iptal edildi.' })
    } catch (err) {
      setCancelResult({
        ok: false,
        message: err instanceof ApiError && err.status === 409 ? err.message : 'Sipariş iptal edilemedi. Lütfen tekrar deneyin.',
      })
    }
    setCancelling(false)
    setConfirmCancel(false)
  }

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      {arrival.payment === 'success' && order.status !== 'AwaitingPayment' && order.status !== 'Cancelled' && !cancelResult && (
        <Alert severity="success">Ödemeniz alındı, siparişiniz hazırlanacak. Teşekkür ederiz!</Alert>
      )}
      {arrival.payment === 'failed' && order.status === 'AwaitingPayment' && !payError && (
        <Alert severity="error">Ödeme tamamlanamadı. Aşağıdan tekrar deneyebilirsiniz.</Alert>
      )}
      {order.status === 'AwaitingPayment' &&
        (paying ? (
          <Alert severity="info" icon={<CircularProgress size={20} />}>
            Güvenli ödeme sayfasına yönlendiriliyorsunuz…
          </Alert>
        ) : (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setPaying(true)
                  setPayError(null)
                  redirectToPayment(order.id)
                }}
              >
                Ödemeyi tamamla
              </Button>
            }
          >
            {payError ??
              `Ödemeniz henüz alınmadı.${
                order.paymentExpiresAt ? ` Saat ${formatTime(order.paymentExpiresAt)}'e kadar` : ''
              } tamamlanmazsa sipariş iptal edilir ve eser yeniden satışa çıkar.`}
          </Alert>
        ))}
      {cancelResult && <Alert severity={cancelResult.ok ? 'success' : 'error'}>{cancelResult.message}</Alert>}
      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="h4" component="h1">
          Sipariş #{order.id}
        </Typography>
        <Typography color="text.secondary">{formatDate(order.createdAt)}</Typography>
        <OrderStatusChip status={order.status} />
      </Stack>
      <Paper variant="outlined" sx={{ px: 2 }}>
        <Stack divider={<Divider />}>
          {order.items.map((item) => (
            <Stack
              key={item.variantId}
              direction="row"
              spacing={2}
              sx={{ py: 1.5, justifyContent: 'space-between' }}
            >
              <Stack sx={{ minWidth: 0 }}>
                <MuiLink
                  component={Link}
                  to={`/artworks/${item.artworkId}`}
                  underline="hover"
                  color="inherit"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {item.title}
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  {variantLabel(item.variantType, item.widthCm, item.heightCm)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.quantity} × {formatPrice(item.unitPrice)}
                </Typography>
              </Stack>
              <Typography sx={{ flexShrink: 0 }}>{formatPrice(item.unitPrice * item.quantity)}</Typography>
            </Stack>
          ))}
          <Stack direction="row" sx={{ py: 1.5, justifyContent: 'space-between' }}>
            <Typography sx={{ fontWeight: 500 }}>Toplam</Typography>
            <Typography sx={{ fontWeight: 500 }}>{formatPrice(order.totalPrice)}</Typography>
          </Stack>
        </Stack>
      </Paper>
      <Stack spacing={0.5}>
        <Typography variant="subtitle2" component="h2">
          Teslimat adresi
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>{order.shippingAddress}</Typography>
        <Typography>{order.shippingCity}</Typography>
      </Stack>
      {canCustomerCancel(order.status) && !(paying && order.status === 'AwaitingPayment') && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <Button color="error" variant="outlined" onClick={() => setConfirmCancel(true)}>
            Siparişi iptal et
          </Button>
        </Stack>
      )}
      <Dialog open={confirmCancel} onClose={() => !cancelling && setConfirmCancel(false)}>
        <DialogTitle>Sipariş iptal edilsin mi?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Sipariş #{order.id} iptal edilecek.{order.status === 'Pending' && ' Ödemeniz kartınıza iade edilecek.'} Bu
            işlem geri alınamaz.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancel(false)} disabled={cancelling}>
            Vazgeç
          </Button>
          <Button onClick={handleCancel} color="error" variant="contained" disabled={cancelling}>
            {cancelling ? 'İptal ediliyor…' : 'Siparişi iptal et'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

function OrderDetailPage() {
  const { id } = useParams()

  return (
    <>
      <Button component={Link} to="/orders" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Siparişlerim
      </Button>
      <OrderDetail key={id} id={Number(id)} />
    </>
  )
}

export default OrderDetailPage
