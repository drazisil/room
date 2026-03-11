export function draggable(node, params) {
  let getPanel = params.getPanel;
  let onStart = params.onStart;
  let onEnd = params.onEnd;

  let startX = 0, startY = 0;
  let startLeft = 0, startTop = 0;
  let active = false;

  function onMouseDown(e) {
    if (
      e.target.closest('button') ||
      e.target.classList.contains('folder-name') ||
      e.target.classList.contains('folder-name-input')
    ) return;

    const panel = getPanel();
    if (!panel) return;

    if (onStart) onStart();

    active = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(panel.style.left) || 0;
    startTop = parseInt(panel.style.top) || 0;

    e.preventDefault();
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!active) return;
    const panel = getPanel();
    if (!panel) return;
    const left = startLeft + (e.clientX - startX);
    const top = startTop + (e.clientY - startY);
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  function onMouseUp(e) {
    if (!active) return;
    active = false;
    const panel = getPanel();
    if (panel && onEnd) {
      onEnd({
        left: parseInt(panel.style.left) || 0,
        top: parseInt(panel.style.top) || 0,
      });
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  node.addEventListener('mousedown', onMouseDown);

  return {
    update(newParams) {
      getPanel = newParams.getPanel;
      onStart = newParams.onStart;
      onEnd = newParams.onEnd;
    },
    destroy() {
      node.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}

export function resizable(node, params) {
  let getPanel = params.getPanel;
  let onStart = params.onStart;
  let onEnd = params.onEnd;
  let minW = params.minW ?? 120;
  let minH = params.minH ?? 80;

  let active = false;
  let startX = 0, startY = 0;
  let startW = 0, startH = 0;

  function onMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const panel = getPanel();
    if (!panel) return;

    if (onStart) onStart();

    active = true;
    startX = e.clientX;
    startY = e.clientY;
    startW = panel.offsetWidth;
    startH = panel.offsetHeight;

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function onMouseMove(e) {
    if (!active) return;
    const panel = getPanel();
    if (!panel) return;
    const w = Math.max(minW, startW + (e.clientX - startX));
    const h = Math.max(minH, startH + (e.clientY - startY));
    panel.style.width = w + 'px';
    panel.style.height = h + 'px';
  }

  function onMouseUp(e) {
    if (!active) return;
    active = false;
    const panel = getPanel();
    if (panel && onEnd) {
      onEnd({
        w: panel.offsetWidth,
        h: panel.offsetHeight,
      });
    }
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  }

  node.addEventListener('mousedown', onMouseDown);

  return {
    update(newParams) {
      getPanel = newParams.getPanel;
      onStart = newParams.onStart;
      onEnd = newParams.onEnd;
      minW = newParams.minW ?? 120;
      minH = newParams.minH ?? 80;
    },
    destroy() {
      node.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
