import type { Properties as CSSProperties } from 'csstype';
import memoize from './memoize';

const DEFAULT_SIZE = {
  width: 'auto',
  height: 'auto',
};

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

export type SvelteResizableBoundsCoords = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type NewSize = {
  newHeight: number | string;
  newWidth: number | string;
};

type Enable = {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
  topRight?: boolean;
  bottomRight?: boolean;
  bottomLeft?: boolean;
  topLeft?: boolean;
};

type HandleClassName = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  topRight?: string;
  bottomRight?: string;
  bottomLeft?: string;
  topLeft?: string;
};

export type HandleComponent = {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  topRight?: string;
  bottomRight?: string;
  bottomLeft?: string;
  topLeft?: string;
};

type Size = {
  width: number | string;
  height: number | string;
};

export type SvelteResizableOptions = {
  enable?: Enable;
  grid?: [number, number];

  snap?: { x?: number[]; y?: number[] };
  snapGap?: number;

  bounds?: 'parent' | string | SvelteResizableBoundsCoords;

  size?: Size;

  minWidth?: string | number;
  minHeight?: string | number;
  maxWidth?: string | number;
  maxHeight?: string | number;
  lockAspectRatio?: boolean | number;
  lockAspectRatioExtraWidth?: number;
  lockAspectRatioExtraHeight?: number;

  handleClasses?: HandleClassName;
  handleWrapperClass?: string;

  defaultSize?: Size;
  scale?: number;
  resizeRatio?: number;
};

const styles: Record<SvelteResizableDirection, CSSProperties> = {
  top: {
    width: '100%',
    height: '10px',
    top: '-5px',
    left: '0px',
    cursor: 'row-resize',
  },
  right: {
    width: '10px',
    height: '100%',
    top: '0px',
    right: '-5px',
    cursor: 'col-resize',
  },
  bottom: {
    width: '100%',
    height: '10px',
    bottom: '-5px',
    left: '0px',
    cursor: 'row-resize',
  },
  left: {
    width: '10px',
    height: '100%',
    top: '0px',
    left: '-5px',
    cursor: 'col-resize',
  },
  topRight: {
    width: '20px',
    height: '20px',
    position: 'absolute',
    right: '-10px',
    top: '-10px',
    cursor: 'ne-resize',
  },
  bottomRight: {
    width: '20px',
    height: '20px',
    position: 'absolute',
    right: '-10px',
    bottom: '-10px',
    cursor: 'se-resize',
  },
  bottomLeft: {
    width: '20px',
    height: '20px',
    position: 'absolute',
    left: '-10px',
    bottom: '-10px',
    cursor: 'sw-resize',
  },
  topLeft: {
    width: '20px',
    height: '20px',
    position: 'absolute',
    left: '-10px',
    top: '-10px',
    cursor: 'nw-resize',
  },
};

export function resizable(node: HTMLElement, options: SvelteResizableOptions = {}) {
  let {
    enable = {
      top: true,
      right: true,
      bottom: true,
      left: true,
      topRight: true,
      bottomRight: true,
      bottomLeft: true,
      topLeft: true,
    },
    grid = [1, 1],
    lockAspectRatio = false,
    lockAspectRatioExtraWidth = 0,
    lockAspectRatioExtraHeight = 0,
    scale = 1,
    resizeRatio = 1,
    snapGap = 0,
    size,
    defaultSize,
  } = options;

  let ratio = 1;

  // For parent boundary
  let parentLeft = 0;
  let parentTop = 0;

  // For boundary
  let resizableLeft = 0;
  let resizableRight = 0;
  let resizableTop = 0;
  let resizableBottom = 0;

  let propsSize = size || defaultSize || DEFAULT_SIZE;

  // For target boundary
  let targetLeft = 0;
  let targetTop = 0;

  let isResizing = false;
  let direction: SvelteResizableDirection = 'right';

  // Local state
  const sizeState = {
    width: typeof propsSize.width === 'undefined' ? 'auto' : propsSize.width,
    height: typeof propsSize.height === 'undefined' ? 'auto' : propsSize.height,
  };

  let original = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };

  /** This element will cover the node while being dragged, and destroyed after it has been dragged */
  let backdropStyles = {
    height: '100%',
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0)',
    cursor: 'auto',
    opacity: 0,
    position: 'fixed',
    zIndex: 9999,
    top: '0',
    left: '0',
    bottom: '0',
    right: '0',
  };

  const computedStyle = getComputedStyle(node);
  let flexBasis = computedStyle.flexBasis !== 'auto' ? computedStyle.flexBasis : undefined;

  // bindEvents(onMouseUp)

  function onResizeStop() {
    if (!isResizing) return;

    const size = getSize(node);

    const delta = {
      width: size.width - original.width,
      height: size.height - original.height,
    };

    // Trigger the custom event
    fireResizeStopEvent(node, direction, delta);

    // If it is controlled,
    if (size) {
      sizeState.height = size.height;
      sizeState.width = size.width;
    }

    isResizing = false;
  }

  function onResize(e: MouseEvent | TouchEvent) {}
}

