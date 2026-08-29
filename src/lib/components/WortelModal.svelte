<script lang="ts">
  interface Props {
    isOpen: boolean;
    clickCount: number;
    dcCount: number;
    textareaValue: string;
    isClickBoxRed: boolean;
    isVibrating: boolean;
    onImageClick: () => void;
    onMouseDown: () => void;
    onReset: () => void;
    onClose: () => void;
  }

  let {
    isOpen,
    clickCount,
    dcCount,
    textareaValue,
    isClickBoxRed,
    isVibrating,
    onImageClick,
    onMouseDown,
    onReset,
    onClose
  }: Props = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div id="myModalWortel" class="modal" role="presentation" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal-content">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <span class="close" role="presentation" onclick={onClose}>&times;</span>
      <div class="asuwh">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div id="click" class="click" role="presentation" style="padding: 1rem; margin-bottom: 1rem; background: {isClickBoxRed ? 'red' : '#292929'}; cursor: pointer;" onmousedown={onMouseDown}>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
          <img src="/static/my.png" id="gambarKlik" class={isVibrating ? "gambarklik vibrate" : "gambarklik"} role="presentation" alt="Click me!" onclick={onImageClick} />
        </div>
        Clicks: <input id="count" type="text" value={clickCount} size="4" readonly style="width: 60px; text-align: center;" />
        <button id="reset" type="button" onclick={onReset}>Reset</button>
        <br /> Fast double click count:
        <input id="dcCount" type="text" value={dcCount} size="4" readonly style="width: 60px; text-align: center; margin-top: 6px;" />
        <br />
        <textarea id="textarea" rows="10" cols="50" value={textareaValue} readonly style="margin-top: 8px; font-family: monospace;"></textarea>
      </div>
    </div>
  </div>
{/if}
