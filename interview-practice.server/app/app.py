import os

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[os.environ.get("CLIENT_ORIGIN", "http://localhost:4200")])


@app.route("/")
def hello_world() -> str:  # put application's code here
    return "Hello World!"


if __name__ == "__main__":
    app.run()