const clamp = memoize((n: number, min: number, max: number): number =>
  Math.max(Math.min(n, max), min)
);
const snap = memoize((n: number, size: number): number => Math.round(n / size) * size);
const hasDirection = memoize((dir: 'top' | 'right' | 'bottom' | 'left', target: string): boolean =>
  new RegExp(dir, 'i').test(target)
);

// INFO: In case of window is a Proxy and does not porxy Events correctly, use isTouchEvent & isMouseEvent to distinguish event type instead of `instanceof`.
const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return Boolean((event as TouchEvent).touches && (event as TouchEvent).touches.length);
};

const isMouseEvent = (event: MouseEvent | TouchEvent): event is MouseEvent => {
  return Boolean(
    ((event as MouseEvent).clientX || (event as MouseEvent).clientX === 0) &&
      ((event as MouseEvent).clientY || (event as MouseEvent).clientY === 0)
  );
};

const findClosestSnap = memoize((n: number, snapArray: number[], snapGap: number = 0): number => {
  const closestGapIndex = snapArray.reduce(
    (prev, curr, index) => (Math.abs(curr - n) < Math.abs(snapArray[prev] - n) ? index : prev),
    0
  );
  const gap = Math.abs(snapArray[closestGapIndex] - n);

  return snapGap === 0 || gap < snapGap ? snapArray[closestGapIndex] : n;
});

const endsWith = memoize(
  (str: string, searchStr: string): boolean =>
    str.substr(str.length - searchStr.length, searchStr.length) === searchStr
);

const getStringSize = memoize((n: number | string): string => {
  n = n.toString();
  if (n === 'auto') {
    return n;
  }
  if (endsWith(n, 'px')) {
    return n;
  }
  if (endsWith(n, '%')) {
    return n;
  }
  if (endsWith(n, 'vh')) {
    return n;
  }
  if (endsWith(n, 'vw')) {
    return n;
  }
  if (endsWith(n, 'vmax')) {
    return n;
  }
  if (endsWith(n, 'vmin')) {
    return n;
  }
  return `${n}px`;
});

const getPixelSize = (
  size: undefined | string | number,
  parentSize: number,
  innerWidth: number,
  innerHeight: number
) => {
  if (size && typeof size === 'string') {
    if (endsWith(size, 'px')) {
      return Number(size.replace('px', ''));
    }
    if (endsWith(size, '%')) {
      const ratio = Number(size.replace('%', '')) / 100;
      return parentSize * ratio;
    }
    if (endsWith(size, 'vw')) {
      const ratio = Number(size.replace('vw', '')) / 100;
      return innerWidth * ratio;
    }
    if (endsWith(size, 'vh')) {
      const ratio = Number(size.replace('vh', '')) / 100;
      return innerHeight * ratio;
    }
  }
  return size;
};

const calculateNewMax = memoize(
  (
    parentSize: { width: number; height: number },
    innerWidth: number,
    innerHeight: number,
    maxWidth?: string | number,
    maxHeight?: string | number,
    minWidth?: string | number,
    minHeight?: string | number
  ) => {
    maxWidth = getPixelSize(maxWidth, parentSize.width, innerWidth, innerHeight);
    maxHeight = getPixelSize(maxHeight, parentSize.height, innerWidth, innerHeight);
    minWidth = getPixelSize(minWidth, parentSize.width, innerWidth, innerHeight);
    minHeight = getPixelSize(minHeight, parentSize.height, innerWidth, innerHeight);
    return {
      maxWidth: typeof maxWidth === 'undefined' ? undefined : +maxWidth,
      maxHeight: typeof maxHeight === 'undefined' ? undefined : +maxHeight,
      minWidth: typeof minWidth === 'undefined' ? undefined : +minWidth,
      minHeight: typeof minHeight === 'undefined' ? undefined : +minHeight,
    };
  }
);

