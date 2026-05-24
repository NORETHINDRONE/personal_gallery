// ============================================================
// NORETHINDRONE Gallery — dynamic image gallery logic
// ============================================================
(function () {
  "use strict";

  // ---- image data (33 photos) ----
  var galleryData = [
    { src: "../images/1.jpg",  alt: "Photography work 1",  w: 2219, h: 1664 },
    { src: "../images/2.jpg",  alt: "Photography work 2",  w: 2735, h: 2051 },
    { src: "../images/3.jpg",  alt: "Photography work 3",  w: 2896, h: 3861 },
    { src: "../images/4.jpg",  alt: "Photography work 4",  w: 2520, h: 3360 },
    { src: "../images/5.jpg",  alt: "Photography work 5",  w: 3072, h: 3072 },
    { src: "../images/6.jpg",  alt: "Photography work 6",  w: 1280, h: 1920 },
    { src: "../images/7.jpg",  alt: "Photography work 7",  w: 2325, h: 3487 },
    { src: "../images/8.jpg",  alt: "Photography work 8",  w: 2875, h: 2156 },
    { src: "../images/9.jpg",  alt: "Photography work 9",  w: 2896, h: 3861 },
    { src: "../images/10.jpg", alt: "Photography work 10", w: 3498, h: 5247 },
    { src: "../images/11.jpg", alt: "Photography work 11", w: 2803, h: 4205 },
    { src: "../images/12.jpg", alt: "Photography work 12", w: 1564, h: 2346 },
    { src: "../images/13.jpg", alt: "Photography work 13", w: 3674, h: 2449 },
    { src: "../images/14.jpg", alt: "Photography work 14", w: 5741, h: 3827 },
    { src: "../images/15.jpg", alt: "Photography work 15", w: 3049, h: 4574 },
    { src: "../images/16.jpg", alt: "Photography work 16", w: 1765, h: 2649 },
    { src: "../images/17.jpg", alt: "Photography work 17", w: 2860, h: 4290 },
    { src: "../images/18.jpg", alt: "Photography work 18", w: 4883, h: 3255 },
    { src: "../images/19.jpg", alt: "Photography work 19", w: 3969, h: 5954 },
    { src: "../images/20.png", alt: "Photography work 20", w: 4032, h: 3024 },
    { src: "../images/21.jpg", alt: "Photography work 21", w: 6000, h: 4000 },
    { src: "../images/22.jpg", alt: "Photography work 22", w: 6000, h: 4000 },
    { src: "../images/23.jpg", alt: "Photography work 23", w: 5543, h: 3695 },
    { src: "../images/24.jpg", alt: "Photography work 24", w: 4000, h: 6000 },
    { src: "../images/25.jpg", alt: "Photography work 25", w: 2907, h: 3876 },
    { src: "../images/26.jpg", alt: "Photography work 26", w: 3072, h: 4096 },
    { src: "../images/27.jpg", alt: "Photography work 27", w: 2651, h: 1988 },
    { src: "../images/28.jpg", alt: "Photography work 28", w: 2598, h: 2598 },
    { src: "../images/29.jpg", alt: "Photography work 29", w: 3072, h: 4096 },
    { src: "../images/30.jpg", alt: "Photography work 30", w: 4080, h: 3060 },
    { src: "../images/31.jpg", alt: "Photography work 31", w: 6267, h: 4178 },
    { src: "../images/32.jpg", alt: "Photography work 32", w: 5457, h: 3638 },
    { src: "../images/33.jpg", alt: "Photography work 33", w: 3615, h: 5423 }
  ];

  // ---- SVG icons for size buttons (4/3/2 column grid patterns) ----
  var sizeIcons = {
    small:  '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="7.5" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="13" y="4" width="3.5" height="16" rx="1" fill="currentColor"/><rect x="18.5" y="4" width="3.5" height="16" rx="1" fill="currentColor"/></svg>',
    medium: '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="9.5" y="4" width="5" height="16" rx="1" fill="currentColor"/><rect x="17" y="4" width="5" height="16" rx="1" fill="currentColor"/></svg>',
    large:  '<svg viewBox="0 0 24 24" width="18" height="18"><rect x="2" y="4" width="8.5" height="16" rx="1" fill="currentColor"/><rect x="13.5" y="4" width="8.5" height="16" rx="1" fill="currentColor"/></svg>'
  };

  // ---- current state ----
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
    renderGrid();
    setupLightbox();
    setupKeyboard();
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
      btn.setAttribute("title", s.key === "small" ? "小图" : s.key === "medium" ? "中图" : "大图");
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

      // lazy image
      var imgEl = document.createElement("img");
      imgEl.alt = img.alt;
      imgEl.setAttribute("data-src", img.src);
      imgEl.className = "lazy-img";

      // error fallback
      var err = document.createElement("div");
      err.className = "error-placeholder";
      err.innerHTML = '<svg viewBox="0 0 24 24" width="48" height="48" style="fill:#999"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><span style="display:block;margin-top:8px;color:#999">加载失败</span>';

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
    lightboxImg.src = img.src;
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
