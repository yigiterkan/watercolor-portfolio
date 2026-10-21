import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import RemoveIcon from '@mui/icons-material/Remove'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import MuiLink from '@mui/material/Link'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import { useCart } from '../cart/CartContext.ts'
import { useCartLines, type CartLine } from '../cart/useCartLines.ts'
import ArtworkImage from '../components/ArtworkImage.tsx'
import Loading from '../components/Loading.tsx'
import { formatPrice } from '../utils/format.ts'
import { variantLabel } from '../utils/variant.ts'

function CartRow({ line }: { line: CartLine }) {
  const { setQuantity, remove } = useCart()
  const { artwork, variant, quantity } = line
  const label = variantLabel(variant.type, variant.widthCm, variant.heightCm)
  const overStock = quantity > variant.stock

  return (
    <Stack spacing={1} sx={{ py: 2 }}>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box sx={{ width: 80, flexShrink: 0, borderRadius: 1, overflow: 'hidden' }}>
          <ArtworkImage artwork={artwork} />
        </Box>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <MuiLink
            component={Link}
            to={`/artworks/${artwork.id}`}
            underline="hover"
            color="inherit"
            sx={{ fontWeight: 500, display: 'block', overflowWrap: 'anywhere' }}
          >
            {artwork.title}
          </MuiLink>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatPrice(variant.price)}
          </Typography>
        </Box>
        <IconButton aria-label={`${artwork.title} (${label}) sepetten çıkar`} onClick={() => remove(variant.id)}>
          <DeleteOutlineIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <IconButton
            size="small"
            aria-label="Adedi azalt"
            disabled={quantity <= 1}
            onClick={() => setQuantity(variant.id, quantity - 1)}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
          <Typography aria-label="Adet" sx={{ minWidth: 24, textAlign: 'center' }}>
            {quantity}
          </Typography>
          <IconButton
            size="small"
            aria-label="Adedi artır"
            disabled={quantity >= variant.stock}
            onClick={() => setQuantity(variant.id, quantity + 1)}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Typography sx={{ fontWeight: 500 }}>{formatPrice(variant.price * quantity)}</Typography>
      </Stack>
      {overStock && (
        <Alert
          severity="warning"
          action={
            variant.stock > 0 && (
              <Button color="inherit" size="small" onClick={() => setQuantity(variant.id, variant.stock)}>
                Adedi düzelt
              </Button>
            )
          }
        >
          {variant.stock === 0
            ? 'Bu seçenek tükendi. Devam etmek için sepetten çıkarın.'
            : `Stokta yalnızca ${variant.stock} adet var.`}
        </Alert>
      )}
    </Stack>
  )
}

function CartPage() {
  const { lines, total, hasStockProblem, loading, error } = useCartLines()

  if (error) return <Alert severity="error">Sepet yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
  if (loading) return <Loading />

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Sepetim
      </Typography>
      {lines.length === 0 ? (
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography color="text.secondary">Sepetiniz boş.</Typography>
          <Button component={Link} to="/" variant="contained">
            Galeriye göz at
          </Button>
        </Stack>
      ) : (
        <Paper variant="outlined" sx={{ px: 2, maxWidth: 720 }}>
          <Stack divider={<Divider />}>
            {lines.map((line) => (
              <CartRow key={line.variant.id} line={line} />
            ))}
            <Stack direction="row" sx={{ py: 2, alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" component="p">
                Toplam
              </Typography>
              <Typography variant="h6" component="p">
                {formatPrice(total)}
              </Typography>
            </Stack>
          </Stack>
          <Box sx={{ pb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            {hasStockProblem ? (
              <Button variant="contained" size="large" disabled>
                Siparişi tamamla
              </Button>
            ) : (
              <Button component={Link} to="/checkout" variant="contained" size="large">
                Siparişi tamamla
              </Button>
            )}
          </Box>
        </Paper>
      )}
    </>
  )
}

export default CartPage
