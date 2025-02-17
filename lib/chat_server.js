var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server) {
    io = socketio(server);

    io.on('connection', function(socket) {
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed);
        joinRoom(socket, 'Lobby');

        handleMessageBroadcasting(socket);
        handleNameChangeAttempts(socket);
        handleRoomJoining(socket);

        socket.on('rooms', function() {
            socket.emit('rooms', io.sockets.adapter.rooms);
        });

        handleClientDisconnection(socket);
    });
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name;
    socket.emit('nameResult', {
        success: true,
        name: name
    });
    namesUsed.push(name);
    return guestNumber + 1;
}

function joinRoom(socket, room) {
    socket.join(room);
    currentRoom[socket.id] = room;
    socket.emit('joinResult', { room: room });
    socket.broadcast.to(room).emit('message', {
        text: nickNames[socket.id] + ' has joined ' + room + "."
    });

    var usersInRoom = io.sockets.adapter.rooms.get(room);
    if (usersInRoom && usersInRoom.size > 1) {
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        usersInRoom.forEach(function (userSocketId) {
            if (userSocketId !== socket.id) {
                usersInRoomSummary += nickNames[userSocketId] + ', ';
            }
        });
        usersInRoomSummary = usersInRoomSummary.slice(0, -2) + '.';
        socket.emit('message', { text: usersInRoomSummary });
    }
}


function handleNameChangeAttempts(socket){
    socket.on('nameAttempt', function(name){
        if(name.indexOf('Guest') == 0){
            socket.emit('nameResult', {
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        } else {
            if(namesUsed.indexOf(name) == -1){
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name);
                nickNames[socket.id] = name;
                delete namesUsed[previousNameIndex];
                socket.emit('nameResult', {
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message', {
                    text: previousName + ' is now known as ' + name + '.'
                });
            } else {
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

function handleMessageBroadcasting(socket) {
    socket.on('message', function (message) {
        socket.broadcast.to(currentRoom[socket.id]).emit('message', {
            text: nickNames[socket.id] + ': ' + message.text
        });
    });
}


function handleRoomJoining(socket) {
    socket.on('join', function(room){
        socket.leave(currentRoom[socket.id]);
        joinRoom(socket, room.newRoom);
    });
}

function handleClientDisconnection(socket) {
    socket.on('disconnect', function () {
      var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
      if (nameIndex !== -1) {
        namesUsed.splice(nameIndex, 1);
        delete nickNames[socket.id];
      }
    });
  }
  