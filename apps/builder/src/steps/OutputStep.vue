<script setup lang="ts">
import { RacButton, RacChip, RacIcon, RacPanel } from '@rac-editions/ui';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import StepHead from '../components/StepHead.vue';
import { defaultFileName, fileName, inFolder } from '../platform/platform';
import { useSession } from '../stores/session';

/**
 * Step 3: a new image beside the retail one (the default), or the retail image updated in place. In place
 * saves a restore file first and asks for one confirmation. A new image's path must name an .iso file,
 * and the installer checks it can write there (and has the room) before the player moves on.
 */
const session = useSession();
const router = useRouter();

const basePath = computed(() => session.discs.rac1?.path ?? '');
const editionName = computed(() => session.edition?.name ?? 'edition');
const ready = computed(() => session.canOpen('review'));
/** What the installer said is wrong with the output, once asked. */
const refused = ref('');
const checking = ref(false);
const problem = computed(() => (session.output.mode === 'new' ? session.outputProblem : '') || refused.value);

watch(() => [session.output.mode, session.output.path], () => (refused.value = ''));

async function chooseFolder(): Promise<void> {
  const folder = await session.platform?.pickFolder?.('Where should the new image go?');
  if (!folder) return;
  const name = fileName(session.output.path.trim());
  const keep = /\.iso$/i.test(name) && name.length > '.iso'.length;
  session.setOutputPath(inFolder(folder, keep ? name : defaultFileName(session.edition?.game ?? '', editionName.value)));
}

async function next(): Promise<void> {
  checking.value = true;
  refused.value = await session.refreshPlan();
  checking.value = false;
  if (!refused.value) await router.push({ name: 'review' });
}
</script>

<template>
  <StepHead
    eyebrow="Step 3 of 5"
    title="Where should it go?"
  />
  <div
    class="choices"
    role="radiogroup"
    aria-label="Where the edition goes"
  >
    <div
      class="choice"
      @click="session.output.mode = 'new'"
    >
      <input
        v-model="session.output.mode"
        type="radio"
        name="output"
        value="new"
        aria-labelledby="output-new-title"
        aria-describedby="output-new-text"
      >
      <RacPanel :tone="session.output.mode === 'new' ? 'selected' : 'default'">
        <div class="choice__body">
          <span
            class="choice__dot"
            aria-hidden="true"
          />
          <div>
            <h3 id="output-new-title">
              Create a new image <RacChip tone="ok">
                Recommended
              </RacChip>
            </h3>
            <p id="output-new-text">
              Your retail image stays as it is. The {{ editionName }} is written as a separate image beside it.
            </p>
            <div
              v-if="session.output.mode === 'new'"
              class="field"
            >
              <label for="output-path">Save as</label>
              <div class="field__row">
                <input
                  id="output-path"
                  :value="session.output.path"
                  spellcheck="false"
                  :aria-invalid="!!problem"
                  aria-describedby="output-path-hint"
                  @input="session.setOutputPath(($event.target as HTMLInputElement).value)"
                >
                <RacButton
                  v-if="session.platform?.pickFolder"
                  :glow="false"
                  @click.stop="chooseFolder"
                >
                  <RacIcon
                    name="folder"
                    :size="16"
                  />
                  Choose folder
                </RacButton>
              </div>
              <span
                v-if="problem"
                id="output-path-hint"
                class="field__hint field__hint--problem"
                role="alert"
              >{{ problem }}</span>
              <span
                v-else
                id="output-path-hint"
                class="field__hint"
              >Building needs about 4.5 GB free there.</span>
            </div>
          </div>
        </div>
      </RacPanel>
    </div>
    <div
      class="choice"
      @click="session.output.mode = 'in_place'"
    >
      <input
        v-model="session.output.mode"
        type="radio"
        name="output"
        value="in_place"
        aria-labelledby="output-in-place-title"
        aria-describedby="output-in-place-text"
      >
      <RacPanel :tone="session.output.mode === 'in_place' ? 'hazard' : 'default'">
        <div class="choice__body">
          <span
            class="choice__dot"
            aria-hidden="true"
          />
          <div>
            <h3 id="output-in-place-title">
              Update my image in place
            </h3>
            <p id="output-in-place-text">
              Your retail image becomes the {{ editionName }}, and no second copy is made.
            </p>
            <div
              v-if="session.output.mode === 'in_place'"
              class="confirm"
            >
              <span>
                The builder first saves a restore file beside the image, holding the original bytes of every part
                it changes: <span class="mono">{{ fileName(basePath) }}.restore</span>. Keep it.
                <b>Restore retail</b> uses it to undo the update, and later edition updates start from it.
              </span>
              <label class="confirm__check">
                <input
                  v-model="session.output.confirmed"
                  type="checkbox"
                >
                <span>I understand <span class="mono">{{ basePath }}</span> becomes the {{ editionName }}.</span>
              </label>
            </div>
          </div>
        </div>
      </RacPanel>
    </div>
  </div>
  <div class="step-actions">
    <RacButton
      :glow="false"
      @click="router.push({ name: 'discs' })"
    >
      Back
    </RacButton>
    <div class="step-actions__end">
      <RacButton
        variant="primary"
        :disabled="!ready || checking"
        @click="next"
      >
        Next: review
      </RacButton>
    </div>
  </div>
</template>

<style scoped>
.choices {
  display: grid;
  gap: 14px;
}
.choice {
  display: block;
  cursor: pointer;
}
.choice > input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}
.choice > input:focus-visible + .rac-panel {
  outline: 2px solid var(--rac-holo);
  outline-offset: 3px;
}
.choice__body {
  display: grid;
  grid-template-columns: 24px 1fr;
  align-items: start;
  gap: 14px;
}
.choice__dot {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  margin-top: 3px;
  border: 2px solid var(--rac-edge);
  border-radius: 50%;
}
.choice > input:checked + .rac-panel .choice__dot {
  border-color: var(--rac-bolt);
}
.choice > input:checked + .rac-panel .choice__dot::after {
  content: "";
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--rac-bolt);
}
.choice h3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin: 0 0 4px;
  font: 600 18px var(--rac-font-display);
  letter-spacing: .02em;
}
.choice p {
  max-width: 64ch;
  margin: 0;
  color: var(--rac-ink-dim);
  font-size: 14px;
}
.field {
  display: grid;
  gap: 6px;
  margin-top: 12px;
}
.field label {
  color: var(--rac-ink-faint);
  font: 500 12px/1 var(--rac-font-mono);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.field input {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--rac-edge);
  background: var(--rac-space);
  color: var(--rac-ink);
  font: 13px/1.3 var(--rac-font-mono);
}
.field__row {
  display: flex;
  gap: 10px;
}
.field input[aria-invalid="true"] {
  border-color: var(--rac-hazard);
}
.field__hint {
  color: var(--rac-ink-faint);
  font-size: 13px;
}
.field__hint--problem {
  color: var(--rac-hazard);
}
.confirm {
  display: grid;
  gap: 10px;
  margin-top: 12px;
  padding: 14px;
  border: 1px solid color-mix(in srgb, var(--rac-hazard) 45%, transparent);
  background: var(--rac-hazard-glass);
  font-size: 14px;
}
.confirm__check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}
.confirm__check input {
  flex: none;
  width: 18px;
  height: 18px;
  margin-top: 2px;
  accent-color: var(--rac-hazard);
}
</style>
