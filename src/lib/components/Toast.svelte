<script lang="ts">
  interface Props {
    show: boolean;
    type: "success" | "fail";
    message: string;
    progress: number;
  }

  let { show, type, message, progress }: Props = $props();
</script>

<div id="snackbar" class={show ? `show ${type}` : ""}>
  <div id="snackbar-text">
    {type === "success" ? "✅ " : "❌ "}{message}
  </div>
  <div class="progress">
    <div class="progress-bar" style="width: {progress}%; transition: {show ? 'width 3s linear' : 'none'};"></div>
  </div>
</div>
