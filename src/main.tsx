import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { appRoutes } from '@/app/routes';
import { createQueryClient } from '@/lib/queryClient';
// Registers playback providers as a side effect (none yet — see the file for why).
import '@/services/playback/authorizedProvider';
import './index.css';

const queryClient = createQueryClient();
const router = createBrowserRouter(appRoutes);

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element #root not found');

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
