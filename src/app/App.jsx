import { Suspense } from 'react';
import { createBrowserRouter, RouterProvider, useRouteError, Link } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ToastContainer } from 'react-toastify';
import { store } from '../store/index';
import queryClient from '../lib/queryClient';
import PageLoader from '../shared/components/PageLoader';
import { ConfirmDialogProvider } from '../shared/components/ConfirmDialogProvider';
import { publicRoutes } from './routes/publicRoutes';
import { authRoutes } from './routes/authRoutes';
import { platformRoutes } from './routes/platformRoutes';
import { workspaceRoutes } from './routes/workspaceRoutes';
import { candidateRoutes } from './routes/candidateRoutes';
import { demoRoutes } from './routes/demoRoutes';
import RouteEnvironment from './RouteEnvironment';
import QualifyRouteFrame from './QualifyRouteFrame';
import '../styles/app.css';

function RouteFallback(){const error=useRouteError(); return <main className="portal-message" role="alert"><h1>Something went wrong</h1><p>{error?.message || 'We could not open this page.'}</p><Link to="/">Return to QUALIFY</Link></main>}
function NotFound(){return <main className="portal-message"><h1>Page not found</h1><p>That page does not exist or its address has changed.</p><Link to="/">Go to homepage</Link></main>}
const pages = [
  ...publicRoutes, ...authRoutes, ...platformRoutes, ...workspaceRoutes,
  ...candidateRoutes, ...demoRoutes,
  {path:'*',element:<NotFound />},
].map(route=>({ ...route, element:<RouteEnvironment>{route.element}</RouteEnvironment>, errorElement:<RouteFallback /> }));
const router = createBrowserRouter([{ element: <QualifyRouteFrame />, children: pages }]);
export default function App(){return <Provider store={store}><QueryClientProvider client={queryClient}>
  <ConfirmDialogProvider><div className="app-container"><Suspense fallback={<PageLoader fullPage label="Opening page…"/>}>
    <RouterProvider router={router} fallbackElement={<PageLoader fullPage label="Opening QUALIFY…"/>}/>
  </Suspense><ToastContainer position="top-right" autoClose={3000} /></div></ConfirmDialogProvider>
  {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
</QueryClientProvider></Provider>}
