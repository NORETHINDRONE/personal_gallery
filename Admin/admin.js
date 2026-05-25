(function () {
  "use strict";

  // ============================================================
  // CONFIG - replace these after setting up OAuth App and Netlify
  // ============================================================
  var CONFIG = {
    clientId: "Ov23liqO8WNVms0ebTQn",
    redirectUri: window.location.origin + "/Admin/admin.html",
    oauthProxy: "https://YOUR_NETLIFY_SITE.netlify.app/api/oauth",
    owner: "NORETHINDRONE",
    repo: "personal_gallery",
    photosPath: "data/photos.json",
    imagesPath: "images/"
  };

  // ============================================================
  // STATE
  // ============================================================
  var accessToken = null;
  var photos = [];

  // ============================================================
  // DOM REFS
  // ============================================================
  var loginSection, adminSection, userAvatar, userName;
  var fileInput, fileLabel, fileNameEl, titleInput, uploadBtn, uploadStatus;
  var photoGrid, emptyState;

  // ============================================================
  // INIT
  // ============================================================
  document.addEventListener("DOMContentLoaded", function () {
    // Cache DOM
    loginSection   = document.getElementById("loginSection");
    adminSection   = document.getElementById("adminSection");
    userAvatar     = document.getElementById("userAvatar");
    userName       = document.getElementById("userName");
    fileInput      = document.getElementById("fileInput");
    fileLabel      = document.getElementById("fileLabel");
    fileNameEl     = document.getElementById("fileName");
    titleInput     = document.getElementById("titleInput");
    uploadBtn      = document.getElementById("uploadBtn");
    uploadStatus   = document.getElementById("uploadStatus");
    photoGrid      = document.getElementById("photoGrid");
    emptyState     = document.getElementById("emptyState");

    // Check for OAuth callback code
    var params = new URLSearchParams(window.location.search);
    var code = params.get("code");
    if (code) {
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      exchangeCode(code);
      return;
    }

    // Check for existing token
    var stored = sessionStorage.getItem("gh_token");
    if (stored) {
      accessToken = stored;
      showAdmin();
      return;
    }

    // Show login
    showLogin();
  });

  // ============================================================
  // OAUTH
  // ============================================================
  function showLogin() {
    if (loginSection) loginSection.style.display = "block";
    if (adminSection) adminSection.style.display = "none";
  }

  function showAdmin() {
    if (loginSection) loginSection.style.display = "none";
    if (adminSection) adminSection.style.display = "block";
    fetchUserInfo();
    loadPhotos();
  }

  window.doLogin = function () {
    var authUrl = "https://github.com/login/oauth/authorize" +
      "?client_id=" + CONFIG.clientId +
      "&redirect_uri=" + encodeURIComponent(CONFIG.redirectUri) +
      "&scope=public_repo";
    window.location.href = authUrl;
  };

  window.doLogout = function () {
    sessionStorage.removeItem("gh_token");
    accessToken = null;
    photos = [];
    showLogin();
  };

  function exchangeCode(code) {
    setStatus("Authenticating...", "");
    fetch(CONFIG.oauthProxy + "?code=" + encodeURIComponent(code))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.error) throw new Error(data.error);
        accessToken = data.access_token;
        sessionStorage.setItem("gh_token", accessToken);
        showAdmin();
      })
      .catch(function (e) {
        setStatus("Auth failed: " + e.message, "error");
        showLogin();
      });
  }

  function fetchUserInfo() {
    ghGet("/user").then(function (user) {
      if (userAvatar) userAvatar.src = user.avatar_url;
      if (userName) userName.textContent = user.login;
    }).catch(function () {});
  }

  // ============================================================
  // GITHUB API HELPERS
  // ============================================================
  function ghGet(endpoint) {
    return fetch("https://api.github.com" + endpoint, {
      headers: { Authorization: "Bearer " + accessToken, Accept: "application/vnd.github.v3+json" }
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || "API error " + r.status); });
      return r.json();
    });
  }

  function ghPut(endpoint, body) {
    return fetch("https://api.github.com" + endpoint, {
      method: "PUT",
      headers: { Authorization: "Bearer " + accessToken, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || "API error " + r.status); });
      return r.json();
    });
  }

  function ghDelete(endpoint, body) {
    return fetch("https://api.github.com" + endpoint, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + accessToken, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw new Error(e.message || "API error " + r.status); });
      return r.json();
    });
  }

  function repoPath(subPath) {
    return "/repos/" + CONFIG.owner + "/" + CONFIG.repo + "/contents/" + subPath;
  }

  // ============================================================
  // LOAD PHOTOS
  // ============================================================
  function loadPhotos() {
    ghGet(repoPath(CONFIG.photosPath)).then(function (data) {
      try {
        var content = JSON.parse(atob(data.content));
        photos = content;
        photos._sha = data.sha;
      } catch (e) {
        photos = [];
      }
      renderGrid();
    }).catch(function (e) {
      photos = [];
      renderGrid();
      console.error("Failed to load photos:", e.message);
    });
  }

  function renderGrid() {
    if (!photoGrid) return;
    photoGrid.innerHTML = "";

    if (!photos || photos.length === 0) {
      if (emptyState) { emptyState.style.display = "block"; emptyState.textContent = "No photos yet"; }
      return;
    }
    if (emptyState) emptyState.style.display = "none";

    photos.forEach(function (photo) {
      var card = document.createElement("div");
      card.className = "photo-card";

      var img = document.createElement("img");
      img.src = "https://raw.githubusercontent.com/" + CONFIG.owner + "/" + CONFIG.repo + "/main/" + photo.src;
      img.alt = photo.alt || "";

      var info = document.createElement("div");
      info.className = "card-info";

      var titleSpan = document.createElement("span");
      titleSpan.className = "card-title";
      titleSpan.textContent = photo.title || "Untitled";

      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "DELETE";
      delBtn.addEventListener("click", function () { deletePhoto(photo); });

      info.appendChild(titleSpan);
      info.appendChild(delBtn);
      card.appendChild(img);
      card.appendChild(info);
      photoGrid.appendChild(card);
    });
  }

  // ============================================================
  // FILE INPUT
  // ============================================================
  if (fileInput) {
    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length > 0) {
        fileNameEl.textContent = fileInput.files[0].name;
        fileLabel.textContent = "CHANGE";
        fileLabel.style.borderStyle = "solid";
      } else {
        fileNameEl.textContent = "";
        fileLabel.textContent = "SELECT IMAGE";
        fileLabel.style.borderStyle = "dashed";
      }
    });
  }

  // ============================================================
  // UPLOAD
  // ============================================================
  if (uploadBtn) {
    uploadBtn.addEventListener("click", function () {
      if (!fileInput.files || fileInput.files.length === 0) {
        setStatus("Please select an image", "error");
        return;
      }

      var file = fileInput.files[0];
      var title = titleInput.value.trim();
      uploadBtn.disabled = true;
      uploadBtn.textContent = "UPLOADING...";
      setStatus("Uploading...", "");

      readFileAsBase64(file).then(function (base64) {
        return uploadImage(file, base64, title);
      }).then(function () {
        setStatus("Uploaded successfully!", "success");
        fileInput.value = "";
        titleInput.value = "";
        fileNameEl.textContent = "";
        fileLabel.textContent = "SELECT IMAGE";
        fileLabel.style.borderStyle = "dashed";
      }).catch(function (e) {
        setStatus(e.message, "error");
      }).finally(function () {
        uploadBtn.disabled = false;
        uploadBtn.textContent = "UPLOAD";
      });
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = reader.result;
        // Remove "data:image/...;base64," prefix
        var commaIdx = result.indexOf(",");
        resolve(result.substring(commaIdx + 1));
      };
      reader.onerror = function () { reject(new Error("Failed to read file")); };
      reader.readAsDataURL(file);
    });
  }

  function uploadImage(file, base64, title) {
    var ext = file.name.split(".").pop().toLowerCase();
    if (["jpg", "jpeg"].indexOf(ext) !== -1) ext = "jpg";
    var filename = generateUUID() + "." + ext;
    var imagePath = CONFIG.imagesPath + filename;

    // Read image dimensions from the file object
    var w = 0, h = 0;
    return getImageDimensions(file).then(function (dims) {
      w = dims.w;
      h = dims.h;

      // Step 1: Upload image file
      return ghPut(repoPath(imagePath), {
        message: "Add photo: " + (title || filename),
        content: base64
      });
    }).then(function () {
      // Step 2: Update photos.json
      // Reload current SHA first (it may have changed)
      return ghGet(repoPath(CONFIG.photosPath));
    }).then(function (data) {
      var currentPhotos;
      try {
        currentPhotos = JSON.parse(atob(data.content));
      } catch (e) {
        currentPhotos = [];
      }
      var sha = data.sha;

      var alt = title || "Photography work";
      currentPhotos.push({
        id: generateUUID(),
        src: imagePath,
        title: title,
        alt: alt,
        w: w,
        h: h
      });

      var newContent = btoa(unescape(encodeURIComponent(JSON.stringify(currentPhotos, null, 2))));

      return ghPut(repoPath(CONFIG.photosPath), {
        message: "Update photos.json: add " + (title || filename),
        content: newContent,
        sha: sha
      });
    }).then(function () {
      // Refresh local state
      return loadPhotos();
    });
  }

  function getImageDimensions(file) {
    return new Promise(function (resolve) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        resolve({ w: img.naturalWidth, h: img.naturalHeight });
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        resolve({ w: 0, h: 0 });
      };
      img.src = url;
    });
  }

  // ============================================================
  // DELETE
  // ============================================================
  function deletePhoto(photo) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;

    setStatus("Deleting...", "");
    var photoId = photo.id;

    // Reload latest photos.json for current SHA
    ghGet(repoPath(CONFIG.photosPath)).then(function (data) {
      var currentPhotos;
      try {
        currentPhotos = JSON.parse(atob(data.content));
      } catch (e) {
        currentPhotos = [];
      }
      var sha = data.sha;

      // Remove from array
      var filtered = currentPhotos.filter(function (p) { return p.id !== photoId; });
      var newContent = btoa(unescape(encodeURIComponent(JSON.stringify(filtered, null, 2))));

      // Update photos.json
      return ghPut(repoPath(CONFIG.photosPath), {
        message: "Delete photo: " + photoId,
        content: newContent,
        sha: sha
      }).then(function () {
        // Delete image file
        return ghDelete(repoPath(photo.src), {
          message: "Delete photo: " + photoId,
          sha: null // Will be fetched internally
        }).catch(function () {
          // Image might already be gone or wasn't committed yet, ignore
        });
      });
    }).then(function () {
      setStatus("Deleted", "success");
      loadPhotos();
    }).catch(function (e) {
      setStatus("Delete failed: " + e.message, "error");
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function setStatus(msg, type) {
    if (!uploadStatus) return;
    uploadStatus.textContent = msg;
    uploadStatus.className = "upload-status " + type;
  }

  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

})();
