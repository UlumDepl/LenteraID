/**
 * Pengelola Tema (otomatis mengikuti prefers-color-scheme + tombol ganti tema)
 * dan perender daftar tim pada halaman Hak Cipta dari LENTERA_CONFIG.TEAM.
 */
window.LenteraUI = (function () {
  var THEME_KEY = "lenteraid_theme_pref_v3";

  function getSystemTheme() {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  function getSavedTheme() {
    try {
      var val = localStorage.getItem(THEME_KEY);
      return val === "light" || val === "dark" ? val : null;
    } catch (e) {
      return null;
    }
  }

  function getEffectiveTheme() {
    return getSavedTheme() || getSystemTheme();
  }

  function updateToggleButtons(theme) {
    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      var nextLabel = theme === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap";
      btn.setAttribute("aria-label", nextLabel);
      btn.setAttribute("title", nextLabel);
    });
  }

  function applyTheme(theme, persist) {
    if (theme === "light" || theme === "dark") {
      document.documentElement.setAttribute("data-theme", theme);
      if (persist) {
        try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* abaikan */ }
      }
      updateToggleButtons(theme);
    } else {
      document.documentElement.removeAttribute("data-theme");
      updateToggleButtons(getSystemTheme());
    }
  }

  function toggleTheme() {
    var next = getEffectiveTheme() === "dark" ? "light" : "dark";
    applyTheme(next, true);
  }

  function initTheme() {
    var saved = getSavedTheme();
    if (saved) {
      applyTheme(saved, false);
    } else {
      updateToggleButtons(getSystemTheme());
    }

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-color-scheme: dark)");
      var onMediaChange = function () {
        if (!getSavedTheme()) {
          updateToggleButtons(getSystemTheme());
        }
      };
      if (typeof mq.addEventListener === "function") mq.addEventListener("change", onMediaChange);
      else if (typeof mq.addListener === "function") mq.addListener(onMediaChange);
    }

    document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
      btn.addEventListener("click", toggleTheme);
    });
  }

  function buildGithubIconSvg() {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", "15");
    svg.setAttribute("height", "15");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "1.8");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    var p1 = document.createElementNS(ns, "path");
    p1.setAttribute("d", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6");
    var p2 = document.createElementNS(ns, "polyline");
    p2.setAttribute("points", "15 3 21 3 21 9");
    var p3 = document.createElementNS(ns, "line");
    p3.setAttribute("x1", "10");
    p3.setAttribute("y1", "14");
    p3.setAttribute("x2", "21");
    p3.setAttribute("y2", "3");

    svg.appendChild(p1);
    svg.appendChild(p2);
    svg.appendChild(p3);
    return svg;
  }

  function renderTeamGrids() {
    var team = (window.LENTERA_CONFIG && window.LENTERA_CONFIG.TEAM) || [];
    if (!team.length) return;

    document.querySelectorAll("[data-team-grid]").forEach(function (container) {
      container.textContent = "";
      team.forEach(function (member) {
        var card = document.createElement("a");
        card.className = "team-card";
        card.href = member.githubUrl || "https://github.com/USERNAME-ISI-SENDIRI";
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.setAttribute("aria-label", "Buka profil GitHub " + member.name + " (" + member.role + ") di tab baru");

        var avatarWrap = document.createElement("div");
        avatarWrap.className = "photo-avatar-wrap";

        var fallback = document.createElement("span");
        fallback.className = "photo-fallback";
        fallback.textContent = member.initials || member.name.slice(0, 2).toUpperCase();
        avatarWrap.appendChild(fallback);

        if (member.photo) {
          var img = document.createElement("img");
          img.src = member.photo;
          img.alt = "Foto " + member.name;
          img.addEventListener("error", function () {
            img.style.display = "none";
          });
          avatarWrap.appendChild(img);
        }

        var nameEl = document.createElement("div");
        nameEl.className = "team-name";
        nameEl.textContent = member.name;

        var roleEl = document.createElement("div");
        roleEl.className = "team-role";
        roleEl.textContent = member.role;

        var ghEl = document.createElement("div");
        ghEl.className = "team-github-link";
        ghEl.appendChild(document.createTextNode("GitHub"));
        ghEl.appendChild(buildGithubIconSvg());

        card.appendChild(avatarWrap);
        card.appendChild(nameEl);
        card.appendChild(roleEl);
        card.appendChild(ghEl);
        container.appendChild(card);
      });
    });
  }

  function init() {
    initTheme();
    renderTeamGrids();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    toggleTheme: toggleTheme,
    getEffectiveTheme: getEffectiveTheme,
    renderTeamGrids: renderTeamGrids
  };
})();
