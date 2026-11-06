import '@rac-editions/ui/styles.css';
import './styles.css';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { InstallerClient } from './installer/client';
import { FakeInstaller } from './installer/fake';
import { devPlatform } from './platform/dev';
import { createBuilderRouter } from './router';
import { useSession } from './stores/session';

/**
 * In a browser the builder runs against the fake installer and the dev platform; the desktop shell
 * will connect the real installer program and the system's dialogs instead. ?pace=0.1 runs the fake
 * ten times faster, for the end-to-end tests.
 */
const pace = Number(new URLSearchParams(location.search).get('pace')) || 1;
const app = createApp(App);
app.use(createPinia());
const session = useSession();
await session.connect(new InstallerClient(new FakeInstaller({ pace })), devPlatform);
app.use(createBuilderRouter());
app.mount('#app');
