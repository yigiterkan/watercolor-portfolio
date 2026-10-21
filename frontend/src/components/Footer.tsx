import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { SERIF_FONT } from '../theme.ts'

const YEAR = new Date().getFullYear()

function Footer() {
  return (
    <Box component="footer" sx={{ borderTop: 1, borderColor: 'divider', py: 4, px: 2, textAlign: 'center' }}>
      <Typography sx={{ fontFamily: SERIF_FONT, color: 'primary.main', mb: 0.5 }}>Suluboya Galerisi</Typography>
      <Typography variant="body2" color="text.secondary">
        © {YEAR} Suluboya Galerisi. Tüm hakları saklıdır.
      </Typography>
    </Box>
  )
}

export default Footer
