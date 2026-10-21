import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import type { Artwork } from '../api/artworks.ts'
import { isSoldOut, priceSummary } from '../utils/variant.ts'
import ArtworkImage from './ArtworkImage.tsx'

function variantSummary(artwork: Artwork) {
  const original = artwork.variants.find((variant) => variant.type === 'Original')
  const hasPrint = artwork.variants.some((variant) => variant.type === 'Print')

  if (original && hasPrint) return 'Orijinal ve baskı'
  if (original) return `Orijinal · ${original.widthCm} × ${original.heightCm} cm`
  if (hasPrint) return 'Baskı'
  return 'Satışta değil'
}

function ArtworkCard({ artwork }: { artwork: Artwork }) {
  const price = priceSummary(artwork)
  const soldOut = isSoldOut(artwork)
  const originalSold =
    !soldOut && artwork.variants.some((variant) => variant.type === 'Original' && variant.stock === 0)

  return (
    <Card sx={{ height: '100%', bgcolor: 'transparent' }}>
      <CardActionArea
        component={Link}
        to={`/artworks/${artwork.id}`}
        sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <Box sx={{ position: 'relative' }}>
          <ArtworkImage artwork={artwork} />
          {(soldOut || originalSold) && (
            <Chip
              label={soldOut ? 'Tükendi' : 'Orijinal satıldı'}
              size="small"
              sx={{ position: 'absolute', top: 8, left: 8, bgcolor: 'background.paper', borderRadius: 0.5 }}
            />
          )}
        </Box>
        <Box sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', px: 1.5, py: 1, flexGrow: 1 }}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <Typography
              component="h2"
              noWrap
              title={artwork.title}
              sx={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', minWidth: 0 }}
            >
              {artwork.title}
            </Typography>
            {price && (
              <Typography sx={{ fontSize: '0.85rem', flexShrink: 0, whiteSpace: 'nowrap' }}>{price}</Typography>
            )}
          </Stack>
          <Typography sx={{ fontSize: '0.75rem', opacity: 0.85, letterSpacing: '0.03em' }}>
            {variantSummary(artwork)}
          </Typography>
        </Box>
      </CardActionArea>
    </Card>
  )
}

export default ArtworkCard
