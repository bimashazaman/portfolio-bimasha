/* ============================================================
   admin/app.js
   Purpose: Editor logic for the portfolio CMS admin panel.
   Vanilla JS, no framework, no CDN deps. Talks to the admin
   API via fetch (credentials: same-origin).

   Highlights:
     - Loads all 18 sections, renders a sidebar + editing pane.
     - RECURSIVE friendly JSON editor (string/number/bool/array/
       object) that reconstructs edited JSON on save.
     - Per-section "Raw JSON" toggle with live parse validation;
       saving is blocked while JSON is invalid.
     - Save -> POST /api/admin/section.php, History + Revert,
       Messages view, Logout.
     - Unsaved-changes guard when switching sections / leaving.
     - Any 401 returns the user to the login screen.
   ============================================================ */
(function () {
  'use strict';

  // ---- The 18 canonical section keys (order = sidebar order) ----
  var SECTION_KEYS = [
    'meta', 'nav', 'hero', 'ticker', 'stats', 'clients', 'about',
    'services', 'engagements', 'cases', 'workIndex', 'spotlight',
    'stack', 'journey', 'process', 'voices', 'faq', 'contact'
  ];

  // Friendly Title Case labels for keys (sidebar + field labels).
  var LABELS = {
    meta: 'Meta', nav: 'Navigation', hero: 'Hero', ticker: 'Ticker',
    stats: 'Stats', clients: 'Clients', about: 'About',
    services: 'Services', engagements: 'Engagements', cases: 'Case Studies',
    workIndex: 'Work Index', spotlight: 'Spotlight', stack: 'Stack',
    journey: 'Journey', process: 'Process', voices: 'Voices',
    faq: 'FAQ', contact: 'Contact'
  };

  // ---- App state ----
  var state = {
    data: {},          // { key: payload }
    revs: {},          // { key: rev }
    globalRev: null,
    activeKey: null,   // currently open section key
    activeView: null,  // 'messages' or null
    rawMode: false,    // raw JSON toggle for current section
    working: null,     // deep-cloned editable copy of active payload
    dirty: false       // unsaved changes flag
  };

  // ---- DOM refs ----
  var $ = function (id) { return document.getElementById(id); };
  var navSections = $('nav-sections');
  var pane = $('pane');
  var paneTitle = $('pane-title');
  var paneMeta = $('pane-meta');
  var topbarActions = $('topbar-actions');
  var toastHost = $('toast-host');
  var globalRevPill = $('global-rev');

  // ============================================================
  // Utilities
  // ============================================================

  function deepClone(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function isPlainObject(v) {
    return v !== null && typeof v === 'object' && !Array.isArray(v);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** Human label for an object key (camelCase / snake -> Title Case). */
  function humanizeKey(key) {
    if (LABELS[key]) return LABELS[key];
    if (/^\d+$/.test(key)) return '#' + (Number(key) + 1);
    return String(key)
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z\d])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  /** Build an "empty" clone of a template value: keep structure,
      blank out string leaves, zero numbers, false booleans.
      Used when adding a new array item modelled on existing ones. */
  function emptyLike(template) {
    if (Array.isArray(template)) {
      // New array starts empty (user adds items explicitly).
      return [];
    }
    if (isPlainObject(template)) {
      var out = {};
      Object.keys(template).forEach(function (k) {
        out[k] = emptyLike(template[k]);
      });
      return out;
    }
    if (typeof template === 'string') return '';
    if (typeof template === 'number') return 0;
    if (typeof template === 'boolean') return false;
    return null;
  }

  function toast(message, kind) {
    var el = document.createElement('div');
    el.className = 'toast toast-' + (kind || 'info');
    el.textContent = message;
    toastHost.appendChild(el);
    // force reflow then animate in
    void el.offsetWidth;
    el.classList.add('toast-in');
    setTimeout(function () {
      el.classList.remove('toast-in');
      el.classList.add('toast-out');
      setTimeout(function () { el.remove(); }, 280);
    }, kind === 'error' ? 5000 : 3000);
  }

  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T'));
    if (isNaN(d.getTime())) return String(s);
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  // ============================================================
  // Fetch wrapper — central 401 handling
  // ============================================================
  function api(url, opts) {
    opts = opts || {};
    opts.credentials = 'same-origin';
    opts.headers = opts.headers || {};
    if (opts.body && !opts.headers['Content-Type']) {
      opts.headers['Content-Type'] = 'application/json';
    }
    return fetch(url, opts).then(function (res) {
      if (res.status === 401) {
        // Session expired / not authed -> back to login.
        toast('Session expired. Returning to sign in…', 'error');
        setTimeout(function () { window.location.reload(); }, 900);
        var err = new Error('unauthorized');
        err.unauthorized = true;
        throw err;
      }
      return res.json()
        .catch(function () { return {}; })
        .then(function (data) { return { status: res.status, data: data }; });
    });
  }

  // ============================================================
  // Sidebar
  // ============================================================
  function renderSidebar() {
    navSections.innerHTML = '';
    SECTION_KEYS.forEach(function (key) {
      var btn = document.createElement('button');
      btn.className = 'nav-item nav-section';
      btn.setAttribute('data-key', key);
      btn.innerHTML =
        '<span class="nav-item-label">' + escapeHtml(LABELS[key] || key) + '</span>' +
        '<span class="nav-rev" data-rev-for="' + escapeHtml(key) + '"></span>';
      btn.addEventListener('click', function () { requestOpenSection(key); });
      navSections.appendChild(btn);
    });
    updateSidebarRevs();
  }

  function updateSidebarRevs() {
    SECTION_KEYS.forEach(function (key) {
      var el = navSections.querySelector('[data-rev-for="' + cssEsc(key) + '"]');
      if (el) {
        var r = state.revs[key];
        el.textContent = (r || r === 0) ? ('r' + r) : '';
      }
    });
  }

  function cssEsc(s) {
    // Section keys are simple identifiers; still guard for safety.
    if (window.CSS && CSS.escape) return CSS.escape(s);
    return String(s).replace(/[^a-zA-Z0-9_-]/g, '\\$&');
  }

  function highlightActiveNav() {
    var all = navSections.querySelectorAll('.nav-item');
    all.forEach(function (b) { b.classList.remove('is-active'); });
    var mb = $('nav-messages');
    if (mb) mb.classList.remove('is-active');

    if (state.activeView === 'messages' && mb) {
      mb.classList.add('is-active');
    } else if (state.activeKey) {
      var active = navSections.querySelector('.nav-section[data-key="' + cssEsc(state.activeKey) + '"]');
      if (active) active.classList.add('is-active');
    }
  }

  // ============================================================
  // Unsaved-changes guard
  // ============================================================
  function confirmDiscardIfDirty() {
    if (!state.dirty) return true;
    return window.confirm(
      'You have unsaved changes in "' +
      (LABELS[state.activeKey] || state.activeKey) +
      '". Discard them?'
    );
  }

  function markDirty() {
    if (!state.dirty) {
      state.dirty = true;
      refreshTopbarActions();
    }
  }

  function clearDirty() {
    if (state.dirty) {
      state.dirty = false;
      refreshTopbarActions();
    }
  }

  window.addEventListener('beforeunload', function (ev) {
    if (state.dirty) {
      ev.preventDefault();
      ev.returnValue = '';
      return '';
    }
  });

  // ============================================================
  // Navigation between sections / views
  // ============================================================
  function requestOpenSection(key) {
    if (key === state.activeKey && state.activeView === null) {
      closeSidebarMobile();
      return;
    }
    if (!confirmDiscardIfDirty()) return;
    openSection(key);
    closeSidebarMobile();
  }

  function openSection(key) {
    state.activeKey = key;
    state.activeView = null;
    state.rawMode = false;
    state.working = (state.data[key] === undefined) ? null : deepClone(state.data[key]);
    clearDirty();
    paneTitle.textContent = LABELS[key] || key;
    paneMeta.textContent = 'Section · rev ' + (state.revs[key] != null ? state.revs[key] : '—');
    highlightActiveNav();
    renderEditor();
    refreshTopbarActions();
    pane.scrollTop = 0;
  }

  function openMessages() {
    if (!confirmDiscardIfDirty()) return;
    state.activeView = 'messages';
    state.activeKey = null;
    state.rawMode = false;
    state.working = null;
    clearDirty();
    paneTitle.textContent = 'Messages';
    paneMeta.textContent = 'Contact submissions';
    highlightActiveNav();
    refreshTopbarActions();
    renderMessages();
    closeSidebarMobile();
    pane.scrollTop = 0;
  }

  // ============================================================
  // Topbar contextual actions
  // ============================================================
  function refreshTopbarActions() {
    topbarActions.innerHTML = '';
    if (state.activeView === 'messages') {
      var refresh = mkButton('Refresh', 'btn-ghost', renderMessages);
      topbarActions.appendChild(refresh);
      return;
    }
    if (!state.activeKey) return;

    // Raw JSON toggle
    var rawToggle = mkButton(state.rawMode ? 'Form view' : 'Raw JSON', 'btn-ghost', function () {
      toggleRaw();
    });
    rawToggle.id = 'raw-toggle';

    // History
    var history = mkButton('History', 'btn-ghost', function () { openHistory(); });

    // Save
    var save = mkButton('Save section', 'btn-accent', function () { saveSection(); });
    save.id = 'save-btn';
    save.disabled = !state.dirty;
    if (state.dirty) {
      var dot = document.createElement('span');
      dot.className = 'dirty-dot';
      save.insertBefore(dot, save.firstChild);
    }

    topbarActions.appendChild(rawToggle);
    topbarActions.appendChild(history);
    topbarActions.appendChild(save);
  }

  function mkButton(label, cls, onClick) {
    var b = document.createElement('button');
    b.className = 'btn ' + (cls || 'btn-ghost');
    b.textContent = label;
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  // ============================================================
  // RAW JSON mode
  // ============================================================
  function toggleRaw() {
    // Switching INTO raw: serialise current working value.
    // Switching OUT of raw: the textarea keeps working value in sync
    // via its input handler, so just re-render the form.
    state.rawMode = !state.rawMode;
    refreshTopbarActions();
    renderEditor();
  }

  // ============================================================
  // Editor rendering
  // ============================================================
  function renderEditor() {
    pane.innerHTML = '';
    if (state.activeKey == null) return;

    if (state.working === undefined || state.working === null) {
      // Section exists in key list but no payload yet.
      var empty = document.createElement('div');
      empty.className = 'empty-state';
      empty.innerHTML =
        '<p>This section has no content yet.</p>' +
        '<p class="empty-hint">Switch to <strong>Raw JSON</strong> to paste a starting structure, then save.</p>';
      pane.appendChild(empty);
    }

    if (state.rawMode) {
      renderRawEditor();
    } else {
      renderFormEditor();
    }
  }

  // ---------- RAW editor ----------
  function renderRawEditor() {
    var wrap = document.createElement('div');
    wrap.className = 'raw-wrap';

    var hint = document.createElement('div');
    hint.className = 'raw-hint';
    hint.textContent = 'Edit the full JSON for this section. It is validated live; saving is blocked while invalid.';

    var ta = document.createElement('textarea');
    ta.className = 'raw-textarea';
    ta.spellcheck = false;
    ta.setAttribute('aria-label', 'Raw JSON for ' + (LABELS[state.activeKey] || state.activeKey));
    try {
      ta.value = JSON.stringify(state.working === undefined ? null : state.working, null, 2);
    } catch (e) {
      ta.value = 'null';
    }

    var status = document.createElement('div');
    status.className = 'raw-status raw-ok';
    status.textContent = 'Valid JSON';

    function validate() {
      try {
        var parsed = JSON.parse(ta.value);
        state.working = parsed;
        status.textContent = 'Valid JSON';
        status.className = 'raw-status raw-ok';
        setSaveBlocked(false);
        return true;
      } catch (err) {
        status.textContent = 'Invalid JSON: ' + err.message;
        status.className = 'raw-status raw-bad';
        setSaveBlocked(true);
        return false;
      }
    }

    ta.addEventListener('input', function () {
      markDirty();
      validate();
    });

    wrap.appendChild(hint);
    wrap.appendChild(ta);
    wrap.appendChild(status);
    pane.appendChild(wrap);

    validate();
  }

  function setSaveBlocked(blocked) {
    var save = $('save-btn');
    if (!save) return;
    if (blocked) {
      save.disabled = true;
      save.setAttribute('data-blocked', '1');
    } else {
      save.removeAttribute('data-blocked');
      save.disabled = !state.dirty;
    }
  }

  // ---------- FORM editor (recursive) ----------
  function renderFormEditor() {
    if (state.working === undefined || state.working === null) return;

    var root = document.createElement('div');
    root.className = 'form-root';

    // The root node: render based on its type. We pass a "set" callback
    // that writes back into state.working at the root.
    var node = buildNode(state.working, function (newVal) {
      state.working = newVal;
      markDirty();
    }, LABELS[state.activeKey] || state.activeKey, 0);

    root.appendChild(node);
    pane.appendChild(root);
  }

  /**
   * Recursively build an editor node for `value`.
   * @param value    current value
   * @param setValue callback(newValue) to write the value back to parent
   * @param label    field label for this node
   * @param depth    nesting depth (for styling)
   * @returns HTMLElement
   */
  function buildNode(value, setValue, label, depth) {
    if (Array.isArray(value)) {
      return buildArrayNode(value, setValue, label, depth);
    }
    if (isPlainObject(value)) {
      return buildObjectNode(value, setValue, label, depth);
    }
    if (typeof value === 'boolean') {
      return buildBooleanField(value, setValue, label);
    }
    if (typeof value === 'number') {
      return buildNumberField(value, setValue, label);
    }
    if (value === null) {
      // Render null as an empty text field (treated as string going forward).
      return buildStringField('', function (v) { setValue(v); }, label);
    }
    // default: string
    return buildStringField(String(value), setValue, label);
  }

  // --- Scalar fields ---
  function buildStringField(value, setValue, label) {
    var field = document.createElement('div');
    field.className = 'field field-string';

    var lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;

    var multiline = value.length > 60 || value.indexOf('\n') !== -1;
    var input;
    if (multiline) {
      input = document.createElement('textarea');
      input.className = 'input textarea';
      input.rows = Math.min(12, Math.max(3, value.split('\n').length + 1));
    } else {
      input = document.createElement('input');
      input.type = 'text';
      input.className = 'input';
    }
    input.value = value;
    input.id = uid('f');
    lbl.setAttribute('for', input.id);
    input.addEventListener('input', function () {
      setValue(input.value);
      markDirty();
    });

    field.appendChild(lbl);
    field.appendChild(input);
    return field;
  }

  function buildNumberField(value, setValue, label) {
    var field = document.createElement('div');
    field.className = 'field field-number';

    var lbl = document.createElement('label');
    lbl.className = 'field-label';
    lbl.textContent = label;

    var input = document.createElement('input');
    input.type = 'number';
    input.className = 'input input-number';
    input.value = String(value);
    input.id = uid('f');
    lbl.setAttribute('for', input.id);
    input.addEventListener('input', function () {
      var n = input.value === '' ? 0 : Number(input.value);
      setValue(isNaN(n) ? 0 : n);
      markDirty();
    });

    field.appendChild(lbl);
    field.appendChild(input);
    return field;
  }

  function buildBooleanField(value, setValue, label) {
    var field = document.createElement('div');
    field.className = 'field field-bool';

    var wrap = document.createElement('label');
    wrap.className = 'checkbox';

    var input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = !!value;
    input.addEventListener('change', function () {
      setValue(input.checked);
      markDirty();
    });

    var span = document.createElement('span');
    span.className = 'checkbox-label';
    span.textContent = label;

    wrap.appendChild(input);
    wrap.appendChild(span);
    field.appendChild(wrap);
    return field;
  }

  // --- Object node ---
  function buildObjectNode(obj, setValue, label, depth) {
    var fs = document.createElement('fieldset');
    fs.className = 'node node-object depth-' + Math.min(depth, 6);

    if (depth > 0) {
      var legend = document.createElement('legend');
      legend.className = 'node-legend';
      legend.textContent = label;
      fs.appendChild(legend);
    }

    var keys = Object.keys(obj);
    keys.forEach(function (k) {
      // Per-child setValue mutates the object and bubbles up.
      var childSet = function (newChild) {
        obj[k] = newChild;
        setValue(obj);
      };
      var childNode = buildNode(obj[k], childSet, humanizeKey(k), depth + 1);
      fs.appendChild(childNode);
    });

    if (keys.length === 0) {
      var none = document.createElement('p');
      none.className = 'node-empty';
      none.textContent = 'No fields. Use Raw JSON to add structure.';
      fs.appendChild(none);
    }

    return fs;
  }

  // --- Array node ---
  function buildArrayNode(arr, setValue, label, depth) {
    var fs = document.createElement('fieldset');
    fs.className = 'node node-array depth-' + Math.min(depth, 6);

    var head = document.createElement('div');
    head.className = 'array-head';

    var legend = document.createElement('legend');
    legend.className = 'node-legend';
    legend.textContent = label + ' (' + arr.length + ')';
    head.appendChild(legend);

    var addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'btn btn-small btn-ghost array-add';
    addBtn.textContent = '+ Add item';
    addBtn.addEventListener('click', function () {
      // New item models the shape of the first existing item.
      var template = arr.length ? arr[0] : null;
      var fresh;
      if (template === null) {
        fresh = '';
      } else if (Array.isArray(template) || isPlainObject(template)) {
        fresh = emptyLike(template);
      } else if (typeof template === 'number') {
        fresh = 0;
      } else if (typeof template === 'boolean') {
        fresh = false;
      } else {
        fresh = '';
      }
      arr.push(fresh);
      setValue(arr);
      markDirty();
      rerenderArray(fs, arr, setValue, label, depth);
    });
    head.appendChild(addBtn);
    fs.appendChild(head);

    var list = document.createElement('div');
    list.className = 'array-list';
    fs.appendChild(list);

    renderArrayItems(list, arr, setValue, label, depth, fs);

    return fs;
  }

  function rerenderArray(fs, arr, setValue, label, depth) {
    var legend = fs.querySelector('.node-legend');
    if (legend) legend.textContent = label + ' (' + arr.length + ')';
    var list = fs.querySelector('.array-list');
    list.innerHTML = '';
    renderArrayItems(list, arr, setValue, label, depth, fs);
  }

  function renderArrayItems(list, arr, setValue, label, depth, fs) {
    if (arr.length === 0) {
      var empty = document.createElement('p');
      empty.className = 'node-empty';
      empty.textContent = 'No items yet. Use “+ Add item”.';
      list.appendChild(empty);
      return;
    }

    arr.forEach(function (item, index) {
      var card = document.createElement('div');
      card.className = 'array-item';

      var bar = document.createElement('div');
      bar.className = 'array-item-bar';

      var idxLabel = document.createElement('span');
      idxLabel.className = 'array-item-idx';
      idxLabel.textContent = '#' + (index + 1);
      bar.appendChild(idxLabel);

      var controls = document.createElement('div');
      controls.className = 'array-item-controls';

      var up = mkIconBtn('↑', 'Move up', index === 0, function () {
        swap(arr, index, index - 1);
        setValue(arr);
        markDirty();
        rerenderArray(fs, arr, setValue, label, depth);
      });
      var down = mkIconBtn('↓', 'Move down', index === arr.length - 1, function () {
        swap(arr, index, index + 1);
        setValue(arr);
        markDirty();
        rerenderArray(fs, arr, setValue, label, depth);
      });
      var del = mkIconBtn('✕', 'Remove item', false, function () {
        if (!window.confirm('Remove item #' + (index + 1) + '?')) return;
        arr.splice(index, 1);
        setValue(arr);
        markDirty();
        rerenderArray(fs, arr, setValue, label, depth);
      });
      del.classList.add('icon-danger');

      controls.appendChild(up);
      controls.appendChild(down);
      controls.appendChild(del);
      bar.appendChild(controls);
      card.appendChild(bar);

      var body = document.createElement('div');
      body.className = 'array-item-body';

      // Each item gets its own setter that writes back at this index.
      var itemSet = function (newVal) {
        arr[index] = newVal;
        setValue(arr);
      };
      var node = buildNode(item, itemSet, humanizeKey(String(index)), depth + 1);
      // For scalar array items, the child already has its own label
      // (“#n”) — but the card bar shows the index, so suppress dup label.
      body.appendChild(node);
      card.appendChild(body);

      list.appendChild(card);
    });
  }

  function mkIconBtn(glyph, title, disabled, onClick) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'icon-btn icon-btn-sm';
    b.textContent = glyph;
    b.title = title;
    b.setAttribute('aria-label', title);
    b.disabled = !!disabled;
    if (onClick) b.addEventListener('click', onClick);
    return b;
  }

  function swap(arr, i, j) {
    if (j < 0 || j >= arr.length) return;
    var t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }

  var _uid = 0;
  function uid(prefix) { _uid += 1; return (prefix || 'id') + '-' + _uid; }

  // ============================================================
  // Save
  // ============================================================
  function saveSection() {
    var save = $('save-btn');
    if (save && save.getAttribute('data-blocked') === '1') {
      toast('Fix the JSON errors before saving.', 'error');
      return;
    }
    if (!state.dirty) {
      toast('Nothing to save.', 'info');
      return;
    }

    // Defensive: ensure the working value serialises.
    var payloadStr;
    try {
      payloadStr = JSON.stringify(state.working === undefined ? null : state.working);
      JSON.parse(payloadStr);
    } catch (e) {
      toast('Cannot save: payload is not valid JSON.', 'error');
      return;
    }

    if (save) { save.disabled = true; save.textContent = 'Saving…'; }
    var key = state.activeKey;

    api('/api/admin/section.php', {
      method: 'POST',
      body: JSON.stringify({ key: key, payload: JSON.parse(payloadStr) })
    })
      .then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          state.data[key] = deepClone(state.working);
          state.revs[key] = r.data.rev;
          if (r.data.globalRev != null) {
            state.globalRev = r.data.globalRev;
          } else if (state.globalRev != null) {
            state.globalRev += 1;
          }
          clearDirty();
          updateSidebarRevs();
          updateGlobalRevPill();
          paneMeta.textContent = 'Section · rev ' + r.data.rev;
          refreshTopbarActions();
          toast('Saved “' + (LABELS[key] || key) + '” · rev ' + r.data.rev, 'success');
        } else if (r.status === 422) {
          var msg = (r.data && r.data.error) ? r.data.error : 'Validation failed.';
          toast('Could not save: ' + msg, 'error');
          restoreSaveBtn();
        } else {
          toast('Save failed (HTTP ' + r.status + ').', 'error');
          restoreSaveBtn();
        }
      })
      .catch(function (err) {
        if (err && err.unauthorized) return;
        toast('Network error while saving.', 'error');
        restoreSaveBtn();
      });
  }

  function restoreSaveBtn() {
    refreshTopbarActions();
  }

  // ============================================================
  // History / versions + revert (modal)
  // ============================================================
  function openHistory() {
    var key = state.activeKey;
    if (!key) return;

    var modal = buildModal('History · ' + (LABELS[key] || key));
    var bodyEl = modal.body;
    bodyEl.innerHTML = '<p class="modal-loading">Loading versions…</p>';
    document.body.appendChild(modal.overlay);

    api('/api/admin/versions.php?key=' + encodeURIComponent(key))
      .then(function (r) {
        if (r.status !== 200 || !r.data || !r.data.ok) {
          bodyEl.innerHTML = '<p class="modal-loading">Could not load history.</p>';
          return;
        }
        var versions = r.data.versions || [];
        if (versions.length === 0) {
          bodyEl.innerHTML = '<p class="modal-loading">No saved versions yet. Versions are created each time you save.</p>';
          return;
        }
        bodyEl.innerHTML = '';
        var list = document.createElement('ul');
        list.className = 'version-list';
        versions.forEach(function (v) {
          var li = document.createElement('li');
          li.className = 'version-item';

          var info = document.createElement('div');
          info.className = 'version-info';
          var when = document.createElement('div');
          when.className = 'version-when';
          when.textContent = fmtDate(v.created_at);
          var prev = document.createElement('div');
          prev.className = 'version-preview';
          prev.textContent = v.preview != null ? String(v.preview) : '';
          info.appendChild(when);
          info.appendChild(prev);

          var revertBtn = mkButton('Revert', 'btn-small btn-ghost', function () {
            revertVersion(key, v.id, modal);
          });

          li.appendChild(info);
          li.appendChild(revertBtn);
          list.appendChild(li);
        });
        bodyEl.appendChild(list);
      })
      .catch(function (err) {
        if (err && err.unauthorized) return;
        bodyEl.innerHTML = '<p class="modal-loading">Network error loading history.</p>';
      });
  }

  function revertVersion(key, versionId, modal) {
    if (!window.confirm('Revert “' + (LABELS[key] || key) + '” to this version? Your current content is snapshotted first.')) {
      return;
    }
    api('/api/admin/revert.php', {
      method: 'POST',
      body: JSON.stringify({ key: key, version_id: versionId })
    })
      .then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          closeModal(modal);
          toast('Reverted “' + (LABELS[key] || key) + '”. Reloading section…', 'success');
          // Re-fetch the section so the editor reflects reverted state.
          reloadSection(key, r.data.rev);
        } else {
          toast('Revert failed (HTTP ' + r.status + ').', 'error');
        }
      })
      .catch(function (err) {
        if (err && err.unauthorized) return;
        toast('Network error during revert.', 'error');
      });
  }

  function reloadSection(key, knownRev) {
    api('/api/admin/sections.php')
      .then(function (r) {
        if (r.status === 200 && r.data && r.data.ok) {
          state.data = r.data.data || {};
          state.revs = r.data.revs || {};
          updateSidebarRevs();
          updateGlobalRevPill();
          if (state.activeKey === key) {
            // discard local dirty edits (reverted server state wins)
            state.dirty = false;
            openSection(key);
          }
        }
      })
      .catch(function () {});
  }

  // ============================================================
  // Modal helper
  // ============================================================
  function buildModal(title) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    var modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', title);

    var head = document.createElement('div');
    head.className = 'modal-head';
    var h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = title;
    var close = document.createElement('button');
    close.className = 'icon-btn';
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close');
    head.appendChild(h);
    head.appendChild(close);

    var body = document.createElement('div');
    body.className = 'modal-body';

    modal.appendChild(head);
    modal.appendChild(body);
    overlay.appendChild(modal);

    var wrapper = { overlay: overlay, modal: modal, body: body };
    function onKey(ev) { if (ev.key === 'Escape') closeModal(wrapper); }
    close.addEventListener('click', function () { closeModal(wrapper); });
    overlay.addEventListener('click', function (ev) {
      if (ev.target === overlay) closeModal(wrapper);
    });
    document.addEventListener('keydown', onKey);
    wrapper._onKey = onKey;
    return wrapper;
  }

  function closeModal(wrapper) {
    if (!wrapper || !wrapper.overlay) return;
    document.removeEventListener('keydown', wrapper._onKey);
    wrapper.overlay.remove();
  }

  // ============================================================
  // Messages view
  // ============================================================
  function renderMessages() {
    pane.innerHTML = '<div class="loading">Loading messages…</div>';
    api('/api/admin/messages.php')
      .then(function (r) {
        if (r.status !== 200 || !r.data || !r.data.ok) {
          pane.innerHTML = '<div class="empty-state"><p>Could not load messages.</p></div>';
          return;
        }
        var msgs = (r.data.messages || r.data.data || []);
        var badge = $('messages-badge');
        if (badge) {
          if (msgs.length) { badge.textContent = String(msgs.length); badge.hidden = false; }
          else { badge.hidden = true; }
        }
        if (!msgs.length) {
          pane.innerHTML = '<div class="empty-state"><p>No messages yet.</p><p class="empty-hint">Contact form submissions will appear here.</p></div>';
          return;
        }
        pane.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.className = 'messages';
        msgs.forEach(function (m) {
          wrap.appendChild(buildMessageCard(m));
        });
        pane.appendChild(wrap);
      })
      .catch(function (err) {
        if (err && err.unauthorized) return;
        pane.innerHTML = '<div class="empty-state"><p>Network error loading messages.</p></div>';
      });
  }

  function buildMessageCard(m) {
    var card = document.createElement('article');
    card.className = 'msg-card';

    var head = document.createElement('div');
    head.className = 'msg-head';

    var who = document.createElement('div');
    who.className = 'msg-who';
    who.innerHTML =
      '<strong>' + escapeHtml(m.name || '(no name)') + '</strong>' +
      '<a class="msg-email" href="mailto:' + escapeHtml(m.email || '') + '">' +
      escapeHtml(m.email || '') + '</a>';

    var meta = document.createElement('div');
    meta.className = 'msg-meta';
    var stage = m.stage ? '<span class="msg-stage">' + escapeHtml(m.stage) + '</span>' : '';
    meta.innerHTML = stage + '<span class="msg-date">' + escapeHtml(fmtDate(m.created_at)) + '</span>';

    head.appendChild(who);
    head.appendChild(meta);

    var body = document.createElement('p');
    body.className = 'msg-body';
    body.textContent = m.message || '';

    card.appendChild(head);
    card.appendChild(body);

    if (m.ip) {
      var ip = document.createElement('div');
      ip.className = 'msg-ip';
      ip.textContent = 'IP ' + m.ip;
      card.appendChild(ip);
    }
    return card;
  }

  // ============================================================
  // Global rev pill
  // ============================================================
  function updateGlobalRevPill() {
    if (!globalRevPill) return;
    globalRevPill.textContent = 'rev ' + (state.globalRev != null ? state.globalRev : '—');
  }

  // ============================================================
  // Logout
  // ============================================================
  function logout() {
    if (!confirmDiscardIfDirty()) return;
    api('/api/auth/logout.php', { method: 'POST' })
      .then(function () { state.dirty = false; window.location.reload(); })
      .catch(function () { state.dirty = false; window.location.reload(); });
  }

  // ============================================================
  // Mobile sidebar
  // ============================================================
  function openSidebarMobile() {
    document.getElementById('sidebar').classList.add('is-open');
    var bd = $('backdrop'); if (bd) bd.hidden = false;
  }
  function closeSidebarMobile() {
    document.getElementById('sidebar').classList.remove('is-open');
    var bd = $('backdrop'); if (bd) bd.hidden = true;
  }

  // ============================================================
  // Boot
  // ============================================================
  function boot() {
    renderSidebar();

    // Wire static controls
    var logoutBtn = $('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    var navMsg = $('nav-messages');
    if (navMsg) navMsg.addEventListener('click', openMessages);
    var menuBtn = $('menu-btn');
    if (menuBtn) menuBtn.addEventListener('click', openSidebarMobile);
    var sidebarClose = $('sidebar-close');
    if (sidebarClose) sidebarClose.addEventListener('click', closeSidebarMobile);
    var backdrop = $('backdrop');
    if (backdrop) backdrop.addEventListener('click', closeSidebarMobile);

    // Keyboard: Cmd/Ctrl+S to save the current section.
    document.addEventListener('keydown', function (ev) {
      if ((ev.metaKey || ev.ctrlKey) && (ev.key === 's' || ev.key === 'S')) {
        if (state.activeKey) {
          ev.preventDefault();
          saveSection();
        }
      }
    });

    // Initial load of all sections.
    api('/api/admin/sections.php')
      .then(function (r) {
        var bootEl = $('boot-loading');
        if (r.status === 200 && r.data && r.data.ok) {
          state.data = r.data.data || {};
          state.revs = r.data.revs || {};
          state.globalRev = (r.data.globalRev != null) ? r.data.globalRev : null;
          updateSidebarRevs();
          updateGlobalRevPill();
          // Open the first section that has a payload (fallback: first key).
          var first = null;
          for (var i = 0; i < SECTION_KEYS.length; i++) {
            if (state.data[SECTION_KEYS[i]] !== undefined) { first = SECTION_KEYS[i]; break; }
          }
          openSection(first || SECTION_KEYS[0]);
        } else {
          if (bootEl) bootEl.textContent = 'Could not load content. Try refreshing.';
          toast('Failed to load sections (HTTP ' + r.status + ').', 'error');
        }
      })
      .catch(function (err) {
        if (err && err.unauthorized) return;
        var bootEl = $('boot-loading');
        if (bootEl) bootEl.textContent = 'Network error. Try refreshing.';
        toast('Network error loading sections.', 'error');
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
