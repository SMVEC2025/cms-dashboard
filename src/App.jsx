import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './router/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import GlobalContextMenu from './components/layout/GlobalContextMenu';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <GlobalContextMenu />
        <Toaster
          position="top-right"
          gutter={12}
          toastOptions={{
            className: 'app-toast app-toast--default',
            duration: 3800,
            success: {
              className: 'app-toast app-toast--success',
              duration: 3400,
              iconTheme: {
                primary: '#59c888',
                secondary: '#ffffff',
              },
            },
            error: {
              className: 'app-toast app-toast--error',
              duration: 4300,
              iconTheme: {
                primary: '#e05766',
                secondary: '#ffffff',
              },
            },
            loading: {
              className: 'app-toast app-toast--loading',
              duration: 7000,
              iconTheme: {
                primary: '#2d3894',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
