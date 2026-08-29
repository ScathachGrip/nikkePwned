<script lang="ts">
  import type { Account } from "../../types";
  import { redactedEmail } from "../utils";

  interface Props {
    isOpen: boolean;
    accounts: Account[];
    selectedAccountIndex: number | null;
    onSelect: (index: number) => void;
    onClose: () => void;
  }

  let { isOpen, accounts, selectedAccountIndex, onSelect, onClose }: Props = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div id="accountPickerModal" class="account-picker-modal" role="presentation" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="account-picker-modal-card">
      <div class="account-picker-head">
        <span>Select Account</span>
        <button type="button" class="account-picker-close" onclick={onClose}>&times;</button>
      </div>
      <div class="account-picker-list">
        {#if accounts.length === 0}
          <button type="button" class="account-picker-option-empty" disabled>No accounts available yet.</button>
        {:else}
          {#each accounts as acc, idx}
            <button
              type="button"
              class={selectedAccountIndex === idx ? "account-picker-option is-selected" : "account-picker-option"}
              onclick={() => onSelect(idx)}
            >
              {acc.nickname} ({redactedEmail(acc.email)})
            </button>
          {/each}
        {/if}
      </div>
    </div>
  </div>
{/if}
