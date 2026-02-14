/**
 * Debounce utility function.
 * Returns a wrapper that delays invocation of `fn` by `delay` ms,
 * resetting the timer on each call.
 *
 * @param {Function} fn - The function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, delay);
  };
}

/**
 * Converts raw Markdown text to an HTML string using marked.js.
 * marked.js is configured with GFM enabled, so this handles
 * standard Markdown plus GFM tables, task lists, and strikethrough.
 *
 * @param {string} markdownText - Raw Markdown input
 * @returns {string} HTML string
 */
function renderMarkdown(markdownText) {
  return marked.parse(markdownText);
}

/**
 * Counter for generating unique Mermaid element IDs across re-renders.
 */
var mermaidCounter = 0;

/**
 * Scans the Preview Panel for `pre.mermaid` elements and renders them
 * as SVG diagrams using Mermaid.js.
 * Uses async/await since mermaid.run() returns a Promise.
 * On error, replaces each mermaid element's content with a styled error message.
 */
async function renderMermaidDiagrams() {
  var preview = document.getElementById('preview');
  var mermaidElements = preview.querySelectorAll('pre.mermaid');

  if (mermaidElements.length === 0) {
    return;
  }

  // Assign unique IDs to avoid Mermaid ID collisions across re-renders
  for (var i = 0; i < mermaidElements.length; i++) {
    mermaidElements[i].setAttribute('id', 'mermaid-' + (++mermaidCounter));
  }

  // Process each mermaid element individually so one failure doesn't block others
  for (var i = 0; i < mermaidElements.length; i++) {
    var el = mermaidElements[i];
    try {
      await mermaid.run({ nodes: [el] });
    } catch (error) {
      var errorMessage = error.message || 'Failed to render Mermaid diagram';
      el.innerHTML = '<div class="mermaid-error">Mermaid diagram error: '
        + escapeHtml(errorMessage) + '</div>';
    }
  }
}

/**
 * Reads the Editor textarea value, renders it to HTML,
 * and injects the result into the Preview Panel.
 * Shows a placeholder message when the Editor is empty.
 * After HTML injection, calls renderMermaidDiagrams() to process
 * any Mermaid code blocks into SVG diagrams.
 */
function updatePreview() {
  var editor = document.getElementById('editor');
  var preview = document.getElementById('preview');

  var markdownText = editor.value;

  if (!markdownText || markdownText.trim() === '') {
    preview.innerHTML = '<div class="placeholder">Start typing Markdown to see a live preview...</div>';
    return;
  }

  var html = renderMarkdown(markdownText);
  preview.innerHTML = html;
  renderMermaidDiagrams();
}

/**
 * Escapes HTML special characters to prevent XSS in code blocks.
 *
 * @param {string} html - Raw string that may contain HTML special characters
 * @returns {string} Escaped string safe for insertion into HTML
 */
