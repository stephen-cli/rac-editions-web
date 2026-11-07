//! The Editions Builder's desktop shell. It stays thin: it opens the window, lends the page the system's
//! file dialog and file manager (through Tauri's dialog and opener plugins), and runs the installer as a
//! separate program, passing the protocol's lines between the two (rac-editions' installer/README.md,
//! "The protocol"). The edition logic lives in the installer, not here.

use std::io::{BufRead, BufReader, Write};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::Mutex;
use std::thread;

use tauri::{AppHandle, Emitter, Manager, RunEvent, State, WebviewUrl, WebviewWindowBuilder};

/// The running installer: its stdin, for the page's commands, and the process, to stop it on exit.
#[derive(Default)]
struct Installer {
    stdin: Mutex<Option<ChildStdin>>,
    child: Mutex<Option<Child>>,
}

/// The edition the builder makes, whose payload the installer serves.
const EDITION: &str = "rac1-executive";

/// The installer core's program name on this platform.
const INSTALLER_PROGRAM: &str = if cfg!(windows) {
    "rac-installer.exe"
} else {
    "rac-installer"
};

/// PATH as the installer and its messages should name it: Windows' "\\?\" form, which Tauri's resource
/// and data folders come in, made plain ("\\?\C:\x" is C:\x, "\\?\UNC\server\share" is \\server\share).
fn plain_path(path: &std::path::Path) -> String {
    let text = path.to_string_lossy();
    if let Some(share) = text.strip_prefix(r"\\?\UNC\") {
        return format!(r"\\{share}");
    }
    text.strip_prefix(r"\\?\").unwrap_or(&text).to_string()
}

/// The installer's command line: RAC_INSTALLER as a JSON array (program, then arguments), or else, in a
/// debug build, the installer core from rac-editions checked out beside this repository
/// (installer/core/build, built with CMake), serving the edition's payload (tools/release.py's
/// build/payload) with its disc hashes kept in build/installer-data. A release build carries the core
/// as a sidecar (tauri.release.conf.json's externalBin, beside the builder's own executable) and the
/// pinned rac-editions release's payload as a resource (scripts/stage-installer.ts stages both), and
/// keeps the disc hashes in the app's data folder.
fn installer_command(app: &AppHandle) -> Result<Vec<String>, String> {
    if let Ok(json) = std::env::var("RAC_INSTALLER") {
        return serde_json::from_str(&json)
            .map_err(|error| format!("RAC_INSTALLER is not a JSON array of strings: {error}"));
    }
    if cfg!(debug_assertions) {
        let editions = concat!(env!("CARGO_MANIFEST_DIR"), "/../../../../rac-editions");
        let edition = format!("{editions}/editions/{EDITION}/build");
        return Ok(vec![
            format!("{editions}/installer/core/build/{INSTALLER_PROGRAM}"),
            "--serve".into(),
            "--payload".into(),
            format!("{edition}/payload"),
            "--data".into(),
            format!("{edition}/installer-data"),
        ]);
    }
    let executable = std::env::current_exe()
        .map_err(|error| format!("Couldn't find the builder's own program: {error}"))?;
    let program = executable
        .parent()
        .ok_or("The builder's program is in no folder.")?
        .join(INSTALLER_PROGRAM);
    let payload = app
        .path()
        .resource_dir()
        .map_err(|error| format!("Couldn't find the builder's resources: {error}"))?
        .join("payloads")
        .join(EDITION);
    let data = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("Couldn't find the builder's data folder: {error}"))?
        .join("installer");
    Ok(vec![
        plain_path(&program),
        "--serve".into(),
        "--payload".into(),
        plain_path(&payload),
        "--data".into(),
        plain_path(&data),
    ])
}

/// Starts the installer. Its stdout lines (the protocol) arrive in the page as "installer://line"
/// events, anything else it prints as "installer://stderr", and its end as "installer://exit" with the
/// exit code. The page listens before it starts the installer, so even the first line, `ready`, arrives.
#[tauri::command]
fn installer_start(app: AppHandle, installer: State<'_, Installer>) -> Result<(), String> {
    // A reloaded page starts afresh: the installer it had stops first.
    if let Some(mut old) = installer.child.lock().unwrap().take() {
        let _ = old.kill();
    }
    let command = installer_command(&app)?;
    let (program, args) = command
        .split_first()
        .ok_or("The installer's command line is empty.")?;
    let mut process = Command::new(program);
    process
        .args(args)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        // CREATE_NO_WINDOW: the installer runs without a console window of its own.
        use std::os::windows::process::CommandExt;
        process.creation_flags(0x0800_0000);
    }
    let mut child = process
        .spawn()
        .map_err(|error| format!("Couldn't start {program}: {error}"))?;

    let stdout = child.stdout.take().ok_or("The installer has no stdout.")?;
    let stderr = child.stderr.take().ok_or("The installer has no stderr.")?;
    let lines = app.clone();
    let out = thread::spawn(move || {
        for line in BufReader::new(stdout).lines().map_while(Result::ok) {
            let _ = lines.emit("installer://line", line);
        }
    });
    let errors = app.clone();
    thread::spawn(move || {
        for line in BufReader::new(stderr).lines().map_while(Result::ok) {
            let _ = errors.emit("installer://stderr", line);
        }
    });

    *installer.stdin.lock().unwrap() = child.stdin.take();
    *installer.child.lock().unwrap() = Some(child);

    // Once stdout has closed, the installer has stopped or is stopping: report how it ended.
    let ended = app.clone();
    thread::spawn(move || {
        let _ = out.join();
        let code = ended
            .state::<Installer>()
            .child
            .lock()
            .unwrap()
            .take()
            .and_then(|mut child| child.wait().ok())
            .and_then(|status| status.code());
        let _ = ended.emit("installer://exit", code);
    });
    Ok(())
}

/// Sends one command line to the installer.
#[tauri::command]
fn installer_send(line: String, installer: State<'_, Installer>) -> Result<(), String> {
    let mut stdin = installer.stdin.lock().unwrap();
    let pipe = stdin.as_mut().ok_or("The installer isn't running.")?;
    writeln!(pipe, "{line}")
        .and_then(|()| pipe.flush())
        .map_err(|error| format!("Couldn't reach the installer: {error}"))
}

/// Opens the builder's window. In a debug build, RAC_DEVTOOLS_PORT opens WebView2's debugging port, so
/// the end-to-end tests can drive the app itself (e2e/desktop.spec.ts).
fn open_window(app: &tauri::App) -> tauri::Result<()> {
    #[allow(unused_mut)]
    let mut window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
        .title("Editions Builder")
        .inner_size(1180.0, 820.0)
        .min_inner_size(760.0, 600.0);
    #[cfg(all(windows, debug_assertions))]
    if let Ok(port) = std::env::var("RAC_DEVTOOLS_PORT") {
        // These replace Tauri's own arguments, so they repeat its --disable-features list.
        window = window.additional_browser_args(&format!(
            "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --remote-debugging-port={port}"
        ));
    }
    window.build()?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(Installer::default())
        .setup(|app| Ok(open_window(app)?))
        .invoke_handler(tauri::generate_handler![installer_start, installer_send])
        .build(tauri::generate_context!())
        .expect("the Editions Builder couldn't start")
        .run(|app, event| {
            // Leaving the app stops the installer with it; a build in progress ends there.
            if let RunEvent::Exit = event
                && let Some(mut child) = app.state::<Installer>().child.lock().unwrap().take()
            {
                let _ = child.kill();
            }
        });
}
