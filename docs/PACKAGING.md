# 完整包与源码运行

当前优先交付 Windows x64 完整 NSIS 安装器，macOS Intel / Apple Silicon 保留原生 DMG 构建；
源码运行则由开发者自行安装 FFprobe、FFmpeg 和 ExifTool。不制作第二种精简二进制，
应用也不下载、安装或更新运行时依赖。普通用户不需要 Node.js、Perl 或命令行工具。

## 构建完整包

使用目标系统的原生机器、Node.js 24 和 `npm ci`。不做交叉编译。

Windows 普通用户只需运行安装器，无需准备以下开发环境。
首次下载约 200 MB 是优化目标，实际大小以原生完整构建的 `release-report.json` 为准，
不为了控制体积删减解析组件、解码器或许可资料。

macOS 需要 Xcode Command Line Tools (`xcode-select --install`)、make 和 bash。
Windows 需要 MSYS2 UCRT64，安装 `mingw-w64-ucrt-x86_64-gcc make diffutils tar perl`，
在保留 Node.js PATH 的 UCRT64 终端中运行工具准备步骤。GitHub Actions 已配置这些环境。
Windows 上 MSYS2 的 Perl 仅用于编译；随应用分发的是 ExifTool 包自己的完整运行时。
Windows 用户系统至少为 Windows 10 1903；ExifTool 启动器的进程 UTF-8 清单让中文安装路径可用。
构建保留原始载荷归档、原有启动器代码与资源，并记录清单修改前后的散列及补丁来源。
工具准备会先在中文目录中读取中文文件名的 DOCX 作者，失败即在 FFmpeg 编译前停止。
仓库通过 `.gitattributes` 将 Shell 脚本固定为 LF，避免 Windows 的 CRLF 检出使 Bash 构建失败。
固定散列的第三方许可文件保持原始字节，防止 Windows 换行转换破坏 SHA-256。

统一命令会顺序执行打包规则测试、工具准备、应用构建、完整目录离线测试、安装器生成，
并在 Windows 上实际安装后重新执行离线测试。任一步失败即停止，不输出通过验证的交付报告。

```sh
npm ci
# Windows：在已准备好的 MSYS2 UCRT64 终端中执行；macOS 使用本机终端。
npm run package:offline
```

需要逐步诊断时也可以分别运行：

```sh
npm ci
npm run test:packaging
npm run prepare:electron
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

输出在 `release/`，例如 `File-Analyzer-0.1.1-win-x64.exe` 或
`File-Analyzer-0.1.1-mac-arm64.dmg`。Windows 安装到当前用户目录，不需要管理员权限；
macOS 打开 DMG 后将 `File Analyzer.app` 拖入 Applications。
`package:dir` 单独生成的未安装应用用于烟雾测试，必须保留整个应用目录，不能只复制 exe。

统一 Windows 构建成功后还会生成：

- `release/README.zh-CN.txt`：给使用者的安装、功能和卸载说明。
- `release/SHA256SUMS`：本次安装器的实际 SHA-256，不包含本机构建路径。
- `release/release-report.json`：安装器大小、解压大小、每个工具与运行时、许可和源码归档占用，
  以及组件来源版本、目录测试和安装后测试状态。体积单位为十进制 MB；许可、源码是工具总大小的子项，不能重复相加。

报告只在安装器生成及对应检查成功后写出；独立调用报告工具时，运行测试状态默认是
`not-recorded`，文件完整性检查不会被描述成原生运行成功。历史基础包测量见
[Windows 体积报告](WINDOWS_PACKAGE_SIZE.md)，其中的测量专用 EXE 不属于本次完整离线安装器。

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

`.github/workflows/package.yml` 在推送主分支和 PR 时优先原生构建 Windows x64。
也可在 Actions 中选择该工作流 → Run workflow，默认 `targets: windows`；
将 `targets` 改为 `all` 才同时构建 macOS Intel / Apple Silicon。
runner 标签与 Node/宿主架构均检查，避免产物名称和真实架构不一致。
CI 只上传待审阅安装器、使用说明、校验值及体积报告，保留 30 天，不创建 tag、GitHub Release 或自动发布。
生成安装器后，Windows CI 会静默安装到临时目录，再验证安装后的应用；macOS CI 会
以只读方式挂载 DMG、复制应用到新的安装目录，再启动复制后的应用验证，最后卸载镜像。

`smoke:package` 校验打包后的工具、将工具复制到带空格和中文的新路径后再次执行，
用 FFmpeg 解码测试音频，用 ExifTool 读取 DOCX 作者，随后启动真正的打包 Electron，
检查 `app.isPackaged`、ASAR 内的 Worker，以及界面实际展示的媒体、Office、PDF 结果，
生成真正的 2400 像素宽频谱图，并检查 PDF 页数、UserUnit、旋转与作者隐私信息。
迁移后的 Perl `@INC` 必须指向新目录。应用在离线模式和隔离 PATH 下完成检查，
配置的全局工具路径也刻意无效，确保使用随包工具；记录外部请求及未捕获的页面异常。
删除测试源文件后切换全部六种语言，验证已有结果仍可查看，且不会重新解析。

Linux 只作为当前云环境的打包结构验证，不是面向用户的支持平台：

```sh
npm run prepare:electron -- --development-linux
npm run prepare:tools -- --development-linux
npm run package:dir -- --development-linux
# 需可用X服务器，例如DISPLAY=:99；容器root启动时仅测试命令传入--no-sandbox。
npm run smoke:package -- --development-linux
```

Linux 验证不能代替 Windows/macOS 实机结果。原生 CI 尚未运行时，应将这点保留在交付说明中。

### 2026-10-21 完整离线构建改进验证

- 修复并回归 Windows Git 换行转换引起的固定许可 SHA-256 失败。
- 修复 MSYS2 GNU tar 把 Windows 盘符当作远程主机、反斜杠当作转义字符的问题，以真实归档提取回归验证。
- 增加显式 Electron 运行时准备；Electron 44 的 npm 包不再自动下载运行时，构建前校验固定版本、可执行路径和 CPU 架构，避免工具编译完成后才发现缺失。
- `npm test`：191 项核心测试通过；`npm run test:packaging`：19 项打包规则、运行时、清单修补、报告及构建失败诊断测试通过。
- 在 Linux 编译固定版本 FFmpeg/FFprobe 与可迁移 Perl，构建完整应用目录，
  执行真实 ASAR Worker、隔离 PATH、离线频谱、DOCX/PDF 隐私与六语言验证通过。
- Windows 安装器及安装后验收仍须由原生 Windows 构建结果确认；这些 Linux 结果不代替 Windows 验收。

### 早期云环境验证记录

- 类型检查、构建、设计 token 检查和严格 UI 审计通过。
- `npm test`：113 项单元/集成测试通过；`npm run test:e2e`：15 项真实 Electron 测试通过。
- `npm run test:packaging`：8 项完整包校验、许可收集和真实 Git CRLF 检出测试通过。
- 使用实际随包 FFmpeg/FFprobe 重跑 7 项频谱测试全部通过，覆盖多音轨、高于 48 kHz 的频率、
  晚起音轨、链式 Ogg 的参数变化及错误时长元数据下的内存限制。
- Linux 完整应用目录构建和 `smoke:package -- --development-linux` 通过，实际验证 ASAR Worker、
  随包工具优先、可迁移 Perl/Archive::Zip、Office 属性读取及界面频谱生成。

以上早期记录没有包含 Windows/macOS 原生构建与安装验收。
当前原生交付状态以本次 CI 日志及产物报告为准；正式对外发布仍需维护者确定项目许可证及签名配置。
