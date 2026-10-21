import { useState, type FormEvent } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import {
  createVariant,
  deleteVariant,
  updateVariant,
  type Variant,
  type VariantInput,
  type VariantType,
} from '../../api/artworks.ts'
import { ApiError } from '../../api/client.ts'
import { formatPrice } from '../../utils/format.ts'
import { parseDecimal, parseInteger } from '../../utils/parse.ts'
import { sortVariants, VARIANT_TYPE_LABELS } from '../../utils/variant.ts'

type FormValues = { type: VariantType; widthCm: string; heightCm: string; price: string; stock: string }
type FormErrors = Partial<Record<keyof FormValues, string>>

// Backend'deki VariantRequest ve iş kurallarının aynısı.
function validate(values: FormValues): { errors: FormErrors; input: VariantInput } {
  const errors: FormErrors = {}
  const widthCm = parseInteger(values.widthCm)
  const heightCm = parseInteger(values.heightCm)
  const price = parseDecimal(values.price)
  const stock = parseInteger(values.stock)
  const maxStock = values.type === 'Original' ? 1 : 10_000

  if (!(widthCm >= 1 && widthCm <= 1000)) errors.widthCm = '1–1000 arasında tam sayı girin.'
  if (!(heightCm >= 1 && heightCm <= 1000)) errors.heightCm = '1–1000 arasında tam sayı girin.'
  if (!(price >= 0.01 && price <= 10_000_000)) errors.price = 'Geçerli bir fiyat girin (örn. 450 veya 450,50).'
  if (!(stock >= 0 && stock <= maxStock)) {
    errors.stock = values.type === 'Original' ? 'Orijinalin stoğu 0 ya da 1 olabilir.' : '0–10.000 arasında tam sayı girin.'
  }

  return { errors, input: { type: values.type, widthCm, heightCm, price, stock } }
}

type VariantDialogProps = {
  artworkId: number
  variant: Variant | null // null: yeni seçenek
  originalTaken: boolean
  onClose: () => void
  onSaved: (variant: Variant) => void
}

