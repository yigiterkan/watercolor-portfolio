import { createTheme } from '@mui/material/styles'

const SERIF = '"Libre Baskerville", Georgia, "Times New Roman", serif'

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: {
    light: {
      palette: {
        // Beyaz yazıyla yeterli kontrast (≈5:1) veren koyu çelik mavisi.
        primary: { main: '#3f6d94', light: '#6f9cc4', dark: '#2c5272', contrastText: '#ffffff' },
        background: { default: '#ffffff', paper: '#ffffff' },
        text: { primary: '#1f2328', secondary: '#5b6470' },
        divider: '#dfe3e8',
      },
    },
    dark: {
      palette: {
        primary: { main: '#8db4d6', light: '#b3cfe6', dark: '#5f8fb8', contrastText: '#0e1a24' },
        background: { default: '#14171a', paper: '#1b1f23' },
        divider: '#2d333a',
      },
    },
  },
  shape: { borderRadius: 2 },
  typography: {
    fontFamily: 'Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontFamily: SERIF, fontWeight: 400 },
    h2: { fontFamily: SERIF, fontWeight: 400 },
    h3: { fontFamily: SERIF, fontWeight: 400 },
    h4: { fontFamily: SERIF, fontWeight: 400, fontSize: '1.9rem' },
    h5: { fontFamily: SERIF, fontWeight: 400 },
    h6: { fontFamily: SERIF, fontWeight: 400 },
    button: { letterSpacing: '0.04em' },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiCard: { defaultProps: { elevation: 0, square: true } },
    MuiPaper: { defaultProps: { elevation: 0 } },
  },
})

export const SERIF_FONT = SERIF

export default theme
