import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

function Loading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  )
}

export default Loading
