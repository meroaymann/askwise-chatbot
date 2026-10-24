import os
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from groq import Groq

# Load the API key and model name from .env
load_dotenv()

app = Flask(__name__, static_folder="public/static", static_url_path="/static")
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

SYSTEM_PROMPT = (
    "You are AskWise, a friendly and helpful AI assistant. "
    "Always reply in the same language the user writes in (for example, Arabic or English). "
    "Keep answers clear and well organized: use short paragraphs, bullet points, "
    "or numbered steps when helpful, and put code inside code blocks. "
    "Be concise unless the user asks for more detail. "
    "If you are not sure about something, say so honestly instead of guessing."
)


@app.route("/")
def home():
    """Show the chat page."""
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    """Receive the conversation, send it to Groq, return the bot's reply."""
    data = request.get_json(silent=True) or {}
    history = data.get("messages", [])

    if not history:
        return jsonify({"error": "No message received."}), 400

    # Keep only the last 20 messages so requests stay small
    history = history[-20:]

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in history:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": str(msg["content"])})

    try:
        completion = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.7,
            max_completion_tokens=2048,
        )
        reply = completion.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        app.logger.error(f"Groq API error: {e}")
        return jsonify({"error": "Sorry, something went wrong. Please try again."}), 500


if __name__ == "__main__":
    app.run(debug=True)