function escapeHtml(html) {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Initializes the Markdown renderer:
 * - Configures marked.js with GFM and breaks enabled
 * - Adds a custom renderer for code blocks with syntax highlighting
 * - Attaches a debounced input event listener to the Editor textarea
 *
 * Custom code block renderer behavior:
 * - Language-specified blocks: highlighted via hljs.highlight()
 * - Mermaid blocks: rendered as <pre class="mermaid"> for later processing
 * - No language specified: plain <pre><code> without highlighting
 * - Unknown/unsupported languages: falls back to plain text (no crash)
 */
function initRenderer() {
  // Custom renderer for code blocks with syntax highlighting integration
  var renderer = {
    code: function (code, lang, escaped) {
      lang = (lang || '').trim();

      // Mermaid code blocks: render as <pre class="mermaid"> for later Mermaid.js processing
      // Mermaid needs the raw text content (browser will unescape innerHTML for textContent)
      if (lang === 'mermaid') {
        return '<pre class="mermaid">' + escapeHtml(code) + '</pre>';
      }

      // Code blocks with a language specified
      if (lang) {
        try {
          // Check if highlight.js supports this language
          if (hljs.getLanguage(lang)) {
            var highlighted = hljs.highlight(code, { language: lang });
            return '<pre><code class="hljs language-' + escapeHtml(lang) + '">'
              + highlighted.value + '</code></pre>';
          }
        } catch (e) {
          // Fall through to plain text on any highlight error
        }
        // Unknown/unsupported language: render as plain text with language class
        return '<pre><code class="language-' + escapeHtml(lang) + '">'
          + escapeHtml(code) + '</code></pre>';
      }

      // No language specified: plain <pre><code> without highlighting
      return '<pre><code>' + escapeHtml(code) + '</code></pre>';
    }
  };

  // Configure marked.js with GFM support, line break handling, and custom renderer
  marked.use({
    gfm: true,
    breaks: true,
    renderer: renderer
  });

  // Initialize Mermaid.js with startOnLoad disabled so we control rendering manually
  // suppressErrors prevents Mermaid from throwing on invalid syntax (we handle errors ourselves)
  mermaid.initialize({ startOnLoad: false, suppressErrors: true });

  // Get the editor textarea
  var editor = document.getElementById('editor');

  // Attach debounced input event listener (50ms delay)
  var debouncedUpdate = debounce(updatePreview, 50);
  editor.addEventListener('input', debouncedUpdate);

  // Show initial placeholder in the preview panel
  updatePreview();

  // Set up the resizable divider drag behavior
  initResizableDivider();
}

/**
 * Initializes the resizable divider drag behavior.
 * Supports both mouse and touch events for desktop and mobile.
 * Constrains so neither panel shrinks below 20% of viewport width.
 */
function initResizableDivider() {
  var divider = document.querySelector('.divider');
  var editorSection = document.querySelector('.editor-section');
  var previewSection = document.querySelector('.preview-section');

  if (!divider || !editorSection || !previewSection) {
    return;
  }

  var isDragging = false;

  /**
   * Returns true if the layout is currently in vertical (stacked) mode,
   * i.e., viewport width < 768px.
   */
  function isVerticalLayout() {
    return window.innerWidth < 768;
  }

  /**
   * Gets the relevant coordinate (clientX or clientY) from a mouse or touch event.
   * @param {MouseEvent|TouchEvent} e
   * @returns {number} The x or y position depending on layout orientation
   */
  function getPosition(e) {
    var touch = e.touches ? e.touches[0] : null;
    if (isVerticalLayout()) {
      return touch ? touch.clientY : e.clientY;
    }
    return touch ? touch.clientX : e.clientX;
  }

  /**
   * Handles the start of a drag operation (mousedown or touchstart).
   * @param {MouseEvent|TouchEvent} e
   */
  function onDragStart(e) {
    e.preventDefault();
    isDragging = true;
    document.body.classList.add('resizing');
  }

  /**
   * Handles drag movement (mousemove or touchmove).
   * Adjusts flex-basis of Editor and Preview Panel proportionally.
   * Constrains so neither panel shrinks below 20% of the viewport dimension.
   * @param {MouseEvent|TouchEvent} e
   */
  function onDragMove(e) {
    if (!isDragging) {
      return;
    }

    e.preventDefault();

    var position = getPosition(e);
    var vertical = isVerticalLayout();
    var totalSize = vertical ? window.innerHeight : window.innerWidth;
    var dividerSize = vertical ? divider.offsetHeight : divider.offsetWidth;

    // Calculate the percentage of the viewport for the editor
    var editorPercent = (position / totalSize) * 100;

    // Constrain: neither panel shrinks below 20% of viewport
    var minPercent = 20;
    var maxPercent = 100 - minPercent - ((dividerSize / totalSize) * 100);

    if (editorPercent < minPercent) {
      editorPercent = minPercent;
    }
    if (editorPercent > maxPercent) {
      editorPercent = maxPercent;
    }

    var previewPercent = 100 - editorPercent - ((dividerSize / totalSize) * 100);

    editorSection.style.flexBasis = editorPercent + '%';
    previewSection.style.flexBasis = previewPercent + '%';
  }

  /**
   * Handles the end of a drag operation (mouseup or touchend).
   */
  function onDragEnd() {
    if (!isDragging) {
      return;
    }
    isDragging = false;
    document.body.classList.remove('resizing');
  }

  // Mouse events
  divider.addEventListener('mousedown', onDragStart);
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);

  // Touch events for mobile support
  divider.addEventListener('touchstart', onDragStart, { passive: false });
  document.addEventListener('touchmove', onDragMove, { passive: false });
  document.addEventListener('touchend', onDragEnd);
}

// Initialize on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  initTheme();
  initRenderer();
});

/**
 * Initializes the theme based on saved preference or system preference.
 * Sets up the theme toggle button.
 */
function initTheme() {
  var themeToggle = document.getElementById('theme-toggle');
  var hljsTheme = document.getElementById('hljs-theme');

  // Check for saved preference, otherwise use system preference
  var savedTheme = localStorage.getItem('theme');
  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  var theme = savedTheme || (prefersDark ? 'dark' : 'light');

  applyTheme(theme);

  // Toggle button click handler
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      var currentTheme = document.documentElement.getAttribute('data-theme');
      var newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }

  /**
   * Applies the specified theme to the document.
   * @param {string} theme - 'light' or 'dark'
   */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Switch highlight.js theme
    if (hljsTheme) {
      if (theme === 'dark') {
        hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
      } else {
        hljsTheme.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
      }
    }

    // Update Mermaid theme and re-render diagrams
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: false,
        suppressErrors: true,
        theme: theme === 'dark' ? 'dark' : 'default'
      });
      // Re-render mermaid diagrams with new theme
      renderMermaidDiagrams();
    }
  }
}

// Export functions for testing
if (typeof window !== 'undefined') {
  window.debounce = debounce;
  window.escapeHtml = escapeHtml;
  window.renderMarkdown = renderMarkdown;
  window.renderMermaidDiagrams = renderMermaidDiagrams;
  window.updatePreview = updatePreview;
  window.initRenderer = initRenderer;
  window.initResizableDivider = initResizableDivider;
  window.initTheme = initTheme;
}
