File Analyzer — Windows x64 完整离线版

安装与使用
1. 如果下载的是构建产物 ZIP，请先解压。
2. 运行 File-Analyzer-<版本>-win-x64.exe，选择安装位置。
3. 从开始菜单打开 File Analyzer，添加或拖入本地文件。

本安装包已包含 FFprobe、FFmpeg、ExifTool 及所需运行文件。
用户无需安装 Node.js、Perl 或其他解析组件；安装和使用均无需联网。
文件分析在本机完成，不上传文件。支持音视频参数、频谱、图片及文档元数据、
隐私元数据检查、PDF 页数与页面结构分析、多文件对比及参数解释。
支持中文、英文、日文、韩文、法文和西班牙文，在窗口右上角切换。

系统要求
64 位 Windows 10 1903（18362）或更新版本，包括 Windows 11。
Windows on ARM 和 32 位 Windows 暂不提供专用安装包。
实际所需磁盘空间高于安装包大小，安装器也需要临时解压空间。

当前构建尚未配置 Windows 代码签名，Windows 可能显示未知发布者。
请核对下载来源；SHA256SUMS 提供安装器的 SHA-256 校验值。
release-report.json 记录本次构建的实际体积、组件版本和验证状态。

卸载
在 Windows 设置 → 应用中卸载 File Analyzer。导入分析的原始文件不会被删除。