function VariantDialog({ artworkId, variant, originalTaken, onClose, onSaved }: VariantDialogProps) {
  const [values, setValues] = useState<FormValues>(
    variant
      ? {
          type: variant.type,
          widthCm: String(variant.widthCm),
          heightCm: String(variant.heightCm),
          price: String(variant.price).replace('.', ','),
          stock: String(variant.stock),
        }
      : { type: originalTaken ? 'Print' : 'Original', widthCm: '', heightCm: '', price: '', stock: '1' },
  )
  const [showErrors, setShowErrors] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const { errors, input } = validate(values)
  const field = (name: Exclude<keyof FormValues, 'type'>) => ({
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
    try {
      const saved = variant
        ? await updateVariant(artworkId, variant.id, input)
        : await createVariant(artworkId, input)
      onSaved(saved)
    } catch (err) {
      setSubmitError(
        err instanceof ApiError && err.status === 409 ? err.message : 'Seçenek kaydedilemedi. Lütfen tekrar deneyin.',
      )
      setSubmitting(false)
    }
  }

  return (
    <Dialog open onClose={() => !submitting && onClose()} fullWidth maxWidth="xs">
      <form onSubmit={handleSubmit} noValidate>
        <DialogTitle>{variant ? 'Seçeneği düzenle' : 'Yeni seçenek'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {submitError && <Alert severity="error">{submitError}</Alert>}
            <TextField
              select
              label="Tür"
              value={values.type}
              onChange={(event) => setValues({ ...values, type: event.target.value as VariantType })}
              helperText={
                originalTaken && values.type !== 'Original' ? 'Bu eserin zaten bir orijinal seçeneği var.' : undefined
              }
            >
              <MenuItem value="Original" disabled={originalTaken}>
                {VARIANT_TYPE_LABELS.Original}
              </MenuItem>
              <MenuItem value="Print">{VARIANT_TYPE_LABELS.Print}</MenuItem>
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Genişlik (cm)"
                required
                fullWidth
                {...field('widthCm')}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
              <TextField
                label="Yükseklik (cm)"
                required
                fullWidth
                {...field('heightCm')}
                slotProps={{ htmlInput: { inputMode: 'numeric' } }}
              />
            </Stack>
            <TextField
              label="Fiyat (TL)"
              required
              {...field('price')}
              slotProps={{ htmlInput: { inputMode: 'decimal' } }}
            />
            <TextField
              label="Stok"
              required
              {...field('stock')}
              slotProps={{ htmlInput: { inputMode: 'numeric' } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Vazgeç
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kaydet'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function VariantsSection({ artworkId, initialVariants }: { artworkId: number; initialVariants: Variant[] }) {
  const [variants, setVariants] = useState(() => sortVariants(initialVariants))
  // undefined: kapalı, null: yeni seçenek, Variant: düzenlenen seçenek
  const [editing, setEditing] = useState<Variant | null | undefined>(undefined)
  const [toDelete, setToDelete] = useState<Variant | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const originalTakenBy = variants.find((variant) => variant.type === 'Original')

  const handleSaved = (saved: Variant) => {
    setVariants((current) => sortVariants([...current.filter((variant) => variant.id !== saved.id), saved]))
    setEditing(undefined)
  }

  const handleDelete = async () => {
    if (!toDelete) return

    setDeleting(true)
    setError(null)
    try {
      await deleteVariant(artworkId, toDelete.id)
      setVariants((current) => current.filter((variant) => variant.id !== toDelete.id))
    } catch (err) {
      setError(err instanceof ApiError && err.status === 409 ? err.message : 'Seçenek silinemedi. Lütfen tekrar deneyin.')
    }
    setDeleting(false)
    setToDelete(null)
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 720 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h2">
          Satış seçenekleri
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditing(null)}>
          Seçenek ekle
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {variants.length === 0 ? (
        <Alert severity="info">
          Henüz satış seçeneği yok. Orijinali ve/veya baskı seçeneklerini ekleyin; seçenek eklenene kadar eser
          galeride "Satışta değil" olarak görünür.
        </Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Satış seçenekleri">
            <TableHead>
              <TableRow>
                <TableCell>Tür</TableCell>
                <TableCell>Ölçü</TableCell>
                <TableCell align="right">Fiyat</TableCell>
                <TableCell align="right">Stok</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {variants.map((variant) => {
                const name = `${VARIANT_TYPE_LABELS[variant.type]} ${variant.widthCm} × ${variant.heightCm} cm`
                return (
                  <TableRow key={variant.id}>
                    <TableCell>{VARIANT_TYPE_LABELS[variant.type]}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {variant.widthCm} × {variant.heightCm} cm
                    </TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      {formatPrice(variant.price)}
                    </TableCell>
                    <TableCell align="right">{variant.stock}</TableCell>
                    <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                      <IconButton aria-label={`${name} seçeneğini düzenle`} onClick={() => setEditing(variant)}>
                        <EditOutlinedIcon />
                      </IconButton>
                      <IconButton aria-label={`${name} seçeneğini sil`} onClick={() => setToDelete(variant)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {editing !== undefined && (
        <VariantDialog
          artworkId={artworkId}
          variant={editing}
          originalTaken={originalTakenBy !== undefined && originalTakenBy.id !== editing?.id}
          onClose={() => setEditing(undefined)}
          onSaved={handleSaved}
        />
      )}
      <Dialog open={toDelete !== null} onClose={() => !deleting && setToDelete(null)}>
        <DialogTitle>Seçenek silinsin mi?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {toDelete &&
              `${VARIANT_TYPE_LABELS[toDelete.type]} ${toDelete.widthCm} × ${toDelete.heightCm} cm seçeneği silinecek.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)} disabled={deleting}>
            Vazgeç
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={deleting}>
            {deleting ? 'Siliniyor…' : 'Sil'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

export default VariantsSection
