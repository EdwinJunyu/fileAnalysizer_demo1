# Third-party software in complete packages

This file records distribution choices for File Analyzer. It grants no license to
the project's own source: the project owner has not selected that license yet.
`package.json` therefore says `UNLICENSED`. Choose a project license before
advertising the project itself as open source or publishing a public release.

## FFmpeg and FFprobe 7.1.5

Source: <https://github.com/FFmpeg/FFmpeg/tree/n7.1.5>.
PNG encoding is enabled using zlib 1.3.1, built statically from
<https://github.com/madler/zlib/tree/v1.3.1> under the zlib license. Its full source
archive and copyright/license text are included in `tools/licenses/` too.

The build uses `--disable-gpl --disable-nonfree --disable-version3`, static
libraries, no external library autodetection, and no networking. Both programs
must report the GNU Lesser General Public License, version 2.1 or later. The
packaging preflight refuses GPL/nonfree/version3 configurations. This applies
to these exact builds; it is not a statement about every FFmpeg download.

The complete corresponding source archive, all FFmpeg COPYING files,
`LICENSE.md`, `config.h`, `config.mak`, and the actual configure arguments are
included in `resources/tools/licenses/`. The source archive preserves upstream
copyright and license notices, including individually licensed components.
The build recipe is included there too. FFmpeg/FFprobe are separate command-line
programs; File Analyzer invokes them as child processes.

## ExifTool 13.59 and Perl

ExifTool: Copyright Phil Harvey; <https://exiftool.org/> and
<https://github.com/exiftool/exiftool>. ExifTool is available under the same terms
as Perl (Artistic License or GNU GPL). Preserve its individual module notices.

macOS packages include Perl 5.40.2 built from the pinned CPAN source, its complete
core library, and Archive::Zip 1.68. They do not require a system Perl installation.
Perl and Archive::Zip are available under Perl's dual licensing terms; their
source archives, Artistic/GPL texts, module notices and build recipe are retained.
Some Perl core modules carry additional notices in the full corresponding source.

Windows packages use `exiftool-vendored.exe` 13.59.3 from PhotoStructure's npm
distribution. Its packaging code is MIT licensed. That does **not** relicense its
payload. The payload contains Phil Harvey's ExifTool, Oliver Betz's CC0 launcher,
Strawberry Perl and other runtime libraries with their own licenses. The complete
`exiftool_files` directory, `readme_windows.txt`, `Licenses_Strawberry_Perl.zip`,
LICENSE files, vendored package archive and downstream patches are preserved.
File Analyzer adds a UTF-8 active-code-page setting to the Windows launcher's
application manifest for non-ASCII installation paths (Windows 10 1903+).
Its executable code and other resources are retained. The original pinned npm
archive, modification recipe and original/modified launcher SHA-256 values are
included in `tools/licenses/`; the record is `exiftool-windows/utf8-manifest-patch.json`.

The bundled Perl runtime includes Archive::Zip. See those included licenses and
source references when redistributing; do not label the entire payload MIT.

## Electron and JavaScript dependencies

Electron includes Chromium, Node.js and other software. Its distribution's
`LICENSE` and `LICENSES.chromium.html` remain in the application package.
Electron is MIT licensed and Chromium/Node components retain their individual
notices. Application production dependencies include `fast-xml-parser` (MIT),
`file-type` (MIT), `yauzl` (MIT), `pdf-lib` 1.17.1 (MIT), and their transitive dependencies. Packaging
collects installed production dependency metadata and available license/notice
files into `resources/tools/licenses/javascript/` so version-specific notices
travel with each binary. `package-lock.json` records exact npm integrity hashes.
`@tokenizer/token` includes its full MIT copyright/license in README, which is
preserved. `@nodable/entities` 3.1.0 omits the license file from its npm archive;
its exact publishing commit's original license is vendored in
`scripts/packaging/notices/`, with the source URL and SHA-256 in `provenance.json`.
This reviewed fallback applies only to that exact package name and version.

## Location and verification

On macOS, `resources/tools` means `File Analyzer.app/Contents/Resources/tools`.
On Windows it is the `resources/tools` directory beside `File Analyzer.exe`.
`manifest.json` records target architecture, versions, source URLs and SHA-256
hashes for every bundled tool file and source archive. The packaging command
verifies these before building and CI smoke-tests the resulting application.

No downloader runs inside the application. Source users install/configure their
own tools; their chosen tool builds may have different licenses and capabilities.
