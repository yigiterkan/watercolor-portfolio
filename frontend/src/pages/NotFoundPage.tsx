import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="h4" component="h1">
        Sayfa bulunamadı
      </Typography>
      <Typography color="text.secondary">Aradığınız sayfa mevcut değil.</Typography>
      <Button component={Link} to="/" variant="contained">
        Galeriye dön
      </Button>
    </Stack>
  )
}

export default NotFoundPage
