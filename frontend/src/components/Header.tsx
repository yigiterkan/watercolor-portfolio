import { startTransition, useState } from 'react'
import AccountCircleIcon from '@mui/icons-material/AccountCircleOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCartOutlined'
import Badge from '@mui/material/Badge'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'
import { useAuth } from '../auth/AuthContext.ts'
import { useCart } from '../cart/CartContext.ts'
import { SERIF_FONT } from '../theme.ts'
import { GALLERY_LINKS } from './navigation.ts'

const CONTENT_WIDTH = 1040

function Brand() {
  return (
    <Stack
      component={Link}
      to="/"
      direction="row"
      spacing={{ xs: 1.5, md: 2 }}
      aria-label="Suluboya Galerisi ana sayfa"
      sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none', minWidth: 0 }}
    >
      <Typography
        aria-hidden
        sx={{
          fontFamily: SERIF_FONT,
          fontSize: { xs: '2.6rem', md: '3.6rem' },
          lineHeight: 1,
          color: 'primary.light',
          letterSpacing: '-0.04em',
        }}
      >
        SG
      </Typography>
      <Divider orientation="vertical" flexItem sx={{ borderColor: 'text.primary', opacity: 0.6 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            color: 'primary.main',
            fontSize: { xs: '1rem', md: '1.3rem' },
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            textTransform: 'uppercase',
          }}
        >
          Suluboya Galerisi
        </Typography>
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: { xs: '0.75rem', md: '0.95rem' },
            letterSpacing: '0.06em',
            lineHeight: 1.3,
            textTransform: 'uppercase',
          }}
        >
          Orijinal eserler ve baskılar
        </Typography>
      </Box>
    </Stack>
  )
}

function Header() {
  const { user, isAdmin, logout } = useAuth()
  const { count, clear: clearCart } = useCart()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const currentType = pathname === '/' ? searchParams.get('type') : undefined
  const closeMenu = () => setMenuAnchor(null)

  const handleLogout = () => {
    closeMenu()
    setDrawerOpen(false)
    navigate('/')
    // Router konumu bir transition içinde günceller. Çıkışı da aynı transition'a alıyoruz ki
    // korumalı bir sayfadayken ProtectedRoute araya girip /login'e yönlendirmesin.
    startTransition(() => {
      logout()
      clearCart()
    })
  }

  const pageLinks = [
    ...(user ? [{ label: 'Siparişlerim', to: '/orders' }] : []),
    ...(isAdmin ? [{ label: 'Yönetim', to: '/admin' }] : []),
  ]

  const cartButton = (
    <IconButton
      component={Link}
      to="/cart"
      color="inherit"
      aria-label={count > 0 ? `Sepet, ${count} ürün` : 'Sepet'}
    >
      <Badge badgeContent={count} color="error">
        <ShoppingCartIcon />
      </Badge>
    </IconButton>
  )

  const navLinkSx = (active: boolean) => ({
    color: active ? 'primary.main' : 'text.primary',
    fontSize: '0.9rem',
    fontWeight: 400,
    px: 1.5,
    py: 1.25,
    borderRadius: 0,
    borderBottom: 2,
    borderColor: active ? 'primary.main' : 'transparent',
    '&:hover': { bgcolor: 'transparent', color: 'primary.main' },
  })

  return (
    <Box component="header" sx={{ bgcolor: 'background.paper' }}>
      <Stack
        direction="row"
        sx={{
          maxWidth: CONTENT_WIDTH,
          mx: 'auto',
          px: 2,
          py: { xs: 1.5, md: 2 },
          alignItems: 'center',
          justifyContent: { xs: 'center', md: 'space-between' },
        }}
      >
        <Brand />
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', color: 'primary.main' }}
        >
          {user ? (
            <>
              <Button
                color="primary"
                startIcon={<AccountCircleIcon />}
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                aria-haspopup="menu"
                sx={{ textTransform: 'none', maxWidth: 260 }}
              >
                <Typography component="span" noWrap>
                  {user.fullName}
                </Typography>
              </Button>
              <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={closeMenu}>
                <MenuItem component={Link} to="/account" onClick={closeMenu}>
                  Hesabım
                </MenuItem>
                <MenuItem component={Link} to="/orders" onClick={closeMenu}>
                  Siparişlerim
                </MenuItem>
                {isAdmin && (
                  <MenuItem component={Link} to="/admin" onClick={closeMenu}>
                    Yönetim paneli
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout}>Çıkış yap</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button component={Link} to="/login">
                Giriş yap
              </Button>
              <Button component={Link} to="/register">
                Kayıt ol
              </Button>
            </>
          )}
          {cartButton}
        </Stack>
      </Stack>

      <Box
        component="nav"
        aria-label="Ana menü"
        sx={{ display: { xs: 'none', md: 'block' }, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}
      >
        <Stack direction="row" sx={{ maxWidth: CONTENT_WIDTH, mx: 'auto', px: 1 }}>
          {GALLERY_LINKS.map((link) => (
            <Button key={link.label} component={Link} to={link.to} sx={navLinkSx(currentType === link.type)}>
              {link.label}
            </Button>
          ))}
          {pageLinks.map((link) => (
            <Button key={link.to} component={Link} to={link.to} sx={navLinkSx(pathname.startsWith(link.to))}>
              {link.label}
            </Button>
          ))}
        </Stack>
      </Box>

      <Stack
        direction="row"
        sx={{
          display: { xs: 'flex', md: 'none' },
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          px: 1,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button
          color="inherit"
          startIcon={<MenuIcon />}
          onClick={() => setDrawerOpen(true)}
          aria-label="Menüyü aç"
          sx={{ fontSize: '1rem', py: 1.25 }}
        >
          Menü
        </Button>
        {cartButton}
      </Stack>
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation">
          <Typography sx={{ px: 2, pt: 2, pb: 1, color: 'text.secondary', fontSize: '0.8rem', letterSpacing: '0.08em' }}>
            MENÜ
          </Typography>
          <List onClick={() => setDrawerOpen(false)}>
            {GALLERY_LINKS.map((link) => (
              <ListItemButton key={link.label} component={Link} to={link.to} selected={currentType === link.type}>
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
            {pageLinks.map((link) => (
              <ListItemButton key={link.to} component={Link} to={link.to} selected={pathname.startsWith(link.to)}>
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
          <List>
            {user ? (
              <>
                <ListItemButton component={Link} to="/account" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Hesabım" secondary={user.fullName} />
                </ListItemButton>
                <ListItemButton onClick={handleLogout}>
                  <ListItemText primary="Çıkış yap" />
                </ListItemButton>
              </>
            ) : (
              <>
                <ListItemButton component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Giriş yap" />
                </ListItemButton>
                <ListItemButton component={Link} to="/register" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Kayıt ol" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </Box>
  )
}

export default Header
