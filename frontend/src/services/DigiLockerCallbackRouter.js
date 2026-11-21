import { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { isDigiLockerCallbackUrl } from '../utils/digilocker';

export default function DigiLockerCallbackRouter({ navigationRef, ready }) {
  const { user, loading } = useAuth();
  const [pending, setPending] = useState(null);
  useEffect(() => {
    const accept = (url) => {
      if (isDigiLockerCallbackUrl(url)) setPending(url);
    };
    Linking.getInitialURL()
      .then(accept)
      .catch(() => {});
    const listener = Linking.addEventListener('url', ({ url }) => accept(url));
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (
      !pending ||
      !ready ||
      loading ||
      user?.role !== 'DRIVER' ||
      !navigationRef.isReady()
    )
      return;
    navigationRef.navigate('Documents', {
      scope: 'personal',
      digiLockerCallbackUrl: pending,
    });
    setPending(null);
  }, [pending, ready, loading, user, navigationRef]);
  return null;
}
