import { RouterProvider } from 'react-router-dom';
import { StoreProvider } from './providers/StoreProvider';
import { appRouter } from './router';
export default function App() {
    return (<StoreProvider>
      <RouterProvider router={appRouter}/>
    </StoreProvider>);
}
