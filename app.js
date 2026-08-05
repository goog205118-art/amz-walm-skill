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

  const els = {};
  const state = loadWorkspace();
  let pendingAttachments = [];

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    state.openGroups = state.openGroups && typeof state.openGroups === "object" ? state.openGroups : {};
    state.ui = normalizeUiState(state.ui);
    state.settings.capabilities = normalizeCapabilities(state.settings.capabilities);
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
      "apiKeyInput",
      "endpointInput",
      "settingsBtn",
      "settingsModal",
      "closeSettingsBtn",
      "saveSettingsBtn",
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
      "sendBtn",
      "chatPanel",
      "leftPanelToggle",
      "rightPanelToggle",
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
      "autoContextToggle"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els.settingsBtn.addEventListener("click", openSettings);
    els.closeSettingsBtn.addEventListener("click", closeSettings);
    els.settingsModal.querySelectorAll("[data-close-settings]").forEach((button) => {
      button.addEventListener("click", closeSettings);
    });
    els.saveSettingsBtn.addEventListener("click", saveSettingsFromForm);
    els.newSessionBtn.addEventListener("click", createNewSession);
    els.exportBtn.addEventListener("click", exportWorkspace);
    els.importInput.addEventListener("change", importWorkspace);
    els.skillImportInput.addEventListener("change", importSkillFiles);
    els.searchInput.addEventListener("input", (event) => {
      state.searchText = event.target.value;
      persist();
      renderAll();
    });
    els.messageInput.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        sendMessage();
      }
    });
    bindDropZone(els.chatPanel);
    bindDropZone(els.messageInput);
    els.leftPanelToggle.addEventListener("click", () => togglePanel("left"));
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
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !els.settingsModal.classList.contains("hidden")) {
        closeSettings();
      }
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
      });
    });
  }

  function renderMessages() {
    const session = getActiveSession();
    if (!session) {
      els.messageList.innerHTML = "";
      return;
    }

    els.messageList.innerHTML = session.messages
      .map((message) => {
        const cls = message.role;
        const meta = message.role === "assistant" ? "助手" : message.role === "user" ? "用户" : "系统";
        const avatar = message.role === "assistant" ? "AI" : message.role === "user" ? "你" : "";
        const attachments = renderMessageAttachments(message.attachments);
        return `
          <div class="message ${cls}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-body">
              <div class="message-meta">${meta}</div>
              <div class="message-content">${escapeHtml(message.content)}</div>
              ${attachments}
            </div>
          </div>
        `;
      })
      .join("");

    els.messageList.scrollTop = els.messageList.scrollHeight;
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
    els.routingNote.innerHTML = session
      ? `${escapeHtml(state.lastRouteReason || "路由会先进行轻量关键词匹配，未命中时继续使用当前技能。")}`
      : "暂无活动会话。";
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
    els.leftPanelToggle.textContent = state.ui.leftCollapsed ? "›" : "‹";
    els.rightPanelToggle.textContent = state.ui.rightCollapsed ? "‹" : "›";
    els.leftPanelToggle.setAttribute("aria-label", state.ui.leftCollapsed ? "展开技能栏" : "收起技能栏");
    els.rightPanelToggle.setAttribute("aria-label", state.ui.rightCollapsed ? "展开说明栏" : "收起说明栏");
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
    persist();
    hydrateSettings();
    updateStatus();
    closeSettings();
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
    const input = els.messageInput.value.trim();
    const attachments = pendingAttachments.map((attachment) => ({ ...attachment }));
    if (!input && !attachments.length) return;
    const userContent = input || "请分析我上传的附件，并给出可执行建议。";

    const routed = routeSkill(userContent);
    const routedSkill = routed.skill || getActiveSkill();
    if (routedSkill && routedSkill.id !== state.activeSkillId) {
      state.activeSkillId = routedSkill.id;
    }
    state.lastRouteReason = buildRouteReason(userContent, routedSkill, routed.matches);

    const session = getActiveSession();
    if (!session) return;

    session.skillId = state.activeSkillId;
    session.messages.push({ role: "user", content: userContent, attachments });
    session.updatedAt = new Date().toISOString();
    if (!session.title || session.title === "新会话") {
      session.title = userContent.slice(0, 24);
    }
    els.messageInput.value = "";
    pendingAttachments = [];
    persist();
    renderAll();

    const skill = getActiveSkill();
    const reply = await generateReply(session, skill, session.messages.at(-1));
    session.messages.push({ role: "assistant", content: reply });
    session.updatedAt = new Date().toISOString();
    persist();
    renderAll();
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

  function buildPromptMessages(session, skill) {
    const capabilities = getCapabilitySettings();
    const contextDepth = capabilities.longContext ? 16 : 8;
    const recent = session.messages.slice(-contextDepth).map((message) => ({
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

  function routeSkill(text) {
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

  function buildRouteReason(text, skill, matches) {
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
    const platform = detectPlatforms(normalized);
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
      state.settings = {
        ...window.DEFAULT_SETTINGS,
        ...state.settings,
        ...imported.settings
      };
      state.settings.protocol = normalizeProtocol(state.settings.protocol);
      state.settings.models = normalizeModelList(state.settings.models, state.settings.model, state.settings.protocol);
      state.settings.capabilities = normalizeCapabilities(state.settings.capabilities);
    }
    if (imported.ui) {
      state.ui = normalizeUiState(imported.ui);
    }
    if (Array.isArray(imported.sessions)) {
      state.sessions = imported.sessions;
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
  }

  function loadWorkspace() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = clone(window.DEFAULT_WORKSPACE);
      initial.settings.protocol = normalizeProtocol(initial.settings.protocol);
      initial.settings.models = normalizeModelList(initial.settings.models, initial.settings.model, initial.settings.protocol);
      initial.settings.capabilities = normalizeCapabilities(initial.settings.capabilities);
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
        platformFilter: parsed.platformFilter || "all",
        openGroups: parsed.openGroups && typeof parsed.openGroups === "object" ? parsed.openGroups : {},
        sessions: Array.isArray(parsed.sessions) && parsed.sessions.length ? parsed.sessions : clone(window.DEFAULT_WORKSPACE.sessions)
      };
      workspace.settings.protocol = normalizeProtocol(workspace.settings.protocol);
      workspace.settings.models = normalizeModelList(workspace.settings.models, workspace.settings.model, workspace.settings.protocol);
      workspace.settings.capabilities = normalizeCapabilities(workspace.settings.capabilities);
      return workspace;
    } catch {
      const fallback = clone(window.DEFAULT_WORKSPACE);
      fallback.settings.protocol = normalizeProtocol(fallback.settings.protocol);
      fallback.settings.models = normalizeModelList(fallback.settings.models, fallback.settings.model, fallback.settings.protocol);
      fallback.settings.capabilities = normalizeCapabilities(fallback.settings.capabilities);
      fallback.ui = normalizeUiState(fallback.ui);
      return fallback;
    }
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function buildModelRequest(messages) {
    const protocol = normalizeProtocol(state.settings.protocol);
    const model = state.settings.model;
    const endpoint = state.settings.endpoint || getProtocolConfig(protocol).endpoint;
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
    return {
      leftCollapsed: Boolean(ui?.leftCollapsed),
      rightCollapsed: Boolean(ui?.rightCollapsed)
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

  function buildEndpointUrl(endpoint, values) {
    let url = String(endpoint || "").trim();
    Object.entries(values).forEach(([key, value]) => {
      url = url.replaceAll(`{${key}}`, encodeURIComponent(value || ""));
    });
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

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();
