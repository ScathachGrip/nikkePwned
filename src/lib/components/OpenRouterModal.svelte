<script lang="ts">
  import { OPENROUTER_MODEL_POOL } from "../../types";

  interface Props {
    isOpen: boolean;
    apiKey: string;
    model: string;
    isApiKeyVisible: boolean;
    onToggleVisibility: () => void;
    onSave: () => void;
    onClose: () => void;
  }

  let {
    isOpen,
    apiKey = $bindable(),
    model = $bindable(),
    isApiKeyVisible,
    onToggleVisibility,
    onSave,
    onClose
  }: Props = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div id="myModalOpenRouter" class="modal" role="presentation" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="margin: 0; font-size: 16px;">OpenRouter Configuration</h3>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span class="close" role="presentation" onclick={onClose}>&times;</span>
      </div>
      <div class="openrouter-panel">
        <strong>Vision LLM Setup:</strong> Enter your OpenRouter API key to enable automated battlefield damage extraction.
      </div>
      <div class="openrouter-key-row">
        <input
          type={isApiKeyVisible ? "text" : "password"}
          bind:value={apiKey}
          placeholder="sk-or-v1-..."
          class="openrouter-field"
        />
        <button type="button" class="openrouter-visibility-btn" onclick={onToggleVisibility}>
          {isApiKeyVisible ? "Hide" : "Show"}
        </button>
      </div>
      <label for="openrouterModel" class="openrouter-label">Model Selection:</label>
      <select bind:value={model} id="openrouterModel" class="openrouter-field">
        {#each OPENROUTER_MODEL_POOL as m}
          <option value={m}>{m}</option>
        {/each}
      </select>
      <button type="button" class="openrouter-save-btn" onclick={onSave}>Save Configuration</button>
    </div>
  </div>
{/if}
