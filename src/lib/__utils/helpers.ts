import memoize from './memoize';

export const clamp = memoize((n: number, min: number, max: number): number =>
  Math.max(Math.min(n, max), min)
);
export const snap = memoize((n: number, size: number): number => Math.round(n / size) * size);
export const hasDirection = memoize(
  (dir: 'top' | 'right' | 'bottom' | 'left', target: string): boolean =>
    new RegExp(dir, 'i').test(target)
);

// INFO: In case of window is a Proxy and does not porxy Events correctly, use isTouchEvent & isMouseEvent to distinguish event type instead of `instanceof`.
export const isTouchEvent = (event: MouseEvent | TouchEvent): event is TouchEvent => {
  return Boolean((event as TouchEvent).touches && (event as TouchEvent).touches.length);
};

export const isMouseEvent = (event: MouseEvent | TouchEvent): event is MouseEvent => {
  return Boolean(
    ((event as MouseEvent).clientX || (event as MouseEvent).clientX === 0) &&
      ((event as MouseEvent).clientY || (event as MouseEvent).clientY === 0)
  );
};

export const findClosestSnap = memoize(
  (n: number, snapArray: number[], snapGap: number = 0): number => {
    const closestGapIndex = snapArray.reduce(
      (prev, curr, index) => (Math.abs(curr - n) < Math.abs(snapArray[prev] - n) ? index : prev),
      0
    );
    const gap = Math.abs(snapArray[closestGapIndex] - n);

    return snapGap === 0 || gap < snapGap ? snapArray[closestGapIndex] : n;
  }
);

export const endsWith = memoize(
  (str: string, searchStr: string): boolean =>
    str.substr(str.length - searchStr.length, searchStr.length) === searchStr
);

export const getStringSize = memoize((n: number | string): string => {
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

export const getPixelSize = (
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

export const calculateNewMax = memoize(
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
export function appendBase(node: HTMLElement) {
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
export function removeBase(node: HTMLElement, base: HTMLDivElement) {
  const parent = node.parentNode;

  if (!parent) return;

  parent.removeChild(base);
}

export function getSize(node: HTMLElement) {
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

export function getParentSize(node: HTMLElement): { width: number; height: number } {
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

export const cursorForDirection = (
  direction:
    | 'top'
    | 'right'
    | 'bottom'
    | 'left'
    | 'topRight'
    | 'bottomRight'
    | 'bottomLeft'
    | 'topLeft'
) => {
  const obj: Record<typeof direction, string> = {
    top: 'row-resize',
    bottom: 'row-resize',
    left: 'col-resize',
    right: 'col-resize',
    topRight: 'ne-resize',
    bottomRight: 'se-resize',
    bottomLeft: 'sw-resize',
    topLeft: 'se-resize',
  };

  return obj[direction];
};
