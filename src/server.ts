import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";

dotenv.config(); //Read .env file lines as though they were env vars.

const dbClientConfig = setupDBClientConfig();
const client = new Client(dbClientConfig);

//Configure express routes
const app = express();

app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.get("/", async (req, res) => {
  res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

app.get("/pastes", async (req, res) => {
  console.log("get request");
  try {
    const queryText = "SELECT * FROM pastes ORDER BY time DESC LIMIT 10";
    const queryResponse = await client.query(queryText);
    res.json(queryResponse.rows);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send("An error occurred when fetching pastes. Check server logs.");
  }
});

app.post<{}, {}, { title: string; content: string }>(
  "/pastes",
  async (req, res) => {
    try {
      const title = req.body.title;
      const content = req.body.content;
      const queryText =
        "INSERT INTO pastes (title, content) VALUES ($1, $2) RETURNING *";
      const queryValues = [title, content];
      const queryResponse = await client.query(queryText, queryValues);
      res.json(queryResponse.rows[0]);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send("An error occurred when posting a paste. Check server logs.");
    }
  }
);

app.delete<{ pasteId: string }, {}, {}>(
  "/pastes/:pasteId",
  async (req, res) => {
    try {
      client.query("BEGIN;");
      const queryValues = [req.params.pasteId];
      const queryToDeleteComments = "DELETE FROM comments WHERE paste_id = $1";
      const queryToDeletePaste =
        "DELETE FROM pastes WHERE id = $1 RETURNING * ";
      const deleteCommentsResponse = await client.query(
        queryToDeleteComments,
        queryValues
      );
      const deletePasteResponse = await client.query(
        queryToDeletePaste,
        queryValues
      );
      client.query("COMMIT;");
      res.json(deletePasteResponse.rows[0]);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send("An error occurred when deleting a paste. Check server logs.");
    }
  }
);

app.get<{ pasteId: string }, {}, {}>(
  "/pastes/:pasteId/comments",
  async (req, res) => {
    try {
      const queryValues = [req.params.pasteId];
      const queryText = "SELECT * FROM comments WHERE paste_id = $1";
      const queryResponse = await client.query(queryText, queryValues);
      res.json(queryResponse.rows);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send(
          "An error occurred when fetching comments for that post. Check server logs."
        );
    }
  }
);

app.post<{ pasteId: string }, {}, { comment: string }>(
  "/pastes/:pasteId/comments",
  async (req, res) => {
    try {
      const queryText =
        "INSERT INTO comments (paste_id, comment) VALUES ($1, $2) RETURNING *";
      const queryValues = [req.params.pasteId, req.body.comment];
      const queryResponse = await client.query(queryText, queryValues);
      res.json(queryResponse.rows[0]);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send("An error occurred when posting a comment. Check server logs.");
    }
  }
);

app.delete<{ commentId: string }, {}, {}>(
  "/pastes/:pasteId/comments/:commentId",
  async (req, res) => {
    try {
      const queryText = "DELETE FROM comments WHERE (id = $1) RETURNING *";
      const queryValues = [req.params.commentId];
      const queryResponse = await client.query(queryText, queryValues);
      res.json(queryResponse.rows[0]);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .send("An error occurred when deleting a comment. Check server logs.");
    }
  }
);

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
  console.log("Attempting to connect to db");
  await client.connect();
  console.log("Connected to db!");

  const port = getEnvVarOrFail("PORT");
  app.listen(port, () => {
    console.log(
      `Server started listening for HTTP requests on port ${port}.  Let's go!`
    );
  });
}
