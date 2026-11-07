import '@rac-editions/ui/styles.css';
import './styles.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { BridgeTransport, bridgePlatform } from './installer/bridge';
import { InstallerClient } from './installer/client';
import { FakeInstaller } from './installer/fake';
import { devPlatform } from './platform/dev';
import { inDesktopShell, TauriTransport, tauriPlatform } from './platform/tauri';
import { createBuilderRouter } from './router';
import { webMemory } from './stores/memory';
import { useSession } from './stores/session';

/**
 * In the desktop shell the builder runs the real installer and uses the system's dialogs. In a browser it
 * runs against the fake installer and the dev platform; in development ?installer=real drives the real
 * installer through the dev server's bridge (vite/installerBridge.ts) instead, and ?pace=0.1 runs the
 * fake ten times faster, for the end-to-end tests. Each remembers the session between runs; the fake apart
 * from the real installer, since its disc paths are made up.
 */
const query = new URLSearchParams(location.search);
const app = createApp(App);
app.use(createPinia());
const session = useSession();
const noteOutput = (line: string) => session.noteInstallerOutput(line);
if (inDesktopShell()) {
  await session.connect(new InstallerClient(new TauriTransport(noteOutput)), tauriPlatform, webMemory('installer'));
} else if (import.meta.env.DEV && query.get('installer') === 'real') {
  await session.connect(new InstallerClient(new BridgeTransport(noteOutput)), bridgePlatform, webMemory('installer'));
} else {
  await session.connect(new InstallerClient(new FakeInstaller({ pace: Number(query.get('pace')) || 1 })), devPlatform, webMemory('fake'));
}
app.use(createBuilderRouter());
app.mount('#app');
