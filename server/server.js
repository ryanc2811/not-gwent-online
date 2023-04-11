var argv = require('minimist')(process.argv.slice(2));
var http = require("http");
var express = require('express');
var cors = require('cors');
var app = express();
var Config = require("../public/Config");

global.connections = require("./Connections")();

global.matchmaking = require("./Matchmaker")();

global.Room = require("./Room");

global.User = require("./User");

var server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server);
global.io = io;

// Enable CORS
app.use(cors());
app.use(express.static('public'));
app.use('/public', express.static('public'));
app.use('/assets', express.static('assets'));

// Removed the duplicate listen call
server.listen(Config.Server.port, () => {
  console.log(`Server is listening on port ${Config.Server.port}`);
});

var admin = io.of("/admin");

io.on("connection", function (socket) {
  var user;
  connections.add(user = User(socket));
  console.log("new user ", user.getName());

  socket.on("disconnect", function () {
    connections.remove(user);
    user.disconnect();
    console.log("user ", user.getName(), " disconnected");
    user = null;
    //io.emit("update:playerOnline", connections.length());
  });

  io.emit("update:playerOnline", connections.length());
});

admin.on("connection", function (socket) {
  socket.on("sendMessage", function (msg) {
    console.log("admin send msg: " + msg);
    io.emit("notification", {
      message: msg
    });
  });
});
