/* ============================================================
   Lunaris documentation — site behavior
   Vanilla JS: drawer nav, TOC scrollspy, code copy, search
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ----------------------------------------------------------
     1. Code blocks — wrap <pre> in a framed block with a
        language label + copy button
     ---------------------------------------------------------- */
  var LANG_LABELS = {
    php: "PHP",
    bash: "Bash",
    shell: "Shell",
    html: "HTML",
    markup: "HTML",
    css: "CSS",
    js: "JavaScript",
    json: "JSON",
    dotenv: ".env",
    env: ".env",
    yaml: "YAML",
    text: "Text",
    sql: "SQL",
  };

  function frameCodeBlocks() {
    var pres = document.querySelectorAll("pre");
    Array.prototype.forEach.call(pres, function (pre) {
      if (pre.closest && pre.closest(".install-block")) return;
      if (pre.parentNode && pre.parentNode.classList.contains("codeblock")) {
        return;
      }

      var lang = "text";
      var cls = (pre.className || "") + " " + ((pre.firstChild && pre.firstChild.className) || "");
      var match = cls.match(/language-([a-z0-9+-]+)/i);
      if (match) lang = match[1].toLowerCase();

      var wrapper = document.createElement("div");
      wrapper.className = "codeblock";

      var bar = document.createElement("div");
      bar.className = "codeblock__bar";

      var label = document.createElement("span");
      label.className = "codeblock__lang";
      label.textContent = LANG_LABELS[lang] || lang;

      var copy = document.createElement("button");
      copy.type = "button";
      copy.className = "codeblock__copy";
      copy.textContent = "Copy";

      bar.appendChild(label);
      bar.appendChild(copy);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(bar);
      wrapper.appendChild(pre);
    });
  }

  function bindCopyButtons() {
    document.addEventListener("click", function (e) {
      var btn = e.target.closest ? e.target.closest(".codeblock__copy") : null;
      if (!btn) return;

      var scope = btn.closest(".codeblock") || btn.closest(".install-block");
      var code = scope ? scope.querySelector("pre code, pre") : null;
      if (!code) return;

      var text = code.textContent || "";
      var done = function () {
        var old = btn.textContent;
        btn.textContent = "Copied!";
        btn.classList.add("is-done");
        setTimeout(function () {
          btn.textContent = old;
          btn.classList.remove("is-done");
        }, 1600);
      };

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });
  }

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      done();
    } catch (err) {
      /* ignore */
    }
    document.body.removeChild(ta);
  }

  /* ----------------------------------------------------------
     2. Mobile sidebar drawer
     ---------------------------------------------------------- */
  function initDrawer() {
    var sidebar = document.getElementById("docsSidebar");
    var overlay = document.getElementById("sidebarOverlay");
    var toggle = document.getElementById("sidebarToggle");
    if (!sidebar || !toggle) return;

    function open() {
      sidebar.classList.add("is-open");
      if (overlay) overlay.classList.add("is-open");
      document.body.classList.add("no-scroll");
      toggle.setAttribute("aria-expanded", "true");
    }

    function close() {
      sidebar.classList.remove("is-open");
      if (overlay) overlay.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      sidebar.classList.contains("is-open") ? close() : open();
    });

    if (overlay) overlay.addEventListener("click", close);

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && sidebar.classList.contains("is-open")) close();
    });

    sidebar.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest("a") : null;
      if (a && window.matchMedia("(max-width: 1023px)").matches) close();
    });

    window.addEventListener("resize", function () {
      if (window.matchMedia("(min-width: 1024px)").matches) close();
    });
  }

  /* ----------------------------------------------------------
     3. Table of contents + scrollspy
     ---------------------------------------------------------- */
  function slugify(text) {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-{2,}/g, "-");
  }

  function initToc() {
    var body = document.querySelector(".doc-body");
    var toc = document.getElementById("tocNav");
    var host = document.getElementById("toc");
    if (!body) return;

    var headings = body.querySelectorAll("h2, h3");
    if (!headings.length) {
      if (host) host.style.display = "none";
      return;
    }

    Array.prototype.forEach.call(headings, function (h) {
      if (!h.id) h.id = slugify(h.textContent.replace(/#$/, "").trim());

      var anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = "#" + h.id;
      anchor.textContent = "#";
      anchor.setAttribute("aria-hidden", "true");
      h.appendChild(anchor);
    });

    if (!toc) return;

    var links = [];
    Array.prototype.forEach.call(headings, function (h) {
      if (h.tagName === "H3" && links.length === 0) return;
      var a = document.createElement("a");
      a.href = "#" + h.id;
      a.textContent = h.firstChild.textContent || h.textContent;
      a.className = h.tagName === "H3" ? "level-3" : "level-2";
      a.dataset.target = h.id;
      toc.appendChild(a);
      links.push({ el: a, heading: h });
    });

    function spy() {
      var offset = 120;
      var current = links[0];
      for (var i = 0; i < links.length; i++) {
        var rect = links[i].heading.getBoundingClientRect();
        if (rect.top - offset <= 0) current = links[i];
      }
      links.forEach(function (l) {
        l.el.classList.toggle("is-active", l === current);
      });
    }

    spy();
    window.addEventListener("scroll", throttled(spy, 100), { passive: true });
  }

  function throttled(fn, wait) {
    var t = 0;
    return function () {
      var now = Date.now();
      if (now - t >= wait) {
        t = now;
        fn();
      }
    };
  }

  /* ----------------------------------------------------------
     4. Search (Ctrl/Cmd+K) over a static index
     ---------------------------------------------------------- */
  function initSearch() {
    var modal = document.getElementById("searchModal");
    if (!modal) return;

    var input = document.getElementById("searchInput");
    var results = document.getElementById("searchResults");
    var base = window.LUNARIS_BASE || "./";
    var index = window.LUNARIS_SEARCH_INDEX || [];
    var cursor = 0;
    var current = [];

    function open() {
      modal.classList.add("is-open");
      document.body.classList.add("no-scroll");
      input.value = "";
      render("");
      setTimeout(function () {
        input.focus();
      }, 30);
    }

    function close() {
      modal.classList.remove("is-open");
      document.body.classList.remove("no-scroll");
    }

    Array.prototype.forEach.call(
      document.querySelectorAll("[data-search-open]"),
      function (el) {
        el.addEventListener("click", open);
      }
    );

    modal.addEventListener("click", function (e) {
      if (e.target === modal) close();
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        modal.classList.contains("is-open") ? close() : open();
      } else if (e.key === "Escape" && modal.classList.contains("is-open")) {
        close();
      }
    });

    input.addEventListener("input", function () {
      render(input.value);
    });

    modal.addEventListener("keydown", function (e) {
      if (!current.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        cursor = (cursor + 1) % current.length;
        highlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        cursor = (cursor - 1 + current.length) % current.length;
        highlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        window.location.href = base + current[cursor].url;
      }
    });

    function render(q) {
      cursor = 0;
      results.innerHTML = "";
      q = q.trim().toLowerCase();

      if (!q) {
        current = index.slice(0, 8);
      } else {
        current = index
          .map(function (item) {
            var title = item.title.toLowerCase();
            var hay = (item.title + " " + item.text + " " + item.crumb).toLowerCase();
            var pos = hay.indexOf(q);
            if (pos === -1) return null;
            var score = title.indexOf(q) === 0 ? 0 : title.indexOf(q) !== -1 ? 1 : 2;
            return { item: item, score: score, pos: pos };
          })
          .filter(Boolean)
          .sort(function (a, b) {
            return a.score - b.score;
          })
          .map(function (r) {
            return r.item;
          })
          .slice(0, 12);
      }

      if (!current.length) {
        var empty = document.createElement("div");
        empty.className = "search-results__empty";
        empty.textContent = 'No results for "' + q + '"';
        results.appendChild(empty);
        return;
      }

      current.forEach(function (item, i) {
        var a = document.createElement("a");
        a.className = "search-result" + (i === 0 ? " is-cursor" : "");
        a.href = base + item.url;

        var crumb = document.createElement("span");
        crumb.className = "crumb";
        crumb.textContent = item.crumb;

        var title = document.createElement("span");
        title.className = "title";
        title.innerHTML = highlightText(item.title, q);

        a.appendChild(crumb);
        a.appendChild(title);

        if (item.text && q) {
          var snip = document.createElement("span");
          snip.className = "snippet";
          snip.innerHTML = highlightText(item.text, q);
          a.appendChild(snip);
        }

        results.appendChild(a);
      });
    }

    function highlight() {
      var nodes = results.querySelectorAll(".search-result");
      Array.prototype.forEach.call(nodes, function (n, i) {
        n.classList.toggle("is-cursor", i === cursor);
        if (i === cursor) n.scrollIntoView({ block: "nearest" });
      });
    }

    function escapeHtml(s) {
      return s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function highlightText(text, q) {
      var safe = escapeHtml(text);
      if (!q) return safe;
      var idx = safe.toLowerCase().indexOf(q);
      if (idx === -1) return safe;
      return (
        safe.slice(0, idx) +
        "<mark>" +
        safe.slice(idx, idx + q.length) +
        "</mark>" +
        safe.slice(idx + q.length)
      );
    }

    render("");
  }

  /* ----------------------------------------------------------
     Boot
     ---------------------------------------------------------- */
  function boot() {
    frameCodeBlocks();
    bindCopyButtons();
    initDrawer();
    initToc();
    initSearch();

    if (window.Prism) {
      try {
        window.Prism.highlightAll();
      } catch (err) {
        /* ignore */
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
