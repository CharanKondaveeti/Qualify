import { QueryClient } from '@tanstack/react-query';
// Do not persist private records or answer keys in a shared query cache.
export default new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 15000 } } });
