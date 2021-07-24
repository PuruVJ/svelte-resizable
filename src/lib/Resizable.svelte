<script lang="ts" context="module">
  type Maybe<T> = T | undefined;

  export type SvelteResizableDirection =
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'topRight'
    | 'bottomRight'
    | 'bottomLeft'
    | 'topLeft';

  export type NewSize = {
    newHeight: number | string;
    newWidth: number | string;
  };

  export type SvelteResizableEnable = {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
    topRight?: boolean;
    bottomRight?: boolean;
    bottomLeft?: boolean;
    topLeft?: boolean;
  };

  export type SvelteResizableHandleClass = {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
    topRight?: string;
    bottomRight?: string;
    bottomLeft?: string;
    topLeft?: string;
  };

  export type SvelteResizableSize = {
    width: number | string;
    height: number | string;
  };

  export type SvelteResizableOptions = {
    enable?: SvelteResizableEnable;
    grid?: [number, number];

    snap?: { x?: number[]; y?: number[] };
    snapGap?: number;

    bounds?: 'parent' | 'window' | string;
    boundsByDirection?: boolean;

    size?: SvelteResizableSize;

    minWidth?: string | number;
    minHeight?: string | number;
    maxWidth?: string | number;
    maxHeight?: string | number;
    lockAspectRatio?: boolean | number;
    lockAspectRatioExtraWidth?: number;
    lockAspectRatioExtraHeight?: number;

    handleClasses?: SvelteResizableHandleClass;
    handleWrapperClass?: string;

    defaultSize?: SvelteResizableSize;
    scale?: number;
    resizeRatio?: number;
  };
</script>

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Resizer from './Resizer.svelte';

  export let enable: SvelteResizableEnable = {};
  export let handleClasses: SvelteResizableHandleClass = {};
  export let handleWrapperClass: string = '';

  const DEFAULT_SIZE = {
    width: 'auto',
    height: 'auto',
  };

  const dispatch =
    createEventDispatcher<{ 'resize-start': { direction: SvelteResizableDirection } }>();
</script>

<div class={handleWrapperClass}>
  <div class="svelte-resizers-container">
    <!-- top -->
    {#if enable.top}
      <Resizer direction="top" className={handleClasses.top}>
        <slot name="top-resizer" />
      </Resizer>
    {/if}

    <!-- top-right -->
    {#if enable.topRight}
      <Resizer direction="topRight" className={handleClasses.topRight}>
        <slot name="top-right-resizer" />
      </Resizer>
    {/if}

    <!-- right -->
    {#if enable.right}
      <Resizer direction="right" className={handleClasses.right}>
        <slot name="right-resizer" />
      </Resizer>
    {/if}

    <!-- bottom right -->
    {#if enable.bottomRight}
      <Resizer direction="bottomRight" className={handleClasses.bottomRight}>
        <slot name="bottom-right-resizer" />
      </Resizer>
    {/if}

    <!-- bottom -->
    {#if enable.bottom}
      <Resizer direction="bottom" className={handleClasses.bottom}>
        <slot name="bottom-resizer" />
      </Resizer>
    {/if}

    <!-- bottom left -->
    {#if enable.bottomLeft}
      <Resizer direction="bottomLeft" className={handleClasses.bottomLeft}>
        <slot name="bottom-left-resizer" />
      </Resizer>
    {/if}

    <!-- left -->
    {#if enable.left}
      <Resizer direction="left" className={handleClasses.left}>
        <slot name="left-resizer" />
      </Resizer>
    {/if}

    <!-- top left -->
    {#if enable.topLeft}
      <Resizer direction="topLeft" className={handleClasses.topLeft}>
        <slot name="top-left-resizer" />
      </Resizer>
    {/if}
  </div>
</div>
