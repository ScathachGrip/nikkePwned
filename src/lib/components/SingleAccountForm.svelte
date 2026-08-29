<script lang="ts">
  interface Props {
    singleNickname: string;
    singleEmail: string;
    singlePassword: string;
  }

  let {
    singleNickname = $bindable(),
    singleEmail = $bindable(),
    singlePassword = $bindable()
  }: Props = $props();
</script>

<div id="singleAccountForm" class="single-account-form" style="display: flex;">
  <input type="text" bind:value={singleNickname} placeholder="Nickname" />
  <input type="email" bind:value={singleEmail} placeholder="Email" />
  <input type="password" bind:value={singlePassword} placeholder="Password" />
</div>
