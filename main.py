from backend.main import app
import os

if __name__ == "__main__":
    import uvicorn
    # Railway provides the PORT environment variable automatically
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
