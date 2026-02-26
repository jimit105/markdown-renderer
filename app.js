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

  // Add copy-as-image buttons to successfully rendered diagrams
  addMermaidCopyButtons(preview);
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
  addCopyButtons(preview);
  renderMermaidDiagrams();
}

/**
 * Adds a copy button to each <pre> code block in the preview panel.
 * Skips mermaid blocks since those render as diagrams.
 * @param {HTMLElement} container - The preview panel element
 */
function addCopyButtons(container) {
  var preBlocks = container.querySelectorAll('pre');
  for (var i = 0; i < preBlocks.length; i++) {
    var pre = preBlocks[i];
    // Skip mermaid blocks
    if (pre.classList.contains('mermaid')) continue;

    pre.style.position = 'relative';
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/></svg>';
    btn.setAttribute('aria-label', 'Copy code to clipboard');
    btn.addEventListener('click', (function(preEl, btnEl) {
      return function() {
        var code = preEl.querySelector('code');
        var text = code ? code.textContent : preEl.textContent;
        navigator.clipboard.writeText(text).then(function() {
          btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8.5l3 3 7-7"/></svg>';
          setTimeout(function() { btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/></svg>'; }, 1500);
        }).catch(function() {
          btnEl.innerHTML = '✗';
          setTimeout(function() { btnEl.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/></svg>'; }, 1500);
        });
      };
    })(pre, btn));
    pre.appendChild(btn);
  }
}

/**
 * Adds a copy-as-image button to each rendered Mermaid diagram.
 * Converts the diagram to a PNG and copies it to the clipboard.
 * @param {HTMLElement} container - The preview panel element
 */
function addMermaidCopyButtons(container) {
  var copyIcon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 5.5V3a1.5 1.5 0 0 0-1.5-1.5H3A1.5 1.5 0 0 0 1.5 3v6A1.5 1.5 0 0 0 3 10.5h2.5"/></svg>';
  var checkIcon = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8.5l3 3 7-7"/></svg>';

  var diagrams = container.querySelectorAll('pre.mermaid');
  for (var i = 0; i < diagrams.length; i++) {
    var el = diagrams[i];
    var svg = el.querySelector('svg');
    if (!svg || el.querySelector('.copy-btn')) continue;

    el.style.position = 'relative';
    var btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.innerHTML = copyIcon;
    btn.setAttribute('aria-label', 'Copy diagram as image');
    btn.addEventListener('click', (function(svgEl, btnEl) {
      return function() {
        var clone = svgEl.cloneNode(true);
        var bbox = svgEl.getBoundingClientRect();
        clone.setAttribute('width', bbox.width);
        clone.setAttribute('height', bbox.height);
        clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        // Embed computed styles as a <style> block instead of inlining on every element
        var styles = '';
        var sheets = document.styleSheets;
        for (var s = 0; s < sheets.length; s++) {
          try {
            var rules = sheets[s].cssRules;
            if (rules) {
              for (var r = 0; r < rules.length; r++) {
                styles += rules[r].cssText + '\n';
              }
            }
          } catch (e) { /* skip cross-origin sheets */ }
        }
        var styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
        styleEl.textContent = styles;
        clone.insertBefore(styleEl, clone.firstChild);

        // Add white background (with !important to override dark mode styles)
        var bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bg.setAttribute('width', '100%');
        bg.setAttribute('height', '100%');
        bg.setAttribute('fill', '#ffffff');
        bg.setAttribute('style', 'fill: #ffffff !important;');
        clone.insertBefore(bg, clone.firstChild);

        var svgData = new XMLSerializer().serializeToString(clone);
        var img = new Image();
        img.onload = function() {
          var scale = 2;
          var canvas = document.createElement('canvas');
          canvas.width = bbox.width * scale;
          canvas.height = bbox.height * scale;
          var ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, bbox.width, bbox.height);
          ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
          canvas.toBlob(function(pngBlob) {
            if (!pngBlob) return;
            navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]).then(function() {
              btnEl.innerHTML = checkIcon;
              setTimeout(function() { btnEl.innerHTML = copyIcon; }, 1500);
            }).catch(function() {
              btnEl.innerHTML = '✗';
              setTimeout(function() { btnEl.innerHTML = copyIcon; }, 1500);
            });
          }, 'image/png');
        };
        img.onerror = function() {
          btnEl.innerHTML = '✗';
          setTimeout(function() { btnEl.innerHTML = copyIcon; }, 1500);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
      };
    })(svg, btn));
    el.appendChild(btn);
  }
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
  initSharing();
  initPdfDownload();
  loadFromHash();
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

/**
 * Loads markdown content from the URL hash if present.
 * Supports lz-string compressed format: #lz,<compressed>
 */
function loadFromHash() {
  var hash = window.location.hash.slice(1); // remove #
  if (!hash) return;

  var editor = document.getElementById('editor');
  if (!editor) return;

  try {
    if (hash.startsWith('lz,')) {
      var compressed = hash.slice(3);
      var text = LZString.decompressFromEncodedURIComponent(compressed);
      if (text) {
        editor.value = text;
        updatePreview();
      }
    }
  } catch (e) {
    // Silently ignore invalid hash data
  }
}

/**
 * Compresses the current editor content and generates a shareable URL.
 * Copies the URL to clipboard and shows a toast notification.
 */
function shareAsUrl() {
  var editor = document.getElementById('editor');
  var text = editor.value;

  if (!text || text.trim() === '') {
    showToast('Nothing to share — editor is empty');
    return;
  }

  var compressed = LZString.compressToEncodedURIComponent(text);
  var url = window.location.origin + window.location.pathname + '#lz,' + compressed;

  // Update the URL without reloading
  history.replaceState(null, '', '#lz,' + compressed);

  // Copy to clipboard
  navigator.clipboard.writeText(url).then(function() {
    showToast('Link copied to clipboard');
  }).catch(function() {
    // Fallback for older browsers
    showToast('URL updated — copy from address bar');
  });
}

/**
 * Sets up the Share button click handler.
 */
function initSharing() {
  var shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', shareAsUrl);
  }
}

/**
 * Downloads the rendered markdown preview as a PDF file.
 * Opens a new window with the preview content and print-optimized styles,
 * then triggers the browser's native print dialog (Save as PDF).
 */
function downloadPdf() {
  var preview = document.getElementById('preview');
  var editor = document.getElementById('editor');

  if (!editor.value || editor.value.trim() === '') {
    showToast('Nothing to export — editor is empty');
    return;
  }

  // Collect the current highlight.js theme CSS href
  var hljsTheme = document.getElementById('hljs-theme');
  var hljsHref = hljsTheme ? hljsTheme.href : '';

  // Print-optimized styles with proper page-break rules
  var printStyles =
    '@page { margin: 20mm 15mm; size: A4; }' +
    '*, *::before, *::after { box-sizing: border-box; }' +
    'body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #24292e; background: #fff; margin: 0; padding: 20px; }' +
    'h1, h2, h3, h4, h5, h6 { page-break-after: avoid; break-after: avoid; margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }' +
    'h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }' +
    'h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #eaecef; }' +
    'h3 { font-size: 1.25em; }' +
    'h1:first-child, h2:first-child, h3:first-child { margin-top: 0; }' +
    'p { margin-top: 0; margin-bottom: 16px; orphans: 3; widows: 3; }' +
    'a { color: #0366d6; text-decoration: none; }' +
    'strong { font-weight: 600; }' +
    'del { text-decoration: line-through; color: #6a737d; }' +
    'blockquote { margin: 0 0 16px 0; padding: 0 16px; color: #6a737d; border-left: 4px solid #dfe2e5; page-break-inside: avoid; break-inside: avoid; }' +
    'ul, ol { margin-top: 0; margin-bottom: 16px; padding-left: 2em; }' +
    'li { margin-bottom: 4px; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 16px; page-break-inside: auto; }' +
    'thead { display: table-header-group; }' +
    'tr { page-break-inside: avoid; break-inside: avoid; }' +
    'th, td { padding: 6px 13px; border: 1px solid #dfe2e5; }' +
    'th { font-weight: 600; background-color: #f6f8fa; }' +
    'tr:nth-child(2n) { background-color: #f6f8fa; }' +
    'code { padding: 0.2em 0.4em; font-size: 85%; background-color: rgba(27,31,35,0.05); border-radius: 3px; font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; }' +
    'pre { margin-bottom: 16px; padding: 16px; overflow: visible; white-space: pre-wrap; word-wrap: break-word; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 6px; border: 1px solid #e1e4e8; page-break-inside: avoid; break-inside: avoid; }' +
    'pre code { display: block; padding: 0; margin: 0; background: transparent; border: 0; border-radius: 0; font-size: 100%; white-space: pre-wrap; word-wrap: break-word; }' +
    'pre code.hljs { padding: 0; background: transparent; }' +
    'img { max-width: 100%; height: auto; page-break-inside: avoid; break-inside: avoid; display: block; margin: 8px 0; }' +
    'hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }' +
    'svg { max-width: 100%; height: auto; }' +
    '.mermaid-error { color: #cb2431; background: #ffeef0; border: 1px solid #fdaeb7; border-radius: 6px; padding: 12px 16px; font-size: 0.875rem; }' +
    '.copy-btn { display: none !important; }' +
    'pre.mermaid { background: #fff; border: 1px solid #e1e4e8; text-align: center; padding: 16px; page-break-inside: avoid; break-inside: avoid; }';

  var contentHtml = preview.innerHTML;

  var fullHtml =
    '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
    '<title>Markdown Export</title>' +
    (hljsHref ? '<link rel="stylesheet" href="' + hljsHref + '">' : '') +
    '<style>' + printStyles + '</style>' +
    '</head><body>' + contentHtml + '</body></html>';

  var printWindow = window.open('', '_blank');
  if (!printWindow) {
    showToast('Pop-up blocked — please allow pop-ups for this site');
    return;
  }

  printWindow.document.open();
  printWindow.document.write(fullHtml);
  printWindow.document.close();

  // Wait for content to load before triggering print
  printWindow.onload = function() {
    setTimeout(function() {
      printWindow.print();
    }, 500);
  };

  showToast('Print dialog opening — choose "Save as PDF"');
}

/**
 * Sets up the PDF download button click handler.
 */
function initPdfDownload() {
  var pdfBtn = document.getElementById('pdf-btn');
  if (pdfBtn) {
    pdfBtn.addEventListener('click', downloadPdf);
  }
}

/**
 * Shows a brief toast notification at the bottom of the screen.
 * @param {string} message - Text to display
 */
function showToast(message) {
  var toast = document.getElementById('share-toast');
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add('visible');

  setTimeout(function() {
    toast.classList.remove('visible');
  }, 2500);
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
  window.loadFromHash = loadFromHash;
  window.shareAsUrl = shareAsUrl;
  window.initSharing = initSharing;
  window.downloadPdf = downloadPdf;
  window.initPdfDownload = initPdfDownload;
}
