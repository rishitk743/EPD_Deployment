import { RouterProvider } from 'react-router';
import { router } from './routes';
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
console.log("VITE_GOOGLE_CLIENT_ID:", CLIENT_ID);

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  );
}
