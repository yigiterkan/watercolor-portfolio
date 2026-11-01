import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link } from 'react-router'

function ShowcaseHero() {
  return (
    <Box component="section" aria-label="Öne çıkan eser" sx={{ mb: 4 }}>
      <Box
        component="img"
        src="/images/showcase/headdress-portrait.jpg"
        alt="Kırmızı, sarı ve gri tüylerden başlık takmış bıyıklı bir adamın suluboya portresi"
        fetchPriority="high"
        sx={{
          display: 'block',
          width: '100%',
          aspectRatio: { xs: '4 / 3', md: '16 / 8' },
          objectFit: 'cover',
          objectPosition: 'center 35%',
          bgcolor: 'action.hover',
        }}
      />
      <Stack
        direction="row"
        spacing={2}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 1.5,
          py: 0.5,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography sx={{ fontSize: { xs: '0.85rem', sm: '1rem' }, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Atölyeden
        </Typography>
        <Button component={Link} to="/?type=Print" color="inherit" endIcon={<ArrowForwardIcon />}>
          Baskılara göz at
        </Button>
      </Stack>
    </Box>
  )
}

export default ShowcaseHero
