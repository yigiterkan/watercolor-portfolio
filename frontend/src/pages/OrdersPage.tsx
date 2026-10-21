import { useEffect, useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import { getMyOrders, type Order } from '../api/orders.ts'
import Loading from '../components/Loading.tsx'
import OrderStatusChip from '../components/OrderStatusChip.tsx'
import { formatDate, formatPrice } from '../utils/format.ts'

function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    getMyOrders()
      .then(setOrders)
      .catch(() => setError(true))
  }, [])

  if (error) return <Alert severity="error">Siparişler yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
  if (!orders) return <Loading />

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Siparişlerim
      </Typography>
      {orders.length === 0 ? (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Henüz siparişiniz yok.</Typography>
          <Button component={Link} to="/" variant="contained">
            Galeriye göz at
          </Button>
        </Stack>
      ) : (
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
          {orders.map((order) => (
            <Card key={order.id} variant="outlined">
              <CardActionArea component={Link} to={`/orders/${order.id}`}>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="h6" component="h2">
                      Sipariş #{order.id}
                    </Typography>
                    <OrderStatusChip status={order.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(order.createdAt)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap sx={{ mt: 1 }}>
                    {order.items.map((item) => item.title).join(', ')}
                  </Typography>
                  <Typography sx={{ mt: 1, fontWeight: 500 }}>{formatPrice(order.totalPrice)}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      )}
    </>
  )
}

export default OrdersPage
