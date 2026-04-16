import { RouterProvider } from 'react-router';
import { router } from './routes';
import { GoogleOAuthProvider } from '@react-oauth/google';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "727087897983-25m74s61nh21129ca70cck2cqkhphk8m.apps.googleusercontent.com";

export default function App() {
  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <RouterProvider router={router} />
    </GoogleOAuthProvider>
  );
}
