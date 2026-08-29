<script lang="ts">
  interface Props {
    jsonInput: string;
  }

  let { jsonInput = $bindable() }: Props = $props();
</script>

<textarea bind:value={jsonInput} placeholder={`[{"nickname": "Acc1", "email": "user1@mail.com", "password": "123"}]`}></textarea>
