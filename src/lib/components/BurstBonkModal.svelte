<script lang="ts">
  interface Props {
    isOpen: boolean;
    onClose: () => void;
  }

  let { isOpen, onClose }: Props = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div
    class="bb-overlay"
    role="presentation"
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
  >
    <div class="bb-card">
      <!-- Header -->
      <div class="bb-header">
        <div class="bb-title-row">
          <h3 class="bb-title">BurstBonk</h3>
          <span class="bb-badge">DEPRECATED</span>
        </div>
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <button
          type="button"
          class="bb-close-btn"
          onclick={onClose}
          title="Close">&times;</button
        >
      </div>

      <!-- Simple Notice -->
      <div class="bb-content">
        <p>This feature has been deprecated and disabled.</p>
      </div>

      <!-- Actions -->
      <div class="bb-actions">
        <button type="button" class="bb-btn-close" onclick={onClose}>
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .bb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .bb-card {
    width: 90%;
    max-width: 380px;
    background: #14141c;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    display: flex;
    flex-direction: column;
    gap: 14px;
    color: #e6e6f0;
    box-sizing: border-box;
  }

  .bb-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bb-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bb-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }

  .bb-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 4px;
    background: rgba(239, 68, 68, 0.15);
    border: 1px solid rgba(239, 68, 68, 0.35);
    color: #f87171;
  }

  .bb-close-btn {
    all: unset;
    cursor: pointer;
    width: 24px;
    height: 24px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #8e8ea6;
    font-size: 18px;
    line-height: 1;
    transition: color 0.15s ease;
  }

  .bb-close-btn:hover {
    color: #ffffff;
  }

  .bb-content {
    background: #0d0d13;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 10px;
    padding: 14px;
  }

  .bb-content p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
    color: #9d9db5;
  }

  .bb-actions {
    display: flex;
    justify-content: flex-end;
  }

  .bb-btn-close {
    all: unset;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
    background: #242434;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: background 0.15s ease;
  }

  .bb-btn-close:hover {
    background: #303046;
  }

  /* Light mode */
  :global(.light-mode) .bb-card {
    background: #ffffff;
    border-color: #e2e8f0;
    color: #1e293b;
    box-shadow: 0 16px 32px rgba(0, 0, 0, 0.12);
  }

  :global(.light-mode) .bb-title {
    color: #0f172a;
  }

  :global(.light-mode) .bb-content {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  :global(.light-mode) .bb-content p {
    color: #475569;
  }

  :global(.light-mode) .bb-btn-close {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #1e293b;
  }

  :global(.light-mode) .bb-btn-close:hover {
    background: #cbd5e1;
  }
</style>
