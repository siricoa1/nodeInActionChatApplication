var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');
require('dotenv').config();
var express = require('express');

var app = express();
app.use(express.static('public'));

const PORT = process.env.PORT || 8080

var cache = {};

function send404(response) {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function sendFile(response, filePath, fileContents){
    response.writeHead(
        200,
        {"content-type": mime.getType(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response, cache, absPath){
    if(cache[absPath]){
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function(exists){
            if(exists) {
                fs.readFile(absPath, function(err, data){
                    if (err) {
                        send404(response);
                    } else {
                        cache[absPath] = data;
                        sendFile(response, absPath, data);
                    }
                });
            } else {
                send404(response);
            }
        });
    }
}

var server = http.createServer(app);


server.listen(PORT, function(){
    console.log(`Server listening on port ${PORT}.`);
});

var chatServer = require('./lib/chat_server');
chatServer.listen(server);