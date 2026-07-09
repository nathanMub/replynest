(() => {
  if (window.ReplyNestWidgetLoaded) return;
  window.ReplyNestWidgetLoaded = true;

  const config = window.ReplyNestConfig || {};

  if (!config.ownerId) {
    console.error("ReplyNest: ownerId missing.");
    return;
  }

  const API =
    config.apiUrl ||
    window.location.origin;

  // Load CSS
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = API + "/widget.css";
  document.head.appendChild(css);

  // Create Bubble
  const bubble = document.createElement("button");
  bubble.className = "rn-bubble";
  bubble.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M4 5C4 3.9 4.9 3 6 3H18C19.1 3 20 3.9 20 5V14C20 15.1 19.1 16 18 16H9L4 21V5Z"
          fill="white"/>
      </svg>
  `;

  document.body.appendChild(bubble);

  // Chat Window
  const widget = document.createElement("div");
  widget.className = "rn-widget";

  widget.innerHTML = `
      <div class="rn-header">
          <div>
              <h3>ReplyNest AI</h3>
              <span>Typically replies instantly</span>
          </div>

          <button class="rn-close">✕</button>
      </div>

      <div class="rn-messages">

          <div class="rn-ai">
              👋 Hi! I'm your AI assistant.

              How can I help today?
          </div>

      </div>

      <div class="rn-input-area">

          <input
            class="rn-input"
            placeholder="Type your message..."
          />

          <button class="rn-send">
              Send
          </button>

      </div>
  `;

  document.body.appendChild(widget);

  const closeBtn = widget.querySelector(".rn-close");

  bubble.onclick = () => {
    widget.classList.add("rn-open");
  };

  closeBtn.onclick = () => {
    widget.classList.remove("rn-open");
  };

  const input = widget.querySelector(".rn-input");
  const send = widget.querySelector(".rn-send");
  const messages = widget.querySelector(".rn-messages");

  async function sendMessage() {
    const text = input.value.trim();

    if (!text) return;

    messages.innerHTML += `
      <div class="rn-user">${text}</div>
    `;

    input.value = "";

    messages.scrollTop = messages.scrollHeight;

    const typing = document.createElement("div");
    typing.className = "rn-ai";

    typing.innerHTML = "Typing...";

    messages.appendChild(typing);

    try {
      const res = await fetch(API + "/api/widget/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ownerId: config.ownerId,
          message: text,
        }),
      });

      const data = await res.json();

      typing.remove();

      messages.innerHTML += `
          <div class="rn-ai">
              ${data.reply}
          </div>
      `;

      messages.scrollTop = messages.scrollHeight;
    } catch (e) {
      typing.innerHTML = "Something went wrong.";
    }
  }

  send.onclick = sendMessage;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage();
  });
})();
