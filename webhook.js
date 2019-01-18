/**
 * Webhook script designed to initialise a HTTP server and listen for requests from
 * Github webhooks (ie in this case when a new release is made).
 *
 * This file should live outside of the Front-end foundations directory otherwise if a
 * release consists of changes to this file, it may cause the script to crash.
 * Therefore, for automation purposes, if this file changes then it will be necessary
 * to manually run the deploy process. But the idea is that this file will
 * not need to change much.
 */

var http = require('http');
var crypto = require('crypto');
var exec = require('child_process').exec;
var fs = require('fs');

// Get the directory location of the Front-end foundation repo.
var FEF_DIRECTORY = process.env.FEF_DIRECTORY ? process.env.FEF_DIRECTORY : "";

// Load the secure key from an environment variable.
var WEBHOOK_SIGNATURE = process.env.FEF_WEBHOOK_SIGNATURE;

// Git reset command.
var GIT_RESET_CMD = "git reset --hard";

// Git fetch command.
var GIT_FETCH_ORIGIN_CMD = "git fetch origin";

// Git checkout command.
var GIT_CHECKOUT_MASTER_CMD = "git checkout develop";

// Git command to checkout a tag (without the tag version number).
var GIT_CHECKOUT_TAG_CMD = "git checkout tags/";

// Gulp deploy command.
var GULP_DEPLOY_CMD = "node_modules/gulp/bin/gulp.js deploy";

// Output file to log errors.
var OUTPUT_FILE = "output.log";

// Start a HTTP server and listen for Git webhook POST requests.
var server = http.createServer(function (req, res) {

  req.on('data', function(chunk) {
    // Extract the signature from the webhook request header.
    var SIG_KEY = "sha1=" + crypto.createHmac('sha1',
      WEBHOOK_SIGNATURE).update(chunk.toString()).digest('hex');

    if (req.headers['x-hub-signature'] == SIG_KEY) {
      // Decode and parse the payload as JSON.
      var payload = chunk.toString('utf8');
      var payloadJSON = JSON.parse(payload);

      // Get the release tag as part of the payload.
      var RELEASE_TAG = payloadJSON["release"]["tag_name"];

      if(RELEASE_TAG) {
        try {
          var GIT_CMDS = GIT_RESET_CMD +
            " && " + GIT_FETCH_ORIGIN_CMD +
            " && " + GIT_CHECKOUT_MASTER_CMD +
            " && " + GIT_CHECKOUT_TAG_CMD + RELEASE_TAG;

          if(FEF_DIRECTORY) {
            GIT_CMDS = "cd " + FEF_DIRECTORY + " && " + GIT_CMDS;
            GULP_DEPLOY_CMD = "cd " + FEF_DIRECTORY + " && " + GULP_DEPLOY_CMD;
          }
          // Checkout the release tag.
          execWithLog(GIT_CMDS);
          // Run the Gulp deploy command.
          execWithLog(GULP_DEPLOY_CMD);
        }
        catch (err) {
          logOutput(err.toString());
        }
      }
    }
    else {
      logOutput("Webhook authentication failed");
    }

  });

  res.end();

}).listen(8001);

// Log any errors that server creation spits out.
server.on('error', function(err) {
  logOutput(err.toString());
});

/**
 * Run a console command and log the outputs.
 * @param {string} command The command to run.
 */
function execWithLog(command){
  exec(command, function(error, stdout, stderr) {
    if(error) {
      logOutput(error);
    }
    if(stderr) {
      logOutput(stderr)
    }
    if(stdout) {
      logOutput(stdout);
    }
  });
};

/**
 * Returns the date and time in human readable format
 * ie yyyy:mm:dd hh:mm:ss.
 */
function getDateTime() {

  var date = new Date();

  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;

  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;

  var year = date.getFullYear();

  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;

  var day  = date.getDate();
  day = (day < 10 ? "0" : "") + day;

  return "[" + year + ":" + month + ":" + day +
    " " + hour + ":" + min + ":" + sec + "]: ";

}

/**
 * Appends a message to a file.
 * @param {str} msg The message string to write.
 */
function logOutput(msg) {
  try {
    fs.appendFileSync(OUTPUT_FILE, getDateTime() + msg);
  }
  catch(err) {
    console.log(err.toString());
  }
}
