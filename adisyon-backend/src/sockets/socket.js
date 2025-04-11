const { verifyToken } = require('../utils/jwt.utils');

const initalizeSocket = (io) => {
    io.on('connection', (socket) => {
        console.log('Yeni socket bağlantısı:' , socket.id);


        //Kullanıcı kimlik doğrulama
        socket.on('authenticate', async (data) => {
            try{
                const decoded = verifyToken(data.token);
                socket.user = decoded;
                socket.join(decoded.role);
                console.log(`Kullanıcı ${decoded.username} giriş yaptı - rol: ${decoded.role}`);
            }catch(err){
                console.log('Socket kimlik doğrulama hatası', err);
            }
        });

        //Masa bağlantısı
        socket.on('joinTable', (tableId) => {
            socket.join(`Table ${tableId}`);
            console.log(`Socket ${socket.id} masa ${tableId}'ye katıldı`);
        });
        
        //Yeni sipariş
        socket.on('newOrder', (order) => {
            console.log('Yeni sipariş alındı' , order);

            // İlgili kullanıcılara bildirim gönder
            io.to('kitchen').emit('orderReceived',order);
            io.to('waiter').emit('orderRedeived',order);
            io.to(`table:${order.tableId}`).emit('orderStatus', { status : 'received' });
        });

        //Sipariş durumunu güncelle
        socket.on('updateOrdersStatus', (data) => {
            console.log('Sipariş durumu güncellendi:',data);

            // İlgili kullanıcılara bildirim gönder
            io.to(`Table:${data.tableId}`).emit('orderStatus',{
                status:data.status,
                orderId:data.orderId
            });
            
            if(data.status === 'ready')
                io.to('waiter').emit('orderReady',data);
        });

        //Bağlantı kesildiğinde
        socket.on('disconnect', () => {
            console.log('Socket bağlantısı kesildi', socket.id);
        });
    })
}

module.exports = { initalizeSocket }