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
</script>

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Resizer from './Resizer.svelte';
  import {
    calculateNewMax,
    clamp,
    endsWith,
    findClosestSnap,
    getParentSize,
    getSize,
    getStringSize,
    hasDirection,
    isTouchEvent,
    snap,
  } from './__utils/helpers';

  const enableDefault: SvelteResizableEnable = {
    top: true,
    topRight: true,
    right: true,
    bottomRight: true,
    bottom: true,
    bottomLeft: true,
    left: true,
    topLeft: true,
  };

  export let enable: SvelteResizableEnable = enableDefault;
  export let handleClasses: SvelteResizableHandleClass = {};
  export let handleWrapperClass: string = '';
  export let minWidth: string | number = undefined;
  export let minHeight: string | number = undefined;
  export let maxWidth: string | number = undefined;
  export let maxHeight: string | number = undefined;
  export let lockAspectRatio: boolean | number = false;
  export let lockAspectRatioExtraWidth: number = 0;
  export let lockAspectRatioExtraHeight: number = 0;

  export let defaultSize: SvelteResizableSize = { width: 'auto', height: 'auto' };
  export let scale: number = 1;
  export let resizeRatio: number = 1;

  export let bounds: 'parent' | 'window' | string = undefined;
  export let boundsByDirection: boolean = true;

  export let size: SvelteResizableSize = undefined;

  export let grid = undefined;

  let propsSnap: { x?: number[]; y?: number[] } = undefined;
  export { propsSnap as snap };

  export let snapGap = 0;

  // Computed

  // Merge enable with existing ones
  enable = { ...enableDefault, ...enable };

  const DEFAULT_SIZE = {
    width: 'auto',
    height: 'auto',
  };

  let containerEl: HTMLDivElement;
  /** Takes into account the handles that are actually rendered */
  let handlesList: HTMLDivElement[];

  // State
  let isResizing = false;
  let ratio = 1;

  let userSelect = '';
  let direction: SvelteResizableDirection;
  let original = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  let sizeState: SvelteResizableSize = {
    width: 0,
    height: 0,
  };

  // For parent boundary
  let parentLeft = 0;
  let parentTop = 0;

  // For boundary
  let resizableLeft = 0;
  let resizableRight = 0;
  let resizableTop = 0;
  let resizableBottom = 0;

  // For target boundary
  let targetLeft = 0;
  let targetTop = 0;

  let propsSize = size || defaultSize || DEFAULT_SIZE;

  let flexDir: 'row' | 'column';

  let flexBasis: string;

  let backdropCursor: string;

  const dispatch =
    createEventDispatcher<{
      'resize-start': { direction: SvelteResizableDirection };
      resize: {
        direction: SvelteResizableDirection;
        delta: {
          width: number;
          height: number;
        };
      };
      'resize-stop': {
        direction: SvelteResizableDirection;
        delta: { width: number; height: number };
      };
    }>();

  onMount(() => {
    const computedStyle = getComputedStyle(containerEl);
    flexBasis = computedStyle.flexBasis !== 'auto' ? computedStyle.flexBasis : undefined;

    ensureMinMaxDimensions();

    containerEl.style.width = propsSize.width.toString();
    containerEl.style.height = propsSize.height.toString();
  });

  function bindEvents() {
    addEventListener('mouseup', onMouseUp);
    addEventListener('mousemove', onMouseMove);
    addEventListener('mouseleave', onMouseUp);
    addEventListener('touchmove', onMouseMove, {
      capture: true,
      passive: false,
    });
    addEventListener('touchend', onMouseUp);
  }

  function unbindEvents() {
    removeEventListener('mouseup', onMouseUp);
    removeEventListener('mousemove', onMouseMove);
    removeEventListener('mouseleave', onMouseUp);
    removeEventListener('touchmove', onMouseMove, true);
    removeEventListener('touchend', onMouseUp);
  }

  function calculateNewSizeFromDirection({ clientX, clientY }) {
    let newWidth = original.width;
    let newHeight = original.height;

    console.log({ original });

    const extraHeight = lockAspectRatioExtraHeight || 0;
    const extraWidth = lockAspectRatioExtraWidth || 0;
    if (hasDirection('right', direction)) {
      newWidth = original.width + ((clientX - original.x) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newHeight = (newWidth - extraWidth) / ratio + extraHeight;
      }
    }
    if (hasDirection('left', direction)) {
      newWidth = original.width - ((clientX - original.x) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newHeight = (newWidth - extraWidth) / ratio + extraHeight;
      }
    }
    if (hasDirection('bottom', direction)) {
      newHeight = original.height + ((clientY - original.y) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newWidth = (newHeight - extraHeight) * ratio + extraWidth;
      }
    }
    if (hasDirection('top', direction)) {
      newHeight = original.height - ((clientY - original.y) * resizeRatio) / scale;
      if (lockAspectRatio) {
        newWidth = (newHeight - extraHeight) * ratio + extraWidth;
      }
    }
    return { newWidth, newHeight };
  }

  function calculateNewMaxFromBoundary(maxWidth?: number, maxHeight?: number) {
    const widthByDirection = boundsByDirection && hasDirection('left', direction);
    const heightByDirection = boundsByDirection && hasDirection('top', direction);
    let boundWidth;
    let boundHeight;
    if (bounds === 'parent') {
      const parent = containerEl.parentNode as HTMLElement;
      if (parent) {
        boundWidth = widthByDirection
          ? resizableRight - parentLeft
          : parent.offsetWidth + (parentLeft - resizableLeft);
        boundHeight = heightByDirection
          ? resizableBottom - parentTop
          : parent.offsetHeight + (parentTop - resizableTop);
      }
    } else if (bounds === 'window') {
      boundWidth = widthByDirection ? resizableRight : window.innerWidth - resizableLeft;
      boundHeight = heightByDirection ? resizableBottom : window.innerHeight - resizableTop;
    } else if (typeof bounds === 'string') {
      // It's a selector
      const boundEl = document.querySelector<HTMLElement>(bounds);

      if (boundEl === null)
        throw new Error(
          "The selector supplied for `bounds` couldn't be found. Please ensure it exists."
        );

      boundWidth = widthByDirection
        ? resizableRight - targetLeft
        : boundEl.offsetWidth + (targetLeft - resizableLeft);
      boundHeight = heightByDirection
        ? resizableBottom - targetTop
        : boundEl.offsetHeight + (targetTop - resizableTop);
    }

    if (boundWidth && Number.isFinite(boundWidth)) {
      maxWidth = maxWidth && maxWidth < boundWidth ? maxWidth : boundWidth;
    }
    if (boundHeight && Number.isFinite(boundHeight)) {
      maxHeight = maxHeight && maxHeight < boundHeight ? maxHeight : boundHeight;
    }
    return { maxWidth, maxHeight };
  }

  function calculateNewSizeFromAspectRatio(
    newWidth: number,
    newHeight: number,
    max: { width?: number; height?: number },
    min: { width?: number; height?: number }
  ) {
    const computedMinWidth = typeof min.width === 'undefined' ? 10 : min.width;
    const computedMaxWidth =
      typeof max.width === 'undefined' || max.width < 0 ? newWidth : max.width;
    const computedMinHeight = typeof min.height === 'undefined' ? 10 : min.height;
    const computedMaxHeight =
      typeof max.height === 'undefined' || max.height < 0 ? newHeight : max.height;
    const extraHeight = lockAspectRatioExtraHeight || 0;
    const extraWidth = lockAspectRatioExtraWidth || 0;

    if (lockAspectRatio) {
      const extraMinWidth = (computedMinHeight - extraHeight) * ratio + extraWidth;
      const extraMaxWidth = (computedMaxHeight - extraHeight) * ratio + extraWidth;
      const extraMinHeight = (computedMinWidth - extraWidth) / ratio + extraHeight;
      const extraMaxHeight = (computedMaxWidth - extraWidth) / ratio + extraHeight;
      const lockedMinWidth = Math.max(computedMinWidth, extraMinWidth);
      const lockedMaxWidth = Math.min(computedMaxWidth, extraMaxWidth);
      const lockedMinHeight = Math.max(computedMinHeight, extraMinHeight);
      const lockedMaxHeight = Math.min(computedMaxHeight, extraMaxHeight);
      newWidth = clamp(newWidth, lockedMinWidth, lockedMaxWidth);
      newHeight = clamp(newHeight, lockedMinHeight, lockedMaxHeight);
    } else {
      newWidth = clamp(newWidth, computedMinWidth, computedMaxWidth);
      newHeight = clamp(newHeight, computedMinHeight, computedMaxHeight);
    }
    return { newWidth, newHeight };
  }

  function createSizeForCssProperty(
    newSize: number | string,
    kind: 'width' | 'height'
  ): number | string {
    const propSize = propsSize?.[kind];
    return sizeState[kind] === 'auto' &&
      original[kind] === newSize &&
      (typeof propSize === 'undefined' || propSize === 'auto')
      ? 'auto'
      : newSize;
  }

  function setBoundingClientRect() {
    // For parent boundary
    if (bounds === 'parent') {
      const parent = containerEl.parentNode as HTMLElement;
      if (parent) {
        const parentRect = parent.getBoundingClientRect();
        parentLeft = parentRect.left;
        parentTop = parentRect.top;

        console.log(parentRect);
      }
    }

    // For target(html element) boundary
    if (bounds !== 'parent' && typeof bounds === 'string') {
      const boundEl = document.querySelector<HTMLElement>(bounds);

      if (boundEl === null)
        throw new Error('Selector supplied for `bounds` can not be found. Make sure it exists');

      const targetRect = boundEl.getBoundingClientRect();

      targetLeft = targetRect.left;
      targetTop = targetRect.top;
    }

    // For boundary
    const { left, top, right, bottom } = containerEl.getBoundingClientRect();
    resizableLeft = left;
    resizableRight = right;
    resizableTop = top;
    resizableBottom = bottom;
  }

  function ensureMinMaxDimensions() {
    if (typeof maxWidth !== 'undefined') containerEl.style.maxWidth = maxWidth.toString();
    if (typeof maxHeight !== 'undefined') containerEl.style.maxHeight = maxHeight.toString();
  }

  function sizeStyle() {
    const getSize = (key: 'width' | 'height'): string => {
      if (typeof sizeState[key] === 'undefined' || sizeState[key] === 'auto') {
        return 'auto';
      }

      if (propsSize?.[key] && endsWith(propsSize[key].toString(), '%')) {
        if (endsWith(sizeState[key].toString(), '%')) {
          return sizeState[key].toString();
        }
        const parentSize = getParentSize(containerEl);
        const value = +sizeState[key].toString().replace('px', '');
        const percent = (value / parentSize[key]) * 100;
        return `${percent}%`;
      }
      return getStringSize(sizeState[key]);
    };
    const width =
      size && typeof size.width !== 'undefined' && !isResizing
        ? getStringSize(size.width)
        : getSize('width');
    const height =
      size && typeof size.height !== 'undefined' && !isResizing
        ? getStringSize(size.height)
        : getSize('height');

    return { width, height };
  }

  function onResizeStart(
    e: CustomEvent<{
      direction: SvelteResizableDirection;
      clientX: number;
      clientY: number;
      cursor: string;
    }>
  ) {
    dispatch('resize-start', { direction });

    if (size) {
      if (typeof size.height !== 'undefined' && size.height !== sizeState.height) {
        sizeState.height = size.height;
      }

      if (typeof size.width !== 'undefined' && size.width !== sizeState.width) {
        sizeState.width = size.width;
      }
    }

    const localSize = getSize(containerEl);

    ratio =
      typeof lockAspectRatio === 'number' ? lockAspectRatio : localSize.width / localSize.height;

    let localFlexBasis: string;
    const computedStyle = getComputedStyle(containerEl);
    if (computedStyle.flexBasis !== 'auto') {
      const parent = containerEl.parentNode as HTMLElement;
      if (parent) {
        const dir = getComputedStyle(parent).flexDirection;
        flexDir = dir.startsWith('row') ? 'row' : 'column';
        localFlexBasis = computedStyle.flexBasis;
      }
    }

    // For boundary
    setBoundingClientRect();
    bindEvents();

    original = {
      x: e.detail.clientX,
      y: e.detail.clientY,
      width: localSize.width,
      height: localSize.height,
    };
    isResizing = true;
    backdropCursor = e.detail.cursor;
    direction = e.detail.direction;
    flexBasis = localFlexBasis;

    Promise.resolve().then(ensureMinMaxDimensions);
    containerEl.style.flexBasis = flexBasis;
  }

  function onMouseMove(e: MouseEvent | TouchEvent) {
    if (!isResizing) return;

    const dimensions = isTouchEvent(e) ? e.touches[0] : e;

    const parentSize = getParentSize(containerEl);

    const max = calculateNewMax(
      parentSize,
      window.innerWidth,
      window.innerHeight,
      maxWidth,
      maxHeight,
      minWidth,
      minHeight
    );

    ({ maxWidth, maxHeight, minWidth, minHeight } = max);

    // Calculate new size
    let { newHeight, newWidth }: NewSize = calculateNewSizeFromDirection(dimensions);
    // console.log({ newHeight, newWidth });

    // Calculate max size from boundary settings
    const boundaryMax = calculateNewMaxFromBoundary(maxWidth, maxHeight);

    // Calculate new size from aspect ratio
    const newSize = calculateNewSizeFromAspectRatio(
      newWidth,
      newHeight,
      { width: boundaryMax.maxWidth, height: boundaryMax.maxHeight },
      { width: minWidth, height: minHeight }
    );

    ({ newWidth, newHeight } = newSize);

    if (grid) {
      const newGridWidth = snap(newWidth, grid[0]);
      const newGridHeight = snap(newHeight, grid[1]);
      const gap = snapGap || 0;
      newWidth = gap === 0 || Math.abs(newGridWidth - newWidth) <= gap ? newGridWidth : newWidth;
      newHeight =
        gap === 0 || Math.abs(newGridHeight - newHeight) <= gap ? newGridHeight : newHeight;
    }

    if (propsSnap?.x) {
      newWidth = findClosestSnap(newWidth, propsSnap.x, snapGap);
    }
    if (propsSnap?.y) {
      newHeight = findClosestSnap(newHeight, propsSnap.y, snapGap);
    }

    const delta = {
      width: newWidth - original.width,
      height: newHeight - original.height,
    };

    if (sizeState.width && typeof sizeState.width === 'string') {
      if (endsWith(sizeState.width, '%')) {
        const percent = (newWidth / parentSize.width) * 100;
        newWidth = `${percent}%`;
      } else if (endsWith(sizeState.width, 'vw')) {
        const vw = (newWidth / window.innerWidth) * 100;
        newWidth = `${vw}vw`;
      } else if (endsWith(sizeState.width, 'vh')) {
        const vh = (newWidth / window.innerHeight) * 100;
        newWidth = `${vh}vh`;
      }
    }

    if (sizeState.height && typeof sizeState.height === 'string') {
      if (endsWith(sizeState.height, '%')) {
        const percent = (newHeight / parentSize.height) * 100;
        newHeight = `${percent}%`;
      } else if (endsWith(sizeState.height, 'vw')) {
        const vw = (newHeight / window.innerWidth) * 100;
        newHeight = `${vw}vw`;
      } else if (endsWith(sizeState.height, 'vh')) {
        const vh = (newHeight / window.innerHeight) * 100;
        newHeight = `${vh}vh`;
      }
    }

    sizeState.width = createSizeForCssProperty(newWidth, 'width');
    sizeState.height = createSizeForCssProperty(newHeight, 'height');

    if (flexDir === 'row') {
      flexBasis = sizeState.width.toString();
    } else if (flexDir === 'column') {
      flexBasis = sizeState.height.toString();
    }

    dispatch('resize', { direction, delta });

    const localStyleSize = sizeStyle();

    Promise.resolve().then(() => {
      containerEl.style.width = localStyleSize.width;
      containerEl.style.height = localStyleSize.height;
    });
  }

  function onMouseUp(e: MouseEvent | TouchEvent) {
    if (!isResizing) return;

    isResizing = false;

    const localSize = getSize(containerEl);

    const delta = {
      width: localSize.width - original.width,
      height: localSize.height - original.height,
    };

    dispatch('resize-stop', { delta, direction });

    if (size) {
      sizeState = size;
    }

    unbindEvents();

    backdropCursor = 'auto';

    // Set user-select back to what it was
    document.body.style.userSelect = userSelect;
  }
