<script lang="ts">
  import { invoke } from "../api";

  interface Props {
    onClose: () => void;
  }

  let { onClose }: Props = $props();
</script>

<div class="titlebar">
  <div class="title-left">
    <div class="app-icon" aria-hidden="true"></div>
    <span class="app-title">nikkePwned</span>
  </div>
  <div class="window-controls">
    <button id="minBtn" class="ctl" title="Minimize" aria-label="Minimize" onclick={() => invoke("minimize_window")}>
      <span class="dot dot-min"></span>
    </button>
    <button id="maxBtn" class="ctl" title="Maximize" aria-label="Maximize" onclick={() => invoke("toggle_maximize_window")}>
      <span class="dot dot-max"></span>
    </button>
    <button id="closeBtn" class="ctl ctl-close" title="Close" aria-label="Close" onclick={onClose}>
      <span class="dot dot-close"></span>
    </button>
  </div>
</div>
