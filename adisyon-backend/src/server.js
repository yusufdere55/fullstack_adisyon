const http = require('http');
const socketIO = require('socket.io');

const app = require('./app');
const { initalizeSocket } = require('./sockets/socket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = socketIO(server,{
    cors:{
        origin:'*',
        method:['GET','POST']
    }
});

initalizeSocket(io);

server.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});