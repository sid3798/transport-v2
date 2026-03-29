const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");

async function authorize() {

  const tokenPath = path.join(__dirname, "token.json");

  if (fs.existsSync(tokenPath)) {
    console.log("Using LOCAL token");

    const credentials = JSON.parse(
      fs.readFileSync(path.join(__dirname, "google-oauth.json"))
    );

    const token = JSON.parse(fs.readFileSync(tokenPath));

    const { client_secret, client_id, redirect_uris } = credentials.installed;

    const oAuth2Client = new google.auth.OAuth2(
      client_id,
      client_secret,
      redirect_uris[0]
    );

    oAuth2Client.setCredentials(token);

    return oAuth2Client;

  } else {

    console.log("Using PRODUCTION env token");

    const token = JSON.parse(process.env.GOOGLE_TOKEN);

    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oAuth2Client.setCredentials(token);

    return oAuth2Client;
  }
}

module.exports = authorize;