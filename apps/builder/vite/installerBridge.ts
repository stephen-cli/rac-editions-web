import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createInterface } from 'node:readline';
import type { Plugin } from 'vite';

/**
 * A development-only bridge between the builder in a browser and the real installer program, for working
 * on the builder before the desktop shell exists. Each browser tab gets its own installer process; its
 * stdout lines (the protocol) reach the page as server-sent events, and the page's commands come back by
 * POST. Lines printed before the page connects, such as `ready`, are held for it.
 *
 *   GET  /__installer/events?session=<id>   protocol lines (message events), stderr lines (event "stderr"),
 *                                           and the process's exit (event "exit")
 *   POST /__installer/send?session=<id>     one command line for the installer's stdin
 *   POST /__installer/pick                  Windows: the system's file dialog; answers the chosen paths
 *   POST /__installer/pick-folder           Windows: the system's folder dialog, titled with the posted text;
 *                                           answers the chosen folder, or null
 *   POST /__installer/reveal                Windows: Explorer with the posted path selected
 *
 * The page opts in with ?installer=real (see src/main.ts).
 */

export interface BridgeOptions {
  /** The installer's command line: program, then arguments. */
  command: string[];
}

interface Session {
  child: ChildProcessWithoutNullStreams;
  held: string[];
  client: ServerResponse | null;
}

function body(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = '';
    request.setEncoding('utf8');
    request.on('data', (chunk: string) => (text += chunk));
    request.on('end', () => resolve(text));
    request.on('error', reject);
  });
}

/** Runs PowerShell and resolves to what it printed. */
function powershell(script: string, env: Record<string, string> = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-STA', '-Command', script], { env: { ...process.env, ...env } });
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString('utf8')));
    child.on('error', reject);
    child.on('close', () => resolve(out));
  });
}

const PICK_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.OpenFileDialog
$dialog.Title = 'Choose disc images'
$dialog.Filter = 'Disc images (*.iso;*.bin;*.img)|*.iso;*.bin;*.img|All files (*.*)|*.*'
$dialog.Multiselect = $true
if ($dialog.ShowDialog() -eq 'OK') { $dialog.FileNames | ConvertTo-Json -Compress } else { '[]' }
`;

// The folder dialog's title comes in an environment variable, so no text from the page is ever parsed as script.
const PICK_FOLDER_SCRIPT = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = $env:RAC_DIALOG_TITLE
$dialog.UseDescriptionForTitle = $true
if ($dialog.ShowDialog() -eq 'OK') { $dialog.SelectedPath | ConvertTo-Json -Compress } else { 'null' }
`;

export function installerBridge(options: BridgeOptions): Plugin {
  const sessions = new Map<string, Session>();

  function send(session: Session, event: string | null, data: string): void {
    const line = `${event ? `event: ${event}\n` : ''}data: ${data}\n\n`;
    if (session.client) session.client.write(line);
    else session.held.push(line);
  }

  function open(id: string): Session {
    const existing = sessions.get(id);
    if (existing) return existing;
    const [program, ...args] = options.command;
    const child = spawn(program!, args, { stdio: 'pipe' });
    const session: Session = { child, held: [], client: null };
    sessions.set(id, session);
    createInterface({ input: child.stdout }).on('line', (line) => send(session, null, line));
    createInterface({ input: child.stderr }).on('line', (line) => send(session, 'stderr', line));
    child.on('error', (error) => send(session, 'stderr', `could not start the installer: ${error.message}`));
    child.on('close', (code) => {
      send(session, 'exit', String(code));
      sessions.delete(id);
    });
    return session;
  }

  return {
    name: 'rac-installer-bridge',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__installer', async (request, response) => {
        const url = new URL(request.url ?? '/', 'http://bridge');
        const id = url.searchParams.get('session') ?? '';
        try {
          if (url.pathname === '/events' && request.method === 'GET' && id) {
            const session = open(id);
            response.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
            session.client = response;
            for (const line of session.held.splice(0)) response.write(line);
            // The tab is gone: so is its installer.
            request.on('close', () => {
              session.client = null;
              session.child.kill();
            });
            return;
          }
          if (url.pathname === '/send' && request.method === 'POST' && id) {
            open(id).child.stdin.write(`${(await body(request)).trim()}\n`);
            response.writeHead(204).end();
            return;
          }
          if (url.pathname === '/pick' && request.method === 'POST') {
            const chosen = JSON.parse((await powershell(PICK_SCRIPT)).trim() || '[]') as string | string[];
            response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify([chosen].flat()));
            return;
          }
          if (url.pathname === '/pick-folder' && request.method === 'POST') {
            const chosen = (await powershell(PICK_FOLDER_SCRIPT, { RAC_DIALOG_TITLE: await body(request) })).trim();
            response.writeHead(200, { 'Content-Type': 'application/json' }).end(chosen || 'null');
            return;
          }
          if (url.pathname === '/reveal' && request.method === 'POST') {
            spawn('explorer.exe', [`/select,${await body(request)}`], { detached: true }).unref();
            response.writeHead(204).end();
            return;
          }
          response.writeHead(404).end();
        } catch (error) {
          response.writeHead(500).end(String(error));
        }
      });
      server.httpServer?.on('close', () => sessions.forEach((session) => session.child.kill()));
    },
  };
}
