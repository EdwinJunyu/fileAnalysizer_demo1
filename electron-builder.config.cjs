const path = require('node:path');

/** Tools are prepared and verified by scripts/package-app.mjs before this config is used. */
module.exports = {
  appId: 'io.github.edwinjunyu.fileanalyzer',
  productName: 'File Analyzer',
  artifactName: 'File-Analyzer-${version}-${os}-${arch}.${ext}',
  directories: { output: 'release' },
  // prepare:electron installs and verifies the pinned native distribution before packaging.
  electronDist: path.join(__dirname, 'node_modules', 'electron', 'dist'),
  files: ['dist/src/**/*', 'dist/ui/**/*', 'package.json', 'THIRD_PARTY_NOTICES.md'],
  asar: true,
  npmRebuild: false,
  extraResources: [{
    from: process.env.FILE_ANALYZER_PACKAGING_TOOLS || path.join('.tools', 'packaging', `${process.platform}-${process.arch}`, 'tools'),
    to: 'tools',
    filter: ['**/*'],
  }],
  // No certificates or Apple credentials are required for CI artifacts. Signing is a later release decision.
  forceCodeSigning: false,
  publish: null,
  win: { target: [{ target: 'nsis', arch: ['x64'] }], signAndEditExecutable: false },
  nsis: { oneClick: false, perMachine: false, allowElevation: false, allowToChangeInstallationDirectory: true,
    runAfterFinish: false, createDesktopShortcut: false },
  mac: { target: ['dmg'], category: 'public.app-category.utilities', identity: null, hardenedRuntime: false },
  // Used only for local packaging verification; Linux is not a supported release target.
  linux: { target: ['dir'], category: 'Utility' },
};
