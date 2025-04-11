const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sql = require('mssql');

require('dotenv').config();

//Routes import
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
// const tableRoutes = require('./routes/table.routes');
// const categoryRoutes = require('./routes/category.routes');
// const productRoutes = require('./routes/product.routes');
// const orderRoutes = require('./routes/order.routes');
// const qrRoutes = require('./routes/qr.routes');

//Middleware import
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

const app = express();

//Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended : true }));
app.use(morgan('dev'));

const sqlConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ,
    database: process.env.DB_NAME ,
    server: process.env.DB_SERVER,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    },
    options: {
      encrypt: true, // Azure için gerekli olabilir
      trustServerCertificate: true // Geliştirme ortamı için
    }
};

global.sqlPool = new sql.ConnectionPool(sqlConfig);
global.sqlPool.connect()
    .then(() => console.log('MSSQL bağlantısı başarılı'))
    .catch(err => console.error('MSSQL bağlantıs hatası:',err))


//Routes
app.use('/api/auth',authRoutes);
app.use('/api/users',authMiddleware,userRoutes);
// app.use('/api/tables', authMiddleware, tableRoutes);
// app.use('/api/categories', authMiddleware, categoryRoutes);
// app.use('/api/products', authMiddleware, productRoutes);
// app.use('/api/orders', authMiddleware, orderRoutes);
// app.use('/api/qr', qrRoutes);

// //Ana route
app.get('/',(req,res) => {
    res.json({ message : 'Kafe Adisyon Sistemi API' });
});

app.use(errorHandler)

module.exports = app;
