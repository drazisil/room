<script>
  import { draggable, resizable } from '../lib/actions.js';
  import { nextZ, pushUndo, updatePanel, removePanel } from '../stores/index.js';

  let {
    id,
    kind,
    x,
    y,
    w,
    h = null,
    title,
    extraClass = '',
    readonly = false,
    children,
    headerActions,
    overlay,
  } = $props();

  let el = $state(null);
  let zIndex = $state(1);
  let raised = $state(false);

  function bringToFront() {
    zIndex = nextZ();
    raised = true;
  }

  function handleMouseDown() {
    bringToFront();
  }

  // Snapshot before drag/resize for undo
  let dragSnapshot = null;
  let resizeSnapshot = null;

  function snapshotForUndo() {
    return {
      type: 'move',
      kind,
      id,
      x: parseInt(el.style.left) || 0,
      y: parseInt(el.style.top) || 0,
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  }

  function onDragStart() {
    bringToFront();
    dragSnapshot = snapshotForUndo();
  }

  function onDragEnd({ left, top }) {
    if (dragSnapshot) {
      pushUndo(dragSnapshot);
      dragSnapshot = null;
    }
    updatePanel(kind, id, { x: left, y: top });
  }

  function onResizeStart() {
    bringToFront();
    resizeSnapshot = snapshotForUndo();
  }

  function onResizeEnd({ w: newW, h: newH }) {
    if (resizeSnapshot) {
      pushUndo(resizeSnapshot);
      resizeSnapshot = null;
    }
    updatePanel(kind, id, { w: newW, h: newH });
  }

  function handleDelete(e) {
    e.stopPropagation();
    removePanel(kind, id);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions a11y_no_noninteractive_element_interactions -->
<!-- Panels are free-floating canvas widgets — no standard ARIA role fits. The aria-label
     on the generic div still provides screen reader context for the panel's content type. -->
<div
  bind:this={el}
  class="panel {extraClass}"
  class:raised
  {id}
  aria-label={title}
  style:left="{x}px"
  style:top="{y}px"
  style:width="{w}px"
  style:height={h ? `${h}px` : null}
  style:z-index={zIndex}
  onmousedown={readonly ? null : handleMouseDown}
>
  {#if readonly}
    <div class="panel-handle">
      {#if title}<span class="panel-title">{title}</span>{/if}
      {@render headerActions?.()}
    </div>
  {:else}
    <div
      class="panel-handle"
      use:draggable={{ getPanel: () => el, onStart: onDragStart, onEnd: onDragEnd }}
    >
      {#if title}<span class="panel-title">{title}</span>{/if}
      {@render headerActions?.()}
      <button onclick={handleDelete}>×</button>
    </div>
  {/if}

  <div class="panel-body">
    {@render children?.()}
  </div>

  {#if !readonly}
    <div
      class="resize-handle"
      use:resizable={{ getPanel: () => el, onStart: onResizeStart, onEnd: onResizeEnd }}
    ></div>
  {/if}

  {@render overlay?.()}
</div>
