(function () {
  "use strict";

  var fileInput   = document.getElementById("fileInput");
  var fileLabel   = document.getElementById("fileLabel");
  var fileNameEl  = document.getElementById("fileName");
  var titleInput  = document.getElementById("titleInput");
  var uploadBtn   = document.getElementById("uploadBtn");
  var uploadStatus = document.getElementById("uploadStatus");
  var photoGrid   = document.getElementById("photoGrid");
  var emptyState  = document.getElementById("emptyState");

  // --- file input display ---
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

  // --- upload ---
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

    var formData = new FormData();
    formData.append("photo", file);
    formData.append("title", title);

    fetch("/api/photos", {
      method: "POST",
      body: formData
    })
    .then(function (res) {
      if (!res.ok) {
        return res.json().then(function (err) { throw new Error(err.error || "Upload failed"); });
      }
      return res.json();
    })
    .then(function (photo) {
      setStatus("Uploaded successfully!", "success");
      // reset form
      fileInput.value = "";
      titleInput.value = "";
      fileNameEl.textContent = "";
      fileLabel.textContent = "SELECT IMAGE";
      fileLabel.style.borderStyle = "dashed";
      // reload grid
      loadPhotos();
    })
    .catch(function (e) {
      setStatus(e.message, "error");
    })
    .finally(function () {
      uploadBtn.disabled = false;
      uploadBtn.textContent = "UPLOAD";
    });
  });

  function setStatus(msg, type) {
    uploadStatus.textContent = msg;
    uploadStatus.className = "upload-status " + type;
  }

  // --- load photos ---
  function loadPhotos() {
    fetch("/api/photos")
      .then(function (res) { return res.json(); })
      .then(function (photos) {
        renderGrid(photos);
      })
      .catch(function () {
        // fallback to static JSON for GitHub Pages
        fetch("../data/photos.json")
          .then(function (res) { return res.json(); })
          .then(function (photos) { renderGrid(photos); })
          .catch(function (e) {
            photoGrid.innerHTML = "";
            emptyState.style.display = "block";
            emptyState.textContent = "Failed to load photos";
          });
      });
  }

  // --- render grid ---
  function renderGrid(photos) {
    photoGrid.innerHTML = "";

    if (!photos || photos.length === 0) {
      emptyState.style.display = "block";
      emptyState.textContent = "No photos yet";
      return;
    }

    emptyState.style.display = "none";

    photos.forEach(function (photo) {
      var card = document.createElement("div");
      card.className = "photo-card";

      var img = document.createElement("img");
      // Use thumbnail for admin grid display, fallback to original
      img.src = "../" + (photo.thumb || photo.src);
      img.alt = photo.alt || "";

      var info = document.createElement("div");
      info.className = "card-info";

      var titleSpan = document.createElement("span");
      titleSpan.className = "card-title";
      titleSpan.textContent = photo.title || "Untitled";

      var delBtn = document.createElement("button");
      delBtn.className = "delete-btn";
      delBtn.textContent = "DELETE";
      delBtn.addEventListener("click", function () { deletePhoto(photo.id); });

      info.appendChild(titleSpan);
      info.appendChild(delBtn);
      card.appendChild(img);
      card.appendChild(info);
      photoGrid.appendChild(card);
    });
  }

  // --- delete ---
  function deletePhoto(id) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;

    fetch("/api/photos/" + id, { method: "DELETE" })
      .then(function (res) {
        if (!res.ok) throw new Error("Delete failed");
        return res.json();
      })
      .then(function () {
        loadPhotos();
      })
      .catch(function (e) {
        alert("Failed to delete: " + e.message);
      });
  }

  // --- init ---
  loadPhotos();

})();
