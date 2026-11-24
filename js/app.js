/**
 * Controller Utama Web Pengguna Lentera ID
 * - Masuk khusus menggunakan akun Google (Firebase Auth).
 * - Obrolan lintas 8 mata kuliah dengan Bahasa Indonesia sebagai konteks utama + KaTeX + sanitasi whitelist.
 * - Terhubung penuh ke Arena Game (Lentera Kuis & Lentera Park), Mabar, Moderator Anti-Curang, dan Lemari Skin.
 */
(function () {
  var CFG = window.LENTERA_CONFIG;
  var STR = window.LENTERA_STRINGS;
  var FB = window.FirebaseBridge;
  var STORE = window.LenteraStore;
  var AUTH_STORE = window.LenteraAuthStorage;
  var ENGINE = window.LenteraEngine;
  var CONTENT = window.LenteraContent;
  var GAME_MGR = window.LenteraGameManager;
  var MABAR = window.LenteraMabar;

  var currentUser = null;
  var unsubscribeUserDoc = null;
  var heartbeatTimer = null;
  var currentView = "chat";
  var activeChatSubject = "indonesia";

  var chatSessions = [];
  var activeSessionId = null;

  // DOM References
  var loginScreen = document.getElementById("login-screen");
  var loginError = document.getElementById("login-error");
  var rememberLoginCheckbox = document.getElementById("remember-login");
  var btnGoogleLogin = document.getElementById("btn-google-login");

  var appShell = document.getElementById("app-shell");
  var sidebar = document.getElementById("sidebar");
  var sidebarBackdrop = document.getElementById("sidebar-backdrop");
  var historyList = document.getElementById("chat-history-list");
  var viewTitle = document.getElementById("view-title");
  var viewSubtitle = document.getElementById("view-subtitle");
  var blockedBanner = document.getElementById("blocked-banner");
  var blockedReason = document.getElementById("blocked-reason");
  var chatSubjectSelect = document.getElementById("chat-subject-select");
  var chatMessages = document.getElementById("chat-messages");
  var chatForm = document.getElementById("chat-form");
  var chatInput = document.getElementById("chat-input");
  var btnSend = document.getElementById("btn-send");
  var quotaText = document.getElementById("quota-text");
  var quotaBar = document.getElementById("quota-bar");
  var toastContainer = document.getElementById("toast-container");
  var btnOpenProfile = document.getElementById("btn-open-profile");
  var profileModal = document.getElementById("profile-modal");
  var profileModalAvatar = document.getElementById("profile-modal-avatar");
  var profileModalEmail = document.getElementById("profile-modal-email");
  var profileNameForm = document.getElementById("profile-name-form");
  var profileNameInput = document.getElementById("profile-name-input");
  var btnCancelProfile = document.getElementById("btn-cancel-profile");

  function showToast(message, type) {
    if (!toastContainer) return;
    var el = document.createElement("div");
    el.className = "toast toast-" + (type || "info");
    el.textContent = message;
    toastContainer.appendChild(el);
    setTimeout(function () { el.remove(); }, 3500);
  }

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  }

  function clearLoginError() {
    loginError.textContent = "";
    loginError.classList.add("hidden");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function sanitizeAllowedHtml(rawHtml) {
    var ALLOWED_TAGS = {
      P: true, H4: true, UL: true, OL: true, LI: true,
      STRONG: true, EM: true, CODE: true, PRE: true, BLOCKQUOTE: true, BR: true
    };
    var doc = new DOMParser().parseFromString("<div>" + rawHtml + "</div>", "text/html");
    var root = doc.body.firstChild;
    if (!root) return "";

    function cleanNode(node) {
      var children = Array.prototype.slice.call(node.childNodes);
      children.forEach(function (child) {
        if (child.nodeType === 1) {
          if (!ALLOWED_TAGS[child.tagName]) {
            var txt = doc.createTextNode(child.textContent || "");
            node.replaceChild(txt, child);
            return;
          }
          while (child.attributes.length > 0) {
            child.removeAttribute(child.attributes[0].name);
          }
          cleanNode(child);
        } else if (child.nodeType !== 3) {
          node.removeChild(child);
        }
      });
    }
    cleanNode(root);
    return root.innerHTML;
  }

  function renderCleanOutput(text) {
    var safe = escapeHtml(text);
    safe = safe.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, function (_, lang, code) {
      return "\n<pre><code>" + code.trim() + "</code></pre>\n";
    });
    safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>");
    safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");
    safe = safe.replace(/(^|\s)\*(\s|$)/g, "$1$2");

    var lines = safe.split(/\n/);
    var html = [];
    var listType = null;

    function closeList() {
      if (listType) { html.push("</" + listType + ">"); listType = null; }
    }

    lines.forEach(function (line) {
      var trimmed = line.trim();
      if (!trimmed) { closeList(); return; }
      if (trimmed.startsWith("<pre>") || trimmed.endsWith("</pre>")) {
        closeList();
        html.push(trimmed);
        return;
      }
      var hMatch = trimmed.match(/^#{1,3}\s+(.+)$/);
      if (hMatch) { closeList(); html.push("<h4>" + hMatch[1] + "</h4>"); return; }
      if (trimmed.startsWith("&gt; ")) { closeList(); html.push("<blockquote>" + trimmed.slice(5) + "</blockquote>"); return; }
      var olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (listType !== "ol") { closeList(); html.push("<ol>"); listType = "ol"; }
        html.push("<li>" + olMatch[1] + "</li>");
        return;
      }
      var ulMatch = trimmed.match(/^[-*\u2022]\s+(.+)$/);
      if (ulMatch) {
        if (listType !== "ul") { closeList(); html.push("<ul>"); listType = "ul"; }
        html.push("<li>" + ulMatch[1] + "</li>");
        return;
      }
      closeList();
      html.push("<p>" + trimmed + "</p>");
    });

    closeList();
    return sanitizeAllowedHtml(html.join("\n"));
  }

  /**
   * Merender ekspresi LaTeX ($...$ / $$...$$) di dalam gelembung pesan bot memakai KaTeX.
   */
  function applyKatexToContainer(el) {
    if (!el || !window.katex || typeof window.katex.render !== "function") return;
    var walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    var n;
    while ((n = walker.nextNode())) {
      if (n.parentElement && (n.parentElement.tagName === "CODE" || n.parentElement.tagName === "PRE")) continue;
      if (n.nodeValue && n.nodeValue.indexOf("$") !== -1) nodes.push(n);
    }
    nodes.forEach(function (textNode) {
      var val = textNode.nodeValue;
      var rx = /(\$\$[^$]+\$\$|\$[^$\n]+\$)/g;
      var last = 0;
      var match;
      var frag = document.createDocumentFragment();
      var touched = false;
      while ((match = rx.exec(val)) !== null) {
        touched = true;
        if (match.index > last) frag.appendChild(document.createTextNode(val.slice(last, match.index)));
        var tok = match[0];
        var isDisplay = tok.startsWith("$$");
        var expr = isDisplay ? tok.slice(2, -2).trim() : tok.slice(1, -1).trim();
        var span = document.createElement("span");
        try { window.katex.render(expr, span, { throwOnError: false, displayMode: isDisplay }); }
        catch (e) { span.textContent = CONTENT.formatMathReadable ? CONTENT.formatMathReadable(expr) : expr; }
        frag.appendChild(span);
        last = rx.lastIndex;
      }
      if (touched) {
        if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
        textNode.parentNode.replaceChild(frag, textNode);
      }
    });
  }

  // === Presence Heartbeat ===
  function getActivityLabel() {
    if (currentView === "quiz") return MABAR.isInRoom() ? "Bermain bersama di Arena Game" : "Bermain di Arena Game";
    if (currentView === "copyright") return "Melihat Halaman Hak Cipta";
    return "Belajar " + CONTENT.getSubjectName(activeChatSubject);
  }

  function pushPresence(isOnline, customActivity) {
    if (!currentUser || !currentUser.uid) return;
    FB.setUserPresence(currentUser.uid, isOnline, customActivity || getActivityLabel());
  }

  function startHeartbeat() {
    stopHeartbeat();
    pushPresence(true);
    heartbeatTimer = setInterval(function () {
      if (currentUser && !document.hidden) pushPresence(true);
    }, CFG.HEARTBEAT_INTERVAL_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
  }

  // === Quota & Block UI (Sinkron Lokal + Cloud per Jam) ===
  function getEffectiveUsedQuota() {
    if (!currentUser) return 0;
    var curBucket = Math.floor(Date.now() / 3600000);
    var localQ = AUTH_STORE.getLocalHourlyQuota(currentUser.uid);
    var cloudUsed = (Number(currentUser.quotaHourBucket || 0) === curBucket)
      ? Number(currentUser.requests || 0)
      : (typeof currentUser.quotaHourBucket === "undefined" ? Number(currentUser.requests || 0) : 0);
    var used = Math.max(localQ.used, cloudUsed);
    currentUser.requests = used;
    currentUser.quotaHourBucket = curBucket;
    return used;
  }

  function consumeChatQuota(serverQuota) {
    if (!currentUser) return;
    var curBucket = Math.floor(Date.now() / 3600000);
    var nextUsed;
    if (serverQuota && typeof serverQuota.used === "number") {
      nextUsed = Math.max(0, Math.min(CFG.MAX_REQUESTS_PER_HOUR, Math.floor(serverQuota.used)));
    } else {
      nextUsed = Math.min(CFG.MAX_REQUESTS_PER_HOUR, getEffectiveUsedQuota() + 1);
    }
    currentUser.requests = nextUsed;
    currentUser.quotaHourBucket = curBucket;
    AUTH_STORE.setLocalHourlyQuota(currentUser.uid, nextUsed);
    AUTH_STORE.setCachedSession(currentUser);
    if (currentUser.uid) {
      FB.updateUserProgress(currentUser.uid, { requests: nextUsed, quotaHourBucket: curBucket });
    }
    syncBlockAndQuotaUI();
  }

  function syncBlockAndQuotaUI() {
    if (!currentUser) return;
    var used = getEffectiveUsedQuota();
    var remaining = Math.max(0, CFG.MAX_REQUESTS_PER_HOUR - used);
    var pct = Math.min(100, Math.round((remaining / CFG.MAX_REQUESTS_PER_HOUR) * 100));
    quotaText.textContent = "Sisa " + remaining + " / " + CFG.MAX_REQUESTS_PER_HOUR;
    quotaBar.style.width = pct + "%";

    var isBlocked = Boolean(currentUser.isBlocked);
    var overQuota = used >= CFG.MAX_REQUESTS_PER_HOUR;

    if (isBlocked) {
      blockedBanner.classList.remove("hidden");
      blockedReason.textContent = currentUser.blockReason || STR.chat.blockedFallback;
      chatInput.disabled = true;
      btnSend.disabled = true;
    } else if (overQuota) {
      blockedBanner.classList.remove("hidden");
      blockedReason.textContent = STR.chat.quotaReached;
      chatInput.disabled = true;
      btnSend.disabled = true;
    } else {
      blockedBanner.classList.add("hidden");
      chatInput.disabled = false;
      btnSend.disabled = false;
    }
  }

  // === Riwayat Obrolan ===
  function getUserStorageKey() {
    if (!currentUser) return "guest";
    return String(currentUser.email || currentUser.uid || "guest").trim().toLowerCase();
  }

  function getActiveSession() {
    return chatSessions.find(function (s) { return s.id === activeSessionId; }) || null;
  }

  function persistSessions() {
    STORE.saveChatSessions(getUserStorageKey(), chatSessions);
  }

  function createNewSession(switchNow) {
    var session = {
      id: "chat_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      title: STR.nav.newChat,
      subject: activeChatSubject,
      messages: [],
      updatedAt: Date.now()
    };
    chatSessions.unshift(session);
    activeSessionId = session.id;
    persistSessions();
    renderHistorySidebar();
    if (switchNow !== false) {
      renderActiveChat();
      if (currentView !== "chat") switchView("chat");
    }
    return session;
  }

  function deleteSession(id) {
    chatSessions = chatSessions.filter(function (s) { return s.id !== id; });
    if (activeSessionId === id) {
      if (chatSessions.length > 0) activeSessionId = chatSessions[0].id;
      else { createNewSession(true); return; }
    }
    persistSessions();
    renderHistorySidebar();
    renderActiveChat();
  }

  function renderHistorySidebar() {
    historyList.textContent = "";
    if (chatSessions.length === 0) {
      var empty = document.createElement("div");
      empty.style.cssText = "padding:8px 10px;font-size:0.8125rem;color:var(--text-secondary);";
      empty.textContent = STR.chat.emptyHistory;
      historyList.appendChild(empty);
      return;
    }

    chatSessions.forEach(function (sess) {
      var item = document.createElement("div");
      item.className = "history-item" + (sess.id === activeSessionId ? " active" : "");

      var title = document.createElement("span");
      title.className = "history-title";
      title.textContent = sess.title || STR.nav.newChat;
      title.addEventListener("click", function () {
        activeSessionId = sess.id;
        if (sess.subject && chatSubjectSelect) {
          activeChatSubject = sess.subject;
          chatSubjectSelect.value = sess.subject;
        }
        renderHistorySidebar();
        renderActiveChat();
        if (currentView !== "chat") switchView("chat");
        closeMobileSidebar();
      });

      var delBtn = document.createElement("button");
      delBtn.type = "button";
      delBtn.className = "history-delete";
      delBtn.title = "Hapus obrolan";
      delBtn.setAttribute("aria-label", "Hapus obrolan");
      delBtn.textContent = "\u00d7";
      delBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        deleteSession(sess.id);
      });

      item.appendChild(title);
      item.appendChild(delBtn);
      historyList.appendChild(item);
    });
  }

  function buildChatContextForGame() {
    var sess = getActiveSession();
    if (!sess || !sess.messages || sess.messages.length === 0) {
      return { text: "", preview: "", subject: activeChatSubject };
    }
    var transcript = sess.messages.slice(-10).map(function (m) {
      return (m.role === "user" ? "Pengguna: " : "Lentera: ") + m.text;
    }).join("\n");
    var preview = 'Topik: "' + (sess.title || "Diskusi Terakhir") + '" (' + CONTENT.getSubjectName(sess.subject || activeChatSubject) + ')';
    return { text: transcript, preview: preview, subject: sess.subject || activeChatSubject };
  }

  function updateQuickGameButton() {
    var ctx = buildChatContextForGame();
    GAME_MGR.syncChatContext(ctx.text, ctx.preview, ctx.subject);
  }

  function appendMessageBubble(msgObj, offerGameBtn) {
    var div = document.createElement("div");
    div.className = "msg " + (msgObj.role === "user" ? "msg-user" : "msg-bot");

    var body = document.createElement("div");
    body.className = "msg-body";
    if (msgObj.role === "user") {
      body.textContent = msgObj.text;
    } else {
      body.innerHTML = renderCleanOutput(msgObj.text);
      applyKatexToContainer(body);
    }
    div.appendChild(body);

    if (offerGameBtn && msgObj.role === "bot") {
      var actions = document.createElement("div");
      actions.className = "msg-actions";
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-accent btn-sm";
      btn.textContent = STR.chat.playFromChatBtn;
      btn.addEventListener("click", launchGameFromCurrentChat);
      actions.appendChild(btn);
      div.appendChild(actions);
    }

    var meta = document.createElement("div");
    meta.className = "msg-meta";
    meta.textContent = msgObj.time || new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    div.appendChild(meta);

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  function appendTypingIndicator() {
    var div = document.createElement("div");
    div.className = "msg msg-bot";
    div.id = "typing-indicator";
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return div;
  }

  function renderActiveChat() {
    chatMessages.textContent = "";
    var sess = getActiveSession();
    if (!sess || sess.messages.length === 0) {
      var hero = document.createElement("div");
      hero.className = "empty-chat-hero";
      hero.innerHTML =
        '<div class="brand-icon">' +
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z"/></svg>' +
        '</div>' +
        '<h3>' + escapeHtml(STR.chat.welcomeTitle) + '</h3>' +
        '<p>' + escapeHtml(STR.chat.welcomeDesc) + '</p>';
      chatMessages.appendChild(hero);
    } else {
      sess.messages.forEach(function (m, idx) {
        var isLastBot = m.role === "bot" && idx === sess.messages.length - 1;
        appendMessageBubble(m, isLastBot && sess.messages.length >= 2);
      });
    }
    updateQuickGameButton();
  }

  function launchGameFromCurrentChat() {
    var ctx = buildChatContextForGame();
    switchView("quiz");
    GAME_MGR.startFromChatContext(ctx.text, ctx.preview, ctx.subject);
  }

  async function handleChatSubmit(e) {
    e.preventDefault();
    syncBlockAndQuotaUI();

    if (!currentUser || currentUser.isBlocked || (currentUser.requests || 0) >= CFG.MAX_REQUESTS_PER_HOUR) return;

    var text = chatInput.value.trim();
    if (!text) return;

    var sess = getActiveSession() || createNewSession(false);
    sess.subject = activeChatSubject;
    if (sess.messages.length === 0) {
      sess.title = text.length > 36 ? text.slice(0, 36) + "..." : text;
      chatMessages.textContent = "";
    }

    var timeStr = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    var userMsg = { role: "user", text: text, time: timeStr };
    sess.messages.push(userMsg);
    sess.updatedAt = Date.now();
    persistSessions();
    renderHistorySidebar();

    chatInput.value = "";
    chatInput.style.height = "auto";
    appendMessageBubble(userMsg, false);

    pushPresence(true, "Berdiskusi " + CONTENT.getSubjectName(activeChatSubject));
    btnSend.disabled = true;
    var typingEl = appendTypingIndicator();

    var streamBubble = null;
    var streamBody = null;
    try {
      var token = await FB.getIdToken();
      var result = await ENGINE.sendChat(sess.messages, token, activeChatSubject, function (partialText) {
        if (!partialText) return;
        if (!streamBubble) {
          typingEl.remove();
          streamBubble = document.createElement("div");
          streamBubble.className = "msg msg-bot";
          streamBody = document.createElement("div");
          streamBody.className = "msg-body";
          streamBubble.appendChild(streamBody);
          chatMessages.appendChild(streamBubble);
        }
        streamBody.innerHTML = renderCleanOutput(partialText);
        chatMessages.scrollTop = chatMessages.scrollHeight;
      });
      if (typingEl && typingEl.parentNode) typingEl.remove();
      if (streamBubble && streamBubble.parentNode) streamBubble.remove();

      consumeChatQuota(result && result.quota);

      var botMsg = {
        role: "bot",
        text: result.text,
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };
      sess.messages.push(botMsg);
      sess.updatedAt = Date.now();
      persistSessions();

      appendMessageBubble(botMsg, sess.messages.length >= 2);
      updateQuickGameButton();
    } catch (err) {
      if (typingEl && typingEl.parentNode) typingEl.remove();
      if (streamBubble && streamBubble.parentNode) streamBubble.remove();
      if (err && err.quota) consumeChatQuota(err.quota);
      var errMsg = {
        role: "bot",
        text: err.message || "Terjadi kendala saat menghubungi peladen. Silakan coba lagi sebentar.",
        time: new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
      };
      appendMessageBubble(errMsg, false);
      showToast(err.message || "Gagal menghubungi peladen.", "error");
    } finally {
      syncBlockAndQuotaUI();
    }
  }

  // === Navigasi Halaman ===
  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });

    document.getElementById("view-chat").classList.toggle("hidden", viewName !== "chat");
    document.getElementById("view-quiz").classList.toggle("hidden", viewName !== "quiz");
    document.getElementById("view-copyright").classList.toggle("hidden", viewName !== "copyright");

    if (viewName === "chat") {
      GAME_MGR.stopTimer();
      viewTitle.textContent = STR.views.chatTitle;
      viewSubtitle.textContent = STR.views.chatSubtitle;
    } else if (viewName === "quiz") {
      viewTitle.textContent = STR.views.gameTitle;
      viewSubtitle.textContent = STR.views.gameSubtitle;
      updateQuickGameButton();
    } else if (viewName === "copyright") {
      GAME_MGR.stopTimer();
      viewTitle.textContent = STR.views.copyrightTitle;
      viewSubtitle.textContent = STR.views.copyrightSubtitle;
    }

    pushPresence(true);
    closeMobileSidebar();
  }

  function openMobileSidebar() {
    sidebar.classList.add("open");
    sidebarBackdrop.classList.remove("hidden");
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("open");
    sidebarBackdrop.classList.add("hidden");
  }

  function renderAvatarInto(el, userObj) {
    if (!el) return;
    el.textContent = "";
    if (userObj && userObj.photoURL && /^https:\/\//i.test(userObj.photoURL)) {
      var img = document.createElement("img");
      img.src = userObj.photoURL;
      img.alt = "Foto profil";
      img.referrerPolicy = "no-referrer";
      el.appendChild(img);
    } else {
      var displayName = (userObj && userObj.name) || "P";
      el.textContent = displayName.charAt(0).toUpperCase();
    }
  }

  function syncAccountIdentityUI() {
    if (!currentUser) return;
    var displayName = AUTH_STORE.getMabarUsername() || currentUser.name || "Pengguna";
    currentUser.name = displayName;
    document.getElementById("user-name").textContent = displayName;
    document.getElementById("user-email").textContent = currentUser.email || "";
    renderAvatarInto(document.getElementById("user-avatar"), currentUser);
  }

  function openProfileModal() {
    if (!currentUser || !profileModal) return;
    if (profileModalEmail) profileModalEmail.textContent = currentUser.email || "";
    if (profileNameInput) profileNameInput.value = AUTH_STORE.getMabarUsername() || currentUser.name || "";
    renderAvatarInto(profileModalAvatar, currentUser);
    profileModal.classList.remove("hidden");
    if (profileNameInput) setTimeout(function () { profileNameInput.focus(); profileNameInput.select(); }, 30);
  }

  function closeProfileModal() {
    if (profileModal) profileModal.classList.add("hidden");
  }

  if (btnOpenProfile) btnOpenProfile.addEventListener("click", openProfileModal);
  if (btnCancelProfile) btnCancelProfile.addEventListener("click", closeProfileModal);
  if (profileModal) {
    profileModal.addEventListener("click", function (e) {
      if (e.target === profileModal) closeProfileModal();
    });
  }
  if (profileNameForm) {
    profileNameForm.addEventListener("submit", async function (e) {
      e.preventDefault();
      var nextName = (profileNameInput ? profileNameInput.value : "").trim().slice(0, 24);
      if (!nextName) return;
      AUTH_STORE.setMabarUsername(nextName);
      if (currentUser) {
        currentUser.name = nextName;
        AUTH_STORE.setCachedSession(currentUser);
        syncAccountIdentityUI();
        MABAR.updatePlayerName(nextName);
        if (currentUser.uid) {
          FB.updateUserProgress(currentUser.uid, { name: nextName });
        }
      }
      closeProfileModal();
      showToast("Nama akun berhasil diperbarui.", "success");
    });
  }

  // === Autentikasi Khusus Google (Sesi Instan Tanpa Layar "Memeriksa sesi masuk") ===
  function enterApp(userData, isFromCache) {
    var savedCustomName = AUTH_STORE.getMabarUsername();
    currentUser = Object.assign({}, userData);
    if (savedCustomName) currentUser.name = savedCustomName;
    else if (currentUser.name) AUTH_STORE.setMabarUsername(currentUser.name);

    AUTH_STORE.setCachedSession(currentUser);
    MABAR.setUser(currentUser);
    GAME_MGR.setUserUid(currentUser.uid);
    syncAccountIdentityUI();

    loginScreen.classList.add("hidden");
    appShell.classList.remove("hidden");

    var loaded = STORE.getChatSessions(getUserStorageKey());
    chatSessions = Array.isArray(loaded) ? loaded : [];
    if (chatSessions.length === 0) createNewSession(false);
    else if (!activeSessionId || !chatSessions.some(function (s) { return s.id === activeSessionId; })) {
      activeSessionId = chatSessions[0].id;
    }

    renderHistorySidebar();
    renderActiveChat();
    syncBlockAndQuotaUI();
    if (!isFromCache) startHeartbeat();
  }

  // Muat sesi tersimpan seketika saat refresh tanpa layar tunggu
  var cachedSession = AUTH_STORE.getCachedSession();
  if (cachedSession && cachedSession.uid) {
    enterApp(cachedSession, true);
  } else {
    loginScreen.classList.remove("hidden");
  }

  if (FB.isReady()) {
    FB.onAuthChanged(async function (fbUser) {
      if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
      if (fbUser) {
        var userData = await FB.ensureUserDoc(fbUser);
        enterApp(userData, false);
        unsubscribeUserDoc = FB.subscribeUserDoc(fbUser.uid, function (freshData) {
          var savedCustomName = AUTH_STORE.getMabarUsername();
          if (freshData && Number(freshData.requests) === 0 && Number(currentUser && currentUser.requests || 0) > 0) {
            AUTH_STORE.setLocalHourlyQuota(fbUser.uid, 0);
          }
          currentUser = Object.assign({}, currentUser, freshData);
          if (savedCustomName) currentUser.name = savedCustomName;
          AUTH_STORE.setCachedSession(currentUser);
          syncAccountIdentityUI();
          MABAR.setUser(currentUser);
          syncBlockAndQuotaUI();
        });
      } else {
        AUTH_STORE.clearCachedSession();
        currentUser = null;
        stopHeartbeat();
        GAME_MGR.stopTimer();
        appShell.classList.add("hidden");
        loginScreen.classList.remove("hidden");
      }
    });
  } else if (!cachedSession) {
    loginScreen.classList.remove("hidden");
    showLoginError(STR.login.firebaseUnavailable);
  }

  btnGoogleLogin.addEventListener("click", async function () {
    clearLoginError();
    if (window.location.protocol === "file:") {
      showLoginError(STR.login.fileProtocolError);
      return;
    }
    if (!FB.isReady()) {
    loginScreen.classList.remove("hidden");
    showLoginError(STR.login.firebaseUnavailable);
      return;
    }
    btnGoogleLogin.disabled = true;
    try {
      var remember = rememberLoginCheckbox ? rememberLoginCheckbox.checked : true;
      await FB.loginWithGoogle(remember, false);
      showToast(STR.login.success, "success");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        showLoginError("Gagal masuk dengan Google: " + (err.message || err.code));
      }
    } finally {
      btnGoogleLogin.disabled = false;
    }
  });

  document.getElementById("btn-logout").addEventListener("click", async function () {
    GAME_MGR.stopTimer();
    await MABAR.leaveMabarRoom();
    pushPresence(false, "Offline");
    stopHeartbeat();
    if (unsubscribeUserDoc) { unsubscribeUserDoc(); unsubscribeUserDoc = null; }
    AUTH_STORE.clearCachedSession();
    await FB.logout();
    currentUser = null;
    appShell.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    showToast("Anda telah keluar.", "info");
  });

  if (chatSubjectSelect) {
    chatSubjectSelect.addEventListener("change", function () {
      activeChatSubject = chatSubjectSelect.value || "indonesia";
      updateQuickGameButton();
      pushPresence(true);
    });
  }

  document.querySelectorAll(".nav-item").forEach(function (btn) {
    btn.addEventListener("click", function () { switchView(btn.dataset.view); });
  });

  document.getElementById("btn-new-chat").addEventListener("click", function () {
    createNewSession(true);
    closeMobileSidebar();
  });

  chatForm.addEventListener("submit", handleChatSubmit);

  chatInput.addEventListener("input", function () {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 140) + "px";
  });

  chatInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.requestSubmit();
    }
  });

  document.getElementById("btn-open-sidebar").addEventListener("click", openMobileSidebar);
  document.getElementById("btn-close-sidebar").addEventListener("click", closeMobileSidebar);
  sidebarBackdrop.addEventListener("click", closeMobileSidebar);

  document.addEventListener("visibilitychange", function () {
    if (currentUser && !document.hidden) pushPresence(true);
  });
  window.addEventListener("pagehide", function () {
    if (currentUser) pushPresence(false, "Offline");
  });

  // === Inisialisasi Arena Game & Mabar ===
  async function generateQuestionsHandler(params) {
    var token = await FB.getIdToken();
    return await ENGINE.generateQuestions(params, token);
  }

  GAME_MGR.init({
    onScoreSaved: async function (bestScore) {
      if (!currentUser || !currentUser.uid) return;
      if (bestScore > (currentUser.bestQuizScore || 0)) {
        currentUser.bestQuizScore = bestScore;
        await FB.updateUserProgress(currentUser.uid, { bestQuizScore: bestScore });
      }
    },
    onCoinsEarned: function (coins) { MABAR.addCoins(coins); },
    onBackToChat: function () { switchView("chat"); },
    onGenerateQuestions: generateQuestionsHandler,
    onScoreProgress: function (patch, force) { MABAR.pushPlayerUpdate(patch, force); },
    onGameFinished: function () { MABAR.showResultLeaderboard(); },
    onNotify: showToast
  });

  MABAR.init({
    onStartSharedGame: function (payload) {
      switchView("quiz");
      GAME_MGR.launchWithData(payload);
    },
    onOpenModeratorView: function (room) {
      switchView("quiz");
      GAME_MGR.openModeratorStage(room);
    },
    onKicked: function () {
      GAME_MGR.showSetupScreen();
      showToast(STR.moderator.kickedNotice, "error");
    },
    onPenaltyReceived: function (pts) {
      GAME_MGR.applyModeratorPenalty(pts);
    },
    onGenerateQuestions: generateQuestionsHandler,
    getGameSetupParams: function () { return GAME_MGR.getSetupParams(); },
    onNotify: showToast
  });
})();
