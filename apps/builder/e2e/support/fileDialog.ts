import { spawn } from 'node:child_process';

/**
 * Answers the Windows file dialog titled `title` with `path`: it finds the dialog through UI Automation,
 * then puts the path in its file name box and presses Open with window messages. For the desktop tests, which drive the
 * real app and so its real dialog.
 */
export function answerFileDialog(title: string, path: string, timeoutSeconds = 30): Promise<void> {
  const script = `
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class Win32 {
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, string l);
  [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
}
'@
$root = [System.Windows.Automation.AutomationElement]::RootElement
$all = [System.Windows.Automation.TreeScope]::Descendants
$id = [System.Windows.Automation.AutomationElement]::AutomationIdProperty
$class = [System.Windows.Automation.AutomationElement]::ClassNameProperty
function Is([string]$automationId, [string]$className) {
  New-Object System.Windows.Automation.AndCondition(
    (New-Object System.Windows.Automation.PropertyCondition($id, $automationId)),
    (New-Object System.Windows.Automation.PropertyCondition($class, $className)))
}
$isDialog = New-Object System.Windows.Automation.AndCondition(
  (New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::NameProperty, $env:DIALOG_TITLE)),
  (New-Object System.Windows.Automation.PropertyCondition($class, '#32770')))
# The file name box is the Edit with id 1148 and Open the Button with id 1, as in every Windows file
# dialog. Automation shows them only as panes, so they are worked with window messages instead.
$deadline = (Get-Date).AddSeconds(${timeoutSeconds})
do {
  $dialog = $root.FindFirst($all, $isDialog)
  $box = if ($dialog) { $dialog.FindFirst($all, (Is '1148' 'Edit')) }
  $open = if ($dialog) { $dialog.FindFirst($all, (Is '1' 'Button')) }
  if (-not ($box -and $open)) { Start-Sleep -Milliseconds 200 }
} while (-not ($box -and $open) -and (Get-Date) -lt $deadline)
if (-not ($box -and $open)) { throw "no file dialog titled $env:DIALOG_TITLE with a file name box and an Open button" }
$WM_SETTEXT = 0x000C
$BM_CLICK = 0x00F5
[Win32]::SendMessage([IntPtr]$box.Current.NativeWindowHandle, $WM_SETTEXT, [IntPtr]::Zero, $env:DIALOG_PATH) | Out-Null
[Win32]::SendMessage([IntPtr]$open.Current.NativeWindowHandle, $BM_CLICK, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
`;
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], {
      env: { ...process.env, DIALOG_TITLE: title, DIALOG_PATH: path },
    });
    let errors = '';
    child.stderr.on('data', (chunk: Buffer) => (errors += chunk.toString()));
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(errors.trim() || `exit ${code}`))));
  });
}
