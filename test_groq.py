import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

key = os.getenv("OPENAI_AI_KEY")
print(f"Testing key starting with: {key[:10]}...")

try:
    client = Groq(api_key=key)
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": "test"}],
        max_tokens=10
    )
    print("Success! Key is valid.")
    print(f"Response: {response.choices[0].message.content}")
except Exception as e:
    print(f"Error: {e}")
