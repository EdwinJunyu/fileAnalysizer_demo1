# Windows x64 包体积测量

测量日期：2026-10-21（UTC）。代码基准：`6051e6a9aa013b9406c003468edb6ed702625063`。
目标是评估约 200 MB 的首次下载，不限制安装后的占用。本文使用十进制 MB
（1 MB = 1,000,000 字节），避免与 Windows 常见的二进制容量显示混淆。

## 已测结果

| 内容 | 下载或压缩大小 | 解压后文件总大小 | 说明 |
| --- | ---: | ---: | --- |
| Electron 44.9.0 Windows x64 官方 ZIP | 158.63 MB | 386.40 MB | 上游 ZIP，不是应用最终安装器 |
| 项目本体与生产依赖 `app.asar` | — | 23.10 MB | 已由 electron-builder 按现有配置收集 |
| 基础应用，不含外部工具 | 114.19 MB | 409.61 MB | 压缩值为 NSIS 的应用载荷 7z，不是完整安装器 |
| 基础应用 Windows 便携 EXE | 101.09 MB | 409.61 MB | 已成功生成；再次压缩的自解压包，未在 Windows 上运行 |
| ExifTool 13.59.3 Windows npm 包 | 10.89 MB | 34.53 MB | 解压列仅计实际随包复制的 `bin/`，含 Perl 与附属文件 |
| 当前 Windows 打包要求的四个来源归档 | 37.05 MB | 37.05 MB | 原始压缩归档随包原样保留 |
| ExifTool 运行文件、四个来源归档及部分许可/构建资料 | 44.55 MB | 71.60 MB | 单独使用 7z 压缩；不含 FFmpeg/FFprobe 二进制 |
| 项目自编 Windows FFmpeg/FFprobe | 待原生构建测量 | 待原生构建测量 | 未使用 Linux 体积或其他发行版代替 |

当前要求的四个来源归档为：

| 归档 | 字节数 |
| --- | ---: |
| `ffmpeg-7.1.5.tar.gz` | 15,931,570 |
| `zlib-1.3.1.tar.gz` | 1,572,744 |
| `exiftool-13.59.tar.gz` | 8,653,399 |
| `exiftool-vendored.exe-13.59.3.tgz` | 10,888,586 |

这里的 FFmpeg 归档是源码，不是可运行的 FFmpeg 下载包；不能据此推断二进制大小。
“已知工具子集”未收集自编工具输出的完整许可、配置、最终清单和 JavaScript 许可目录，
因此也不能当成可分发的完整组件包。

## 对首发方案的影响

基础应用的压缩载荷约 114 MB，便携 EXE 约 101 MB，说明轻量版的 200 MB 目标有实现空间。
两者使用的压缩过程不同，不能将便携 EXE 的大小当作常规安装器最终大小。
不过按当前分发规则，源码归档也占用下载量；不能只比较三个可执行文件。

将基础载荷与已知工具子集的独立压缩结果粗略相加约为 159 MB，
距离 200 MB 约剩 41 MB，仍需容纳 Windows FFmpeg/FFprobe 和完整安装器等内容。
不同内容合并压缩后的大小不一定等于独立压缩大小之和，这只是预算估算。
目前证据不足以认定完整离线安装包一定超过 200 MB。

建议在引入在线下载、组件管理和故障恢复流程之前，先取得 Windows 原生完整包：
如果完整包已经接近目标，首发直接提供完整离线包会更简单；
如果明显超出目标，再根据实际节省量确定按需下载的范围。

按需下载方案仍须保留完整组件附属文件和相应许可资料，并明确缺少组件时的功能可用范围。
本次没有修改现有应用的组件发现逻辑、安装流程或打包完整性要求。

## 测量方法与范围

1. 构建现有项目：`npm run build`。
2. 下载项目锁定的 Electron 44.9.0 Windows x64 发行 ZIP，并核对上游
   `SHASUMS256.txt`。Windows ExifTool 与四个来源归档使用
   `scripts/packaging/sources.json` 中的 SHA-256 校验。
3. 在 Linux 上使用现有 electron-builder 26.15.3 配置，仅为测量覆盖
   `electronDist` 为下载的 Windows 运行时、`extraResources` 为空、输出位置为临时目录。
   保留原有 ASAR、生产依赖收集和未签名设置。
4. 汇总 Windows 应用目录的逻辑文件长度，读取生成的 NSIS 7z 载荷长度。
   未计文件系统分配单元或安装器运行时临时空间。
5. 提取 Windows ExifTool 的完整 `bin/`，加入四个来源归档、项目第三方声明和构建脚本，
   使用 `7zz a -t7z -mx=7 -mmt=2` 单独压缩已知工具子集。
6. 使用基础应用目录作为 `prepackaged` 输入，将测量目标切换为 `portable`，
   成功生成 Windows 便携 EXE。基础载荷和已知工具子集的归档完整性检查均通过。

当前环境是 Linux，没有 Wine 或本项目所需的 Windows 原生工具产物。
常规 NSIS 安装器构建在生成卸载程序的 Wine 调用处停止，
所以 114.19 MB 只代表成功生成的应用压缩载荷。
本次测量不构成 Windows 安装、运行或完整离线功能验收。
GitHub Actions 的安装器产物也未在本次测量中取得。

临时下载、校验清单、测量脚本和构建日志位于
`/tmp/file-analyzer-windows-size/`，不会提交成用户安装包。
便携 EXE 名称带有 `MEASUREMENT-ONLY`，缺少外部工具与下载管理功能，不能作为完整应用发布。
该目录的 `measurement.json` 记录产物字节数与 SHA-256，`download-inventory.json`
记录下载文件的字节数与校验值。

Windows 完整包的后续测量应在原生构建机执行现有流程：

```sh
npm ci
npm run prepare:tools
npm run package:dir
npm run smoke:package
npm run package:release
```

再分别统计 `release/*.exe`、`release/win-unpacked`、
`resources/app.asar`、`resources/tools/ffmpeg.exe`、`resources/tools/ffprobe.exe`、
`resources/tools/exiftool_files` 与 `resources/tools/licenses`，
以实际完整安装器长度决定是否需要分拆下载。
