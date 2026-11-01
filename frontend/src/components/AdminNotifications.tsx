import { useEffect, useState } from 'react'
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Snackbar from '@mui/material/Snackbar'
import { Link } from 'react-router'
import { loadSession } from '../auth/storage.ts'
import { formatPrice } from '../utils/format.ts'

export const ADMIN_ORDERS_CHANGED = 'admin:orders-changed'

type OrderNotification = { orderId: number; customerName: string; totalPrice: number; itemCount: number }
type Message = { key: number; text: string; severity: 'info' | 'warning' }

// Yalnızca admin oturumunda bağlanır; yeni ya da iptal edilen siparişte bildirim gösterir.
function AdminNotifications() {
  const [message, setMessage] = useState<Message | null>(null)

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl('/hubs/admin', { accessTokenFactory: () => loadSession()?.token ?? '' })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.None)
      .build()

    const show = (text: string, severity: Message['severity']) => {
      setMessage({ key: Date.now(), text, severity })
      window.dispatchEvent(new Event(ADMIN_ORDERS_CHANGED))
    }
    connection.on('OrderCreated', (n: OrderNotification) =>
      show(`Yeni sipariş #${n.orderId} — ${n.customerName}, ${formatPrice(n.totalPrice)}`, 'info'),
    )
    connection.on('OrderCancelled', (n: OrderNotification) =>
      show(`Sipariş #${n.orderId} müşteri tarafından iptal edildi`, 'warning'),
    )

    // Bağlantı kurulamazsa site çalışmaya devam eder; yalnızca anlık bildirim gelmez.
    connection.start().catch(() => {})
    return () => {
      connection.stop()
    }
  }, [])

  return (
    <Snackbar
      key={message?.key}
      open={message !== null}
      autoHideDuration={8000}
      onClose={(_, reason) => reason !== 'clickaway' && setMessage(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert
        severity={message?.severity ?? 'info'}
        variant="filled"
        onClose={() => setMessage(null)}
        action={
          <Button component={Link} to="/admin/orders" color="inherit" size="small" onClick={() => setMessage(null)}>
            Görüntüle
          </Button>
        }
      >
        {message?.text}
      </Alert>
    </Snackbar>
  )
}

export default AdminNotifications
