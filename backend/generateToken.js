const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/drive"];
const TOKEN_PATH = path.join(__dirname, "config/token.json");

const credentials = JSON.parse(
  fs.readFileSync(path.join(__dirname, "config/google-oauth.json"))
);

const { client_secret, client_id, redirect_uris } = credentials.installed;

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const authUrl = oAuth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("Authorize this app by visiting this url:\n");
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("\nEnter the code from that page here: ", (code) => {
  rl.close();

  oAuth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Error retrieving token", err);

    fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
    console.log("\nToken stored to:", TOKEN_PATH);
  });
});