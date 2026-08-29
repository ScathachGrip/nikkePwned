<script lang="ts">
  interface Props {
    show: boolean;
    loadingImgSrc: string;
  }

  let { show, loadingImgSrc }: Props = $props();
</script>

{#if show}
  <div id="loading" class="loading-overlay">
    <img id="loadingImg" src={loadingImgSrc} alt="Loading loader..." />
  </div>
{/if}
