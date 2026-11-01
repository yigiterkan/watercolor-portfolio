import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import Box from '@mui/material/Box'
import type { Artwork } from '../api/artworks.ts'
import { isSoldOut } from '../utils/variant.ts'

type ArtworkImageProps = {
  artwork: Artwork
  fit?: 'cover' | 'contain'
  size?: 'thumbnail' | 'large'
}

function ArtworkImage({ artwork, fit = 'cover', size = 'thumbnail' }: ArtworkImageProps) {
  const src = size === 'thumbnail' ? (artwork.thumbnailUrl ?? artwork.imageUrl) : artwork.imageUrl

  if (!src) {
    return (
      <Box
        sx={{
          aspectRatio: '4 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'action.hover',
          color: 'text.disabled',
        }}
      >
        <ImageOutlinedIcon fontSize="large" />
      </Box>
    )
  }

  return (
    <Box
      component="img"
      src={src}
      alt={artwork.title}
      loading={size === 'thumbnail' ? 'lazy' : undefined}
      sx={{
        display: 'block',
        width: '100%',
        aspectRatio: '4 / 3',
        objectFit: fit,
        bgcolor: 'action.hover',
        opacity: isSoldOut(artwork) ? 0.6 : 1,
      }}
    />
  )
}

export default ArtworkImage
