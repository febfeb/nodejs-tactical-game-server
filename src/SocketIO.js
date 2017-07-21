class SocketIO {
    constructor(http) {
        this.io = require('socket.io')(http, {
            transports: ['polling', 'websocket'],
        });
        this.io.attach(4567);
        this.io.on('connection', this.onConnection.bind(this));

        this.mysql = require('mysql').createConnection(require('./Connection'));
        this.mysql.connect();

        this.rooms = [];
        this.users = [];
    }

    onConnection(socket) {
        console.log("A client connected");

        socket.on('broadcast', (msg) => {
            console.log(msg);
            this.io.emit('broadcast', msg);
            this.io.emit('on_console', msg);
        });

        //create room
        /**
        {
            name: "Room Name"
        }
        */
        socket.on('createRoom', (msg) => {
            console.log("createRoom...");
            if (msg.name) {
                let room = {
                    id: require("randomstring").generate(),
                    name: msg.name,
                    score: 0,
                    readyCounter: 0
                };
                this.rooms.push(room);
                console.log('emit roomCreated');
                socket.emit('roomCreated', room);
            }
        });

        //Join room
        /**
        {
            roomId: "Room ID", (optional)
            roomName: "Room Name", (optional)
            roleId : "Role ID",
            username: "Username di DB",
            password: "Password di DB"
        }
        */
        socket.on('joinRoom', (msg) => {
            console.log("joinRoom...");
            let roomId = msg.roomId;
            let roleId = msg.roleId;
            let room = null;

            if (roomId == null) {
                if (msg.roomName == '') {
                    console.log('emit roomNotJoined');
                    socket.emit('roomNotJoined', {});
                    return;
                }

                //check if room name exist
                let exist = false;
                for (let i = 0; i < this.rooms.length; i++) {
                    if (this.rooms[i].name == msg.roomName) {
                        exist = true;
                        roomId = this.rooms[i].id;
                        break;
                    }
                }

                if (exist == false) {
                    //create new Room
                    room = {
                        id: require("randomstring").generate(),
                        name: msg.roomName,
                        score: 0,
                        readyCounter: 0
                    };
                    this.rooms.push(room);
                    console.log('emit roomCreated');
                    socket.emit('roomCreated', room);
                    this.io.emit('roomList', { data: this.rooms });
                    roomId = room.id;
                }
            } else {
                this.rooms.forEach((room) => {
                    if (room.id == roomId) {
                        this.room = room;
                    }
                });
            }

            //check username & password
            this.mysql.query(`SELECT * FROM user WHERE username = '${msg.username}' AND password = '${msg.password}'`, (error, results, fields) => {
                if (error) throw error;

                let loggedInUser = null;
                results.forEach((user) => {
                    loggedInUser = {
                        id: user.id,
                        name: user.nama_lengkap,
                        username: user.username,
                        password: user.password,
                        roomId: roomId,
                        roleId: roleId,
                        socket: socket
                    };
                });

                //hapus user duplikat
                for (let i = 0; i < this.users.length; i++) {
                    if (this.users[i].id == loggedInUser.id) {
                        this.users.splice(i, 1);
                        break;
                    }
                }

                if (loggedInUser !== null) {
                    this.users.push(loggedInUser);

                    console.log('emit roomJoined');
                    socket.emit('roomJoined', {
                        id: loggedInUser.id,
                        name: loggedInUser.name,
                        username: loggedInUser.username,
                        password: loggedInUser.password,
                        roomId: loggedInUser.roomId,
                        roleId: loggedInUser.roleId,
                    });

                    //Mungkin perlu dipertimbangkan lebih lanjut
                    this.emitUserList(this.io, msg.roomId);
                } else {
                    console.log('emit roomNotJoined');
                    socket.emit('roomNotJoined', {});
                }
            });
        });

        //broadcast message to room
        /**
        {
            roomId: "Room ID",
            userId: "User ID",
            message: "A message",
            action: "An Action"
        }
        */
        socket.on('broadcastToRoom', (msg) => {
            console.log("broadcastToRoom... " + msg.action);
            console.log(msg);
            if (msg.roomId) {
                this.users.map(user => {
                    if (user.roomId == msg.roomId && user.id != msg.userId) {
                        console.log('emit receive UID:' + user.id);
                        user.socket.emit('receive', msg);
                    }
                });
            }
        });

        socket.on('debugger', (msg) => {
            console.log("debug: ", msg);
        });

        //broadcast message to room
        /**
        {
            roomId: "Room ID",
            userId: "User ID"
        }
        */
        socket.on('readyToPlay', (msg) => {
            console.log("readyToPlay... ");
            console.log(msg);
            let roomId = msg.roomId;
            let selectedRoom = null;
            let userCount = 0;

            if (roomId) {
                this.rooms.forEach((room) => {
                    if (room.id == roomId) {
                        room.readyCounter += 1;
                        selectedRoom = room;
                    }
                });

                this.users.forEach((user) => {
                    if (user.roomId == roomId) {
                        userCount += 1;
                    }
                });

                if (userCount == selectedRoom.readyCounter) {
                    //broadcast to room
                    this.users.forEach((user) => {
                        if (user.roomId == roomId) {
                            user.socket.emit("readyToPlay", { data: "OK" });
                        }
                    });

                    this.rooms.forEach((room) => {
                        if (room.id == roomId) {
                            room.readyCounter = 0;
                        }
                    });
                }
            }
        });

        //increase score
        /**
        {
            roomId: "Room ID",
        }
        */
        socket.on('increaseScore', (msg) => {
            console.log("increaseScore...");
            let roomId = msg.roomId;
            let selectedRoom = null;
            if (roomId) {
                this.rooms.forEach((room) => {
                    if (room.id == roomId) {
                        room.score += 100;
                        selectedRoom = room;
                    }
                });

                this.users.map(user => {
                    if (user.roomId == roomId) {
                        console.log('emit scoreChanged');
                        user.socket.emit('scoreChanged', { score: selectedRoom.score });
                    }
                });
            }
        });

        //decrease score
        /**
        {
            roomId: "Room ID",
        }
        */
        socket.on('decreaseScore', (msg) => {
            console.log("decreaseScore...");
            let roomId = msg.roomId;
            let selectedRoom = null;
            if (roomId) {
                this.rooms.forEach((room) => {
                    if (room.id == roomId) {
                        room.score -= 50;
                        selectedRoom = room;
                    }
                });

                this.users.map(user => {
                    if (user.roomId == roomId) {
                        console.log('emit scoreChanged');
                        user.socket.emit('scoreChanged', { score: selectedRoom.score });
                    }
                });
            }
        });

        //get user list on the room
        /**
        {
            roomId: "Room ID"
        }
        */
        socket.on('userList', (msg) => {
            console.log("UserList...");
            this.emitUserList(socket, msg.roomId);
        });

        //get all room list
        socket.on('roomList', (msg) => {
            console.log("RoomList...");
            console.log('emit roomList');
            socket.emit('roomList', { data: this.rooms });
        });

        socket.on('consoleRoomList', (msg) => {
            socket.emit('consoleRoomList', this.rooms);
        });

        socket.on('consoleUserList', (msg) => {
            socket.emit('consoleUserList', this.users.map((user) => {
                return {
                    id: user.id,
                    name: user.name,
                    roleId: user.roleId,
                    roomId: user.roomId,
                    username: user.username
                };
            }));
        });

        socket.on('reset', (msg) => {
            this.rooms = [];
            this.users = [];
        });
    }

    emitUserList(socket, roomId) {
        if (roomId) {
            let userList = [];
            this.users.forEach(user => {
                if (user.roomId == roomId) {
                    userList.push({
                        id: user.id,
                        name: user.name,
                        roleId: user.roleId,
                        roomId: user.roomId,
                        username: user.username
                    });
                }
            });
            console.log('emit userList');
            socket.emit('userList', { data: userList });
        }
    }
}

module.exports = SocketIO;
