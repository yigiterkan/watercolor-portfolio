import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import type { Variant } from '../api/artworks.ts'
import { useCart } from '../cart/CartContext.ts'

function AddToCartButton({ variant }: { variant: Variant }) {
  const { quantityOf, add } = useCart()
  const inCart = quantityOf(variant.id)

  if (variant.stock === 0) {
    return (
      <Button variant="contained" size="large" disabled>
        Tükendi
      </Button>
    )
  }

  return (
    <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<AddShoppingCartIcon />}
          disabled={inCart >= variant.stock}
          onClick={() => add(variant.id)}
        >
          Sepete ekle
        </Button>
        {inCart > 0 && (
          <Button component={Link} to="/cart" variant="outlined" size="large">
            Sepete git
          </Button>
        )}
      </Stack>
      {inCart > 0 && (
        <Typography variant="body2" color="text.secondary" role="status">
          {inCart >= variant.stock
            ? `Sepetinizde bu seçenekten ${inCart} adet var; stoktaki tamamı bu kadar.`
            : `Sepetinizde bu seçenekten ${inCart} adet var.`}
        </Typography>
      )}
    </Stack>
  )
}

export default AddToCartButton
