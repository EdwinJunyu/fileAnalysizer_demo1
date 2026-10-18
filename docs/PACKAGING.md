# 完整包与源码运行

目标是一个小工具：Windows x64 提供完整 NSIS 安装器，macOS Intel / Apple Silicon 各提供 DMG；
源码运行则由开发者自行安装 FFprobe、FFmpeg 和 ExifTool。不制作第二种精简二进制，
应用也不下载、安装或更新运行时依赖。普通用户不需要 Node.js、Perl 或命令行工具。

## 构建完整包

使用目标系统的原生机器、Node.js 24 和 `npm ci`。不做交叉编译。

macOS 需要 Xcode Command Line Tools (`xcode-select --install`)、make 和 bash。
Windows 需要 MSYS2 UCRT64，安装 `mingw-w64-ucrt-x86_64-gcc make diffutils tar perl`，
在保留 Node.js PATH 的 UCRT64 终端中运行工具准备步骤。GitHub Actions 已配置这些环境。
Windows 上 MSYS2 的 Perl 仅用于编译；随应用分发的是 ExifTool 包自己的完整运行时。
仓库通过 `.gitattributes` 将 Shell 脚本固定为 LF，避免 Windows 的 CRLF 检出使 Bash 构建失败。

```sh
npm ci
npm run test:packaging
npm run prepare:tools
npm run package:dir
npm run smoke:package
npm run package:release
```

第一次准备工具会联网下载固定版本源代码/Windows ExifTool 载荷，严格核验 SHA-256，
然后编译 FFmpeg；macOS 还编译可迁移的独立 Perl。通常需要数分钟到数十分钟。
这些步骤只在构建时联网，生成的应用离线使用。已有缓存也会重新校验，损坏缓存直接报错。
工具源及散列见 [`scripts/packaging/sources.json`](../scripts/packaging/sources.json)。
更新版本时需同时审查源码、散列、许可与烟雾测试；不要从第三方下载页随意换一个 FFmpeg。

输出在 `release/`，例如 `File-Analyzer-0.1.0-win-x64.exe` 或
`File-Analyzer-0.1.0-mac-arm64.dmg`。Windows 安装到当前用户目录，不需要管理员权限；
macOS 打开 DMG 后将 `File Analyzer.app` 拖入 Applications。
`package:dir` 单独生成的未安装应用用于烟雾测试，必须保留整个应用目录，不能只复制 exe。

当前产物未配置 Windows 代码签名或 Apple 签名/公证。系统可能提示未知开发者，
macOS Gatekeeper 可能阻止首次打开；这仍是供验证的构建产物。
没有自动绕过系统保护的脚本。对外发布前应在两种 macOS 架构和 Windows 实机上验证，
并由维护者决定代码签名与公证配置。

## 工具布局与许可资料

打包器将 `.tools/packaging/<platform>-<arch>/tools` 复制到应用的 `resources/tools`。
macOS 的位置是 `.app/Contents/Resources/tools`。工具位于 ASAR 外部，Node Worker 和
应用代码位于 `app.asar` 内部。打包前核验每个文件散列、CPU 架构、版本和 FFmpeg 许可输出。

```text
tools/
  ffprobe[.exe]
  ffmpeg[.exe]
  exiftool[.exe]
  exiftool_files/       # Windows完整载荷；macOS为ExifTool与Archive::Zip库
  perl/                # 仅macOS：自编Perl及完整核心库，支持目录迁移
  licenses/
    sources/           # 固定的原始源码/载荷归档
    ffmpeg/            # COPYING、LICENSE、config.h/config.mak、实际configure参数
    perl/              # macOS Perl许可文本
    javascript/        # npm生产依赖的具体版本和许可文本
    build-recipe/      # 对应构建脚本及源清单
    THIRD_PARTY_NOTICES.md
  manifest.json        # 版本、来源、平台和每个工具文件的SHA-256
```

