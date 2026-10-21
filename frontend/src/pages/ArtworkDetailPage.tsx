import { useEffect, useState } from 'react'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import FormControl from '@mui/material/FormControl'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormLabel from '@mui/material/FormLabel'
import Grid from '@mui/material/Grid'
import Paper from '@mui/material/Paper'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, useParams } from 'react-router'
import { getArtwork, type Artwork } from '../api/artworks.ts'
import AddToCartButton from '../components/AddToCartButton.tsx'
import ArtworkImage from '../components/ArtworkImage.tsx'
import Loading from '../components/Loading.tsx'
import { formatPrice } from '../utils/format.ts'
import { variantLabel } from '../utils/variant.ts'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'loaded'; artwork: Artwork }

function ArtworkDetail({ id }: { id: number }) {
  const [state, setState] = useState<State>(
    Number.isInteger(id) ? { status: 'loading' } : { status: 'notFound' },
  )

  useEffect(() => {
    if (!Number.isInteger(id)) return

    getArtwork(id)
      .then((artwork) => setState(artwork ? { status: 'loaded', artwork } : { status: 'notFound' }))
      .catch(() => setState({ status: 'error' }))
  }, [id])

  if (state.status === 'loading') return <Loading />

  if (state.status === 'error') {
    return <Alert severity="error">Eser yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
  }

  if (state.status === 'notFound') {
    return <Alert severity="warning">Bu eser bulunamadı.</Alert>
  }

  return <ArtworkInfo artwork={state.artwork} />
}

function ArtworkInfo({ artwork }: { artwork: Artwork }) {
  const [selectedId, setSelectedId] = useState<number | null>(
    () => (artwork.variants.find((variant) => variant.stock > 0) ?? artwork.variants[0])?.id ?? null,
  )
  const selected = artwork.variants.find((variant) => variant.id === selectedId) ?? null

  return (
    <Grid container spacing={4}>
      <Grid size={{ xs: 12, md: 7 }}>
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
          <ArtworkImage artwork={artwork} fit="contain" />
        </Paper>
      </Grid>
      <Grid size={{ xs: 12, md: 5 }}>
        <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
          <Typography variant="h4" component="h1" sx={{ overflowWrap: 'anywhere' }}>
            {artwork.title}
          </Typography>
          {artwork.description && (
            <Typography sx={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere' }}>
              {artwork.description}
            </Typography>
          )}
          {artwork.variants.length === 0 ? (
            <Alert severity="info">Bu eser şu an satışta değil.</Alert>
          ) : (
            <>
              <FormControl>
                <FormLabel id="variant-label">Seçenek</FormLabel>
                <RadioGroup
                  aria-labelledby="variant-label"
                  value={selectedId ?? ''}
                  onChange={(event) => setSelectedId(Number(event.target.value))}
                >
                  {artwork.variants.map((variant) => (
                    <FormControlLabel
                      key={variant.id}
                      value={variant.id}
                      control={<Radio />}
                      disabled={variant.stock === 0}
                      label={
                        <Typography component="span">
                          {variantLabel(variant.type, variant.widthCm, variant.heightCm)} —{' '}
                          {variant.stock === 0 ? 'Tükendi' : formatPrice(variant.price)}
                        </Typography>
                      }
                    />
                  ))}
                </RadioGroup>
              </FormControl>
              {selected && (
                <>
                  <Typography variant="h5" component="p">
                    {formatPrice(selected.price)}
                  </Typography>
                  <AddToCartButton variant={selected} />
                </>
              )}
            </>
          )}
        </Stack>
      </Grid>
    </Grid>
  )
}

function ArtworkDetailPage() {
  const { id } = useParams()

  return (
    <>
      <Button component={Link} to="/" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Galeriye dön
      </Button>
      <ArtworkDetail key={id} id={Number(id)} />
    </>
  )
}

export default ArtworkDetailPage
