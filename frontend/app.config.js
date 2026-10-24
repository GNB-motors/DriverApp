module.exports = ({ config }) => {
  const androidMapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY;
  return {
    ...config,
    android: {
      ...config.android,
      ...(androidMapsKey
        ? {
            config: {
              ...config.android?.config,
              googleMaps: { apiKey: androidMapsKey },
            },
          }
        : {}),
    },
  };
};
