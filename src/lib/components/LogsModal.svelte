<script lang="ts">
  import type { HistoryLog } from "../../types";
  import { formatDateWithTimeAgo } from "../utils";

  interface Props {
    isOpen: boolean;
    searchQuery: string;
    filteredLogs: HistoryLog[];
    onClose: () => void;
  }

  let { isOpen, searchQuery = $bindable(), filteredLogs, onClose }: Props = $props();
</script>

{#if isOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div id="myModal" class="modal" role="presentation" style="display: flex;" onclick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <div class="modal-content">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <input type="text" id="searchInput" bind:value={searchQuery} placeholder="search string" style="width: 80%; padding: 8px; font-weight: bold;" />
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <span class="close" role="presentation" onclick={onClose}>&times;</span>
      </div>
      <br />
      <div style="max-height: 400px; overflow-y: auto;">
        <table style="width:100%; text-align: left; border-collapse: collapse;">
          <thead>
            <tr style="font-weight: 900; background-color: #0d0d0d; border-bottom: 2px solid #555;">
              <th style="padding: 8px;">STRING</th>
              <th style="padding: 8px;">TYPE</th>
              <th style="padding: 8px;">ISSUCCESS</th>
              <th style="padding: 8px;">DATE</th>
            </tr>
          </thead>
          <tbody>
            {#if filteredLogs.length === 0}
              <tr><td colspan="4" style="text-align:center; padding: 12px;">No Results</td></tr>
            {:else}
              {#each filteredLogs as log}
                {@const accountStr = log.account || log.accountWhat || "-"}
                {@const typeStr = log.eventType || log.typeWhat || log.is_success || "-"}
                {@const isSuccessStr = log.isSuccess || log.is_success || "False"}
                {@const dateStr = formatDateWithTimeAgo(log.timestamp || log.dateWhat)}
                <tr style="border-bottom: 1px solid #333;">
                  <td style="padding: 8px;">{accountStr}</td>
                  <td style="padding: 8px;">{typeStr}</td>
                  <td style="padding: 8px;">{isSuccessStr}</td>
                  <td style="padding: 8px;">{dateStr}</td>
                </tr>
              {/each}
            {/if}
          </tbody>
        </table>
      </div>
    </div>
  </div>
{/if}
