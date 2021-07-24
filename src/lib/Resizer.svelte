<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  type SvelteResizableDirection =
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'topRight'
    | 'bottomRight'
    | 'bottomLeft'
    | 'topLeft';

  // export let enable
  export let direction: SvelteResizableDirection;

  export let className: string = '';

  const dispatch = createEventDispatcher();

  function onResizeStart() {
    dispatch('resize-start', { detail: { direction } });
  }
</script>

<div
  class="svelte-resizer svelte-resizer-{direction} {className}"
  on:mousedown={onResizeStart}
  on:touchstart={onResizeStart}
>
  <slot />
</div>
