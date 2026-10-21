import { useEffect, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { getOrder, type Order } from '../api/orders.ts'
import Loading from '../components/Loading.tsx'
import OrderStatusChip from '../components/OrderStatusChip.tsx'
import { formatDate, formatPrice } from '../utils/format.ts'
import { variantLabel } from '../utils/variant.ts'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'loaded'; order: Order }

function OrderDetail({ id }: { id: number }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [justOrdered] = useState(
    () => (location.state as { justOrdered?: boolean } | null)?.justOrdered === true,
  )
  const [state, setState] = useState<State>(
    Number.isInteger(id) ? { status: 'loading' } : { status: 'notFound' },
  )

  // "Siparişiniz alındı" mesajı bir kez gösterilsin; sayfa yenilenince tekrar çıkmasın.
  useEffect(() => {
    if (justOrdered) navigate(location.pathname, { replace: true, state: null })
  }, [justOrdered, navigate, location.pathname])

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

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      {justOrdered && <Alert severity="success">Siparişiniz alındı. Teşekkür ederiz!</Alert>}
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
      </Stack>
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
