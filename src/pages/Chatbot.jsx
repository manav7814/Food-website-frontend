import { useEffect, useMemo, useRef, useState } from "react";
import API from "../api/client";

const STORAGE_KEY = "foodhub_chat_history_v1";

const createMessage = (role, content) => ({
  id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  role,
  content,
  createdAt: new Date().toISOString()
});

const INITIAL_BOT_MESSAGE = createMessage(
  "assistant",
  "Hi, I can help with order tracking, refunds, popular dishes, delivery availability, and food recommendations."
);

export default function Chatbot() {
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [INITIAL_BOT_MESSAGE];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : [INITIAL_BOT_MESSAGE];
    } catch (_error) {
      return [INITIAL_BOT_MESSAGE];
    }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const history = useMemo(
    () =>
      messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role, content: message.content })),
    [messages]
  );

  const sendMessage = async (event) => {
    event.preventDefault();
    const userInput = input.trim();
    if (!userInput || loading) return;

    const userMessage = createMessage("user", userInput);
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const { data } = await API.post("/chat", {
        message: userInput,
        history
      });

      const assistantMessage = createMessage("assistant", data.reply || "Sorry, I could not process that.");
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      const errorMessage = requestError.response?.data?.message || "Unable to reach assistant right now.";
      setError(errorMessage);
      setMessages((prev) => [
        ...prev,
        createMessage("assistant", "I hit an error while processing that. Please try again in a moment.")
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([INITIAL_BOT_MESSAGE]);
    setError("");
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <main className="container section page-gap">
      <section className="assistant-shell">
        <header className="assistant-header">
          <div>
            <p className="eyebrow">AI Assistant</p>
            <h2>Food Ordering Help Desk</h2>
          </div>
          <button className="btn btn-secondary" type="button" onClick={clearChat}>
            Clear Chat
          </button>
        </header>

        <div className="assistant-messages" aria-live="polite">
          {messages.map((message) => (
            <article
              key={message.id}
              className={`assistant-message ${message.role === "user" ? "assistant-message-user" : "assistant-message-bot"}`}
            >
              <p>{message.content}</p>
            </article>
          ))}

          {loading && (
            <article className="assistant-message assistant-message-bot">
              <div className="typing-indicator" aria-label="Assistant typing">
                <span />
                <span />
                <span />
              </div>
            </article>
          )}
          <div ref={endRef} />
        </div>

        <form className="assistant-input-row" onSubmit={sendMessage}>
          <input
            type="text"
            placeholder="Ask about delivery, refunds, tracking, or food recommendations..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={loading}
          />
          <button className="btn" type="submit" disabled={loading || !input.trim()}>
            {loading ? "Thinking..." : "Send"}
          </button>
        </form>

        {error ? <p className="error small-text">{error}</p> : null}
      </section>
    </main>
  );
}
