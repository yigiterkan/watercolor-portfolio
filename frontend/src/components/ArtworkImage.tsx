import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import Box from '@mui/material/Box'
import type { Artwork } from '../api/artworks.ts'
import { isSoldOut } from '../utils/variant.ts'

type ArtworkImageProps = {
  artwork: Artwork
  fit?: 'cover' | 'contain'
}

function ArtworkImage({ artwork, fit = 'cover' }: ArtworkImageProps) {
  if (!artwork.imageUrl) {
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
      src={artwork.imageUrl}
      alt={artwork.title}
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
