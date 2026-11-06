<script setup lang="ts">
import { RacButton, RacIcon, RacPanel, RacTabs } from '@rac-editions/ui';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import StepHead from '../components/StepHead.vue';
import { useSession } from '../stores/session';

/** Done: where the image is, its hash, and how to play it on a PC or on a PS2 or PS3. */
const session = useSession();
const router = useRouter();
const where = ref('pc');

const result = computed(() => session.build.result);
const tabs = [
  { value: 'pc', label: 'PC', icon: 'pc' as const },
  { value: 'console', label: 'PS2 or PS3', icon: 'console' as const },
];
</script>

<template>
  <StepHead
    eyebrow="Built"
    :title="`${session.edition?.name} is ready`"
  />
  <RacPanel class="result">
    <div class="result__head">
      <span class="result__mark"><RacIcon
        name="check"
        :size="32"
      /></span>
      <div class="result__words">
        <div class="result__path">
          {{ result?.path }}
        </div>
        <div class="result__sub">
          {{ session.output.mode === 'new' ? 'New image' : 'Updated in place, restore file saved beside it' }}
          · {{ session.customised ? 'customised settings' : 'designed settings' }}
        </div>
      </div>
    </div>
    <div class="mono result__hash">
      SHA-256 {{ result?.sha256 }}
    </div>
    <div class="result__actions">
      <RacButton
        variant="primary"
        @click="result && session.platform?.showInFolder(result.path)"
      >
        Show in folder
      </RacButton>
      <RacButton @click="router.push({ name: 'review' })">
        Build again
      </RacButton>
    </div>
  </RacPanel>
  <RacPanel>
    <RacTabs
      v-model="where"
      :tabs="tabs"
      label="Where to play it"
    >
      <template #pc>
        <div class="play">
          <p>
            <b>PCSX2</b>, the PS2 emulator for Windows, macOS and Linux, free from
            <a
              href="https://pcsx2.net"
              target="_blank"
              rel="noopener"
            >pcsx2.net</a>. It needs a BIOS dumped from your own PS2; its setup walks you through it.
          </p>
          <p>In PCSX2, choose System › Start File and open the image, or add its folder to the game list.</p>
        </div>
      </template>
      <template #console>
        <div class="play">
          <p>Play the .iso file from a USB drive or hard drive, or burn it to a DVD-R.</p>
          <p>
            <b>PS2.</b> For the file, a homebrew launcher such as Open PS2 Loader, started from FreeMcBoot. For a
            disc, a PS2 that reads burned discs (a modchip, or MechaPwn).
          </p>
          <p>
            <b>PS3 with HEN or CFW</b> (Homebrew Enabler or custom firmware). Copy the file to the console and start
            it like your other PS2 games, or put the burned disc in. It needs a backwards compatible model, CECHAxx or
            CECHBxx, which have the PS2's hardware inside. CECHCxx and CECHExx emulate part of the PS2 in software, so
            the edition may run on them with bugs.
          </p>
          <p>To burn it, use a single-layer DVD-R at a low speed. At 4.22 GB it fits a 4.7 GB disc.</p>
        </div>
      </template>
    </RacTabs>
  </RacPanel>
</template>

<style scoped>
.result {
  display: grid;
  gap: 16px;
}
.result__head {
  display: grid;
  grid-template-columns: 64px 1fr;
  align-items: center;
  gap: 18px;
}
.result__mark {
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border: 1px solid var(--rac-clank);
  background: var(--rac-clank-glass);
  color: var(--rac-clank);
  clip-path: polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px);
}
.result__words {
  min-width: 0;
}
.result__path {
  font: 600 18px var(--rac-font-display);
  letter-spacing: .02em;
  overflow-wrap: anywhere;
}
.result__sub {
  color: var(--rac-ink-dim);
  font-size: 13px;
}
.result__hash {
  color: var(--rac-ink-dim);
}
.result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.play {
  max-width: 66ch;
  color: var(--rac-ink-dim);
  font-size: 15px;
}
.play p {
  margin: 0 0 8px;
}
.play b {
  color: var(--rac-ink);
  font-weight: 600;
}
.play a {
  color: var(--rac-holo);
  text-decoration-color: var(--rac-holo-line);
  text-underline-offset: 3px;
}
</style>
