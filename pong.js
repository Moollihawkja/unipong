/* LOADING THE MODULES NEEDED TO RUN THE WEBSERVER */
const express = require('express')			// module used to create the web server
    , path = require('path')				// module used to get the absolute path of a file
    , bodyParser = require('body-parser')	// module used to parse what the cliend sent
    , http = require('http')				// module used to talk to a client
    , request = require('request')
    , Io = require('socket.io')
    ;

/* GLOBAL CONSTANTS */
const app = express()						// Creating a variable: app, to receive and respond to client's requests
    , port = process.env.PORT || 8000		// Defining what port to use to talk to the client
    , server = http.createServer(app)		// Creating the web server and storing it in a variable: app
    , io = Io(server)
    ;

let speed = 1;
let leftPosition = 44;
let rightPosition = 44;
let paddleHeight = 12;
let leftSpeed = 0;
let rightSpeed = 0;
let rightWidth = 2;
let leftWidth = 2;
let rightSide = 3;
let leftSide = 3;

let score = { left: 0, right: 0 };

let angle;
let direction;
let speedOfBall = 1;
let ballSize = 3;
let ballSpeed = { x: 0, y: 0 }
let ballPosition = { x: 50, y: 50 };

let players = [];

/* MIDDLEWARE TO LOOK AT THE REQUEST BEFORE HANDLING IT */
app.use(bodyParser.json({					// Limiting the amount of data the client can send to 50mb
    limit: '50mb'
}));

app.use(bodyParser.urlencoded({ 			// Allowing the body parser to parse many different types of requests
    extended: true
}));


/* ROUTES TO HANDLE THE REQUEST */
app.get('/', (req, res, next) => {			// Recieving a request from the client when there is no path
    request.get('https://mrlera.wisen.space/pong.html').pipe(res);
});


function startSocketServer() {
    io.on('connection', function (socket) {

        players.push(socket);

        function reset(resetScore) {
            speed = 1;
            leftPosition = 44;
            rightPosition = 44;
            paddleHeight = 12;
            leftSpeed = 0;
            rightSpeed = 0;
            rightWidth = 2;
            leftWidth = 2;
            rightSide = 3;
            leftSide = 3;

            if (resetScore) score = { left: 0, right: 0 };

            angle;
            direction;
            speedOfBall = 1;
            ballSize = 3;
            ballSpeed = { x: 0, y: 0 }
            ballPosition = { x: 50, y: 50 };
        }

        function initialize() {
            const π = Math.PI;
            direction = Math.random() <= 0.5 ? -1 : 1; //RANDOMLY CHOOSE A NUMBER THAT IS -1 or 1
            angle = (Math.random() - 0.5) * 2 * π / 3;  //RANDOMLY CHOOSE A NUMBER THAT IS BETWEEN -pi/4 and pi/4

            ballSpeed = {
                x: direction * speedOfBall * Math.cos(angle)
                , y: speedOfBall * Math.sin(angle)
            }

            io.emit('start', {
                speed,
                score,
                leftPosition,
                rightPosition,
                paddleHeight,
                leftSpeed,
                rightSpeed,
                rightWidth,
                leftWidth,
                rightSide,
                leftSide,
                angle,
                direction,
                ballSpeed,
                ballSize,
                ballPosition
            });
        }

        if (players.length > 2) {
            socket.emit('goaway', 'go away');
        }

        if (players.length === 2) {
            reset(true);
            players[0].emit('side', 'left');
            players[1].emit('side', 'right');
            setTimeout(() => {
                initialize();
            }, 500);

        }

        if (players.length === 1) {
            reset(true);
            socket.emit('waiting', 'bring your friends');
        }

        // LETS DETERMINE WHEN THE USER DISCONNECTS
        socket.on('disconnect', function () {
            console.log('disconnect');
            score = { left: 0, right: 0 };
            players = players.filter(player => player.id !== socket.id);
        });

        socket.on('leftPaddleUp', function () {
            console.log('leftPaddleUp');
            leftSpeed = -1 * speed;
            io.emit('leftPaddleUp', { leftSpeed });
        });

        socket.on('leftPaddleStop', function () {
            console.log('leftPaddleStop');
            leftSpeed = 0;
            io.emit('leftPaddleStop', { leftSpeed });
        });

        socket.on('leftPaddleDown', function () {
            console.log('leftPaddleDown');
            leftSpeed = speed;
            io.emit('leftPaddleDown', { leftSpeed });
        });

        socket.on('rightPaddleUp', function () {
            console.log('rightPaddleUp');
            rightSpeed = -1 * speed;
            io.emit('rightPaddleUp', { rightSpeed });
        });

        socket.on('rightPaddleStop', function () {
            console.log('rightPaddleStop');
            rightSpeed = 0;
            io.emit('rightPaddleStop', { rightSpeed });
        });

        socket.on('rightPaddleDown', function () {
            console.log('rightPaddleDown');
            rightSpeed = speed;
            io.emit('rightPaddleDown', { rightSpeed });
        });

        socket.on('rightBallPass', function () {
            console.log('rightBallPass');
            score.left++;
            reset(false);
            initialize();
        });

        socket.on('leftBallPass', function () {
            console.log('leftBallPass');
            score.right++;
            reset(false);
            initialize()
        });

        socket.on('rightBallHit', function () {
            console.log('rightBallHit');
            ballSpeed.x = -1 * ballSpeed.x;
            ballSpeed.y += rightSpeed;
            ballPosition.x = 100 - rightSide - rightWidth;
            io.emit('ballHitPaddle', { ballSpeed, ballPosition });
        });

        socket.on('leftBallHit', function () {
            console.log('leftBallHit');
            ballSpeed.x = -1 * ballSpeed.x;
            ballSpeed.y += leftSpeed;
            io.emit('ballHitPaddle', { ballSpeed, ballPosition });
        });

        socket.on('hitTop', function () {
            console.log('hitTop');
            ballSpeed.y = Math.abs(ballSpeed.y);
            ballPosition.y = ballSize;
            io.emit('ballHitTop', { ballSpeed, ballPosition });
        });

        socket.on('hitBottom', function () {
            console.log('hitBottom');
            ballSpeed.y = -1 * Math.abs(ballSpeed.y);
            ballPosition.y = 100 - ballSize;
            io.emit('ballHitBottom', { ballSpeed, ballPosition });
        });

    });
}

function startServer() {
    startSocketServer();
    server.on('listening', () => {				// Calling a function when the server starts listening for requests
        var addr = server.address()
            , bind = typeof addr === 'string'
                ? 'pipe ' + addr
                : 'port ' + addr.port
            ;
        console.log('Listening on ' + bind);	// Logging a message to terminal
    });
    server.listen(port);						// Telling the server to start listening
}

startServer();