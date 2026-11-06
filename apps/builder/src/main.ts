import '@rac-editions/ui/styles.css';
import './styles.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { BridgeTransport, bridgePlatform } from './installer/bridge';
import { InstallerClient } from './installer/client';
import { FakeInstaller } from './installer/fake';
import { devPlatform } from './platform/dev';
import { createBuilderRouter } from './router';
import { useSession } from './stores/session';

/**
 * In a browser the builder runs against the fake installer and the dev platform; the desktop shell
 * will connect the real installer program and the system's dialogs instead. In development,
 * ?installer=real drives the real installer through the dev server's bridge (vite/installerBridge.ts),
 * and ?pace=0.1 runs the fake ten times faster, for the end-to-end tests.
 */
const query = new URLSearchParams(location.search);
const app = createApp(App);
app.use(createPinia());
const session = useSession();
if (import.meta.env.DEV && query.get('installer') === 'real') {
  await session.connect(new InstallerClient(new BridgeTransport((line) => session.noteInstallerOutput(line))), bridgePlatform);
} else {
  await session.connect(new InstallerClient(new FakeInstaller({ pace: Number(query.get('pace')) || 1 })), devPlatform);
}
app.use(createBuilderRouter());
app.mount('#app');
