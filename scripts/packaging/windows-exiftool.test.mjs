import test from 'node:test';
import assert from 'node:assert/strict';
import { NtExecutable, NtExecutableResource } from 'resedit';
import { enableWindowsUtf8Manifest } from './windows-exiftool.mjs';

function fixture(manifest) {
  const executable = NtExecutable.createEmpty(false, false);
  const resources = NtExecutableResource.from(executable);
  resources.replaceResourceEntryFromString(24, 1, 1033, manifest);
  resources.replaceResourceEntryFromString(16, 1, 1033, 'original version resource');
  resources.outputResource(executable);
  return Buffer.from(executable.generate());
}

test('ExifTool UTF-8 manifest patch retains existing compatibility settings and other resources', () => {
  const original = fixture('<assembly><application><windowsSettings><longPathAware>true</longPathAware></windowsSettings></application></assembly>');
  const patched = enableWindowsUtf8Manifest(original);
  const executable = NtExecutable.from(patched);
  assert.equal(executable.is32bit(), false);
  const resources = NtExecutableResource.from(executable);
  const manifest = resources.getResourceEntriesAsString(24, 1)[0][1];
  assert.match(manifest, /<longPathAware>true<\/longPathAware>/);
  assert.match(manifest, /<activeCodePage xmlns="http:\/\/schemas.microsoft.com\/SMI\/2019\/WindowsSettings">UTF-8<\/activeCodePage>/);
  assert.deepEqual(resources.getResourceEntriesAsString(16, 1), [[1033, 'original version resource']]);
  assert.deepEqual(enableWindowsUtf8Manifest(patched), patched);
});

test('ExifTool manifest patch refuses absent or conflicting process code-page policies', () => {
  assert.throws(() => enableWindowsUtf8Manifest(Buffer.from(NtExecutable.createEmpty(false, false).generate())), /no application manifest/);
  assert.throws(() => enableWindowsUtf8Manifest(fixture('<assembly/>')), /Unexpected/);
  assert.throws(() => enableWindowsUtf8Manifest(fixture('<assembly><windowsSettings><activeCodePage>Legacy</activeCodePage></windowsSettings></assembly>')), /Unexpected/);
});
