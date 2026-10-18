#!/usr/bin/env bash
set -euo pipefail

TASK_PLATFORM=$1
TASK_WORK_DIR=$2
TASK_OUTPUT_DIR=$3
if [[ "$TASK_PLATFORM" == "win32" ]]; then
  TASK_WORK_DIR=$(cygpath -u "$TASK_WORK_DIR")
  TASK_OUTPUT_DIR=$(cygpath -u "$TASK_OUTPUT_DIR")
fi
TASK_JOBS=${PACKAGING_JOBS:-4}
mkdir -p "$TASK_OUTPUT_DIR/licenses/ffmpeg"

# PNG encoding needs zlib. Build it explicitly, since external autodetection is disabled.
mkdir -p "$TASK_WORK_DIR/zlib-prefix/include" "$TASK_WORK_DIR/zlib-prefix/lib" "$TASK_OUTPUT_DIR/licenses/zlib"
cd "$TASK_WORK_DIR/zlib"
if [[ "$TASK_PLATFORM" == "win32" ]]; then
  make -f win32/Makefile.gcc -j"$TASK_JOBS" libz.a
  cp libz.a "$TASK_WORK_DIR/zlib-prefix/lib/"
  cp zlib.h zconf.h "$TASK_WORK_DIR/zlib-prefix/include/"
else
  ./configure --static --prefix="$TASK_WORK_DIR/zlib-prefix"
  make -j"$TASK_JOBS"
  make install
fi
cp LICENSE README "$TASK_OUTPUT_DIR/licenses/zlib/"

cd "$TASK_WORK_DIR/ffmpeg"
# A GitHub source archive has no .git directory. Otherwise FFmpeg's version.sh may
# discover this application's parent repository and stamp its commit into ffmpeg.
cp RELEASE VERSION
TASK_CONFIGURE=(--disable-gpl --disable-nonfree --disable-version3 --disable-shared --enable-static
  --disable-autodetect --disable-network --disable-doc --disable-debug --disable-ffplay --disable-x86asm
  --enable-zlib --extra-cflags=-I../zlib-prefix/include)
TASK_LDFLAGS=-L../zlib-prefix/lib
if [[ "$TASK_PLATFORM" == "win32" ]]; then
  TASK_CONFIGURE+=(--target-os=mingw32 --cc=gcc)
  TASK_LDFLAGS="$TASK_LDFLAGS -static"
fi
TASK_CONFIGURE+=("--extra-ldflags=$TASK_LDFLAGS")
./configure "${TASK_CONFIGURE[@]}"
make -j"$TASK_JOBS"
TASK_SUFFIX=""
if [[ "$TASK_PLATFORM" == "win32" ]]; then TASK_SUFFIX=.exe; fi
cp "ffmpeg$TASK_SUFFIX" "ffprobe$TASK_SUFFIX" "$TASK_OUTPUT_DIR/"
cp COPYING.* LICENSE.md "$TASK_OUTPUT_DIR/licenses/ffmpeg/"
cp config.h ffbuild/config.mak "$TASK_OUTPUT_DIR/licenses/ffmpeg/"
cp RELEASE VERSION "$TASK_OUTPUT_DIR/licenses/ffmpeg/"
# Arguments are recorded by Node rather than reconstructed from a banner in a downstream package.
node -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify(process.argv.slice(2), null, 2)+"\n")' \
  "$TASK_OUTPUT_DIR/licenses/ffmpeg/configure-arguments.json" "${TASK_CONFIGURE[@]}"

if [[ "$TASK_PLATFORM" != "win32" ]]; then
  cd "$TASK_WORK_DIR/perl"
  # A static libperl and relocatable @INC avoid a dependency on system/Homebrew Perl.
  sh Configure -des -Dprefix="$TASK_OUTPUT_DIR/perl" -Duserelocatableinc -Uuseshrplib -Dman1dir=none -Dman3dir=none \
    -Dlocincpth= -Dloclibpth=
  make -j"$TASK_JOBS"
  make install
  mkdir -p "$TASK_OUTPUT_DIR/licenses/perl"
  cp Artistic Copying README "$TASK_OUTPUT_DIR/licenses/perl/"
  # Refuse accidental Homebrew/local-library dependencies on macOS.
  if [[ "$TASK_PLATFORM" == "darwin" ]]; then
    check_system_dependencies() {
      local TASK_NATIVE_FILE=$1
      local TASK_DEPENDENCY
      local TASK_LINKS
      TASK_LINKS=$(otool -L "$TASK_NATIVE_FILE") || return 1
      while IFS= read -r TASK_DEPENDENCY; do
        case "$TASK_DEPENDENCY" in
          /usr/lib/*|/System/Library/*) ;;
          *) echo "Unexpected native dependency in $TASK_NATIVE_FILE: $TASK_DEPENDENCY" >&2; return 1 ;;
        esac
      done < <(printf '%s\n' "$TASK_LINKS" | awk 'NR > 1 {print $1}')
    }
    check_system_dependencies "$TASK_OUTPUT_DIR/ffmpeg"
    check_system_dependencies "$TASK_OUTPUT_DIR/ffprobe"
    # Core XS modules load dynamically too; checking just the perl executable misses these.
    while IFS= read -r -d '' TASK_NATIVE_FILE; do
      check_system_dependencies "$TASK_NATIVE_FILE"
    done < <(find "$TASK_OUTPUT_DIR/perl" -type f \( -name '*.bundle' -o -name '*.dylib' -o -name 'perl' -o -name 'perl5.*' \) -print0)
  fi
fi
