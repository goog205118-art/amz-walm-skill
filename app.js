(function () {
  const STORAGE_KEY = "nexscope-skill-console.workspace.v1";
  const CATEGORY_LABELS = {
    all: "全部分类",
    strategy: "策略",
    finance: "财务",
    research: "调研",
    content: "内容",
    marketing: "营销",
    operations: "运营",
    imported: "导入",
    ecommerce: "电商"
  };
  const PROTOCOL_PRESETS = {
    openai: {
      label: "OpenAI 协议",
      model: "gpt-5.5",
      models: ["gpt-5.5", "gpt-5.5-mini", "gpt-5.5-vision", "gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini", "gpt-4o"],
      endpoint: "https://api.openai.com/v1/chat/completions"
    },
    gemini: {
      label: "Gemini 协议",
      model: "gemini-3.1-pro",
      models: ["gemini-3.1-pro", "gemini-3.1-flash", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro"],
      endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}"
    },
    anthropic: {
      label: "Anthropic 协议",
      model: "claude-3-5-sonnet-latest",
      models: ["claude-3-5-sonnet-latest", "claude-3-5-haiku-latest", "claude-3-opus-latest"],
      endpoint: "https://api.anthropic.com/v1/messages"
    }
  };
  const DEFAULT_CAPABILITIES = {
    vision: true,
    fileText: true,
    preserveAttachments: true,
    longContext: true,
    reasoning: true,
    autoContext: true
  };
  const MAX_ATTACHMENT_BYTES = 6 * 1024 * 1024;
  const MAX_TEXT_CHARS = 60000;
  const ROUTER_TOP_K = 5;
  const ROUTER_MODEL_MIN_CONFIDENCE = 0.42;
  const ROUTER_GENERIC_TERMS = new Set([
    "ecommerce",
    "product",
    "business",
    "analysis",
    "strategy",
    "tool",
    "online",
    "market",
    "shop",
    "seller"
  ]);

  const els = {};
  const state = loadWorkspace();
  let pendingAttachments = [];
  let isSending = false;
  let inputExpanded = false;
  let streamFrame = 0;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    state.openGroups = state.openGroups && typeof state.openGroups === "object" ? state.openGroups : {};
    state.ui = normalizeUiState(state.ui);
    state.settings = normalizeSettings(state.settings);
    bindElements();
    bindEvents();
    hydrateSettings();
    registerServiceWorker();
    renderAll();
    updateStatus();
  }

  function bindElements() {
    [
      "modelInput",
      "protocolInput",
      "modelListInput",
      "refreshModelsBtn",
      "apiKeyInput",
      "endpointInput",
      "settingsBtn",
      "settingsModal",
      "closeSettingsBtn",
      "skillPickerBtn",
      "skillModal",
      "closeSkillModalBtn",
      "saveSettingsBtn",
      "exportSettingsBtn",
      "settingsImportInput",
      "newSessionBtn",
      "exportBtn",
      "importInput",
      "skillImportInput",
      "searchInput",
      "categoryTabs",
      "platformTabs",
      "skillList",
      "sessionList",
      "skillCount",
      "activeSkillName",
      "activeSkillMeta",
      "storageState",
      "apiState",
      "messageList",
      "attachmentTray",
      "messageInput",
      "composerModelSelect",
      "expandInputBtn",
      "sendBtn",
      "chatPanel",
      "leftPanelToggle",
      "rightPanelToggle",
      "sessionsPanelToggle",
      "closeSessionsBtn",
      "sessionFlyout",
      "skillBrief",
      "capabilityList",
      "workflowList",
      "routingNote",
      "workspaceStats",
      "workspace",
      "visionToggle",
      "fileTextToggle",
      "preserveAttachmentsToggle",
      "longContextToggle",
      "reasoningToggle",
      "autoContextToggle",
      "streamOutputToggle"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
    if (!els.refreshModelsBtn && els.modelListInput) {
      const button = document.createElement("button");
      button.id = "refreshModelsBtn";
      button.className = "btn subtle";
      button.type = "button";
      button.textContent = "\u5237\u65b0\u53ef\u7528\u6a21\u578b";
      els.modelListInput.parentElement.appendChild(button);
      els.refreshModelsBtn = button;
    }
  }

  function bindEvents() {
    els.settingsBtn.addEventListener("click", openSettings);
    els.closeSettingsBtn.addEventListener("click", closeSettings);
    els.settingsModal.querySelectorAll("[data-close-settings]").forEach((button) => {
      button.addEventListener("click", closeSettings);
    });
    els.skillPickerBtn.addEventListener("click", openSkillPicker);
    els.closeSkillModalBtn.addEventListener("click", closeSkillPicker);
    els.skillModal.querySelectorAll("[data-close-skills]").forEach((button) => {
      button.addEventListener("click", closeSkillPicker);
    });
    els.saveSettingsBtn.addEventListener("click", saveSettingsFromForm);
    els.exportSettingsBtn.addEventListener("click", exportSettings);
    els.settingsImportInput.addEventListener("change", importSettings);
    els.newSessionBtn.addEventListener("click", createNewSession);
    els.exportBtn.addEventListener("click", exportWorkspace);
    els.importInput.addEventListener("change", importWorkspace);
    els.skillImportInput.addEventListener("change", importSkillFiles);
    els.searchInput.addEventListener("input", (event) => {
      state.searchText = event.target.value;
      persist();
      renderAll();
    });
    els.messageInput.addEventListener("input", syncComposerHeight);
    els.messageInput.addEventListener("keydown", (event) => {
      if (event.isComposing || event.key !== "Enter") return;
      if (!inputExpanded && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
        return;
      }
      if (inputExpanded && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        sendMessage();
      }
    });
    els.expandInputBtn.addEventListener("click", toggleInputExpanded);
    els.messageList.addEventListener("scroll", () => {
      if (!isSending) return;
      els.messageList.dataset.userDetached = String(!isMessageListNearBottom());
    }, { passive: true });
    bindDropZone(els.chatPanel);
    bindDropZone(els.messageInput);
    els.leftPanelToggle.addEventListener("click", () => togglePanel("left"));
    els.sessionsPanelToggle.addEventListener("click", toggleSessionsPanel);
    els.closeSessionsBtn.addEventListener("click", closeSessionsPanel);
    els.rightPanelToggle.addEventListener("click", () => togglePanel("right"));
    els.sendBtn.addEventListener("click", sendMessage);
    els.composerModelSelect.addEventListener("change", () => {
      state.settings.model = els.composerModelSelect.value;
      persist();
      hydrateSettings();
      updateStatus();
    });
    els.protocolInput.addEventListener("change", () => {
      applyProtocolPreset(els.protocolInput.value);
    });
    els.modelInput.addEventListener("change", () => {
      renderComposerModelOptions(els.modelInput.value, parseModelList(els.modelListInput.value));
    });
    els.modelListInput.addEventListener("change", () => {
      renderModelOptions(els.modelInput.value, parseModelList(els.modelListInput.value));
    });
    els.refreshModelsBtn.addEventListener("click", refreshAvailableModels);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (!els.settingsModal.classList.contains("hidden")) {
        closeSettings();
        return;
      }
      if (!els.skillModal.classList.contains("hidden")) {
        closeSkillPicker();
        return;
      }
      closeSessionsPanel();
    });
  }

  function hydrateSettings() {
    state.settings.protocol = normalizeProtocol(state.settings.protocol);
    state.settings.models = normalizeModelList(state.settings.models, state.settings.model, state.settings.protocol);
    state.settings.capabilities = normalizeCapabilities(state.settings.capabilities);
    els.protocolInput.value = state.settings.protocol;
    renderModelOptions(state.settings.model, state.settings.models);
    renderComposerModelOptions(state.settings.model, state.settings.models);
    els.modelInput.value = state.settings.model;
    els.composerModelSelect.value = state.settings.model;
    els.modelListInput.value = state.settings.models.join("\n");
    els.apiKeyInput.value = state.settings.apiKey;
    els.endpointInput.value = state.settings.endpoint;
    els.searchInput.value = state.searchText;
    els.streamOutputToggle.checked = Boolean(state.settings.streamOutput);
    hydrateCapabilitySettings();
    applyLayoutState();
  }

  function renderAll() {
    renderCategories();
    renderPlatforms();
    renderSkillList();
    renderSessions();
    renderMessages();
    renderInspector();
    renderAttachmentTray();
    renderWorkspaceStats();
    updateStatus();
    syncComposerHeight();
  }

  function renderCategories() {
    const categories = ["all", ...new Set(allSkills().map((skill) => skill.category))];
    els.categoryTabs.innerHTML = categories
      .map((category) => {
        const active = state.categoryFilter === category ? "active" : "";
        const label = getCategoryLabel(category);
        return `<button class="tab ${active}" data-category="${escapeHtml(category)}">${escapeHtml(label)}</button>`;
      })
      .join("");
    els.categoryTabs.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.categoryFilter = button.dataset.category;
        persist();
        renderAll();
      });
    });
  }

  function renderPlatforms() {
    const platforms = ["all", ...new Set(allSkills().flatMap((skill) => skill.platform || []))].slice(0, 18);
    els.platformTabs.innerHTML = platforms
      .map((platform) => {
        const active = state.platformFilter === platform ? "active" : "";
        const label = platform === "all" ? "全部平台" : platform;
        return `<button class="tab ${active}" data-platform="${escapeHtml(platform)}">${escapeHtml(label)}</button>`;
      })
      .join("");
    els.platformTabs.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        state.platformFilter = button.dataset.platform;
        persist();
        renderAll();
      });
    });
  }

  function renderSkillList() {
    const filtered = getFilteredSkills();
    const groups = groupSkills(filtered);
    els.skillCount.textContent = `共 ${filtered.length} 个 / ${groups.length} 组`;
    els.skillList.innerHTML = groups.length
      ? groups
          .map((group) => {
            const forcedOpen = Boolean(state.searchText.trim());
            const isOpen = forcedOpen || state.openGroups[group.key] !== false;
            const activeInGroup = group.skills.some((skill) => skill.id === state.activeSkillId);
            return `
              <details class="skill-group ${activeInGroup ? "has-active" : ""}" data-group="${escapeHtml(group.key)}" ${isOpen ? "open" : ""}>
                <summary class="skill-group-head">
                  <span class="group-name">${escapeHtml(group.label)}</span>
                  <span class="group-count">${group.skills.length}</span>
                </summary>
                <div class="skill-group-items">
                  ${group.skills
                    .map((skill) => {
                      const active = skill.id === state.activeSkillId ? "active" : "";
                      const platform = (skill.platform || []).slice(0, 3).join(" / ");
                      const status = skill.status ? ` · ${skill.status}` : "";
                      return `
                        <button class="item skill-nav-item ${active}" data-skill="${escapeHtml(skill.id)}" title="${escapeHtml(skill.summary)}">
                          <span class="item-title">${escapeHtml(skill.name)}</span>
                          <span class="item-meta">${escapeHtml(platform)}${escapeHtml(status)}</span>
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </details>
            `;
          })
          .join("")
      : `<div class="empty-state">没有匹配的 Skill</div>`;

    els.skillList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveSkill(button.dataset.skill);
        closeSkillPicker();
      });
    });
    els.skillList.querySelectorAll(".skill-group").forEach((group) => {
      group.addEventListener("toggle", () => {
        if (state.searchText.trim()) return;
        state.openGroups[group.dataset.group] = group.open;
        persist();
      });
    });
  }

  function renderSessions() {
    const sessions = [...state.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    els.sessionList.innerHTML = sessions
      .map((session) => {
        const active = session.id === state.activeSessionId ? "active" : "";
        const skill = getSkillById(session.skillId);
        return `
          <button class="item ${active}" data-session="${escapeHtml(session.id)}">
            <div class="item-title">${escapeHtml(session.title)}</div>
            <div class="item-meta">${escapeHtml(skill ? skill.name : "未知技能")}</div>
            <div class="item-desc">${escapeHtml(formatDate(session.updatedAt))}</div>
          </button>
        `;
      })
      .join("");

    els.sessionList.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        setActiveSession(button.dataset.session);
        closeSessionsPanel();
      });
    });
  }

  function renderMessages(options = {}) {
    const session = getActiveSession();
    if (!session) {
      els.messageList.innerHTML = "";
      return;
    }
    session.messages.forEach(ensureMessageId);
    const shouldFollow = options.forceScroll || shouldFollowMessages();

    els.messageList.innerHTML = session.messages
      .map((message) => {
        const cls = message.role;
        const meta = message.role === "assistant" ? "助手" : message.role === "user" ? "用户" : "系统";
        const avatar = message.role === "assistant" ? "AI" : message.role === "user" ? "你" : "";
        const attachments = renderMessageAttachments(message.attachments);
        const content = message.loading
          ? `<div class="thinking"><span></span><span></span><span></span><em>${escapeHtml(message.status || "正在思考")}</em></div>`
          : `<div class="message-content">${renderRichText(message.content)}</div>`;
        return `
          <div class="message ${cls}" data-message-id="${escapeHtml(message.id)}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-body">
              <div class="message-meta">${meta}</div>
              ${content}
              ${attachments}
            </div>
          </div>
        `;
      })
      .join("");

    if (shouldFollow) {
      scrollMessagesToBottom();
    }
  }

  function updateMessageContent(message, content) {
    ensureMessageId(message);
    const shouldFollow = shouldFollowMessages();
    message.loading = false;
    message.content = content;
    const node = els.messageList.querySelector(`[data-message-id="${cssEscape(message.id)}"] .message-body`);
    if (!node) {
      renderMessages({ forceScroll: shouldFollow });
      return;
    }
    const attachments = renderMessageAttachments(message.attachments);
    node.innerHTML = `
      <div class="message-meta">助手</div>
      <div class="message-content">${renderRichText(message.content)}</div>
      ${attachments}
    `;
    if (shouldFollow) {
      scrollMessagesToBottom();
    }
  }

  function createStreamUpdater(message) {
    let latest = "";
    return (content, options = {}) => {
      latest = content;
      if (options.flush) {
        if (streamFrame) {
          cancelAnimationFrame(streamFrame);
          streamFrame = 0;
        }
        updateMessageContent(message, latest);
        return;
      }
      if (streamFrame) return;
      streamFrame = requestAnimationFrame(() => {
        streamFrame = 0;
        updateMessageContent(message, latest);
      });
    };
  }

  function shouldFollowMessages() {
    if (!isSending) return true;
    return els.messageList.dataset.userDetached !== "true" && isMessageListNearBottom();
  }

  function isMessageListNearBottom() {
    const distance = els.messageList.scrollHeight - els.messageList.scrollTop - els.messageList.clientHeight;
    return distance < 90;
  }

  function scrollMessagesToBottom() {
    els.messageList.scrollTop = els.messageList.scrollHeight;
    els.messageList.dataset.userDetached = "false";
  }

  function renderMessageAttachments(attachments) {
    if (!Array.isArray(attachments) || !attachments.length) return "";
    return `
      <div class="message-attachments">
        ${attachments
          .map((attachment) => {
            const label = `${attachment.name || "附件"} · ${formatBytes(attachment.size || 0)}`;
            return `<span class="message-attachment" title="${escapeHtml(label)}">${escapeHtml(label)}</span>`;
          })
          .join("")}
      </div>
    `;
  }

  function ensureMessageId(message) {
    if (!message.id) {
      message.id = `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return message.id;
  }

  function renderRichText(value) {
    const lines = String(value || "").replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let listOpen = false;

    const closeList = () => {
      if (!listOpen) return;
      html.push("</ul>");
      listOpen = false;
    };

    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      const clean = line.trim();
      if (!clean) {
        closeList();
        html.push("<br>");
        continue;
      }
      if (/^-{3,}$/.test(clean)) {
        closeList();
        html.push('<div class="md-divider"></div>');
        continue;
      }
      const heading = clean.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        closeList();
        html.push(`<div class="md-heading">${formatInline(heading[1])}</div>`);
        continue;
      }
      const bullet = clean.match(/^[-*]\s+(.+)$/);
      if (bullet) {
        if (!listOpen) {
          html.push('<ul class="md-list">');
          listOpen = true;
        }
        html.push(`<li>${formatInline(bullet[1])}</li>`);
        continue;
      }
      const numbered = clean.match(/^(\d+)\.\s+(.+)$/);
      if (numbered) {
        closeList();
        html.push(`<div class="md-numbered"><span>${escapeHtml(numbered[1])}.</span><p>${formatInline(numbered[2])}</p></div>`);
        continue;
      }
      closeList();
      html.push(`<p>${formatInline(line)}</p>`);
    }
    closeList();
    return html.join("");
  }

  function formatInline(value) {
    return escapeHtml(String(value || ""))
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  function renderAttachmentTray() {
    if (!pendingAttachments.length) {
      els.attachmentTray.classList.add("hidden");
      els.attachmentTray.innerHTML = "";
      return;
    }
    els.attachmentTray.classList.remove("hidden");
    els.attachmentTray.innerHTML = pendingAttachments
      .map((attachment) => {
        const label = `${attachment.name} · ${formatBytes(attachment.size)}`;
        return `
          <div class="attachment-chip" title="${escapeHtml(label)}">
            <span>${escapeHtml(label)}</span>
            <button type="button" data-remove-attachment="${escapeHtml(attachment.id)}" aria-label="移除附件">×</button>
          </div>
        `;
      })
      .join("");
    els.attachmentTray.querySelectorAll("button[data-remove-attachment]").forEach((button) => {
      button.addEventListener("click", () => {
        pendingAttachments = pendingAttachments.filter((item) => item.id !== button.dataset.removeAttachment);
        renderAttachmentTray();
      });
    });
  }

  function renderInspector() {
    const skill = getActiveSkill();
    const session = getActiveSession();
    els.activeSkillName.textContent = skill ? skill.name : "未选择技能";
    els.activeSkillMeta.textContent = skill
      ? `${skill.groupLabel || getCategoryLabel(skill.category)} · ${skill.platform.join(" / ")}${skill.status ? ` · ${skill.status}` : ""}`
      : "";
    els.skillBrief.innerHTML = skill
      ? `
        <div><strong>摘要：</strong>${escapeHtml(skill.summary)}</div>
        <div class="muted" style="margin-top:8px;"><strong>原始名称：</strong>${escapeHtml(skill.sourceName || skill.id)}</div>
        <div class="muted" style="margin-top:8px;"><strong>起手提示：</strong>${escapeHtml(skill.starterPrompt)}</div>
      `
      : `<div class="muted">请选择一个技能查看说明。</div>`;

    els.capabilityList.innerHTML = skill ? skill.capabilities.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "";
    els.workflowList.innerHTML = skill ? skill.workflow.map((item) => `<li>${escapeHtml(item)}</li>`).join("") : "";
    els.routingNote.innerHTML = session ? renderRouteTrace() : "暂无活动会话。";
  }

  function renderRouteTrace() {
    const trace = state.routeTrace;
    if (!trace) return escapeHtml(state.lastRouteReason || "暂无路由记录");
    const strategyLabels = {
      "local-top5-model-selection": "本地 Top 5 + 模型结构化选择",
      "local-recall": "本地召回",
      "local-recall-fallback": "本地召回兜底"
    };
    const candidates = Array.isArray(trace.candidates) ? trace.candidates : [];
    const selected = trace.selectedSkillId || "未命中";
    const confidence = `${(Number(trace.confidence || 0) * 100).toFixed(0)}%`;
    const candidateHtml = candidates
      .slice(0, ROUTER_TOP_K)
      .map((candidate, index) => `
        <div class="route-candidate ${candidate.skillId === selected ? "selected" : ""}">
          <span class="route-rank">${index + 1}</span>
          <span class="route-candidate-main">
            <strong>${escapeHtml(candidate.name || candidate.skillId)}</strong>
            <small>${Number(candidate.score || 0).toFixed(1)} 分${candidate.reasons?.length ? ` · ${escapeHtml(candidate.reasons.slice(0, 2).join(" / "))}` : ""}</small>
          </span>
        </div>
      `)
      .join("");
    return `
      <div class="route-trace">
        <div class="route-trace-summary">
          <strong>${escapeHtml(selected)}</strong>
          <span>${escapeHtml(strategyLabels[trace.strategy] || trace.strategy || "本地召回")} · 置信度 ${confidence}</span>
        </div>
        ${trace.reason ? `<p class="route-reason">${escapeHtml(trace.reason)}</p>` : ""}
        ${candidateHtml ? `<details class="route-candidates"><summary>查看 Top ${Math.min(ROUTER_TOP_K, candidates.length)} 候选</summary>${candidateHtml}</details>` : ""}
      </div>
    `;
  }

  function renderWorkspaceStats() {
    const sessions = state.sessions.length;
    const messages = state.sessions.reduce((sum, session) => sum + session.messages.length, 0);
    const customSkills = state.customSkills.length;
    const builtInSkills = window.SKILL_LIBRARY.length;
    els.workspaceStats.innerHTML = [
      ["内置技能", builtInSkills],
      ["自定义技能", customSkills],
      ["会话", sessions],
      ["消息", messages]
    ]
      .map(([label, value]) => `<div class="stat"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`)
      .join("");
  }

  function updateStatus() {
    els.storageState.textContent = "浏览器缓存已启用";
    const protocol = getProtocolConfig(state.settings.protocol);
    els.apiState.textContent = state.settings.apiKey ? `${protocol.label} 已保存` : "演示模式";
  }

  function applyLayoutState() {
    state.ui = normalizeUiState(state.ui);
    els.workspace.classList.toggle("left-collapsed", state.ui.leftCollapsed);
    els.workspace.classList.toggle("right-collapsed", state.ui.rightCollapsed);
    els.workspace.classList.toggle("sessions-open", state.ui.sessionsOpen);
    els.leftPanelToggle.textContent = state.ui.leftCollapsed ? "›" : "‹";
    els.rightPanelToggle.classList.toggle("active", !state.ui.rightCollapsed);
    els.sessionsPanelToggle.classList.toggle("active", state.ui.sessionsOpen);
    els.leftPanelToggle.setAttribute("aria-label", state.ui.leftCollapsed ? "展开技能栏" : "收起技能栏");
    els.rightPanelToggle.setAttribute("aria-label", state.ui.rightCollapsed ? "展开说明栏" : "收起说明栏");
    els.sessionsPanelToggle.setAttribute("aria-expanded", String(state.ui.sessionsOpen));
    els.sessionFlyout.setAttribute("aria-hidden", String(!state.ui.sessionsOpen));
  }

  function togglePanel(side) {
    state.ui = normalizeUiState(state.ui);
    if (side === "left") {
      state.ui.leftCollapsed = !state.ui.leftCollapsed;
    }
    if (side === "right") {
      state.ui.rightCollapsed = !state.ui.rightCollapsed;
    }
    persist();
    applyLayoutState();
  }

  function openSkillPicker() {
    renderAll();
    els.skillModal.classList.remove("hidden");
    els.searchInput.focus();
  }

  function closeSkillPicker() {
    els.skillModal.classList.add("hidden");
  }

  function toggleSessionsPanel() {
    state.ui = normalizeUiState(state.ui);
    state.ui.sessionsOpen = !state.ui.sessionsOpen;
    persist();
    applyLayoutState();
  }

  function closeSessionsPanel() {
    state.ui = normalizeUiState(state.ui);
    if (!state.ui.sessionsOpen) return;
    state.ui.sessionsOpen = false;
    persist();
    applyLayoutState();
  }

  function toggleInputExpanded() {
    inputExpanded = !inputExpanded;
    els.chatPanel.classList.toggle("input-expanded", inputExpanded);
    els.expandInputBtn.classList.toggle("active", inputExpanded);
    els.expandInputBtn.setAttribute("aria-label", inputExpanded ? "收起输入框" : "扩大输入框");
    els.expandInputBtn.dataset.tooltip = inputExpanded ? "收起输入框" : "扩大输入框";
    syncComposerHeight();
    els.messageInput.focus();
  }

  function syncComposerHeight() {
    if (!els.messageInput) return;
    const textarea = els.messageInput;
    const lineHeight = Number.parseFloat(getComputedStyle(textarea).lineHeight) || 22;
    const maxRows = inputExpanded ? 9 : 3;
    const verticalPadding = inputExpanded ? 18 : 8;
    const maxHeight = Math.round(lineHeight * maxRows + verticalPadding);
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function hydrateCapabilitySettings() {
    const capabilities = getCapabilitySettings();
    els.visionToggle.checked = capabilities.vision;
    els.fileTextToggle.checked = capabilities.fileText;
    els.preserveAttachmentsToggle.checked = capabilities.preserveAttachments;
    els.longContextToggle.checked = capabilities.longContext;
    els.reasoningToggle.checked = capabilities.reasoning;
    els.autoContextToggle.checked = capabilities.autoContext;
  }

  function readCapabilitySettingsFromForm() {
    return {
      vision: els.visionToggle.checked,
      fileText: els.fileTextToggle.checked,
      preserveAttachments: els.preserveAttachmentsToggle.checked,
      longContext: els.longContextToggle.checked,
      reasoning: els.reasoningToggle.checked,
      autoContext: els.autoContextToggle.checked
    };
  }

  function bindDropZone(element) {
    if (!element) return;
    ["dragenter", "dragover"].forEach((eventName) => {
      element.addEventListener(eventName, (event) => {
        if (!event.dataTransfer?.types?.includes("Files")) return;
        event.preventDefault();
        els.chatPanel.classList.add("drag-over");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      element.addEventListener(eventName, (event) => {
        if (!event.dataTransfer?.types?.includes("Files")) return;
        event.preventDefault();
        if (eventName === "drop") {
          addAttachmentFiles(Array.from(event.dataTransfer.files || []));
        }
        els.chatPanel.classList.remove("drag-over");
      });
    });
  }

  async function addAttachmentFiles(files) {
    if (!files.length) return;
    const next = [];
    for (const file of files) {
      next.push(await buildAttachment(file));
    }
    pendingAttachments = [...pendingAttachments, ...next];
    renderAttachmentTray();
  }

  async function buildAttachment(file) {
    const type = file.type || guessMimeType(file.name);
    const isImage = type.startsWith("image/");
    const isText = isTextLikeFile(file.name, type);
    const attachment = {
      id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      type,
      size: file.size,
      kind: isImage ? "image" : isText ? "text" : "file"
    };

    if (file.size > MAX_ATTACHMENT_BYTES) {
      attachment.notice = "文件超过前端直传上限，已保留文件信息。";
      return attachment;
    }

    if (isText) {
      const text = await readFileAsText(file);
      attachment.text = text.slice(0, MAX_TEXT_CHARS);
      attachment.truncated = text.length > MAX_TEXT_CHARS;
      return attachment;
    }

    if (isImage || shouldPreserveBinaryAttachment(type)) {
      const dataUrl = await readFileAsDataUrl(file);
      attachment.dataUrl = dataUrl;
      attachment.base64 = dataUrl.split(",")[1] || "";
    }
    return attachment;
  }

  function openSettings() {
    hydrateSettings();
    els.settingsModal.classList.remove("hidden");
    els.modelInput.focus();
  }

  function closeSettings() {
    els.settingsModal.classList.add("hidden");
  }

  function saveSettingsFromForm() {
    const protocol = normalizeProtocol(els.protocolInput.value);
    const models = normalizeModelList(parseModelList(els.modelListInput.value), els.modelInput.value, protocol);
    const selectedModel = els.modelInput.value.trim() || models[0] || getProtocolConfig(protocol).model;
    state.settings.protocol = protocol;
    state.settings.models = normalizeModelList(models, selectedModel, protocol);
    state.settings.model = selectedModel;
    state.settings.apiKey = els.apiKeyInput.value.trim();
    state.settings.endpoint = els.endpointInput.value.trim() || getProtocolConfig(protocol).endpoint;
    state.settings.capabilities = readCapabilitySettingsFromForm();
    state.settings.streamOutput = els.streamOutputToggle.checked;
    persist();
    hydrateSettings();
    updateStatus();
    closeSettings();
  }

  function exportSettings() {
    const protocol = normalizeProtocol(els.protocolInput.value);
    const models = normalizeModelList(parseModelList(els.modelListInput.value), els.modelInput.value, protocol);
    const settings = {
      ...state.settings,
      protocol,
      models,
      model: els.modelInput.value.trim() || models[0] || getProtocolConfig(protocol).model,
      apiKey: els.apiKeyInput.value.trim(),
      endpoint: els.endpointInput.value.trim() || getProtocolConfig(protocol).endpoint,
      capabilities: readCapabilitySettingsFromForm(),
      streamOutput: els.streamOutputToggle.checked
    };
    const payload = {
      type: "amz-walm-skill-settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "amz-walm-skill-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSettings(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        const nextSettings = imported.settings && typeof imported.settings === "object" ? imported.settings : imported;
        state.settings = normalizeSettings({
          ...state.settings,
          ...nextSettings
        });
        persist();
        hydrateSettings();
        updateStatus();
      } catch (error) {
        window.alert(`配置导入失败：${error.message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function createNewSession() {
    const skill = getActiveSkill();
    const now = new Date().toISOString();
    const session = {
      id: `session-${Date.now()}`,
      title: skill ? `${skill.name} 会话` : "新会话",
      skillId: skill ? skill.id : window.DEFAULT_WORKSPACE.activeSkillId,
      createdAt: now,
      updatedAt: now,
      artifacts: [],
      messages: [
        {
          role: "assistant",
          content: "新会话已创建。你可以直接输入任务背景，我会先路由再回答。"
        }
      ]
    };
    state.sessions.unshift(session);
    state.activeSessionId = session.id;
    state.activeSkillId = session.skillId;
    persist();
    renderAll();
  }

  function setActiveSkill(skillId) {
    const skill = getSkillById(skillId);
    if (!skill) return;
    state.activeSkillId = skill.id;
    const session = getActiveSession();
    if (session) {
      session.skillId = skill.id;
      session.updatedAt = new Date().toISOString();
      if (!session.title || session.title === "新会话") {
        session.title = `${skill.name} 会话`;
      }
    }
    persist();
    renderAll();
  }

  function setActiveSession(sessionId) {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) return;
    state.activeSessionId = session.id;
    state.activeSkillId = session.skillId;
    persist();
    renderAll();
  }

  async function sendMessage() {
    if (isSending) return;
    const input = els.messageInput.value.trim();
    const attachments = pendingAttachments.map((attachment) => ({ ...attachment }));
    if (!input && !attachments.length) return;
    isSending = true;
    els.sendBtn.disabled = true;
    const userContent = input || "请分析我上传的附件，并给出可执行建议。";

    const routed = await routeSkill(userContent);
    const routedSkill = routed.skill || getActiveSkill();
    if (routedSkill && routedSkill.id !== state.activeSkillId) {
      state.activeSkillId = routedSkill.id;
    }
    state.lastRouteReason = buildRouteReason(userContent, routedSkill, routed.matches, routed);
    state.routeTrace = {
      query: userContent,
      selectedSkillId: routedSkill?.id || "",
      strategy: routed.strategy,
      score: routed.score || 0,
      confidence: routed.confidence || 0,
      reason: routed.reason || "",
      candidates: (routed.candidates || []).map((candidate) => ({
        skillId: candidate.skill.id,
        name: candidate.skill.name,
        score: candidate.score,
        reasons: candidate.reasons
      })),
      timestamp: new Date().toISOString()
    };

    const session = getActiveSession();
    if (!session) {
      isSending = false;
      els.sendBtn.disabled = false;
      return;
    }

    session.skillId = state.activeSkillId;
    const userMessage = { role: "user", content: userContent, attachments };
    session.messages.push(userMessage);
    session.updatedAt = new Date().toISOString();
    if (!session.title || session.title === "新会话") {
      session.title = userContent.slice(0, 24);
    }
    els.messageInput.value = "";
    syncComposerHeight();
    pendingAttachments = [];
    persist();
    const assistantMessage = {
      role: "assistant",
      content: "",
      loading: true,
      status: "正在思考"
    };
    ensureMessageId(userMessage);
    ensureMessageId(assistantMessage);
    session.messages.push(assistantMessage);
    els.messageList.dataset.userDetached = "false";
    renderAll();
    scrollMessagesToBottom();

    try {
      const skill = getActiveSkill();
      const onUpdate = createStreamUpdater(assistantMessage);
      const reply = await generateReplyOrTool(session, skill, userMessage, onUpdate);
      onUpdate(reply || assistantMessage.content || "没有收到模型输出。", { flush: true });
    } catch (error) {
      updateMessageContent(assistantMessage, `请求失败：${error.message}`);
    } finally {
      session.updatedAt = new Date().toISOString();
      persist();
      isSending = false;
      els.sendBtn.disabled = false;
      renderSessions();
      renderInspector();
      renderWorkspaceStats();
      updateStatus();
    }
  }

  async function generateReplyOrTool(session, skill, userMessage, onUpdate) {
    const toolResult = runSkillToolAdapter(skill, userMessage);
    if (!toolResult) {
      return state.settings.streamOutput
        ? generateReplyStream(session, skill, userMessage, onUpdate)
        : generateReply(session, skill, userMessage);
    }

    const message = session.messages.find((item) => item.id === userMessage.id);
    const assistant = session.messages.find((item) => item.role === "assistant" && item.loading);
    if (assistant) {
      assistant.tool = toolResult.tool;
      assistant.artifact = toolResult.artifact || null;
    }
    session.artifacts = [...(session.artifacts || []), {
      ...toolResult,
      createdAt: new Date().toISOString()
    }];
    if (message) message.toolInput = toolResult.input || null;
    return state.settings.streamOutput
      ? streamLocalText(toolResult.content, onUpdate)
      : toolResult.content;
  }

  async function generateReply(session, skill, userMessage) {
    const messages = buildPromptMessages(session, skill, userMessage);
    if (!state.settings.apiKey) {
      return buildDemoReply(skill, userMessage);
    }

    try {
      const request = buildModelRequest(messages);
      const response = await fetch(request.url, request);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return extractModelText(data, state.settings.protocol) || buildDemoReply(skill, userMessage);
    } catch (error) {
      return `${buildDemoReply(skill, userMessage)}\n\n[API 回退] ${error.message}`;
    }
  }

  async function generateReplyStream(session, skill, userMessage, onUpdate) {
    const messages = buildPromptMessages(session, skill, userMessage);
    if (!state.settings.apiKey) {
      return streamLocalText(buildDemoReply(skill, userMessage), onUpdate);
    }

    try {
      const request = buildModelRequest(messages, { stream: true });
      const response = await fetch(request.url, request);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      if (!response.body || contentType.includes("application/json")) {
        const data = await response.json();
        const text = extractModelText(data, state.settings.protocol) || buildDemoReply(skill, userMessage);
        onUpdate(text);
        return text;
      }

      const streamed = await readStreamingResponse(response, state.settings.protocol, onUpdate);
      return streamed || buildDemoReply(skill, userMessage);
    } catch (error) {
      const fallback = `${buildDemoReply(skill, userMessage)}\n\n[API 回退] ${error.message}`;
      await streamLocalText(fallback, onUpdate);
      return fallback;
    }
  }

  async function readStreamingResponse(response, protocol, onUpdate) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
    let finished = false;

    const append = (delta) => {
      if (!delta) return;
      fullText += delta;
      onUpdate(fullText);
    };

    while (!finished) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        const result = readStreamLine(line, protocol);
        if (result.done) {
          finished = true;
          break;
        }
        append(result.delta);
      }
    }

    if (buffer.trim() && !finished) {
      const result = readStreamLine(buffer, protocol);
      append(result.delta);
    }
    return fullText.trim();
  }

  function readStreamLine(line, protocol) {
    const trimmed = String(line || "").trim();
    if (!trimmed || trimmed.startsWith(":") || trimmed.startsWith("event:")) {
      return { delta: "", done: false };
    }
    const payload = trimmed.startsWith("data:") ? trimmed.slice(5).trim() : trimmed;
    if (!payload || payload === "[DONE]") {
      return { delta: "", done: payload === "[DONE]" };
    }
    if (!payload.startsWith("{") && !payload.startsWith("[")) {
      return { delta: payload, done: false };
    }
    try {
      return { delta: extractStreamDelta(JSON.parse(payload), protocol), done: false };
    } catch {
      return { delta: "", done: false };
    }
  }

  function extractStreamDelta(data, protocol) {
    if (protocol === "anthropic") {
      if (data?.type === "content_block_delta" && typeof data?.delta?.text === "string") return data.delta.text;
      if (typeof data?.completion === "string") return data.completion;
    }
    if (Array.isArray(data?.choices)) {
      const choice = data.choices[0] || {};
      if (typeof choice?.delta?.content === "string") return choice.delta.content;
      if (Array.isArray(choice?.delta?.content)) {
        return choice.delta.content.map((part) => part?.text || "").filter(Boolean).join("");
      }
      if (typeof choice?.text === "string") return choice.text;
    }
    if (protocol === "gemini") {
      return extractModelText(data, "gemini");
    }
    if (typeof data?.delta === "string") return data.delta;
    if (typeof data?.output_text_delta === "string") return data.output_text_delta;
    if (data?.type === "response.output_text.delta" && typeof data?.delta === "string") return data.delta;
    return "";
  }

  async function streamLocalText(text, onUpdate) {
    const source = String(text || "");
    let cursor = 0;
    while (cursor < source.length) {
      cursor += source[cursor] === "\n" ? 1 : 10;
      onUpdate(source.slice(0, cursor));
      await delay(28);
    }
    return source;
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function runSkillToolAdapter(skill, userMessage) {
    if (!skill) return null;
    const adapter = skill.toolAdapter || inferToolAdapter(skill.id);
    if (!adapter) return null;
    const input = collectToolInput(userMessage);
    if (adapter === "profit-margin") return runProfitMarginTool(input, skill);
    if (adapter === "review-checker" || adapter === "review-analysis") return runReviewTool(input, skill, adapter);
    if (adapter === "restock") return runRestockTool(input, skill);
    if (adapter === "competitor-price") return runCompetitorPriceTool(input, skill);
    return null;
  }

  function inferToolAdapter(skillId) {
    const id = String(skillId || "");
    if (id.includes("profit-margin-calculator")) return "profit-margin";
    if (id.includes("review-checker")) return "review-checker";
    if (id === "product-review-analysis") return "review-analysis";
    if (id.includes("restock-alert") || id.includes("supply-chain-optimization")) return "restock";
    if (id.includes("competitor-price-analysis") || id.includes("competitor-price-tracker")) return "competitor-price";
    return "";
  }

  function collectToolInput(userMessage) {
    const attachments = Array.isArray(userMessage?.attachments) ? userMessage.attachments : [];
    const texts = attachments.map((attachment) => attachment.text || "").filter(Boolean);
    const records = texts.flatMap(parseStructuredRecords);
    return {
      text: String(userMessage?.content || ""),
      attachments,
      records,
      rawText: texts.join("\n")
    };
  }

  function parseStructuredRecords(text) {
    const source = String(text || "").trim();
    if (!source) return [];
    try {
      const json = JSON.parse(source);
      if (Array.isArray(json)) return json.filter((item) => item && typeof item === "object");
      if (json && typeof json === "object") return Array.isArray(json.items) ? json.items : [json];
    } catch {
      // Continue with CSV parsing.
    }
    const lines = source.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length < 2 || !lines[0].includes(",")) return [];
    const headers = splitCsvLine(lines[0]).map(normalizeFieldName);
    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line);
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || "";
        return row;
      }, {});
    });
  }

  function splitCsvLine(line) {
    const result = [];
    let current = "";
    let quoted = false;
    for (const char of String(line || "")) {
      if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  function normalizeFieldName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[\s_-]+/g, "")
      .replace(/[()（）]/g, "");
  }

  function readNumber(input, aliases) {
    const source = typeof input === "object" ? input : {};
    for (const alias of aliases) {
      const key = normalizeFieldName(alias);
      const entry = Object.entries(source).find(([name]) => normalizeFieldName(name) === key);
      if (entry) {
        const value = Number(String(entry[1]).replace(/[^0-9.-]/g, ""));
        if (Number.isFinite(value)) return value;
      }
    }
    const text = typeof input === "string" ? input : "";
    for (const alias of aliases) {
      const match = text.match(new RegExp(`${escapeRegExp(alias)}[^0-9-]*(-?[0-9]+(?:\\.[0-9]+)?)`, "i"));
      if (match) return Number(match[1]);
    }
    return null;
  }

  function readTextValue(input, aliases) {
    if (!input || typeof input !== "object") return "";
    for (const alias of aliases) {
      const key = normalizeFieldName(alias);
      const entry = Object.entries(input).find(([name]) => normalizeFieldName(name) === key);
      if (entry && entry[1] !== undefined) return String(entry[1]).trim();
    }
    return "";
  }

  function formatMoney(value) {
    return Number.isFinite(Number(value)) ? `$${Number(value).toFixed(2)}` : "-";
  }

  function makeToolResult(tool, content, artifact, input) {
    return { tool, content, artifact, input };
  }

  function runProfitMarginTool(input, skill) {
    const platform = (skill.platform || []).find((item) => item !== "E-Commerce") || "Amazon";
    const sourceRows = input.records.length ? input.records : [input.text];
    const rows = sourceRows.map((row) => {
      const price = readNumber(row, ["selling_price", "selling price", "sale_price", "sellingPrice", "\u552e\u4ef7", "\u9500\u552e\u4ef7", "price"]);
      const productCost = readNumber(row, ["product_cost", "product cost", "purchase_price", "productCost", "\u91c7\u8d2d\u4ef7", "\u91c7\u8d2d\u6210\u672c", "\u4ea7\u54c1\u6210\u672c", "cost"]);
      const shipping = readNumber(row, ["shipping_cost", "shipping cost", "shippingCost", "\u7269\u6d41\u6210\u672c", "\u8fd0\u8d39", "shipping"]) || 0;
      const fulfillment = readNumber(row, ["fba_fulfillment_fee", "fulfillment_fee", "fba_fee", "wfs_fee", "fbt_fee", "fulfillmentFee", "\u914d\u9001\u8d39", "\u5c65\u7ea6\u8d39"]) || 0;
      const storage = readNumber(row, ["storage_fee", "fba_storage_fee", "storageFee", "\u4ed3\u50a8\u8d39"]) || 0;
      const adRatio = readNumber(row, ["ad_spend_ratio", "ad_ratio", "ad spend ratio", "adRatio", "\u5e7f\u544a\u8d39\u7387", "\u5e7f\u544a\u5360\u6bd4"]) || 0;
      const otherFees = readNumber(row, ["other_fees", "other fees", "otherFees", "\u5176\u4ed6\u8d39\u7528"]) || 0;
      const referralRate = platform === "Amazon" ? 0.15 : platform === "Walmart" ? 0.15 : platform === "TikTok Shop" ? 0.06 : 0.029;
      if (!Number.isFinite(price) || !Number.isFinite(productCost)) return { missing: true, platform };
      const referral = price * referralRate;
      const fulfillmentFee = fulfillment || (platform === "Amazon" ? 3.22 : 0);
      const ad = price * (adRatio > 1 ? adRatio / 100 : adRatio);
      const totalCost = productCost + shipping + fulfillmentFee + storage + referral + ad + otherFees;
      const profit = price - totalCost;
      return {
        sku: readTextValue(row, ["sku", "asin", "product_id", "\u5546\u54c1", "\u4ea7\u54c1"]) || "SKU",
        price,
        totalCost,
        profit,
        margin: price ? profit / price : 0,
        breakEven: Math.max(0, (productCost + shipping + fulfillmentFee + storage + otherFees) / (1 - referralRate - (adRatio > 1 ? adRatio / 100 : adRatio)))
      };
    });
    if (rows.every((row) => row.missing)) {
      return makeToolResult("profit-margin", "\u8bf7\u8865\u5145\u5229\u6da6\u8ba1\u7b97\u53c2\u6570\uff1a\u552e\u4ef7\u3001\u4ea7\u54c1\u6210\u672c\u3002\u53ef\u9009\uff1a\u8fd0\u8d39\u3001\u5e73\u53f0\u8d39\u3001\u5e7f\u544a\u8d39\u7387\u3001\u4ed3\u50a8\u8d39\u3001\u5176\u4ed6\u8d39\u7528\u3002", null, { platform });
    }
    const valid = rows.filter((row) => !row.missing);
    const lines = [`## \u5229\u6da6\u8ba1\u7b97\u5de5\u5177\u7ed3\u679c`, `\u5e73\u53f0\uff1a${platform}`, ""];
    valid.forEach((row) => lines.push(`- ${row.sku}\uff1a\u552e\u4ef7 ${formatMoney(row.price)}\uff0c\u603b\u6210\u672c ${formatMoney(row.totalCost)}\uff0c\u51c0\u5229\u6da6 ${formatMoney(row.profit)}\uff0c\u51c0\u5229\u6da6\u7387 ${(row.margin * 100).toFixed(1)}%\uff0c\u4fdd\u672c\u4ef7 ${formatMoney(row.breakEven)}`));
    return makeToolResult("profit-margin", lines.join("\n"), { type: "profit-margin", rows: valid }, { platform });
  }

  function runReviewTool(input, skill, adapter) {
    const rows = input.records.length ? input.records : input.rawText.split(/\r?\n/).filter(Boolean).map((content) => ({ content }));
    const reviews = rows.map((row) => ({
      content: readTextValue(row, ["content", "review", "review_text", "body", "\u8bc4\u8bba", "\u8bc4\u8bba\u5185\u5bb9", "text"]) || String(row),
      rating: readNumber(row, ["rating", "stars", "score", "\u8bc4\u5206", "\u661f\u7ea7"])
    })).filter((row) => row.content && row.content !== "[object Object]");
    if (!reviews.length) {
      return makeToolResult(adapter, "\u8bf7\u63d0\u4f9b\u8bc4\u8bba\u6587\u672c\uff0c\u53ef\u76f4\u63a5\u7c98\u8d34\uff0c\u6216\u62d6\u5165 CSV/JSON \u6587\u4ef6\u3002", null, {});
    }
    const normalized = reviews.map((row) => row.content.toLowerCase().replace(/\s+/g, " ").trim());
    const suspicious = [];
    normalized.forEach((content, index) => {
      const duplicate = normalized.filter((item) => item === content).length > 1;
      const generic = content.length < 18 || /great product|good product|love it|awesome/i.test(content);
      const mismatch = reviews[index].rating === 1 && /great|excellent|love|perfect/i.test(content);
      const risk = (duplicate ? 45 : 0) + (generic ? 25 : 0) + (mismatch ? 20 : 0);
      if (risk >= 40) suspicious.push({ index: index + 1, risk, content: reviews[index].content });
    });
    const riskScore = Math.min(100, Math.round((suspicious.length / reviews.length) * 100));
    const content = [
      `## \u8bc4\u8bba\u68c0\u6d4b\u7ed3\u679c`,
      `\u6837\u672c\u6570\uff1a${reviews.length}\uff0c\u53ef\u7591\u6bd4\u4f8b\uff1a${riskScore}%`,
      suspicious.length ? `\u53ef\u7591\u9879\uff1a${suspicious.slice(0, 8).map((item) => `#${item.index}(${item.risk})`).join("\u3001")}` : "\u672a\u53d1\u73b0\u9ad8\u98ce\u9669\u91cd\u590d\u6a21\u5f0f\u3002",
      "",
      "\u6ce8\uff1a\u8fd9\u662f\u524d\u7aef\u786e\u5b9a\u6027\u521d\u7b5b\uff0c\u53ef\u4ee5\u518d\u8ba9\u6a21\u578b\u505a\u8bed\u4e49\u590d\u6838\u3002"
    ].join("\n");
    return makeToolResult(adapter, content, { type: adapter, total: reviews.length, riskScore, suspicious }, { total: reviews.length });
  }

  function runRestockTool(input, skill) {
    const row = input.records[0] || input.text;
    const dailySales = readNumber(row, ["daily_sales", "sales_velocity", "daily sales", "dailySales", "\u65e5\u5747\u9500\u91cf", "\u65e5\u9500\u91cf", "\u9500\u91cf"]);
    const currentStock = readNumber(row, ["current_stock", "stock", "available_stock", "currentStock", "\u5f53\u524d\u5e93\u5b58", "\u53ef\u552e\u5e93\u5b58", "\u5e93\u5b58", "\u5e93\u5b58\u91cf"]);
    const leadTime = readNumber(row, ["lead_time_days", "lead time", "restock_days", "leadTime", "\u8865\u8d27\u5468\u671f", "\u8865\u8d27\u5929\u6570", "\u5230\u8d27\u5929\u6570", "\u4ea4\u8d27\u5929\u6570", "\u4f9b\u8d27\u5929\u6570"]);
    const safetyDays = readNumber(row, ["safety_days", "safety stock days", "safetyDays", "\u5b89\u5168\u5e93\u5b58\u5929\u6570"]) || 7;
    if (![dailySales, currentStock, leadTime].every((value) => Number.isFinite(value)) || dailySales <= 0) {
      return makeToolResult("restock", "\u8bf7\u8865\u5145\u5e93\u5b58\u8865\u8d27\u53c2\u6570\uff1a\u65e5\u5747\u9500\u91cf\u3001\u5f53\u524d\u5e93\u5b58\u3001\u8865\u8d27\u5468\u671f\uff08\u5929\uff09\u3002\u53ef\u9009\uff1a\u5b89\u5168\u5e93\u5b58\u5929\u6570\u3002", null, {});
    }
    const reorderPoint = dailySales * (leadTime + safetyDays);
    const stockoutDays = currentStock / dailySales;
    const orderQuantity = Math.max(0, Math.ceil(reorderPoint - currentStock));
    const risk = stockoutDays <= leadTime ? "\u9ad8" : stockoutDays <= leadTime + safetyDays ? "\u4e2d" : "\u4f4e";
    const content = [
      "## \u5e93\u5b58\u8865\u8d27\u5de5\u5177\u7ed3\u679c",
      `\u65e5\u5747\u9500\u91cf ${dailySales}\uff0c\u5f53\u524d\u5e93\u5b58 ${currentStock}\uff0c\u8865\u8d27\u5468\u671f ${leadTime} \u5929`,
      `\u9884\u8ba1\u65ad\u8d27\u5929\u6570\uff1a${stockoutDays.toFixed(1)} \u5929\uff0c\u98ce\u9669\uff1a${risk}`,
      `\u5efa\u8bae\u518d\u8ba2\u70b9\uff1a${Math.ceil(reorderPoint)}\uff0c\u5efa\u8bae\u8865\u8d27\u91cf\uff1a${orderQuantity}`,
      "\u8ba1\u7b97\u53e3\u5f84\uff1a\u65e5\u5747\u9500\u91cf \u00d7\uff08\u8865\u8d27\u5468\u671f\uff0b\u5b89\u5168\u5e93\u5b58\u5929\u6570\uff09\u3002"
    ].join("\n");
    return makeToolResult("restock", content, { type: "restock", dailySales, currentStock, leadTime, safetyDays, reorderPoint, stockoutDays, orderQuantity, risk }, { dailySales, currentStock, leadTime, safetyDays });
  }

  function runCompetitorPriceTool(input, skill) {
    const rows = input.records.map((row) => ({
      name: readTextValue(row, ["name", "sku", "product", "competitor_name", "title", "\u4ea7\u54c1", "\u7ade\u54c1"]) || "\u5546\u54c1",
      price: readNumber(row, ["price", "competitor_price", "competitorPrice", "\u4ef7\u683c", "\u7ade\u54c1\u4ef7\u683c"])
    })).filter((row) => Number.isFinite(row.price));
    if (!rows.length) {
      return makeToolResult("competitor-price", "\u8bf7\u63d0\u4f9b\u7ade\u54c1\u540d\u79f0\u548c\u4ef7\u683c\uff0c\u53ef\u4f7f\u7528 CSV/JSON \u9644\u4ef6\u3002", null, {});
    }
    const prices = rows.map((row) => row.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((sum, value) => sum + value, 0) / prices.length;
    const content = [
      "## \u7ade\u54c1\u4ef7\u683c\u5de5\u5177\u7ed3\u679c",
      `\u6837\u672c ${rows.length} \u4e2a\uff0c\u6700\u4f4e ${formatMoney(min)}\uff0c\u5747\u503c ${formatMoney(avg)}\uff0c\u6700\u9ad8 ${formatMoney(max)}`,
      ...rows.slice(0, 10).map((row) => `- ${row.name}\uff1a${formatMoney(row.price)}`)
    ].join("\n");
    return makeToolResult("competitor-price", content, { type: "competitor-price", rows, min, max, avg }, { count: rows.length });
  }

  function buildPromptMessages(session, skill) {
    const capabilities = getCapabilitySettings();
    const contextDepth = capabilities.longContext ? 16 : 8;
    const eligibleMessages = session.messages
      .filter((message) => !message.loading)
      .map((message) => ({
        role: message.role,
        content: message.content,
        attachments: message.attachments || []
      }));
    const context = capabilities.autoContext
      ? buildCompressedContext(eligibleMessages, contextDepth)
      : eligibleMessages.slice(-contextDepth);
    const recent = context
      .map((message) => ({
        role: message.role,
        content: message.content,
        attachments: message.attachments || []
      }));
    const system = {
      role: "system",
      content: [
        skill ? skill.systemPrompt : "你是一个可靠的电商 AI 助手。",
        skill ? `可用能力：${(skill.capabilities || []).join("；")}` : "",
        skill ? `必须输出：${(skill.outputs || []).join("；")}` : "",
        `模型能力策略：图片识别=${capabilities.vision ? "开启" : "关闭"}；文件文本识别=${capabilities.fileText ? "开启" : "关闭"}；保留原始多模态输入=${capabilities.preserveAttachments ? "开启" : "关闭"}；长上下文=${capabilities.longContext ? "开启" : "关闭"}；深度推理=${capabilities.reasoning ? "开启" : "关闭"}。`,
        "请返回实用、结构化、可执行的内容。",
        capabilities.reasoning ? "复杂任务先做关键判断，再给结论和步骤；不要因为前端封装而省略模型原生能力。" : "",
        "如果信息不足，请明确写出你的假设。"
      ].filter(Boolean).join(" ")
    };
    return [system, ...recent];
  }

  function buildCompressedContext(messages, contextDepth) {
    if (messages.length <= contextDepth + 4) return messages.slice(-contextDepth);
    const older = messages.slice(0, -contextDepth);
    const recent = messages.slice(-contextDepth);
    const summary = older
      .map((message) => `${message.role === "user" ? "用户" : "助手"}：${summarizeInput(message.content || "")}`)
      .filter((line) => line.length > 4)
      .slice(-12)
      .join("\n");
    return [
      {
        role: "system",
        content: `历史上下文摘要（自动压缩）：\n${summary}`
      },
      ...recent
    ];
  }

  function buildDemoReply(skill, userMessage) {
    const content = typeof userMessage === "string" ? userMessage : userMessage?.content || "";
    const attachments = Array.isArray(userMessage?.attachments) ? userMessage.attachments : [];
    const lines = [];
    lines.push(`已路由到：${skill ? skill.name : "默认助手"}`);
    lines.push("");
    lines.push("判断：");
    lines.push(`- 你的输入重点是：${summarizeInput(content)}`);
    if (attachments.length) {
      lines.push(`- 已接收附件：${attachments.map((item) => item.name).join("、")}`);
    }
    lines.push("- 我会先用本地规则给出一个可执行框架。");
    lines.push("");
    lines.push("建议：");
    lines.push("- 先补齐业务背景、目标值、时间范围和约束。");
    lines.push("- 再按优先级拆成 3 步：诊断、排序、执行。");
    lines.push("");
    lines.push("下一步：");
    lines.push("- 你可以把产品、平台、销量、毛利、预算发给我。");
    lines.push("- 我会按当前 skill 输出一版结构化计划。");
    return lines.join("\n");
  }

  function legacyRouteSkill(text) {
    const haystack = text.toLowerCase();
    let winner = null;
    let score = 0;
    let matches = [];
    for (const skill of allSkills()) {
      let current = 0;
      const currentMatches = [];
      const tokens = [
        skill.name,
        skill.category,
        ...(skill.platform || []),
        ...(skill.triggers || []),
        ...(skill.capabilities || [])
      ].filter(Boolean);
      for (const token of tokens) {
        const normalized = String(token).toLowerCase();
        if (haystack.includes(normalized)) {
          current += 1;
          currentMatches.push(token);
        }
      }
      if (current > score) {
        score = current;
        winner = skill;
        matches = currentMatches;
      }
    }
    return score > 0 ? { skill: winner, matches } : { skill: null, matches: [] };
  }

  async function routeSkill(text) {
    const candidates = recallSkillCandidates(text, ROUTER_TOP_K);
    if (!candidates.length) {
      return {
        skill: null,
        matches: [],
        candidates: [],
        strategy: "local-recall",
        score: 0,
        confidence: 0,
        reason: "没有候选 skill"
      };
    }

    const localWinner = candidates[0];
    if (!state.settings.apiKey || localWinner.score < 3) {
      return {
        skill: localWinner.skill,
        matches: localWinner.reasons,
        candidates,
        strategy: "local-recall",
        score: localWinner.score,
        confidence: localWinner.confidence,
        reason: "本地召回结果"
      };
    }

    try {
      const decision = await requestModelRouteDecision(text, candidates);
      const selected = candidates.find((candidate) => candidate.skill.id === decision.skillId);
      if (selected && Number(decision.confidence) >= ROUTER_MODEL_MIN_CONFIDENCE) {
        return {
          skill: selected.skill,
          matches: selected.reasons,
          candidates,
          strategy: "local-top5-model-selection",
          score: selected.score,
          confidence: Number(decision.confidence),
          reason: decision.reason || "模型在本地 Top 5 候选中完成结构化选择"
        };
      }
    } catch {
      // Routing must remain usable when the model endpoint is unavailable.
    }

    return {
      skill: localWinner.skill,
      matches: localWinner.reasons,
      candidates,
      strategy: "local-recall-fallback",
      score: localWinner.score,
      confidence: localWinner.confidence,
      reason: "模型路由不可用，回退到本地 Top 5 召回首选"
    };
  }

  function recallSkillCandidates(text, limit = ROUTER_TOP_K) {
    const query = normalizeRouteText(text);
    const queryTerms = new Set(extractRouteTerms(query));
    const queryPlatforms = detectQueryPlatforms(query);
    return allSkills()
      .map((skill) => scoreSkillCandidate(skill, query, queryTerms, queryPlatforms))
      .filter((candidate) => candidate.score > 0)
      .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name, "zh-CN"))
      .slice(0, limit)
      .map((candidate, index, list) => ({
        ...candidate,
        rank: index + 1,
        confidence: calculateCandidateConfidence(candidate, list)
      }));
  }

  function scoreSkillCandidate(skill, query, queryTerms, queryPlatforms) {
    const routing = skill.routing || {};
    const phrases = [...(routing.phrases || []), ...(skill.triggers || [])].filter(Boolean);
    const tokens = [
      ...(routing.tokens || []),
      skill.id,
      skill.name,
      skill.sourceName,
      skill.category,
      skill.groupName,
      skill.groupLabel,
      ...(skill.platform || []),
      ...(skill.capabilities || [])
    ].filter(Boolean);
    let score = 0;
    const reasons = [];
    const normalizedQuery = normalizeRouteText(query);
    const queryHasCompetitorPrice = /竞品.{0,4}(价格|售价)|竞争对手.{0,4}(价格|售价)|competitor.{0,12}price|price.{0,12}(competitor|tracking)/i.test(query);
    const queryHasProfit = /利润|毛利|净利|利润率|profit|margin/i.test(query);
    const skillIsCompetitorPrice = /competitor-price/.test(skill.id) || routing.intent === "competitor-price";
    const skillIsProfit = routing.intent === "profit" || /profit-margin|pricing-strategy|price-optimization|dynamic-pricing/.test(skill.id);
    const skillIsProfitCalculator = /^profit-margin-calculator/.test(skill.id);
    const queryHasTitleOptimization = /listing.{0,8}(title|keyword)|title.{0,8}(keyword|optimization)|\u6807\u9898|\u5173\u952e\u8bcd/i.test(query);
    const queryHasPriceComparison = /\u5bf9\u6bd4|\u5206\u6790|compare|comparison|analy[sz]e/i.test(query);
    const queryHasPriceTracking = /\u8ffd\u8e2a|\u76d1\u63a7|tracking|monitor/i.test(query);

    for (const phrase of phrases) {
      const normalizedPhrase = normalizeRouteText(phrase);
      if (normalizedPhrase.length >= 3 && normalizedQuery.includes(normalizedPhrase)) {
        const weight = normalizedPhrase.length >= 6 ? 12 : 7;
        score += weight;
        reasons.push(`短语:${phrase}`);
      }
    }

    if (queryHasCompetitorPrice && skillIsCompetitorPrice) {
      score += 18;
      reasons.push("任务:竞品价格");
    } else if (queryHasCompetitorPrice && skillIsProfit) {
      score -= 12;
    }
    if (queryHasProfit && skillIsProfit) {
      score += 10;
      reasons.push("任务:利润计算");
    } else if (queryHasProfit && skillIsCompetitorPrice) {
      score -= 8;
    }
    if (queryHasProfit && skillIsProfitCalculator) {
      score += 16;
      reasons.push("涓撳睘:利润率计算器");
    } else if (queryHasProfit && skillIsProfit && !skillIsProfitCalculator) {
      score -= 6;
    }
    if (queryHasTitleOptimization && skill.id === "product-title-optimization") {
      score += 12;
      reasons.push("涓撳睘:产品标题优化");
    }
    if (queryHasPriceComparison && skill.id === "competitor-price-analysis") {
      score += 8;
      reasons.push("动作:价格对比");
    } else if (queryHasPriceTracking && skill.id === "competitor-price-tracker") {
      score += 8;
      reasons.push("动作:价格追踪");
    }

    for (const token of tokens) {
      const normalizedToken = normalizeRouteText(token);
      if (normalizedToken.length < 2 || ROUTER_GENERIC_TERMS.has(normalizedToken)) continue;
      if (queryTerms.has(normalizedToken) || normalizedQuery.includes(normalizedToken)) {
        const weight = normalizedToken.length >= 5 ? 3.5 : 2;
        score += weight;
        reasons.push(`词:${token}`);
      }
    }

    const skillPlatforms = (skill.platform || []).map(normalizePlatformName);
    const matchedPlatforms = queryPlatforms.filter((platform) => skillPlatforms.includes(platform));
    if (matchedPlatforms.length) {
      score += 8 * matchedPlatforms.length;
      reasons.push(`平台:${matchedPlatforms.join("/")}`);
    } else if (queryPlatforms.length && skillPlatforms.length && !skillPlatforms.includes("E-Commerce")) {
      score -= 3;
    }

    const intent = routing.intent || "";
    if (intent && queryTerms.has(intent)) {
      score += 5;
      reasons.push(`意图:${intent}`);
    }

    return {
      skill,
      score: Math.max(0, Number(score.toFixed(2))),
      reasons: [...new Set(reasons)].slice(0, 8)
    };
  }

  function calculateCandidateConfidence(candidate, candidates) {
    const second = candidates.find((item) => item.skill.id !== candidate.skill.id);
    const margin = candidate.score - (second?.score || 0);
    return Math.min(0.99, Math.max(0.05, (candidate.score / 32) + (margin / 40)));
  }

  function normalizeRouteText(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[\s\-_/.,，。:：;；|/]+/g, "")
      .trim();
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function extractRouteTerms(value) {
    const text = normalizeRouteText(value);
    const terms = text.match(/[a-z0-9]{2,}|[\u4e00-\u9fa5]{2,}/g) || [];
    const cjk = [];
    for (const term of terms.filter((item) => /[\u4e00-\u9fa5]/.test(item))) {
      cjk.push(term);
      for (let size = 2; size <= Math.min(5, term.length); size += 1) {
        for (let index = 0; index + size <= term.length; index += 1) {
          cjk.push(term.slice(index, index + size));
        }
      }
    }
    return [...new Set([...terms, ...cjk])];
  }

  function detectQueryPlatforms(query) {
    const names = ["Amazon Ads", "Amazon", "Walmart", "Shopify", "Etsy", "eBay", "TikTok Shop", "Meta", "Google", "WooCommerce", "DTC"];
    return names
      .filter((name) => normalizeRouteText(query).includes(normalizeRouteText(name)))
      .map(normalizePlatformName);
  }

  function normalizePlatformName(value) {
    const lower = normalizeRouteText(value);
    if (lower.includes("\u7535\u5546") || lower.includes("ecommerce") || lower.includes("e-commerce")) return "E-Commerce";
    if (lower.includes("tiktok")) return "TikTok Shop";
    if (lower.includes("amazon")) return lower.includes("ads") ? "Amazon Ads" : "Amazon";
    if (lower.includes("walmart")) return "Walmart";
    if (lower.includes("shopify")) return "Shopify";
    if (lower.includes("etsy")) return "Etsy";
    if (lower.includes("ebay")) return "eBay";
    if (lower.includes("meta") || lower.includes("facebook") || lower.includes("instagram")) return "Meta";
    if (lower.includes("google")) return "Google";
    if (lower.includes("woocommerce")) return "WooCommerce";
    if (lower.includes("dtc")) return "DTC";
    return String(value || "");
  }

  async function requestModelRouteDecision(text, candidates) {
    const candidateText = candidates
      .map((candidate) => JSON.stringify({
        id: candidate.skill.id,
        name: candidate.skill.name,
        platform: candidate.skill.platform,
        category: candidate.skill.category,
        intent: candidate.skill.routing?.intent || "",
        score: candidate.score,
        reasons: candidate.reasons
      }))
      .join("\n");
    const messages = [
      {
        role: "system",
        content: [
          "你是 skill 路由器，只能从候选列表中选择一个 skill。",
          "必须返回 JSON，不要 Markdown：{\"skillId\":\"候选id\",\"confidence\":0到1之间的数字,\"reason\":\"简短理由\"}。",
          "如果候选都不合适，选择最接近者并把 confidence 设为 0.2。"
        ].join("\n")
      },
      {
        role: "user",
        content: `用户任务：${text}\n候选 skill：\n${candidateText}`
      }
    ];
    const request = buildModelRequest(messages);
    const response = await fetch(request.url, request);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const raw = extractModelText(data, state.settings.protocol);
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("路由模型未返回 JSON");
    const parsed = JSON.parse(match[0]);
    return {
      skillId: String(parsed.skillId || ""),
      confidence: Number(parsed.confidence) || 0,
      reason: String(parsed.reason || "")
    };
  }

  function buildRouteReason(text, skill, matches, routing) {
    if (!skill) {
      return `没有为“${summarizeInput(text)}”找到强关键词匹配，因此工作区继续使用当前技能。`;
    }
    const preview = matches.slice(0, 4).join(", ");
    return `已将“${summarizeInput(text)}”路由到「${skill.name}」，命中依据：${preview || "技能元数据"}。`;
  }

  function getFilteredSkills() {
    const search = state.searchText.trim().toLowerCase();
    return allSkills().filter((skill) => {
      const categoryOk = state.categoryFilter === "all" || skill.category === state.categoryFilter;
      const platformOk = state.platformFilter === "all" || (skill.platform || []).includes(state.platformFilter);
      const text = [
        skill.name,
        skill.sourceName,
        skill.category,
        skill.groupLabel,
        skill.groupName,
        skill.summary,
        skill.sourceSummary,
        (skill.platform || []).join(" "),
        (skill.triggers || []).join(" "),
        (skill.capabilities || []).join(" ")
      ]
        .join(" ")
        .toLowerCase();
      const searchOk = !search || text.includes(search);
      return categoryOk && platformOk && searchOk;
    });
  }

  function allSkills() {
    return [...window.SKILL_LIBRARY, ...(state.customSkills || [])];
  }

  function groupSkills(skills) {
    const map = new Map();
    for (const skill of skills) {
      const key = skill.groupKey || skill.category || "other";
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: skill.groupLabel || getCategoryLabel(skill.category),
          order: Number.isFinite(skill.groupOrder) ? skill.groupOrder : 999,
          skills: []
        });
      }
      map.get(key).skills.push(skill);
    }
    return [...map.values()]
      .map((group) => ({
        ...group,
        skills: group.skills.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))
      }))
      .sort((a, b) => (a.order === b.order ? a.label.localeCompare(b.label, "zh-CN") : a.order - b.order));
  }

  function getSkillById(skillId) {
    return allSkills().find((skill) => skill.id === skillId) || null;
  }

  function getActiveSkill() {
    return getSkillById(state.activeSkillId) || allSkills()[0] || null;
  }

  function getActiveSession() {
    return state.sessions.find((session) => session.id === state.activeSessionId) || state.sessions[0] || null;
  }

  function exportWorkspace() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexscope-skill-console.workspace.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importSkillFiles(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    Promise.all(files.map(readTextFile))
      .then((items) => {
        const imported = items.map(({ name, text }) => parseSkillMarkdown(name, text));
        const existingIds = new Set(allSkills().map((skill) => skill.id));
        const merged = imported.map((skill) => {
          let id = skill.id;
          let suffix = 2;
          while (existingIds.has(id)) {
            id = `${skill.id}-${suffix}`;
            suffix += 1;
          }
          existingIds.add(id);
          return { ...skill, id };
        });
        state.customSkills = [...(state.customSkills || []), ...merged];
        state.activeSkillId = merged[0].id;
        state.lastRouteReason = `已导入 ${merged.length} 个技能文件到本地工作区。`;
        persist();
        renderAll();
      })
      .catch((error) => {
        alert(`Skill 导入失败：${error.message}`);
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  function readTextFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result || "") });
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
      reader.readAsText(file);
    });
  }

  function parseSkillMarkdown(fileName, markdown) {
    const normalized = markdown.replace(/\r\n/g, "\n");
    const title = extractTitle(normalized) || fileName.replace(/\.(md|txt)$/i, "");
    const lower = normalized.toLowerCase();
    const platform = detectImportedPlatforms(normalized, title);
    const category = detectCategory(lower);
    const capabilities = extractListAfterHeading(normalized, ["capabilities", "skills", "what it does", "能力", "核心能力"]);
    const workflow = extractListAfterHeading(normalized, ["workflow", "process", "steps", "方法", "流程"]);
    const outputs = extractListAfterHeading(normalized, ["output", "deliverables", "outputs", "输出"]);
    const summary = extractSummary(normalized, title);
    const triggers = buildTriggers(title, summary, platform, category, lower);
    return {
      id: slugify(title || fileName),
      name: title,
      category,
      platform,
      summary,
      triggers,
      capabilities: capabilities.length ? capabilities : ["根据导入的技能说明分析当前任务"],
      workflow: workflow.length ? workflow : ["读取任务背景", "套用技能方法", "返回结构化建议"],
      outputs: outputs.length ? outputs : ["结构化回答", "行动清单", "关键假设"],
      starterPrompt: `请基于「${title}」这个技能帮我处理当前电商任务。`,
      systemPrompt: [
        `你正在使用导入的技能：${title}。`,
        "请以下方技能文档作为回答依据。",
        normalized.slice(0, 6000)
      ].join("\n\n"),
      importedAt: new Date().toISOString(),
      sourceFile: fileName,
      sourceName: title,
      groupKey: "imported",
      groupName: "Imported",
      groupLabel: "导入技能",
      groupOrder: 1000,
      status: "本地"
    };
  }

  function extractTitle(markdown) {
    const h1 = markdown.match(/^#\s+(.+)$/m);
    if (h1) return h1[1].trim();
    const firstHeading = markdown.match(/^#{2,6}\s+(.+)$/m);
    return firstHeading ? firstHeading[1].trim() : "";
  }

  function extractSummary(markdown, title) {
    const lines = markdown
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith("-") && !line.startsWith("*"));
    const summary = lines.find((line) => line.length > 40) || `从 ${title} 导入的技能。`;
    return summary.length > 260 ? `${summary.slice(0, 260)}...` : summary;
  }

  function extractListAfterHeading(markdown, headings) {
    const lines = markdown.split("\n");
    const results = [];
    let collecting = false;
    for (const line of lines) {
      const trimmed = line.trim();
      const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
      if (heading) {
        const text = heading[1].toLowerCase();
        collecting = headings.some((item) => text.includes(item.toLowerCase()));
        continue;
      }
      if (!collecting) continue;
      if (/^[-*]\s+/.test(trimmed)) {
        results.push(trimmed.replace(/^[-*]\s+/, "").trim());
      }
      if (results.length >= 8) break;
    }
    return results;
  }

  function detectPlatforms(text) {
    const known = ["Amazon", "Walmart", "Shopify", "Etsy", "TikTok Shop", "eBay", "Meta", "Google", "DTC"];
    const lower = text.toLowerCase();
    const matches = known.filter((platform) => lower.includes(platform.toLowerCase()));
    return matches.length ? matches : ["E-Commerce"];
  }

  function detectImportedPlatforms(markdown, title) {
    const frontmatter = String(markdown || "").match(/^---\n([\s\S]*?)\n---/)?.[1] || "";
    const explicit = [];
    const fieldPattern = /^(?:platform|platforms|marketplace|marketplaces|supported_platforms?):\s*(.+)$/gim;
    let match;
    while ((match = fieldPattern.exec(frontmatter))) {
      explicit.push(...match[1].replace(/[\[\]"']/g, "").split(",").map((item) => item.trim()));
    }
    const source = explicit.length ? explicit.join(" ") : `${title} ${frontmatter.split("\n").slice(0, 5).join(" ")}`;
    const lower = source.toLowerCase();
    const known = [
      ["Amazon Ads", "amazon ads"],
      ["Amazon", "amazon"],
      ["Walmart", "walmart"],
      ["Shopify", "shopify"],
      ["Etsy", "etsy"],
      ["TikTok Shop", "tiktok"],
      ["eBay", "ebay"],
      ["Meta", "meta"],
      ["Google", "google"],
      ["DTC", "dtc"]
    ];
    const matches = known.filter(([, alias]) => lower.includes(alias)).map(([name]) => name);
    return matches.length ? [...new Set(matches)] : ["E-Commerce"];
  }

  function detectCategory(lower) {
    const rules = [
      ["finance", ["profit", "margin", "fee", "cost", "利润", "毛利"]],
      ["marketing", ["ad", "ads", "campaign", "facebook", "meta", "tiktok", "广告", "投放"]],
      ["content", ["listing", "copy", "title", "description", "文案", "标题"]],
      ["research", ["competitor", "price", "market", "research", "竞品", "市场"]],
      ["operations", ["inventory", "stock", "fulfillment", "库存", "履约"]],
      ["strategy", ["growth", "strategy", "roadmap", "增长", "策略"]]
    ];
    const hit = rules.find(([, tokens]) => tokens.some((token) => lower.includes(token)));
    return hit ? hit[0] : "imported";
  }

  function buildTriggers(title, summary, platform, category, lower) {
    const seed = [title, summary, category, ...platform].join(" ").toLowerCase();
    const tokens = seed
      .split(/[^a-zA-Z0-9\u4e00-\u9fa5]+/)
      .filter((token) => token.length > 2)
      .slice(0, 18);
    const extra = ["增长", "利润", "竞品", "listing", "广告", "库存", "价格"].filter((token) => lower.includes(token.toLowerCase()));
    return [...new Set([...tokens, ...extra])];
  }

  function slugify(value) {
    const slug = String(value)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || `skill-${Date.now()}`;
  }

  function importWorkspace(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result || "{}"));
        mergeImportedState(imported);
        persist();
        hydrateSettings();
        renderAll();
      } catch (error) {
        alert(`导入失败：${error.message}`);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  function mergeImportedState(imported) {
    if (imported.settings) {
      state.settings = normalizeSettings({
        ...state.settings,
        ...imported.settings
      });
    }
    if (imported.ui) {
      state.ui = normalizeUiState(imported.ui);
    }
    if (Array.isArray(imported.sessions)) {
      state.sessions = imported.sessions;
      state.sessions.forEach((session) => {
        session.artifacts = Array.isArray(session.artifacts) ? session.artifacts : [];
      });
    }
    if (Array.isArray(imported.customSkills)) {
      state.customSkills = imported.customSkills;
    }
    if (imported.activeSkillId) {
      state.activeSkillId = imported.activeSkillId;
    }
    if (imported.activeSessionId) {
      state.activeSessionId = imported.activeSessionId;
    }
    if (typeof imported.searchText === "string") {
      state.searchText = imported.searchText;
    }
    if (typeof imported.categoryFilter === "string") {
      state.categoryFilter = imported.categoryFilter;
    }
    if (typeof imported.platformFilter === "string") {
      state.platformFilter = imported.platformFilter;
    }
    if (typeof imported.lastRouteReason === "string") {
      state.lastRouteReason = imported.lastRouteReason;
    }
    if (imported.routeTrace && typeof imported.routeTrace === "object") {
      state.routeTrace = imported.routeTrace;
    }
  }

  function loadWorkspace() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = clone(window.DEFAULT_WORKSPACE);
      initial.settings = normalizeSettings(initial.settings);
      initial.ui = normalizeUiState(initial.ui);
      return initial;
    }
    try {
      const parsed = JSON.parse(raw);
      const workspace = {
        ...clone(window.DEFAULT_WORKSPACE),
        ...parsed,
        settings: {
          ...window.DEFAULT_SETTINGS,
          ...parsed.settings
        },
        customSkills: Array.isArray(parsed.customSkills) ? parsed.customSkills : [],
        ui: normalizeUiState(parsed.ui),
        routeTrace: parsed.routeTrace && typeof parsed.routeTrace === "object" ? parsed.routeTrace : null,
        platformFilter: parsed.platformFilter || "all",
        openGroups: parsed.openGroups && typeof parsed.openGroups === "object" ? parsed.openGroups : {},
        sessions: Array.isArray(parsed.sessions) && parsed.sessions.length ? parsed.sessions : clone(window.DEFAULT_WORKSPACE.sessions)
      };
      workspace.sessions.forEach((session) => {
        session.artifacts = Array.isArray(session.artifacts) ? session.artifacts : [];
      });
      workspace.settings = normalizeSettings(workspace.settings);
      return workspace;
    } catch {
      const fallback = clone(window.DEFAULT_WORKSPACE);
      fallback.settings = normalizeSettings(fallback.settings);
      fallback.ui = normalizeUiState(fallback.ui);
      return fallback;
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function buildModelRequest(messages, options = {}) {
    const protocol = normalizeProtocol(state.settings.protocol);
    const model = state.settings.model;
    const stream = Boolean(options.stream);
    const endpoint = stream ? getStreamingEndpoint(state.settings.endpoint || getProtocolConfig(protocol).endpoint, protocol) : state.settings.endpoint || getProtocolConfig(protocol).endpoint;
    const apiKey = state.settings.apiKey;

    if (protocol === "gemini") {
      const system = messages.find((message) => message.role === "system")?.content || "";
      const contents = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: buildGeminiParts(message, getCapabilitySettings())
        }));
      return {
        method: "POST",
        url: buildEndpointUrl(endpoint, { model, apiKey }),
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: system ? { parts: [{ text: system }] } : undefined,
          contents,
          generationConfig: { temperature: 0.3 }
        })
      };
    }

    if (protocol === "anthropic") {
      const system = messages.find((message) => message.role === "system")?.content || "";
      const conversation = messages
        .filter((message) => message.role !== "system")
        .map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: buildAnthropicContent(message, getCapabilitySettings())
        }));
      return {
        method: "POST",
        url: buildEndpointUrl(endpoint, { model, apiKey }),
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1800,
          temperature: 0.3,
          stream,
          system,
          messages: conversation
        })
      };
    }

    return {
      method: "POST",
      url: buildEndpointUrl(endpoint, { model, apiKey }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map((message) => ({
          role: message.role,
          content: buildOpenAiContent(message, getCapabilitySettings())
        })),
        stream,
        temperature: getCapabilitySettings().reasoning ? 0.2 : 0.3
      })
    };
  }

  function buildOpenAiContent(message, capabilities) {
    if (message.role === "system" || message.role === "assistant") {
      return buildMessageTextWithAttachments(message, capabilities, "openai");
    }
    const parts = [{ type: "text", text: buildMessageTextWithAttachments(message, capabilities, "openai") }];
    if (capabilities.vision && capabilities.preserveAttachments) {
      for (const attachment of message.attachments || []) {
        if (attachment.kind === "image" && attachment.dataUrl) {
          parts.push({ type: "image_url", image_url: { url: attachment.dataUrl } });
        }
      }
    }
    return parts.length > 1 ? parts : parts[0].text;
  }

  function buildGeminiParts(message, capabilities) {
    const parts = [{ text: buildMessageTextWithAttachments(message, capabilities, "gemini") }];
    if (!capabilities.preserveAttachments) return parts;
    for (const attachment of message.attachments || []) {
      const canAttachImage = attachment.kind === "image" && capabilities.vision;
      const canAttachFile = attachment.kind !== "image" && capabilities.fileText;
      if ((canAttachImage || canAttachFile) && attachment.base64) {
        parts.push({
          inlineData: {
            mimeType: attachment.type || "application/octet-stream",
            data: attachment.base64
          }
        });
      }
    }
    return parts;
  }

  function buildAnthropicContent(message, capabilities) {
    if (message.role === "assistant") {
      return buildMessageTextWithAttachments(message, capabilities, "anthropic");
    }
    const content = [{ type: "text", text: buildMessageTextWithAttachments(message, capabilities, "anthropic") }];
    if (capabilities.vision && capabilities.preserveAttachments) {
      for (const attachment of message.attachments || []) {
        if (attachment.kind === "image" && attachment.base64) {
          content.push({
            type: "image",
            source: {
              type: "base64",
              media_type: attachment.type || "image/png",
              data: attachment.base64
            }
          });
        }
      }
    }
    return content;
  }

  function buildMessageTextWithAttachments(message, capabilities, protocol) {
    const content = message.content || "";
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (!attachments.length) return content;
    const lines = [content, "", "附件上下文："];
    for (const attachment of attachments) {
      lines.push(`- ${attachment.name} (${attachment.type || "未知类型"}, ${formatBytes(attachment.size || 0)})`);
      if (attachment.text && capabilities.fileText) {
        lines.push(`  文本内容：${attachment.text}${attachment.truncated ? "\n  [已截断，仅传入前段内容]" : ""}`);
      } else if (attachment.kind === "image" && capabilities.vision && capabilities.preserveAttachments) {
        lines.push(`  图片已按 ${protocol} 多模态格式附加。`);
      } else if (attachment.base64 && capabilities.fileText && capabilities.preserveAttachments && protocol === "gemini") {
        lines.push("  文件已按 Gemini inlineData 附加。");
      } else {
        lines.push(`  ${attachment.notice || "当前协议将以文件信息摘要传入。"}`);
      }
    }
    return lines.join("\n");
  }

  function extractModelText(data, protocol) {
    if (protocol === "gemini") {
      return (data?.candidates || [])
        .flatMap((candidate) => candidate?.content?.parts || [])
        .map((part) => part.text || "")
        .filter(Boolean)
        .join("\n");
    }
    if (protocol === "anthropic" && Array.isArray(data?.content)) {
      return data.content.map((item) => item.text || "").filter(Boolean).join("\n");
    }
    if (typeof data?.output_text === "string") return data.output_text;
    if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
      return data.choices[0].message.content;
    }
    if (Array.isArray(data?.output)) {
      return data.output
        .map((item) => item?.content?.[0]?.text || item?.text || "")
        .filter(Boolean)
        .join("\n");
    }
    return "";
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function getCategoryLabel(category) {
    return CATEGORY_LABELS[category] || category || "未分类";
  }

  function renderModelOptions(selected, sourceModels) {
    const protocol = normalizeProtocol(els.protocolInput?.value || state.settings.protocol);
    const models = normalizeModelList(sourceModels || state.settings.models, selected || state.settings.model, protocol);
    els.modelInput.innerHTML = models
      .map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`)
      .join("");
    els.modelInput.value = models.includes(selected) ? selected : models[0];
    renderComposerModelOptions(els.modelInput.value, models);
  }

  function renderComposerModelOptions(selected, sourceModels) {
    const protocol = normalizeProtocol(els.protocolInput?.value || state.settings.protocol);
    const models = normalizeModelList(sourceModels || state.settings.models, selected || state.settings.model, protocol);
    els.composerModelSelect.innerHTML = models
      .map((model) => `<option value="${escapeHtml(model)}">${escapeHtml(model)}</option>`)
      .join("");
    els.composerModelSelect.value = models.includes(selected) ? selected : models[0];
  }

  function applyProtocolPreset(protocolValue) {
    const preset = getProtocolConfig(protocolValue);
    els.endpointInput.value = preset.endpoint;
    els.modelListInput.value = preset.models.join("\n");
    renderModelOptions(preset.model, preset.models);
    els.modelInput.value = preset.model;
    els.composerModelSelect.value = preset.model;
  }

  async function refreshAvailableModels() {
    const apiKey = String(els.apiKeyInput.value || state.settings.apiKey || "").trim();
    if (!apiKey) {
      alert("\u8bf7\u5148\u586b\u5199 API \u5bc6\u94a5\uff0c\u518d\u83b7\u53d6\u6a21\u578b\u5217\u8868\u3002");
      return;
    }
    const protocol = normalizeProtocol(els.protocolInput.value);
    const endpoint = buildModelsEndpoint(els.endpointInput.value, protocol);
    const headers = { "Content-Type": "application/json" };
    if (protocol === "anthropic") {
      headers["x-api-key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else if (protocol === "openai") {
      headers.Authorization = `Bearer ${apiKey}`;
    }
    const url = protocol === "gemini"
      ? `${endpoint}${endpoint.includes("?") ? "&" : "?"}key=${encodeURIComponent(apiKey)}`
      : endpoint;
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const models = extractAvailableModels(data, protocol);
      if (!models.length) throw new Error("\u672a\u8fd4\u56de\u53ef\u7528\u6a21\u578b");
      els.modelListInput.value = models.join("\n");
      renderModelOptions(state.settings.model, models);
      alert(`\u5df2\u83b7\u53d6 ${models.length} \u4e2a\u53ef\u7528\u6a21\u578b\u3002`);
    } catch (error) {
      alert(`\u6a21\u578b\u5217\u8868\u83b7\u53d6\u5931\u8d25\uff1a${error.message}`);
    }
  }

  function buildModelsEndpoint(endpoint, protocol) {
    const source = String(endpoint || "").trim();
    if (protocol === "gemini") {
      return source
        .replace(/\/models\/\{model\}:generateContent.*$/i, "/models")
        .replace(/\/models\/[^/?]+:generateContent.*$/i, "/models");
    }
    if (protocol === "anthropic") return source.replace(/\/messages(?:\?.*)?$/i, "/models");
    return source.replace(/\/chat\/completions(?:\?.*)?$/i, "/models");
  }

  function extractAvailableModels(data, protocol) {
    if (protocol === "gemini") {
      return (data.models || [])
        .filter((model) => !model.supportedGenerationMethods || model.supportedGenerationMethods.includes("generateContent"))
        .map((model) => String(model.name || "").replace(/^models\//, ""))
        .filter(Boolean);
    }
    return (data.data || [])
      .map((model) => String(model.id || model.name || ""))
      .filter(Boolean);
  }

  function parseModelList(value) {
    return String(value || "")
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function normalizeModelList(models, preferredModel, protocolValue) {
    const protocol = normalizeProtocol(protocolValue || window.DEFAULT_SETTINGS.protocol);
    const preset = getProtocolConfig(protocol);
    const defaults = Array.isArray(preset.models) ? preset.models : [preset.model];
    const source = Array.isArray(models) && models.length ? models : defaults;
    const merged = [preferredModel, ...source, preset.model]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return [...new Set(merged)];
  }

  function getCapabilitySettings() {
    state.settings.capabilities = normalizeCapabilities(state.settings.capabilities);
    return state.settings.capabilities;
  }

  function normalizeCapabilities(capabilities) {
    return {
      ...DEFAULT_CAPABILITIES,
      ...(capabilities && typeof capabilities === "object" ? capabilities : {})
    };
  }

  function normalizeUiState(ui) {
    const migrated = ui?.layoutVersion === 2;
    return {
      leftCollapsed: Boolean(ui?.leftCollapsed),
      rightCollapsed: migrated ? (ui?.rightCollapsed === undefined ? true : Boolean(ui.rightCollapsed)) : true,
      sessionsOpen: Boolean(ui?.sessionsOpen),
      layoutVersion: 2
    };
  }

  function normalizeProtocol(protocol) {
    return PROTOCOL_PRESETS[protocol] ? protocol : "openai";
  }

  function getProtocolConfig(protocol) {
    const normalized = normalizeProtocol(protocol);
    const fromDefault = window.DEFAULT_SETTINGS.protocols?.[normalized] || {};
    return {
      ...PROTOCOL_PRESETS[normalized],
      ...fromDefault
    };
  }

  function normalizeSettings(settings) {
    const source = {
      ...window.DEFAULT_SETTINGS,
      ...(settings && typeof settings === "object" ? settings : {})
    };
    source.protocol = normalizeProtocol(source.protocol);
    source.models = normalizeModelList(source.models, source.model, source.protocol);
    source.model = source.models.includes(source.model) ? source.model : source.models[0] || getProtocolConfig(source.protocol).model;
    source.endpoint = source.endpoint || getProtocolConfig(source.protocol).endpoint;
    source.apiKey = source.apiKey || "";
    source.capabilities = normalizeCapabilities(source.capabilities);
    source.streamOutput = Boolean(source.streamOutput);
    return source;
  }

  function buildEndpointUrl(endpoint, values) {
    let url = String(endpoint || "").trim();
    Object.entries(values).forEach(([key, value]) => {
      url = url.replaceAll(`{${key}}`, encodeURIComponent(value || ""));
    });
    return url;
  }

  function getStreamingEndpoint(endpoint, protocol) {
    let url = String(endpoint || "").trim();
    if (normalizeProtocol(protocol) !== "gemini") return url;
    if (url.includes(":generateContent")) {
      url = url.replace(":generateContent", ":streamGenerateContent");
    }
    if (!/[?&]alt=/.test(url)) {
      url += `${url.includes("?") ? "&" : "?"}alt=sse`;
    }
    return url;
  }

  function shouldPreserveBinaryAttachment(type) {
    const capabilities = getCapabilitySettings();
    return Boolean(capabilities.fileText && capabilities.preserveAttachments && normalizeProtocol(state.settings.protocol) === "gemini" && type);
  }

  function isTextLikeFile(name, type) {
    const lower = String(name || "").toLowerCase();
    return (
      type.startsWith("text/") ||
      ["application/json", "application/xml", "application/x-ndjson"].includes(type) ||
      [".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts", ".log"].some((suffix) => lower.endsWith(suffix))
    );
  }

  function guessMimeType(name) {
    const lower = String(name || "").toLowerCase();
    if (lower.endsWith(".pdf")) return "application/pdf";
    if (lower.endsWith(".json")) return "application/json";
    if (lower.endsWith(".csv")) return "text/csv";
    if (lower.endsWith(".md")) return "text/markdown";
    if (lower.endsWith(".txt")) return "text/plain";
    if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if (lower.endsWith(".xlsx")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return "application/octet-stream";
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
      reader.readAsText(file);
    });
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  function formatBytes(value) {
    const bytes = Number(value) || 0;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  function summarizeInput(text) {
    const cleaned = text.replace(/\s+/g, " ").trim();
    return cleaned.length > 48 ? `${cleaned.slice(0, 48)}...` : cleaned;
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cssEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\\]]/g, "\\$&");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
