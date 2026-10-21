import Chip from '@mui/material/Chip'
import type { OrderStatus } from '../api/orders.ts'
import { ORDER_STATUS_LABELS } from '../utils/orderStatus.ts'

const COLORS: Record<OrderStatus, 'default' | 'info' | 'warning' | 'success'> = {
  Pending: 'default',
  Confirmed: 'info',
  Shipped: 'warning',
  Delivered: 'success',
}

function OrderStatusChip({ status }: { status: OrderStatus }) {
  return <Chip label={ORDER_STATUS_LABELS[status] ?? status} color={COLORS[status] ?? 'default'} size="small" />
}

export default OrderStatusChip
