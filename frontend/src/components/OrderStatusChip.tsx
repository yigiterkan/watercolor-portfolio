import Chip from '@mui/material/Chip'
import type { OrderStatus } from '../api/orders.ts'
import { ORDER_STATUS_LABELS } from '../utils/orderStatus.ts'

const COLORS: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  AwaitingPayment: 'warning',
  Pending: 'default',
  Confirmed: 'info',
  Shipped: 'warning',
  Delivered: 'success',
  Cancelled: 'error',
}

function OrderStatusChip({ status }: { status: OrderStatus }) {
  return (
    <Chip
      label={ORDER_STATUS_LABELS[status] ?? status}
      color={COLORS[status] ?? 'default'}
      variant={status === 'AwaitingPayment' ? 'outlined' : 'filled'}
      size="small"
    />
  )
}

export default OrderStatusChip
