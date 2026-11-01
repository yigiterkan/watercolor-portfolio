import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import { Navigate, Route, Routes } from 'react-router'
import { useAuth } from './auth/AuthContext.ts'
import AdminNotifications from './components/AdminNotifications.tsx'
import Footer from './components/Footer.tsx'
import Header from './components/Header.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'
import AccountPage from './pages/AccountPage.tsx'
import AdminArtworksPage from './pages/admin/AdminArtworksPage.tsx'
import AdminLayout from './pages/admin/AdminLayout.tsx'
import AdminOrdersPage from './pages/admin/AdminOrdersPage.tsx'
import ArtworkFormPage from './pages/admin/ArtworkFormPage.tsx'
import ArtworkDetailPage from './pages/ArtworkDetailPage.tsx'
import CartPage from './pages/CartPage.tsx'
import CheckoutPage from './pages/CheckoutPage.tsx'
import GalleryPage from './pages/GalleryPage.tsx'
import LoginPage from './pages/LoginPage.tsx'
import NotFoundPage from './pages/NotFoundPage.tsx'
import OrderDetailPage from './pages/OrderDetailPage.tsx'
import OrdersPage from './pages/OrdersPage.tsx'
import RegisterPage from './pages/RegisterPage.tsx'

function App() {
  const { isAdmin } = useAuth()

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <Container component="main" maxWidth={false} sx={{ maxWidth: 1040, py: 4, flexGrow: 1 }}>
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/artworks/:id" element={<ArtworkDetailPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/account" element={<AccountPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
          </Route>
          <Route element={<ProtectedRoute role="Admin" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="orders" replace />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="artworks" element={<AdminArtworksPage />} />
              <Route path="artworks/new" element={<ArtworkFormPage />} />
              <Route path="artworks/:id/edit" element={<ArtworkFormPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Container>
      <Footer />
      {isAdmin && <AdminNotifications />}
    </Box>
  )
}

export default App