// HACK: Used to calculate % size.
const baseClassName = '__resizable_base__';

// HACK: Creates a dummy element to calculate stuff
function appendBase(node: HTMLElement) {
  const parent = node.parentNode;

  if (!parent) return null;

  const element = window.document.createElement('div');

  element.style.width = '100%';
  element.style.height = '100%';
  element.style.position = 'absolute';
  element.style.transform = 'scale(0, 0)';
  element.style.left = '0';
  element.style.flex = '0';

  element.classList.add(baseClassName);

  parent.appendChild(element);
  return element;
}

// Remove the appended base element
function removeBase(node: HTMLElement, base: HTMLDivElement) {
  const parent = node.parentNode;

  if (!parent) return;

  parent.removeChild(base);
}

function getSize(node: HTMLElement) {
  let width = 0;
  let height = 0;

  const { width: originalWidth, height: originalHeight } = node.getBoundingClientRect();

  // HACK: Set position `relative` to get parent size.
  //       This is because when re-resizable set `absolute`, I can not get base width correctly.
  const orgPosition = node.style.position;

  if (orgPosition === 'relative') {
    node.style.position = 'relative';
  }

  // INFO: Use original width or height if set auto.
  width = node.style.width !== 'auto' ? node.getBoundingClientRect().width : originalWidth;
  height = node.style.height !== 'auto' ? node.getBoundingClientRect().width : originalHeight;

  // Restore original position
  node.style.position = orgPosition;

  return { width, height };
}

function getParentSize(node: HTMLElement): { width: number; height: number } {
  const parentNode = node.parentNode as HTMLElement;

  // Doesn't have any parent, maybe the only element on the page
  if (!parentNode) return { width: window.innerWidth, height: window.innerHeight };

  // Create base
  const base = appendBase(node);
  if (!base) return { width: 0, height: 0 };

  // INFO: To calculate parent width with flex layout
  let wrapChanged = false;
  const wrap = parentNode.style.flexWrap;
  if (wrap !== 'wrap') {
    wrapChanged = true;
    parentNode.style.flexWrap = 'wrap';
  }
  // HACK: Use relative to get parent padding size
  base.style.position = 'relative';
  base.style.minWidth = '100%';

  const baseRect = base.getBoundingClientRect();

  const size = {
    width: baseRect.width,
    height: baseRect.height,
  };

  if (wrapChanged) {
    parentNode.style.flexWrap = wrap;
  }

  removeBase(node, base);

  return size;
}

// Applied while dragging
function appendBackdrop(node: HTMLElement, styles: CSSProperties) {
  const div = document.createElement('div');

  Object.assign(div.style, styles);

  return div;
}

function removeBackdrop(node: HTMLElement, backdropEl: HTMLDivElement) {
  const parent = node.parentNode;

  if (!parent) return;

  parent.removeChild(backdropEl);
}

//
// EVENTS
//

function bindEvents(onMouseUp: () => void, onMouseMove: () => void) {
  const listen = addEventListener;

  listen('mouseup', onMouseUp);
  listen('mousemove', onMouseMove);
  listen('mouseleave', onMouseUp);
  listen('touchmove', onMouseMove, {
    capture: true,
    passive: false,
  });
  listen('touchend', onMouseUp);
}

function unbindEvents(onMouseUp: () => void, onMouseMove: () => void) {
  const unlisten = removeEventListener;

  unlisten('mouseup', onMouseUp);
  unlisten('mousemove', onMouseMove);
  unlisten('mouseleave', onMouseUp);
  unlisten('touchmove', onMouseMove, {
    capture: true,
  });
  unlisten('touchend', onMouseUp);
}

function fireResizeStopEvent(
  node: HTMLElement,
  direction: string,
  delta: { width: number; height: number }
) {
  node.dispatchEvent(
    new CustomEvent('svelte-resizable:stop', {
      detail: { direction, delta },
    })
  );
}