Windows 的 `exiftool_files` 包含 Perl DLL、附属 DLL、ExifTool、Archive::Zip 与
Strawberry Perl 许可归档，必须完整复制。macOS 的 `exiftool` 只是一个很小的 shell
启动器，它启动随包 `perl/bin/perl`，不依赖 `/usr/bin/perl` 或 Homebrew Perl。
Office 的 ZIP 读取依赖 Archive::Zip；烟雾测试使用真正 DOCX 验证，不能只测试 `-ver`。

FFmpeg 使用 LGPL 配置：关闭 GPL/nonfree/version3、外部库自动探测及网络协议；
显式编译并静态链接固定版本 zlib（zlib 许可），用于频谱 PNG 编码。
不包含 libx264/libx265 等可改变许可证的外部编码库。这里只需要解码与元数据读取，
不为减小包体删除常见内置解码器。对应源码和实际配置随完整包分发，因此会额外占用空间。
说明与上游具体许可见 [`THIRD_PARTY_NOTICES.md`](../THIRD_PARTY_NOTICES.md)。

**项目自身尚未选择开源许可证。** `UNLICENSED` 表示没有在这里替作者作授权选择，
第三方许可声明也不会给项目代码自动增加许可。公开宣称开源或正式发布前需要作者确定这一点。

## CI 与验证范围

`.github/workflows/package.yml` 为 Windows x64、macOS Intel / Apple Silicon 分别原生构建。
runner 标签与 Node/宿主架构均检查，避免产物名称和真实架构不一致。
CI 只上传待审阅安装器，不创建 tag、GitHub Release 或自动发布。
生成安装器后，Windows CI 会静默安装到临时目录，再验证安装后的应用；macOS CI 会
以只读方式挂载 DMG、复制应用到新的安装目录，再启动复制后的应用验证，最后卸载镜像。

`smoke:package` 校验打包后的工具、将工具复制到带空格和中文的新路径后再次执行，
用 FFmpeg 解码测试音频，用 ExifTool 读取 DOCX 作者，随后启动真正的打包 Electron，
检查 `app.isPackaged`、ASAR 内的 Worker，以及界面实际展示的媒体与 Office 结果，
并在音频详情中实际生成频谱，验证 PNG 能正常显示。迁移后的 Perl `@INC` 必须指向新目录。
还会通过界面生成真正的 1200 像素宽频谱图，并检查迁移后的 Perl `@INC` 全部位于新目录。
测试刻意设置无效的全局工具路径，确保完整包使用随包工具。

Linux 只作为当前云环境的打包结构验证，不是面向用户的支持平台：

```sh
npm run prepare:tools -- --development-linux
npm run package:dir -- --development-linux
# 需可用X服务器，例如DISPLAY=:99；容器root启动时仅测试命令传入--no-sandbox。
npm run smoke:package -- --development-linux
```

Linux 验证不能代替 Windows/macOS 实机结果。原生 CI 尚未运行时，应将这点保留在交付说明中。

### 本次云环境已执行的验证

- 类型检查、构建、设计 token 检查和严格 UI 审计通过。
- `npm test`：113 项单元/集成测试通过；`npm run test:e2e`：15 项真实 Electron 测试通过。
- `npm run test:packaging`：8 项完整包校验、许可收集和真实 Git CRLF 检出测试通过。
- 使用实际随包 FFmpeg/FFprobe 重跑 7 项频谱测试全部通过，覆盖多音轨、高于 48 kHz 的频率、
  晚起音轨、链式 Ogg 的参数变化及错误时长元数据下的内存限制。
- Linux 完整应用目录构建和 `smoke:package -- --development-linux` 通过，实际验证 ASAR Worker、
  随包工具优先、可迁移 Perl/Archive::Zip、Office 属性读取及界面频谱生成。

本次没有执行 Windows/macOS 原生 CI，也没有生成或安装这两个系统的安装器。
安装器交付仍需原生 CI、实机离线验收，以及维护者确定项目许可证和正式发布配置。
