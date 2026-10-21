import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import UploadIcon from '@mui/icons-material/UploadFile'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  createArtwork,
  deleteArtworkImage,
  getArtwork,
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  updateArtwork,
  uploadArtworkImage,
  type Artwork,
  type ArtworkInput,
} from '../../api/artworks.ts'
import Loading from '../../components/Loading.tsx'
import VariantsSection from './VariantsSection.tsx'

type FormValues = {
  title: string
  description: string
}

type FormErrors = Partial<Record<keyof FormValues, string>>

// Backend'deki ArtworkRequest kurallarının aynısı.
function validate(values: FormValues): { errors: FormErrors; input: ArtworkInput } {
  const errors: FormErrors = {}
  if (!values.title.trim()) errors.title = 'Başlık gerekli.'

  return {
    errors,
    input: { title: values.title.trim(), description: values.description.trim() || null },
  }
}

const IMAGE_FAILED_MESSAGE =
  'Eser kaydedildi ancak görsel güncellenemedi. Görseli tekrar seçip kaydetmeyi deneyin.'

function ArtworkForm({ artwork }: { artwork: Artwork | null }) {
  const navigate = useNavigate()
  const [values, setValues] = useState<FormValues>({
    title: artwork?.title ?? '',
    description: artwork?.description ?? '',
  })
  const [showErrors, setShowErrors] = useState(false)
  const location = useLocation()
  const [arrival] = useState(() => (location.state as { created?: boolean; imageFailed?: boolean } | null) ?? {})
  const [submitError, setSubmitError] = useState<string | null>(arrival.imageFailed ? IMAGE_FAILED_MESSAGE : null)
  const [submitting, setSubmitting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const shownImage = previewUrl ?? (removeImage ? null : (artwork?.imageUrl ?? null))

  const setSelectedImage = (file: File | null) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setImageFile(file)
    setPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = '' // aynı dosya tekrar seçilebilsin
    if (!file) return

    if (!IMAGE_TYPES.includes(file.type)) {
      setImageError('Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.')
    } else if (file.size > MAX_IMAGE_BYTES) {
      setImageError('Görsel en fazla 5 MB olabilir.')
    } else {
      setImageError(null)
      setRemoveImage(false)
      setSelectedImage(file)
    }
  }

  const handleImageRemove = () => {
    setImageError(null)
    setSelectedImage(null)
    setRemoveImage(true)
  }

  const { errors, input } = validate(values)
  const field = (name: keyof FormValues) => ({
    value: values[name],
    onChange: (event: { target: { value: string } }) => setValues({ ...values, [name]: event.target.value }),
    error: showErrors && errors[name] !== undefined,
    helperText: showErrors ? errors[name] : undefined,
  })

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setShowErrors(true)
    setSubmitError(null)
    if (Object.keys(errors).length > 0) return

    setSubmitting(true)
    let id: number
    try {
      if (artwork) {
        await updateArtwork(artwork.id, input)
        id = artwork.id
      } else {
        id = (await createArtwork(input)).id
      }
    } catch {
      setSubmitError('Eser kaydedilemedi. Lütfen alanları kontrol edip tekrar deneyin.')
      setSubmitting(false)
      return
    }

    try {
      if (imageFile) await uploadArtworkImage(id, imageFile)
      else if (removeImage && artwork?.imageUrl) await deleteArtworkImage(id)
    } catch {
      if (artwork) {
        setSubmitError(IMAGE_FAILED_MESSAGE)
        setSubmitting(false)
      } else {
        navigate(`/admin/artworks/${id}/edit`, { replace: true, state: { created: true, imageFailed: true } })
      }
      return
    }

    // Yeni eserde düzenleme sayfasına geçilir; böylece tekrar "Kaydet" ikinci bir eser oluşturmaz.
    if (artwork) navigate('/admin/artworks')
    else navigate(`/admin/artworks/${id}/edit`, { replace: true, state: { created: true } })
  }

  return (
    <Stack component="form" spacing={2} onSubmit={handleSubmit} noValidate sx={{ maxWidth: 560 }}>
      <Typography variant="h5" component="h2">
        {artwork ? 'Eseri düzenle' : 'Yeni eser'}
      </Typography>
      {arrival.created && !submitError && (
        <Alert severity="success">Eser oluşturuldu. Şimdi aşağıdan satış seçeneklerini ekleyin.</Alert>
      )}
      {submitError && <Alert severity="error">{submitError}</Alert>}
      <TextField label="Başlık" required {...field('title')} slotProps={{ htmlInput: { maxLength: 200 } }} />
      <TextField
        label="Açıklama"
        multiline
        minRows={3}
        {...field('description')}
        slotProps={{ htmlInput: { maxLength: 2000 } }}
      />
      {!artwork && (
        <Typography variant="body2" color="text.secondary">
          Fiyat, ölçü ve stok; eser kaydedildikten sonra "Satış seçenekleri" bölümünden (orijinal ve/veya baskı
          olarak) eklenir.
        </Typography>
      )}
      <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Typography variant="subtitle2" component="h3">
          Görsel
        </Typography>
        {shownImage && (
          <Box
            component="img"
            src={shownImage}
            alt="Eser görseli önizlemesi"
            sx={{
              maxWidth: '100%',
              maxHeight: 280,
              objectFit: 'contain',
              borderRadius: 1,
              border: 1,
              borderColor: 'divider',
            }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          onChange={handleImageChange}
          aria-label="Görsel dosyası"
          hidden
        />
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => fileInputRef.current?.click()}>
            {shownImage ? 'Görseli değiştir' : 'Görsel seç'}
          </Button>
          {shownImage && (
            <Button color="error" onClick={handleImageRemove}>
              Görseli kaldır
            </Button>
          )}
        </Stack>
        <Typography variant="caption" color={imageError ? 'error' : 'text.secondary'} role={imageError ? 'alert' : undefined}>
          {imageError ?? 'JPEG, PNG veya WebP; en fazla 5 MB.'}
        </Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button component={Link} to="/admin/artworks" disabled={submitting}>
          Vazgeç
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? 'Kaydediliyor…' : 'Kaydet'}
        </Button>
      </Stack>
    </Stack>
  )
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | { status: 'loaded'; artwork: Artwork }

function EditArtwork({ id }: { id: number }) {
  const [state, setState] = useState<LoadState>(
    Number.isInteger(id) ? { status: 'loading' } : { status: 'notFound' },
  )

  useEffect(() => {
    if (!Number.isInteger(id)) return

    getArtwork(id)
      .then((artwork) => setState(artwork ? { status: 'loaded', artwork } : { status: 'notFound' }))
      .catch(() => setState({ status: 'error' }))
  }, [id])

  if (state.status === 'loading') return <Loading />
  if (state.status === 'error') return <Alert severity="error">Eser yüklenemedi. Lütfen tekrar deneyin.</Alert>
  if (state.status === 'notFound') return <Alert severity="warning">Bu eser bulunamadı.</Alert>

  return (
    <Stack spacing={5}>
      <ArtworkForm artwork={state.artwork} />
      <VariantsSection artworkId={state.artwork.id} initialVariants={state.artwork.variants} />
    </Stack>
  )
}

function ArtworkFormPage() {
  const { id } = useParams()

  return id === undefined ? <ArtworkForm artwork={null} /> : <EditArtwork key={id} id={Number(id)} />
}

export default ArtworkFormPage
