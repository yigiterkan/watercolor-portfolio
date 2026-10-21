import { Fragment, useEffect, useState } from 'react'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Collapse from '@mui/material/Collapse'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TablePagination from '@mui/material/TablePagination'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { getAdminOrders, updateOrderStatus, type AdminOrder, type PagedResult } from '../../api/adminOrders.ts'
import { ApiError } from '../../api/client.ts'
import type { OrderStatus } from '../../api/orders.ts'
import Loading from '../../components/Loading.tsx'
import OrderStatusChip from '../../components/OrderStatusChip.tsx'
import { formatDate, formatPrice } from '../../utils/format.ts'
import { nextOrderStatus, ORDER_STATUS_LABELS, ORDER_STATUSES } from '../../utils/orderStatus.ts'
import { variantLabel } from '../../utils/variant.ts'

const NEXT_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  Confirmed: 'Onayla',
  Shipped: 'Kargoya ver',
  Delivered: 'Teslim edildi',
}

const COLUMN_COUNT = 7

type OrderRowProps = {
  order: AdminOrder
  updating: boolean
  onAdvance: (order: AdminOrder, next: OrderStatus) => void
}

function OrderRow({ order, updating, onAdvance }: OrderRowProps) {
  const [open, setOpen] = useState(false)
  const next = nextOrderStatus(order.status)

  return (
    <Fragment>
      <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
        <TableCell padding="checkbox">
          <IconButton
            size="small"
            aria-label={`Sipariş #${order.id} ayrıntılarını ${open ? 'gizle' : 'göster'}`}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>#{order.id}</TableCell>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(order.createdAt)}</TableCell>
        <TableCell>
          <Typography variant="body2">{order.customerName}</Typography>
          <Typography variant="body2" color="text.secondary">
            {order.customerEmail}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
          {formatPrice(order.totalPrice)}
        </TableCell>
        <TableCell>
          <OrderStatusChip status={order.status} />
        </TableCell>
        <TableCell align="right">
          {next && (
            <Button
              size="small"
              variant="outlined"
              disabled={updating}
              onClick={() => onAdvance(order, next)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              {NEXT_ACTION_LABELS[next]}
            </Button>
          )}
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell colSpan={COLUMN_COUNT} sx={{ py: 0 }}>
          <Collapse in={open} unmountOnExit>
            <Stack spacing={2} sx={{ py: 2, maxWidth: 560 }}>
              <Box>
                <Typography variant="subtitle2" component="h3" gutterBottom>
                  Kalemler
                </Typography>
                {order.items.map((item) => (
                  <Stack key={item.variantId} direction="row" spacing={2} sx={{ justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                      {item.title} — {variantLabel(item.variantType, item.widthCm, item.heightCm)} ({item.quantity} ×{' '}
                      {formatPrice(item.unitPrice)})
                    </Typography>
                    <Typography variant="body2" sx={{ flexShrink: 0 }}>
                      {formatPrice(item.unitPrice * item.quantity)}
                    </Typography>
                  </Stack>
                ))}
              </Box>
              <Box>
                <Typography variant="subtitle2" component="h3" gutterBottom>
                  Teslimat adresi
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
                  {order.shippingAddress}
                </Typography>
              </Box>
            </Stack>
          </Collapse>
        </TableCell>
      </TableRow>
    </Fragment>
  )
}

function AdminOrdersPage() {
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(0) // TablePagination 0'dan, API 1'den sayar.
  const [pageSize, setPageSize] = useState(10)
  const [reloadKey, setReloadKey] = useState(0)

  const [data, setData] = useState<PagedResult<AdminOrder> | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    getAdminOrders({ status: status || undefined, page: page + 1, pageSize })
      .then((result) => {
        if (cancelled) return
        setData(result)
        setLoadError(false)
      })
      .catch(() => {
        if (!cancelled) setLoadError(true)
      })

    return () => {
      cancelled = true
    }
  }, [status, page, pageSize, reloadKey])

  const handleAdvance = async (order: AdminOrder, next: OrderStatus) => {
    setActionError(null)
    setUpdatingId(order.id)
    try {
      await updateOrderStatus(order.id, next)
    } catch (err) {
      setActionError(
        err instanceof ApiError && err.status === 409
          ? `Sipariş #${order.id} bu arada güncellenmiş. Liste yenilendi.`
          : `Sipariş #${order.id} güncellenemedi. Lütfen tekrar deneyin.`,
      )
    }
    setUpdatingId(null)
    setReloadKey((key) => key + 1)
  }

  return (
    <Stack spacing={2}>
      <TextField
        select
        label="Durum"
        value={status}
        onChange={(event) => {
          setStatus(event.target.value as OrderStatus | '')
          setPage(0)
        }}
        size="small"
        sx={{ width: 220 }}
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">Tümü</MenuItem>
        {ORDER_STATUSES.map((value) => (
          <MenuItem key={value} value={value}>
            {ORDER_STATUS_LABELS[value]}
          </MenuItem>
        ))}
      </TextField>
      {actionError && (
        <Alert severity="error" onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}
      {loadError ? (
        <Alert severity="error">Siparişler yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
      ) : !data ? (
        <Loading />
      ) : data.totalCount === 0 ? (
        <Typography color="text.secondary">
          {status ? 'Bu durumda sipariş yok.' : 'Henüz sipariş yok.'}
        </Typography>
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small" aria-label="Siparişler">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>No</TableCell>
                  <TableCell>Tarih</TableCell>
                  <TableCell>Müşteri</TableCell>
                  <TableCell align="right">Toplam</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.items.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    updating={updatingId === order.id}
                    onAdvance={handleAdvance}
                  />
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={data.totalCount}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(0)
            }}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="Sayfa başına:"
            labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count}`}
          />
        </Paper>
      )}
    </Stack>
  )
}

export default AdminOrdersPage
