(function () {
  "use strict";

  var DEFAULT_CONFIG = {
    startSessionUrl: "",
    messageUrl: "",
    endSessionUrl: "",
    title: "Assistente Metodo Eureka",
    welcomeMessage:
      "Ciao! Sono l'assistente AI di Metodo Eureka. Scrivimi pure la tua domanda.",
    placeholder: "Scrivi un messaggio...",
    sendLabel: "Invia",
    resetLabel: "Nuova chat"
  };

  var state = {
    isOpen: false,
    isSending: false,
    sessionId: null
  };

  function resolveConfig() {
    var customConfig = window.AIChatWidgetConfig || {};
    return Object.assign({}, DEFAULT_CONFIG, customConfig);
  }

  function parseSessionId(payload) {
    if (!payload || typeof payload !== "object") {
      return null;
    }

    return (
      payload.session_id ||
      payload.sessionId ||
      payload.id ||
      (payload.data && (payload.data.session_id || payload.data.sessionId)) ||
      null
    );
  }

  function parseAssistantMessage(payload) {
    if (!payload || typeof payload !== "object") {
      return "Non sono riuscito a generare una risposta valida.";
    }

    return (
      payload.display_text ||
      payload.speech ||
      payload.reply ||
      payload.response ||
      payload.message ||
      payload.answer ||
      (payload.data &&
        (payload.data.display_text ||
          payload.data.speech ||
          payload.data.reply ||
          payload.data.response ||
          payload.data.message ||
          payload.data.answer)) ||
      (payload.result &&
        (payload.result.display_text ||
          payload.result.speech ||
          payload.result.reply ||
          payload.result.response ||
          payload.result.message ||
          payload.result.answer)) ||
      "Non sono riuscito a generare una risposta valida."
    );
  }

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) {
      element.className = className;
    }
    if (typeof text === "string") {
      element.textContent = text;
    }
    return element;
  }

  function appendMessage(messagesEl, role, text) {
    var bubble = createElement(
      "div",
      "ai-chat-bubble " +
        (role === "user" ? "ai-chat-bubble-user" : "ai-chat-bubble-assistant")
    );
    bubble.textContent = text;
    messagesEl.appendChild(bubble);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function setStatus(statusEl, text) {
    statusEl.textContent = text || "";
  }

  async function ensureSession(config, statusEl) {
    if (state.sessionId) {
      return state.sessionId;
    }

    setStatus(statusEl, "Avvio sessione...");

    var response = await fetch(config.startSessionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({})
    });

    if (!response.ok) {
      throw new Error("Impossibile avviare la sessione chat.");
    }

    var payload = await response.json();
    var sessionId = parseSessionId(payload);

    if (!sessionId) {
      throw new Error("Risposta start session senza session_id.");
    }

    state.sessionId = sessionId;
    setStatus(statusEl, "");
    return sessionId;
  }

  async function endSession(config, statusEl, keepaliveOnly) {
    if (!state.sessionId) {
      return;
    }

    var currentSession = state.sessionId;
    state.sessionId = null;

    var body = JSON.stringify({ session_id: currentSession });

    if (keepaliveOnly && navigator.sendBeacon) {
      var blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(config.endSessionUrl, blob);
      return;
    }

    try {
      await fetch(config.endSessionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: body,
        keepalive: keepaliveOnly === true
      });
    } catch (_error) {
      setStatus(statusEl, "Sessione chiusa localmente.");
    }
  }

  function buildWidget(config) {
    var root = createElement("div", "ai-chat-widget");

    var toggleButton = createElement("button", "ai-chat-toggle", "AI");
    toggleButton.type = "button";
    toggleButton.setAttribute("aria-label", "Apri chat AI");

    var panel = createElement("section", "ai-chat-panel");
    panel.hidden = true;

    var header = createElement("div", "ai-chat-header");
    var title = createElement("h3", "ai-chat-title", config.title);
    var actions = createElement("div", "ai-chat-header-actions");
    var resetButton = createElement("button", "ai-chat-icon-btn", config.resetLabel);
    var closeButton = createElement("button", "ai-chat-icon-btn", "Chiudi");
    resetButton.type = "button";
    closeButton.type = "button";
    actions.appendChild(resetButton);
    actions.appendChild(closeButton);
    header.appendChild(title);
    header.appendChild(actions);

    var messagesEl = createElement("div", "ai-chat-messages");
    appendMessage(messagesEl, "assistant", config.welcomeMessage);

    var statusEl = createElement("p", "ai-chat-status", "");

    var form = createElement("form", "ai-chat-form");
    var input = createElement("input", "ai-chat-input");
    input.type = "text";
    input.placeholder = config.placeholder;
    input.autocomplete = "off";

    var sendButton = createElement("button", "ai-chat-send", config.sendLabel);
    sendButton.type = "submit";

    form.appendChild(input);
    form.appendChild(sendButton);

    panel.appendChild(header);
    panel.appendChild(messagesEl);
    panel.appendChild(statusEl);
    panel.appendChild(form);

    root.appendChild(panel);
    root.appendChild(toggleButton);
    document.body.appendChild(root);

    toggleButton.addEventListener("click", function () {
      state.isOpen = !state.isOpen;
      panel.hidden = !state.isOpen;
      if (state.isOpen) {
        input.focus();
      }
    });

    closeButton.addEventListener("click", function () {
      state.isOpen = false;
      panel.hidden = true;
    });

    resetButton.addEventListener("click", async function () {
      setStatus(statusEl, "Chiusura sessione...");
      await endSession(config, statusEl, false);
      messagesEl.innerHTML = "";
      appendMessage(messagesEl, "assistant", config.welcomeMessage);
      setStatus(statusEl, "");
    });

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var userText = input.value.trim();
      if (!userText || state.isSending) {
        return;
      }

      state.isSending = true;
      sendButton.disabled = true;
      appendMessage(messagesEl, "user", userText);
      input.value = "";

      try {
        var sessionId = await ensureSession(config, statusEl);
        setStatus(statusEl, "L'assistente sta rispondendo...");

        var response = await fetch(config.messageUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            session_id: sessionId,
            message: userText
          })
        });

        if (!response.ok) {
          throw new Error("Errore durante l'invio del messaggio.");
        }

        var payload = await response.json();
        var assistantText = parseAssistantMessage(payload);
        appendMessage(messagesEl, "assistant", assistantText);
        setStatus(statusEl, "");
      } catch (error) {
        appendMessage(
          messagesEl,
          "assistant",
          "Al momento non riesco a rispondere. Riprova tra qualche secondo."
        );
        setStatus(statusEl, (error && error.message) || "Errore chat.");
      } finally {
        state.isSending = false;
        sendButton.disabled = false;
      }
    });

    window.addEventListener("beforeunload", function () {
      endSession(config, statusEl, true);
    });
  }

  function init() {
    var config = resolveConfig();
    if (!config.startSessionUrl || !config.messageUrl || !config.endSessionUrl) {
      return;
    }
    buildWidget(config);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
