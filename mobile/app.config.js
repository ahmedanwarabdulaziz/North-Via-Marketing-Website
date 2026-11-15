// Adds to app.json what can't be static: Firebase (google-services.json) only when the file is there.
// The file is kept out of git (public repo) and uploaded to EAS builds through .easignore.
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const firebase = path.join(__dirname, 'google-services.json');
  return {
    ...config,
    android: {
      ...config.android,
      ...(fs.existsSync(firebase) ? { googleServicesFile: './google-services.json' } : {}),
    },
  };
};
