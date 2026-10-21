import Box from '@mui/material/Box'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Typography from '@mui/material/Typography'
import { Link, Outlet, useLocation } from 'react-router'

function AdminLayout() {
  const { pathname } = useLocation()
  const tab = pathname.startsWith('/admin/artworks') ? 'artworks' : 'orders'

  return (
    <>
      <Typography variant="h4" component="h1" gutterBottom>
        Yönetim paneli
      </Typography>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tab} aria-label="Yönetim bölümleri">
          <Tab label="Siparişler" value="orders" component={Link} to="/admin/orders" />
          <Tab label="Eserler" value="artworks" component={Link} to="/admin/artworks" />
        </Tabs>
      </Box>
      <Outlet />
    </>
  )
}

export default AdminLayout
