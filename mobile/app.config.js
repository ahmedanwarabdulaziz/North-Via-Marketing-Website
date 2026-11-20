// Adds to app.json what can't be static: Firebase (google-services.json) only when the file is there.
// The file is kept out of git (public repo) and uploaded to EAS builds through .easignore.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const firebase = path.join(__dirname, 'google-services.json');
  return {
    ...config,
    // The PC version (npm run web:publish) lives at northviamarketing.com/app. Only for that export,
    // so the phone app's config (and its update fingerprint) stays the same.
    ...(process.env.ANWARZ_WEB === '1' ? { experiments: { ...config.experiments, baseUrl: '/app' } } : {}),
    android: {
      ...config.android,
      ...(fs.existsSync(firebase) ? { googleServicesFile: './google-services.json' } : {}),
    },
  };
};