</script>

<div class="svelte-resizable-wrapper {handleWrapperClass}" bind:this={containerEl}>
  {#if isResizing}
    <div class="backdrop" style="cursor: {backdropCursor};" />
  {/if}
  <slot />
  <div class="svelte-resizers-container">
    <!-- top -->
    {#if enable.top}
      <Resizer direction="top" className={handleClasses.top} on:resize-start={onResizeStart}>
        <slot name="top-resizer" />
      </Resizer>
    {/if}

    <!-- top-right -->
    {#if enable.topRight}
      <Resizer
        direction="topRight"
        className={handleClasses.topRight}
        on:resize-start={onResizeStart}
      >
        <slot name="topRight-resizer" />
      </Resizer>
    {/if}

    <!-- right -->
    {#if enable.right}
      <Resizer direction="right" className={handleClasses.right} on:resize-start={onResizeStart}>
        <slot name="right-resizer" />
      </Resizer>
    {/if}

    <!-- bottom right -->
    {#if enable.bottomRight}
      <Resizer
        direction="bottomRight"
        className={handleClasses.bottomRight}
        on:resize-start={onResizeStart}
      >
        <slot name="bottomRight-resizer" />
      </Resizer>
    {/if}

    <!-- bottom -->
    {#if enable.bottom}
      <Resizer direction="bottom" className={handleClasses.bottom} on:resize-start={onResizeStart}>
        <slot name="bottom-resizer" />
      </Resizer>
    {/if}

    <!-- bottom left -->
    {#if enable.bottomLeft}
      <Resizer
        direction="bottomLeft"
        className={handleClasses.bottomLeft}
        on:resize-start={onResizeStart}
      >
        <slot name="bottomLeft-resizer" />
      </Resizer>
    {/if}

    <!-- left -->
    {#if enable.left}
      <Resizer direction="left" className={handleClasses.left} on:resize-start={onResizeStart}>
        <slot name="left-resizer" />
      </Resizer>
    {/if}

    <!-- top left -->
    {#if enable.topLeft}
      <Resizer
        direction="topLeft"
        className={handleClasses.topLeft}
        on:resize-start={onResizeStart}
      >
        <slot name="topLeft-resizer" />
      </Resizer>
    {/if}
  </div>
</div>

<style>
  .svelte-resizable-wrapper {
    position: relative;

    box-sizing: border-box;
    flex-shrink: 0;
  }

  .backdrop {
    height: 100%;
    width: 100%;
    background-color: rgba(0, 0, 0, 0);
    cursor: auto;
    opacity: 0;
    position: fixed;
    z-index: 9999;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
  }
</style>
