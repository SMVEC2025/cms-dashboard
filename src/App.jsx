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
          toastOptions={{
            style: {
              borderRadius: '16px',
              border: '1px solid rgba(18, 24, 38, 0.08)',
              boxShadow: '0 18px 40px rgba(15, 23, 42, 0.1)',
            },
          }}
        />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
