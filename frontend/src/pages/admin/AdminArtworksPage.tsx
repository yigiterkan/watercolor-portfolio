import { useEffect, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'
import { deleteArtwork, getArtworks, type Artwork } from '../../api/artworks.ts'
import { ApiError } from '../../api/client.ts'
import ArtworkImage from '../../components/ArtworkImage.tsx'
import Loading from '../../components/Loading.tsx'
import { priceSummary } from '../../utils/variant.ts'

function describeVariants(artwork: Artwork) {
  const parts: string[] = []
  if (artwork.variants.some((variant) => variant.type === 'Original')) parts.push('Orijinal')
  const prints = artwork.variants.filter((variant) => variant.type === 'Print').length
  if (prints > 0) parts.push(`${prints} baskı`)
  return parts.join(', ')
}

function AdminArtworksPage() {
  const [artworks, setArtworks] = useState<Artwork[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [toDelete, setToDelete] = useState<Artwork | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    getArtworks()
      .then(setArtworks)
      .catch(() => setLoadError(true))
  }, [])

  const handleDelete = async () => {
    if (!toDelete) return

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteArtwork(toDelete.id)
      setArtworks((current) => current?.filter((artwork) => artwork.id !== toDelete.id) ?? null)
    } catch (err) {
      setDeleteError(
        err instanceof ApiError && err.status === 409
          ? `"${toDelete.title}" silinemedi: bu eserin siparişi var. Satışı durdurmak için stoğunu 0 yapabilirsiniz.`
          : `"${toDelete.title}" silinemedi. Lütfen tekrar deneyin.`,
      )
    }
    setDeleting(false)
    setToDelete(null)
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
        <Button component={Link} to="/admin/artworks/new" variant="contained" startIcon={<AddIcon />}>
          Yeni eser
        </Button>
      </Stack>
      {deleteError && (
        <Alert severity="error" onClose={() => setDeleteError(null)}>
          {deleteError}
        </Alert>
      )}
      {loadError ? (
        <Alert severity="error">Eserler yüklenemedi. Lütfen daha sonra tekrar deneyin.</Alert>
      ) : !artworks ? (
        <Loading />
      ) : artworks.length === 0 ? (
        <Typography color="text.secondary">Henüz eser eklenmedi.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label="Eserler">
            <TableHead>
              <TableRow>
                <TableCell>Eser</TableCell>
                <TableCell>Seçenekler</TableCell>
                <TableCell align="right">Fiyat</TableCell>
                <TableCell align="right">Toplam stok</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {artworks.map((artwork) => (
                <TableRow key={artwork.id}>
                  <TableCell sx={{ minWidth: 200 }}>
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Box sx={{ width: 56, flexShrink: 0, borderRadius: 1, overflow: 'hidden' }}>
                        <ArtworkImage artwork={artwork} />
                      </Box>
                      <Typography variant="body2" sx={{ overflowWrap: 'anywhere' }}>
                        {artwork.title}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {artwork.variants.length === 0 ? (
                      <Typography variant="body2" color="warning.main">
                        Seçenek yok
                      </Typography>
                    ) : (
                      describeVariants(artwork)
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {priceSummary(artwork) ?? '—'}
                  </TableCell>
                  <TableCell align="right">
                    {artwork.variants.reduce((sum, variant) => sum + variant.stock, 0)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton
                      component={Link}
                      to={`/admin/artworks/${artwork.id}/edit`}
                      aria-label={`${artwork.title} eserini düzenle`}
                    >
                      <EditOutlinedIcon />
                    </IconButton>
                    <IconButton aria-label={`${artwork.title} eserini sil`} onClick={() => setToDelete(artwork)}>
                      <DeleteOutlineIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog open={toDelete !== null} onClose={() => !deleting && setToDelete(null)}>
        <DialogTitle>Eser silinsin mi?</DialogTitle>
        <DialogContent>
          <DialogContentText>"{toDelete?.title}" kalıcı olarak silinecek. Bu işlem geri alınamaz.</DialogContentText>
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

export default AdminArtworksPage
