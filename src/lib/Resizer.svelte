<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { cursorForDirection, isTouchEvent } from './__utils/helpers';

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

  const dispatch =
    createEventDispatcher<{
      'resize-start': {
        direction: SvelteResizableDirection;
        clientX: number;
        clientY: number;
        cursor: string;
      };
    }>();

  function onResizeStart(e: MouseEvent | TouchEvent) {
    // Give out the clientX and clientY
    const { clientX, clientY } = isTouchEvent(e) ? e.touches[0] : e;

    dispatch('resize-start', {
      direction,
      clientX,
      clientY,
      cursor: cursorForDirection(direction),
    });
  }

  $: console.log(cursorForDirection(direction));
</script>

<div
  style="cursor: {cursorForDirection(direction)}"
  class="svelte-resizer svelte-resizer-{direction} {className}"
  data-direction={direction}
  on:touchstart={onResizeStart}
  on:mousedown={onResizeStart}
>
  <slot />
</div>

<style global>
  .svelte-resizer {
    touch-action: none;
  }

  .svelte-resizer-top,
  .svelte-resizer-bottom {
    height: 10px;
    width: 100%;
    left: 0px;
    position: absolute;
  }

  .svelte-resizer-right,
  .svelte-resizer-left {
    width: 10px;
    height: 100%;
    top: 0px;
    position: absolute;
  }

  .svelte-resizer-top {
    top: -5px;
  }

  .svelte-resizer-bottom {
    bottom: -5px;
  }

  .svelte-resizer-right {
    right: -5px;
  }

  .svelte-resizer-left {
    left: -5px;
  }

  .svelte-resizer-bottomLeft,
  .svelte-resizer-bottomRight,
  .svelte-resizer-topLeft,
  .svelte-resizer-topRight {
    width: 20px;
    height: 20px;
    position: absolute;
  }

  .svelte-resizer-topRight {
    right: -10px;
    top: -10px;
  }

  .svelte-resizer-bottomRight {
    right: -10px;
    bottom: -10px;
  }

  .svelte-resizer-bottomLeft {
    left: -10px;
    bottom: -10px;
  }

  .svelte-resizer-topLeft {
    left: -10px;
    top: -10px;
  }
</style>
