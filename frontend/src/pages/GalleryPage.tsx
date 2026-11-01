import { useEffect, useState } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Grid from '@mui/material/Grid'
import InputAdornment from '@mui/material/InputAdornment'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Typography from '@mui/material/Typography'
import { useSearchParams } from 'react-router'
import { getArtworks, type Artwork, type ArtworkSort, type VariantType } from '../api/artworks.ts'
import type { PagedResult } from '../api/client.ts'
import ShowcaseHero from '../components/ShowcaseHero.tsx'
import ArtworkCard from '../components/ArtworkCard.tsx'
import Loading from '../components/Loading.tsx'

const PAGE_SIZE = 12

const SORT_LABELS: Record<ArtworkSort, string> = {
  Newest: 'En yeni',
  PriceAsc: 'Fiyat: düşükten yükseğe',
  PriceDesc: 'Fiyat: yüksekten düşüğe',
}

const HEADINGS: Record<VariantType | 'all', { title: string; intro: string }> = {
  all: {
    title: 'Suluboya Eserleri',
    intro: 'Manzaralardan şehir köşelerine, her biri elde boyanmış suluboya eserler. Orijinalleri tek adettir; seçili eserlerin farklı ölçülerde baskıları da mevcuttur.',
  },
  Original: {
    title: 'Orijinal Eserler',
    intro: 'Her orijinal eser tek adettir; satıldığında galeriden "Orijinal satıldı" olarak işaretlenir.',
  },
  Print: {
    title: 'Baskılar',
    intro: 'Sevdiğiniz eserlerin farklı ölçülerde, kaliteli kâğıda basılmış reprodüksiyonları.',
  },
}

function parseType(value: string | null): VariantType | null {
  return value === 'Original' || value === 'Print' ? value : null
}

function parseSort(value: string | null): ArtworkSort {
  return value === 'PriceAsc' || value === 'PriceDesc' ? value : 'Newest'
}

function GalleryPage() {
  // Filtreler adres çubuğunda tutulur (paylaşılabilir, geri tuşu çalışır): /?q=kule&type=Print&inStock=1
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('q') ?? ''
  const type = parseType(searchParams.get('type'))
  const inStock = searchParams.get('inStock') === '1'
  const sort = parseSort(searchParams.get('sort'))
  const page = Math.max(1, Number.parseInt(searchParams.get('page') ?? '1', 10) || 1)
  const hasFilters = search !== '' || type !== null || inStock || sort !== 'Newest'

  const [result, setResult] = useState<PagedResult<Artwork> | null>(null)
  const artworks = result?.items ?? null
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [searchInput, setSearchInput] = useState(search)
  useEffect(() => setSearchInput(search), [search])

  const updateParams = (changes: Record<string, string | null>) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        // Filtre değişince ilk sayfaya dönülür.
        if (!('page' in changes)) next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (searchInput.trim() === search) return
    const timer = setTimeout(() => updateParams({ q: searchInput.trim() || null }), 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    getArtworks({ search, type: type ?? undefined, inStock, sort, page, pageSize: PAGE_SIZE })
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setError(false)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [search, type, inStock, sort, page])

  const heading = HEADINGS[type ?? 'all']

  return (
    <>
      <Box component="section" sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontSize: { xs: '2rem', md: '2.75rem' }, mb: 1.5 }}>
          {heading.title}
        </Typography>
        <Typography color="text.secondary" sx={{ maxWidth: 720, mx: 'auto' }}>
          {heading.intro}
        </Typography>
      </Box>

      {!hasFilters && page === 1 && <ShowcaseHero />}

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ mb: 1, alignItems: { md: 'center' }, justifyContent: 'space-between' }}
      >
        <TextField
          size="small"
          placeholder="Eser ara"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          slotProps={{
            htmlInput: { 'aria-label': 'Eser ara', maxLength: 100 },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: { xs: '100%', md: 260 } }}
        />
        <ToggleButtonGroup
          exclusive
          size="small"
          value={type ?? 'all'}
          onChange={(_, value: VariantType | 'all' | null) => {
            if (value !== null) updateParams({ type: value === 'all' ? null : value })
          }}
          aria-label="Tür"
        >
          <ToggleButton value="all">Tümü</ToggleButton>
          <ToggleButton value="Original">Orijinaller</ToggleButton>
          <ToggleButton value="Print">Baskılar</ToggleButton>
        </ToggleButtonGroup>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 2 }}
          sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}
        >
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={inStock}
                onChange={(event) => updateParams({ inStock: event.target.checked ? '1' : null })}
              />
            }
            label="Yalnızca satıştakiler"
            sx={{ mr: 0, whiteSpace: 'nowrap' }}
          />
          <TextField
            select
            size="small"
            label="Sırala"
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value === 'Newest' ? null : event.target.value })}
            sx={{ minWidth: { sm: 220 } }}
          >
            {(Object.keys(SORT_LABELS) as ArtworkSort[]).map((value) => (
              <MenuItem key={value} value={value}>
                {SORT_LABELS[value]}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Stack>

      <Box sx={{ height: 4, mb: 2 }}>{loading && artworks && <LinearProgress />}</Box>

      {error ? (
        <Alert severity="error">Eserler yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
      ) : !artworks ? (
        <Loading />
      ) : artworks.length === 0 ? (
        <Stack spacing={2} sx={{ alignItems: 'center', py: 6 }}>
          <Typography color="text.secondary">
            {hasFilters ? 'Aramanıza uygun eser bulunamadı.' : 'Henüz eser eklenmedi.'}
          </Typography>
          {hasFilters && (
            <Button variant="outlined" onClick={() => setSearchParams({}, { replace: true })}>
              Filtreleri temizle
            </Button>
          )}
        </Stack>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }} role="status">
            {result!.totalCount} eser
          </Typography>
          <Grid container spacing={1.5} sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}>
            {artworks.map((artwork) => (
              <Grid key={artwork.id} size={{ xs: 12, sm: 6 }}>
                <ArtworkCard artwork={artwork} />
              </Grid>
            ))}
          </Grid>
          {result!.totalCount > PAGE_SIZE && (
            <Pagination
              count={Math.ceil(result!.totalCount / PAGE_SIZE)}
              page={page}
              onChange={(_, value) => {
                updateParams({ page: value > 1 ? String(value) : null })
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              shape="rounded"
              sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}
            />
          )}
        </>
      )}
    </>
  )
}

export default GalleryPage
