import { NtExecutable, NtExecutableResource } from 'resedit';

const utf8Setting = '<activeCodePage xmlns="http://schemas.microsoft.com/SMI/2019/WindowsSettings">UTF-8</activeCodePage>';

/** Keep the upstream launcher code/resources and opt its ANSI APIs into UTF-8 on Windows 10 1903+. */
export function enableWindowsUtf8Manifest(binary) {
  const executable = NtExecutable.from(binary);
  const resources = NtExecutableResource.from(executable);
  const manifests = resources.getResourceEntriesAsString(24, 1);
  if (!manifests.length) throw new Error('ExifTool launcher has no application manifest; review the pinned payload.');
  let changed = false;
  for (const [language, manifest] of manifests) {
    if (manifest.includes(utf8Setting)) continue;
    if (manifest.includes('activeCodePage') || manifest.split('</windowsSettings>').length !== 2) {
      throw new Error('Unexpected ExifTool application manifest; review before patching.');
    }
    resources.replaceResourceEntryFromString(24, 1, language,
      manifest.replace('</windowsSettings>', `    ${utf8Setting}\n    </windowsSettings>`));
    changed = true;
  }
  if (!changed) return Buffer.from(binary);
  resources.outputResource(executable);
  return Buffer.from(executable.generate());
}
