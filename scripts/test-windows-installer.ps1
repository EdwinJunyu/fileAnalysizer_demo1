param(
    [Parameter(Mandatory = $true)][string]$Installer,
    [Parameter(Mandatory = $true)][string]$NodeExecutable
)

$ErrorActionPreference = 'Stop'
$TaskInstaller = (Resolve-Path -LiteralPath $Installer).Path
$TaskNode = (Resolve-Path -LiteralPath $NodeExecutable).Path
$TaskSmokeScript = Join-Path $PSScriptRoot 'smoke-package.mjs'
# A fresh installation path exercises spaces independently of the build directory.
$TaskInstallDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ('File Analyzer offline ' + [guid]::NewGuid().ToString('N'))

try {
    # NSIS requires /D to be last and takes the rest of the command line as the directory.
    $TaskInstall = Start-Process -FilePath $TaskInstaller -ArgumentList @('/S', "/D=$TaskInstallDirectory") -Wait -PassThru
    if ($TaskInstall.ExitCode -ne 0) { throw "Installer exited with $($TaskInstall.ExitCode)." }
    $TaskExecutable = Join-Path $TaskInstallDirectory 'File Analyzer.exe'
    if (-not (Test-Path -LiteralPath $TaskExecutable)) { throw 'Installed application is missing.' }
    & $TaskNode $TaskSmokeScript "--app=$TaskExecutable"
    if ($LASTEXITCODE -ne 0) { throw 'Installed application failed offline smoke tests.' }
} finally {
    $TaskUninstaller = Join-Path $TaskInstallDirectory 'Uninstall File Analyzer.exe'
    if (Test-Path -LiteralPath $TaskUninstaller) {
        $TaskUninstall = Start-Process -FilePath $TaskUninstaller -ArgumentList '/S' -Wait -PassThru
        if ($TaskUninstall.ExitCode -ne 0) { throw "Uninstaller exited with $($TaskUninstall.ExitCode)." }
    }
}
