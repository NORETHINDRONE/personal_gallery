// ============================================================
// NORETHINDRONE Gallery — dynamic image gallery logic
// ============================================================
(function () {
  "use strict";

  // ---- SVG icons for size buttons (4/3/2 column grid patterns) ----
  var sizeIcons = {
    small:  '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="7.5" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="13" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="18.5" y="4" width="3.5" height="16" rx="1" fill="currentColor"/></svg>',
    medium: '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="9.5" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="17" y="4" width="5" height="16" rx="1" fill="currentColor"/></svg>',
    large:  '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="8.5" height="16" rx="1" fill="currentColor"/><rect x="13.5" y="4" width="8.5" height="16" rx="1" fill="currentColor"/></svg>'
  };

  // ---- current state ----
  var galleryData = [];
  var currentSize   = "medium";
  var lightboxIndex = 0;

  // ---- DOM refs ----
  var frame, lightbox, lightboxImg, sizeToggle;

  // ---- bootstrap ----
  document.addEventListener("DOMContentLoaded", function () {
    frame       = document.querySelector(".picture-frame");
    lightbox    = document.getElementById("lightbox");
    lightboxImg = document.getElementById("lightbox-img");
    sizeToggle  = document.getElementById("sizeToggle");

    buildSizeToggle();

    // load photo data from JSON
    fetch("../data/photos.json")
      .then(function (res) {
        if (!res.ok) throw new Error("Failed to load photos");
        return res.json();
      })
      .then(function (data) {
        galleryData = data;
        renderGrid();
        setupLightbox();
        setupKeyboard();
      })
      .catch(function (err) {
        console.error("Gallery load error:", err);
        if (frame) frame.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#999;font-family:MyCustomFont;letter-spacing:2px">Failed to load photos</div>';
      });
  });

  // ==================== SIZE TOGGLE ====================
  function buildSizeToggle() {
    if (!sizeToggle) return;
    [
      { key: "small",  icon: sizeIcons.small  },
      { key: "medium", icon: sizeIcons.medium },
      { key: "large",  icon: sizeIcons.large  }
    ].forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "size-btn" + (s.key === currentSize ? " active" : "");
      btn.setAttribute("data-size", s.key);
      btn.setAttribute("title", s.key === "small" ? "Small grid" : s.key === "medium" ? "Medium grid" : "Large grid");
      btn.innerHTML = s.icon;
      btn.addEventListener("click", function () { applySize(s.key); });
      sizeToggle.appendChild(btn);
    });
  }

  function applySize(key) {
    currentSize = key;
    sizeToggle.querySelectorAll(".size-btn").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-size") === key);
    });
    frame.classList.remove("size-small", "size-medium", "size-large");
    frame.classList.add("size-" + key);
  }

  // ==================== GRID RENDERING + LAZY LOAD ====================
  function renderGrid() {
    if (!frame) return;
    frame.innerHTML = "";
    frame.classList.add("size-" + currentSize);

    galleryData.forEach(function (img, idx) {
      var item = document.createElement("div");
      item.className = "grid-item loading";
      item.setAttribute("data-index", String(idx));
      item.style.cursor = "pointer";

      // skeleton
      var ratio = (img.h / img.w * 100).toFixed(2);
      var skeleton = document.createElement("div");
      skeleton.className = "skeleton";
      skeleton.style.paddingBottom = ratio + "%";

      // lazy image — use thumbnail for grid, fallback to original
      var thumbSrc = (img.thumb) ? ("../" + img.thumb) : ("../" + img.src);

      var imgEl = document.createElement("img");
      imgEl.alt = img.alt;
      imgEl.setAttribute("data-src", thumbSrc);
      imgEl.className = "lazy-img";

      // error fallback
      var err = document.createElement("div");
      err.className = "error-placeholder";
      err.innerHTML = '<svg viewBox="0 0 24 24" width="48" height="48" style="fill:#999"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><span style="display:block;margin-top:8px;color:#999">Load failed</span>';

      item.appendChild(skeleton);
      item.appendChild(imgEl);
      item.appendChild(err);

      item.addEventListener("click", function () { openLightbox(idx); });
      frame.appendChild(item);
    });

    setupLazyLoad();
  }

  function setupLazyLoad() {
    if (!("IntersectionObserver" in window)) {
      frame.querySelectorAll(".grid-item").forEach(function (item) { loadImage(item); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        loadImage(entry.target);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "200px 0px" });
    frame.querySelectorAll(".grid-item").forEach(function (item) { observer.observe(item); });
  }

  function loadImage(item) {
    var imgEl = item.querySelector(".lazy-img");
    var skeleton = item.querySelector(".skeleton");
    var err = item.querySelector(".error-placeholder");
    if (!imgEl || imgEl.src) return;
    var src = imgEl.getAttribute("data-src");
    if (!src) return;
    imgEl.src = src;
    imgEl.onload = function () {
      item.classList.remove("loading");
      imgEl.style.display = "block";
      skeleton.style.display = "none";
    };
    imgEl.onerror = function () {
      item.classList.remove("loading");
      item.classList.add("error");
      skeleton.style.display = "none";
      err.style.display = "flex";
    };
  }

  // ==================== LIGHTBOX ====================
  function setupLightbox() {
    if (!lightbox) return;
    var closeBtn = lightbox.querySelector(".lightbox-close");
    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    var prevBtn = lightbox.querySelector(".lightbox-prev");
    var nextBtn = lightbox.querySelector(".lightbox-next");
    if (prevBtn) prevBtn.addEventListener("click", function (e) { e.stopPropagation(); navigateLightbox(-1); });
    if (nextBtn) nextBtn.addEventListener("click", function (e) { e.stopPropagation(); navigateLightbox(1); });
  }

  function openLightbox(idx) {
    lightboxIndex = idx;
    showLightboxImage();
    lightbox.classList.add("visible");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.classList.remove("visible");
    document.body.style.overflow = "";
  }

  function navigateLightbox(dir) {
    lightboxIndex = (lightboxIndex + dir + galleryData.length) % galleryData.length;
    showLightboxImage();
  }

  function showLightboxImage() {
    var img = galleryData[lightboxIndex];
    // Lightbox always uses full-resolution original
    lightboxImg.src = "../" + img.src;
    lightboxImg.alt = img.alt;
    var counter = lightbox.querySelector(".lightbox-counter");
    if (counter) counter.textContent = (lightboxIndex + 1) + " / " + galleryData.length;
  }

  // ==================== KEYBOARD ====================
  function setupKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("visible")) return;
      if (e.key === "Escape") closeLightbox();
      else if (e.key === "ArrowLeft") navigateLightbox(-1);
      else if (e.key === "ArrowRight") navigateLightbox(1);
    });
  }

})();
