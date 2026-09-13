<script lang="ts">
  interface Props {
    isOpen: boolean;
    keys: string[];
    intervalMs: number;
    humanized?: boolean;
    isActive: boolean;
    onSave: () => void;
    onToggle: () => void;
    onClose: () => void;
    onUpdateKeys: (keys: string[]) => void;
  }

  let {
    isOpen,
    keys = $bindable(),
    intervalMs = $bindable(3),
    humanized = $bindable(true),
    isActive,
    onSave,
    onToggle,
    onClose,
    onUpdateKeys,
  }: Props = $props();

  function handleKeyInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 1);
    input.value = value;
    const newKeys = [...keys];
    newKeys[index] = value;
    onUpdateKeys(newKeys);
  }

  function handleKeyDown(index: number, event: KeyboardEvent) {
    if (event.key.length === 1 && /^[a-zA-Z0-9]$/.test(event.key)) {
      event.preventDefault();
      const val = event.key.toUpperCase();
      const newKeys = [...keys];
      newKeys[index] = val;
      onUpdateKeys(newKeys);
      // Move focus to next key if available
      const nextInput = document.getElementById(`bb-key-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  }
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
        <div class="bb-header-left">
          <div class="bb-title-row">
            <span class="bb-icon">⚡</span>
            <h3 class="bb-title">BurstBonk</h3>
          </div>
          <span class="bb-tagline"
            >Native {intervalMs}ms high-frequency hardware keystrokes</span
          >
        </div>
        <div class="bb-header-right">
          <div class="bb-badge" class:is-active={isActive}>
            <span class="bb-badge-dot"></span>
            <span class="bb-badge-text">{isActive ? "RUNNING" : "STANDBY"}</span
            >
          </div>
          <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
          <button
            type="button"
            class="bb-close-btn"
            onclick={onClose}
            title="Close">&times;</button
          >
        </div>
      </div>

      <!-- Description Subtitle -->
      <div class="bb-subtitle">
        <p>Auto-repeats configured key inputs while they are held.</p>
      </div>

      <!-- Keycap Deck -->
      <div class="bb-deck-section">
        <div class="bb-deck-header">
          <div class="bb-deck-label-group">
            <span class="bb-deck-label">Assigned Keys</span>
            <div
              class="bb-tooltip-wrapper"
              tabindex="0"
              role="button"
              aria-label="Assigned keys explanation"
            >
              <span class="bb-tooltip-q">?</span>
              <div class="bb-tooltip-popup">
                <div class="bb-tooltip-popup-desc">
                  Make sure these keys match with corresponding Skill Shortcuts
                  on your NIKKE client Control Settings.
                </div>
              </div>
            </div>
          </div>
          <span class="bb-deck-hint">Click a slot to rebind</span>
        </div>
        <div class="bb-keys-grid">
          {#each keys as key, i}
            <div class="bb-key-slot">
              <span class="bb-slot-tag">SLOT {i + 1}</span>
              <input
                id="bb-key-{i}"
                type="text"
                class="bb-keycap"
                maxlength="1"
                value={key}
                placeholder={String.fromCharCode(65 + i)}
                oninput={(e) => handleKeyInput(i, e)}
                onkeydown={(e) => handleKeyDown(i, e)}
              />
            </div>
          {/each}
        </div>
      </div>

      <!-- Customizable Interval Setup -->
      <div class="bb-interval-section">
        <div class="bb-interval-row">
          <div class="bb-interval-left">
            <span class="bb-interval-label">SPAM INTERVAL</span>
            <span class="bb-interval-sub"
              >Base hardware delay per keystroke</span
            >
          </div>
          <div class="bb-interval-right">
            <div class="bb-interval-input-wrap">
              <input
                type="number"
                class="bb-interval-input"
                min="1"
                max="500"
                bind:value={intervalMs}
              />
              <span class="bb-interval-unit">ms</span>
            </div>
            <div class="bb-presets">
              <button
                type="button"
                class="bb-preset-chip"
                class:selected={intervalMs === 3}
                onclick={() => (intervalMs = 3)}
                title="Original AutoHotKey script speed"
              >
                3ms
              </button>
              <button
                type="button"
                class="bb-preset-chip"
                class:selected={intervalMs === 5}
                onclick={() => (intervalMs = 5)}
              >
                5ms
              </button>
              <button
                type="button"
                class="bb-preset-chip"
                class:selected={intervalMs === 10}
                onclick={() => (intervalMs = 10)}
              >
                10ms
              </button>
            </div>
          </div>
        </div>

        <!-- Humanized Mode Checklist / Toggle -->
        <div class="bb-humanized-row" class:active={humanized}>
          <label class="bb-humanized-label">
            <input
              type="checkbox"
              class="bb-checkbox-input"
              bind:checked={humanized}
            />
            <span class="bb-custom-check" class:checked={humanized}>
              {#if humanized}
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  stroke="currentColor"
                  stroke-width="3.5"
                  fill="none"
                >
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              {/if}
            </span>
            <div class="bb-humanized-info">
              <div class="bb-humanized-title-line">
                <span class="bb-humanized-title">Humanized</span>
                <span class="bb-humanized-badge" class:active={humanized}>
                  {humanized ? "Active: +5~15ms delay" : "Anti-Detection"}
                </span>

                <!-- Hover Tooltip Explainer -->
                <div
                  class="bb-tooltip-wrapper"
                  tabindex="0"
                  role="button"
                  aria-label="Humanized feature explanation"
                >
                  <span class="bb-tooltip-q">?</span>
                  <div class="bb-tooltip-popup">
                    <div class="bb-tooltip-popup-title">
                      🛡️ Humanized Anti-Detection
                    </div>
                    <div class="bb-tooltip-popup-desc">
                      Injects hard <strong
                        >random micro-delays (5.xxx ms to 15.xxx ms)</strong
                      > on every spam cycle.
                    </div>
                    <div class="bb-tooltip-popup-sub">
                      Static intervals (e.g. flat 3.000ms) produce zero-variance
                      patterns easily flagged by anti-macro heuristics.
                      Humanized breaks this robotic rhythm without compromising
                      firing rate.
                    </div>
                    <div class="bb-tooltip-popup-footer">
                      Target output: <strong
                        >{intervalMs}ms + (5~15ms)</strong
                      >
                    </div>
                  </div>
                </div>
              </div>
              <span class="bb-humanized-desc">
                Randomize ms-delay variation on every cycle to prevent robotic
                behavior.
              </span>
            </div>
          </label>
        </div>
      </div>

      <!-- Info Tip -->
      <div class="bb-tip-bar">
        <span class="bb-tip-icon">💡</span>
        <span class="bb-tip-text">
          Hold assigned key to burst bonk. <strong>F12</strong> to toggle
        </span>
      </div>

      <!-- Actions -->
      <div class="bb-actions">
        <button
          type="button"
          class="bb-btn bb-btn-toggle"
          class:is-active-btn={isActive}
          onclick={onToggle}
        >
          {#if isActive}
            <span class="bb-btn-icon">⏹</span>
            <span>Stop Engine</span>
          {:else}
            <span class="bb-btn-icon">▶</span>
            <span>Start Engine</span>
          {/if}
        </button>

        <button type="button" class="bb-btn bb-btn-save" onclick={onSave}>
          <span class="bb-btn-icon">💾</span>
          <span>Save Changes</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .bb-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.72);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    animation: bbFadeIn 0.18s ease-out;
  }

  @keyframes bbFadeIn {
    from {
      opacity: 0;
      transform: scale(0.98);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .bb-card {
    width: 92%;
    max-width: 480px;
    background: #15151c;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 22px 24px;
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.65),
      0 0 1px rgba(255, 255, 255, 0.2);
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: #e6e6f0;
    box-sizing: border-box;
  }

  /* Header */
  .bb-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .bb-header-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .bb-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .bb-icon {
    font-size: 18px;
    color: #f59e0b;
    filter: drop-shadow(0 0 6px rgba(245, 158, 11, 0.5));
  }

  .bb-title {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: #ffffff;
  }

  .bb-tagline {
    font-size: 11px;
    color: #f59e0b;
    font-weight: 600;
    letter-spacing: 0.01em;
  }

  .bb-subtitle {
    font-size: 11px;
    color: #9d9db5;
    line-height: 1.5;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: -4px 0 2px 0;
  }

  .bb-subtitle p {
    margin: 0;
  }

  .bb-header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .bb-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.04em;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #8e8ea6;
    transition: all 0.25s ease;
  }

  .bb-badge.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.4);
    color: #34d399;
    box-shadow: 0 0 12px rgba(16, 185, 129, 0.25);
  }

  .bb-badge-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #64748b;
    transition: background 0.25s ease;
  }

  .bb-badge.is-active .bb-badge-dot {
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
    animation: bbPulse 1.4s infinite;
  }

  @keyframes bbPulse {
    0%,
    100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.4;
      transform: scale(0.85);
    }
  }

  .bb-close-btn {
    all: unset;
    cursor: pointer;
    width: 26px;
    height: 26px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: #8e8ea6;
    font-size: 18px;
    line-height: 1;
    transition:
      background 0.15s ease,
      color 0.15s ease;
  }

  .bb-close-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
  }

  /* Key Deck */
  .bb-deck-section {
    background: #101015;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 11px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .bb-deck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .bb-deck-label-group {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .bb-deck-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #9d9db5;
  }

  .bb-deck-hint {
    font-size: 10px;
    color: #636378;
  }

  .bb-keys-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .bb-key-slot {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .bb-slot-tag {
    font-size: 9px;
    font-weight: 700;
    color: #6a6a80;
    letter-spacing: 0.02em;
  }

  .bb-keycap {
    all: unset;
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 1;
    max-width: 56px;
    background: linear-gradient(180deg, #242432 0%, #1a1a24 100%);
    border: 1px solid #36364a;
    border-top: 1px solid #4a4a62;
    border-radius: 8.5px;
    box-shadow:
      0 3px 0 #0f0f15,
      0 5px 10px rgba(0, 0, 0, 0.38);
    color: #ffffff;
    font-size: 17.5px;
    font-weight: 800;
    text-align: center;
    text-transform: uppercase;
    cursor: pointer;
    transition: all 0.12s ease;
  }

  .bb-keycap:hover {
    border-color: #555570;
    transform: translateY(-1px);
    box-shadow:
      0 4px 0 #0f0f15,
      0 7px 14px rgba(0, 0, 0, 0.42);
  }

  .bb-keycap:focus {
    border-color: #e05bc4;
    box-shadow:
      0 1px 0 #0f0f15,
      0 0 12px rgba(224, 91, 196, 0.45);
    transform: translateY(2px);
    outline: none;
    background: linear-gradient(180deg, #2e2436 0%, #201a26 100%);
  }

  /* Interval Setup */
  .bb-interval-row {
    background: #101015;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 12px 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .bb-interval-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .bb-interval-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #9d9db5;
  }

  .bb-interval-sub {
    font-size: 10px;
    color: #636378;
  }

  .bb-interval-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .bb-interval-input-wrap {
    display: inline-flex;
    align-items: center;
    background: #1c1c27;
    border: 1px solid #36364a;
    border-radius: 8px;
    padding: 4px 8px;
    gap: 4px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
    transition:
      border-color 0.15s ease,
      box-shadow 0.15s ease;
  }

  .bb-interval-input {
    all: unset;
    width: 44px;
    text-align: center;
    font-size: 13px;
    font-weight: 800;
    color: #ffffff;
    font-variant-numeric: tabular-nums;
  }

  .bb-interval-input-wrap:focus-within {
    border-color: #f59e0b;
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
  }

  .bb-interval-unit {
    font-size: 11px;
    font-weight: 700;
    color: #8e8ea6;
  }

  .bb-presets {
    display: flex;
    gap: 5px;
  }

  .bb-preset-chip {
    all: unset;
    cursor: pointer;
    font-size: 10px;
    font-weight: 700;
    padding: 5px 9px;
    border-radius: 6px;
    background: #1f1f2b;
    border: 1px solid #333345;
    color: #9d9db5;
    transition: all 0.15s ease;
    user-select: none;
  }

  .bb-preset-chip:hover {
    background: #2b2b3b;
    color: #ffffff;
    border-color: #4a4a60;
  }

  .bb-preset-chip.selected {
    background: rgba(245, 158, 11, 0.16);
    border-color: rgba(245, 158, 11, 0.5);
    color: #f59e0b;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.2);
  }

  /* Interval Section Wrapper */
  .bb-interval-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  /* Humanized Row & Checklist */
  .bb-humanized-row {
    background: #101015;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 10px 14px;
    transition: all 0.2s ease;
  }

  .bb-humanized-row.active {
    background: rgba(16, 185, 129, 0.05);
    border-color: rgba(16, 185, 129, 0.35);
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.08);
  }

  .bb-humanized-label {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    cursor: pointer;
    user-select: none;
    margin: 0;
  }

  .bb-checkbox-input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .bb-custom-check {
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: #1c1c27;
    border: 1.5px solid #3d3d52;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    transition: all 0.2s ease;
    color: #ffffff;
  }

  .bb-custom-check.checked {
    background: #10b981;
    border-color: #10b981;
    box-shadow: 0 0 10px rgba(16, 185, 129, 0.4);
  }

  .bb-humanized-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .bb-humanized-title-line {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .bb-humanized-title {
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.03em;
    color: #ffffff;
  }

  .bb-humanized-badge {
    font-size: 9.5px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 5px;
    background: #1f1f2b;
    border: 1px solid #333345;
    color: #9d9db5;
    transition: all 0.2s ease;
  }

  .bb-humanized-badge.active {
    background: rgba(16, 185, 129, 0.18);
    border-color: rgba(16, 185, 129, 0.5);
    color: #34d399;
  }

  .bb-humanized-desc {
    font-size: 10px;
    color: #7b7b93;
    line-height: 1.35;
  }

  /* Interactive Hover Tooltip */
  .bb-tooltip-wrapper {
    position: relative;
    display: inline-flex;
    align-items: center;
    cursor: help;
    outline: none;
  }

  .bb-tooltip-q {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #a1a1bb;
    font-size: 10px;
    font-weight: 800;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
  }

  .bb-tooltip-wrapper:hover .bb-tooltip-q,
  .bb-tooltip-wrapper:focus .bb-tooltip-q {
    background: #f59e0b;
    border-color: #f59e0b;
    color: #000000;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
  }

  .bb-tooltip-popup {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%) translateY(4px);
    width: 290px;
    background: #181822;
    border: 1px solid rgba(245, 158, 11, 0.4);
    box-shadow:
      0 10px 28px rgba(0, 0, 0, 0.65),
      0 0 16px rgba(245, 158, 11, 0.15);
    border-radius: 10px;
    padding: 12px 14px;
    opacity: 0;
    visibility: hidden;
    pointer-events: none;
    transition:
      opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    z-index: 100;
  }

  .bb-tooltip-popup::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border-width: 6px;
    border-style: solid;
    border-color: #181822 transparent transparent transparent;
  }

  .bb-tooltip-wrapper:hover .bb-tooltip-popup,
  .bb-tooltip-wrapper:focus .bb-tooltip-popup {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
    pointer-events: auto;
  }

  .bb-tooltip-popup-title {
    font-size: 11.5px;
    font-weight: 800;
    color: #fbbf24;
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .bb-tooltip-popup-desc {
    font-size: 10.5px;
    color: #e2e8f0;
    line-height: 1.4;
    margin-bottom: 5px;
  }

  .bb-tooltip-popup-desc strong {
    color: #34d399;
  }

  .bb-tooltip-popup-sub {
    font-size: 9.5px;
    color: #94a3b8;
    line-height: 1.35;
    margin-bottom: 8px;
  }

  .bb-tooltip-popup-footer {
    font-size: 9.5px;
    background: rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
    padding: 4px 8px;
    color: #cbd5e1;
  }

  .bb-tooltip-popup-footer strong {
    color: #f59e0b;
    font-family: monospace;
  }

  /* Tip Bar */
  .bb-tip-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(245, 158, 11, 0.06);
    border: 1px solid rgba(245, 158, 11, 0.18);
    border-radius: 10px;
    padding: 9px 12px;
    font-size: 11px;
    color: #d1d5db;
    line-height: 1.4;
  }

  .bb-tip-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .bb-tip-text strong {
    color: #fbbf24;
    font-weight: 700;
  }

  /* Actions */
  .bb-actions {
    display: flex;
    gap: 10px;
    margin-top: 2px;
  }

  .bb-btn {
    all: unset;
    box-sizing: border-box;
    flex: 1;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;
    user-select: none;
  }

  .bb-btn-icon {
    font-size: 14px;
    line-height: 1;
  }

  /* Toggle button - inactive state (green) */
  .bb-btn-toggle {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%);
    color: #ffffff;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
  }

  .bb-btn-toggle:hover {
    background: linear-gradient(135deg, #047857 0%, #059669 100%);
    box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
    transform: translateY(-1px);
  }

  .bb-btn-toggle:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25);
  }

  /* Toggle button - active state (red/crimson) */
  .bb-btn-toggle.is-active-btn {
    background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
    box-shadow: 0 4px 14px rgba(239, 68, 68, 0.35);
  }

  .bb-btn-toggle.is-active-btn:hover {
    background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%);
    box-shadow: 0 6px 18px rgba(239, 68, 68, 0.5);
    transform: translateY(-1px);
  }

  .bb-btn-toggle.is-active-btn:active {
    transform: translateY(1px);
    box-shadow: 0 2px 8px rgba(239, 68, 68, 0.25);
  }

  /* Save button */
  .bb-btn-save {
    background: #23232f;
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #f1f1f6;
  }

  .bb-btn-save:hover {
    background: #2d2d3c;
    border-color: rgba(255, 255, 255, 0.25);
    transform: translateY(-1px);
  }

  .bb-btn-save:active {
    transform: translateY(1px);
    background: #1c1c26;
  }

  /* Light mode support */
  :global(.light-mode) .bb-card {
    background: #ffffff;
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow:
      0 24px 48px rgba(0, 0, 0, 0.18),
      0 0 1px rgba(0, 0, 0, 0.2);
    color: #1a1a24;
  }

  :global(.light-mode) .bb-title {
    color: #111118;
  }

  :global(.light-mode) .bb-tagline {
    color: #d97706;
  }

  :global(.light-mode) .bb-subtitle {
    color: #475569;
  }

  :global(.light-mode) .bb-deck-section {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  :global(.light-mode) .bb-deck-label {
    color: #475569;
  }

  :global(.light-mode) .bb-keycap {
    background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
    border-color: #cbd5e1;
    border-top-color: #ffffff;
    box-shadow:
      0 3px 0 #cbd5e1,
      0 5px 10px rgba(0, 0, 0, 0.08);
    color: #0f172a;
  }

  :global(.light-mode) .bb-keycap:hover {
    border-color: #94a3b8;
  }

  :global(.light-mode) .bb-keycap:focus {
    border-color: #e05bc4;
    box-shadow:
      0 1px 0 #cbd5e1,
      0 0 11px rgba(224, 91, 196, 0.3);
  }

  :global(.light-mode) .bb-btn-save {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  :global(.light-mode) .bb-btn-save:hover {
    background: #e2e8f0;
  }

  :global(.light-mode) .bb-interval-row {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  :global(.light-mode) .bb-interval-label {
    color: #475569;
  }

  :global(.light-mode) .bb-interval-sub {
    color: #94a3b8;
  }

  :global(.light-mode) .bb-interval-input-wrap {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  :global(.light-mode) .bb-interval-input {
    color: #0f172a;
  }

  :global(.light-mode) .bb-interval-unit {
    color: #64748b;
  }

  :global(.light-mode) .bb-preset-chip {
    background: #ffffff;
    border-color: #cbd5e1;
    color: #475569;
  }

  :global(.light-mode) .bb-preset-chip:hover {
    background: #f1f5f9;
    color: #0f172a;
    border-color: #94a3b8;
  }

  :global(.light-mode) .bb-preset-chip.selected {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.6);
    color: #b45309;
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.15);
  }

  :global(.light-mode) .bb-tip-bar {
    background: rgba(245, 158, 11, 0.12);
    border-color: rgba(245, 158, 11, 0.35);
    color: #1e293b;
  }

  :global(.light-mode) .bb-tip-text strong {
    color: #b45309;
  }

  :global(.light-mode) .bb-close-btn {
    color: #64748b;
  }

  :global(.light-mode) .bb-close-btn:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #0f172a;
  }

  :global(.light-mode) .bb-badge {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #64748b;
  }

  :global(.light-mode) .bb-badge.is-active {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.4);
    color: #059669;
  }

  :global(.light-mode) .bb-humanized-row {
    background: #f8fafc;
    border-color: #e2e8f0;
  }

  :global(.light-mode) .bb-humanized-row.active {
    background: rgba(16, 185, 129, 0.08);
    border-color: rgba(16, 185, 129, 0.4);
    box-shadow: 0 0 14px rgba(16, 185, 129, 0.1);
  }

  :global(.light-mode) .bb-custom-check {
    background: #ffffff;
    border-color: #cbd5e1;
  }

  :global(.light-mode) .bb-custom-check.checked {
    background: #10b981;
    border-color: #10b981;
    color: #ffffff;
  }

  :global(.light-mode) .bb-humanized-title {
    color: #0f172a;
  }

  :global(.light-mode) .bb-humanized-desc {
    color: #64748b;
  }

  :global(.light-mode) .bb-humanized-badge {
    background: #ffffff;
    border-color: #cbd5e1;
    color: #475569;
  }

  :global(.light-mode) .bb-humanized-badge.active {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.4);
    color: #047857;
  }

  :global(.light-mode) .bb-tooltip-q {
    background: #e2e8f0;
    border-color: #cbd5e1;
    color: #475569;
  }

  :global(.light-mode) .bb-tooltip-popup {
    background: #ffffff;
    border-color: #cbd5e1;
    box-shadow:
      0 10px 25px rgba(0, 0, 0, 0.12),
      0 0 12px rgba(245, 158, 11, 0.15);
  }

  :global(.light-mode) .bb-tooltip-popup::after {
    border-color: #ffffff transparent transparent transparent;
  }

  :global(.light-mode) .bb-tooltip-popup-title {
    color: #b45309;
  }

  :global(.light-mode) .bb-tooltip-popup-desc {
    color: #334155;
  }

  :global(.light-mode) .bb-tooltip-popup-sub {
    color: #64748b;
  }

  :global(.light-mode) .bb-tooltip-popup-footer {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #475569;
  }
</style>
