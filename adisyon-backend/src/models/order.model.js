const sql = require('mssql');

class OrderItem {
    constructor(data) {
        this.id = data.id;
        this.orderId = data.orderId;
        this.productId = data.productId;
        this.quantity = data.quantity;
        this.price = data.price;
        this.note = data.note || '';
        this.status = data.status || 'new';
        this.createAt = data.createAt;
        this.updateAt = data.updateAt;
    }
}

class Order {
    constructor(data) {
        this.id = data.id;
        this.tableId = data.tableId;
        this.waiterId = data.waiterId;
        this.status = data.status ||'new';
        this.qrOrderCode = data.qrOrderCode;
        this.subtotal = data.subtotal;
        this.tax = data.tax;
        this.discount = data.discount || 0;
        this.total = data.total;
        this.paymentMethod = data.paymentMethod || 'cash';
        this.paymentStatus = data.paymentStatus || 'pending';
        this.closeAt = data.closeAt;
        this.createAt = data.createAt;
        this.updateAt = data.updateAt;
        this.items = data.items || [];
    }

    //Sipariş oluşturma
    static async create(orderData) {
        const transaction = new sql.Transaction(await global.sqlPool);

        try {
            await transaction.begin();
        const orderResult = await new sql.Request(transaction)
            .input('tableId' , sql.Int , orderData.tableId)
            .input('waiterId',sql.Int,orderData.waiterId)
            .input('status',sql.NVarChar,orderData.status || 'new')
            .input('qrOrderCode',sql.NVarChar, orderData.qrOrderCode || null)
            .input('subtotal', sql.Decimal(10, 2), orderData.subtotal)
            .input('tax', sql.Decimal(10, 2), orderData.tax)
            .input('discount', sql.Decimal(10, 2), orderData.discount || 0)
            .input('total', sql.Decimal(10, 2), orderData.total)
            .input('paymentMethod', sql.NVarChar, orderData.paymentMethod || 'cash')
            .input('paymentStatus', sql.NVarChar, orderData.paymentStatus || 'pending')
            .input('closedAt', sql.DateTime, orderData.closedAt || null)
            .input('createdAt', sql.DateTime, new Date())
            .input('updatedAt', sql.DateTime, new Date())
            .query(`
                INSERT INTO Orders (
                  tableId, waiterId, status, qrOrderCode, subtotal, tax, discount, total, 
                  paymentMethod, paymentStatus, closedAt, createdAt, updatedAt
                )
                OUTPUT INSERTED.*
                VALUES (
                  @tableId, @waiterId, @status, @qrOrderCode, @subtotal, @tax, @discount, @total, 
                  @paymentMethod, @paymentStatus, @closedAt, @createdAt, @updatedAt
                )
            `);

            const newOrder = orderResult.recordset[0];
            const orderId = newOrder.id;

            if(orderData.items && orderData.items.length > 0) {
                for( const item of orderData.items){
                    await new sql.Request(transaction)
                        .input('orderId',sql.Int, orderId)
                        .input('productId', sql.Int, item.productId)
                        .input('quantity',sql.Int, item.quantity)
                        .input('price' , sql.Decimal(10, 2), item.price)
                        .input('note',sql.NVarChar, item.note || '')
                        .input('status',sql.NVarCharr, item.status || 'new')
                        .input('createAt',sql.DateTime, new Date())
                        .input('updateAt',sql.DateTime, new Date())
                        .query(`
                            INSERT INTO OrderItems (
                                orderId,productId,quantity,price,note,status,createAt,updateAt
                            )    
                            VALUES(
                                @orderId, @productId, @quantity, @price, @note, @status, @createAt, @updateAt
                            )
                        `)
                }
            }

            await transaction.commit();

            return await Order.findById(orderId);
        } catch (error) {
            throw error
        }

    }

    //ID'ye göre sipariş bulma
    static async findById(id){
        try {
            const pool = await global.sqlPool;
            const result = await pool.Request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM Orders WHERE id = @id');

            if(result.recordset.length === 0) {
                return null
            }

            const orderData = result.recordset[0];

            const itemsResult = await pool.Request()
                .input('orderId',sql.Int,id)
                .query('SELECT * FROM OrderItems WHERE  orderId = @orderId');

            const order = new Order({
                ...orderData,
                items: itemsResult.recordset.map(item => new OrderItem(item))
            });

            return Order;
        } catch (error) {
            throw error
        }
    }

    // Tüm siparişleri filtreleme ve sıralama seçenekleri ile getir
    static async findAll(options = {}) {
        try {
        const pool = await global.sqlPool;
        let query = 'SELECT * FROM Orders';
        
        const whereConditions = [];
        const queryParams = new sql.Request(pool);
        
        // Filtre seçenekleri
        if (options.status) {
            queryParams.input('status', sql.NVarChar, options.status);
            whereConditions.push('status = @status');
        }
        
        if (options.tableId) {
            queryParams.input('tableId', sql.Int, options.tableId);
            whereConditions.push('tableId = @tableId');
        }
        
        if (options.waiterId) {
            queryParams.input('waiterId', sql.Int, options.waiterId);
            whereConditions.push('waiterId = @waiterId');
        }
        
        if (options.paymentStatus) {
            queryParams.input('paymentStatus', sql.NVarChar, options.paymentStatus);
            whereConditions.push('paymentStatus = @paymentStatus');
        }
        
        // Tarih aralığı filtreleme
        if (options.startDate) {
            queryParams.input('startDate', sql.DateTime, new Date(options.startDate));
            whereConditions.push('createdAt >= @startDate');
        }
        
        if (options.endDate) {
            queryParams.input('endDate', sql.DateTime, new Date(options.endDate));
            whereConditions.push('createdAt <= @endDate');
        }
        
        // WHERE koşulları ekle
        if (whereConditions.length > 0) {
            query += ' WHERE ' + whereConditions.join(' AND ');
        }
        
        // Sıralama
        const sortField = options.sortField || 'createdAt';
        const sortOrder = options.sortOrder || 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        
        // Sayfalama
        if (options.limit) {
            query += ' OFFSET ' + (options.offset || 0) + ' ROWS FETCH NEXT ' + options.limit + ' ROWS ONLY';
        }
        
        const result = await queryParams.query(query);
        
        // Her bir sipariş için ürünleri ayrı ayrı sorgulama
        const orders = [];
        for (const orderData of result.recordset) {
            const itemsResult = await pool.request()
            .input('orderId', sql.Int, orderData.id)
            .query('SELECT * FROM OrderItems WHERE orderId = @orderId');
            
            orders.push(new Order({
            ...orderData,
            items: itemsResult.recordset.map(item => new OrderItem(item))
            }));
        }
        
        return orders;
        } catch (error) {
        throw error;
        }
    }

    // Aktif masa siparişlerini getir
    static async findActiveByTable(tableId) {
        try {
        const pool = await global.sqlPool;
        const result = await pool.request()
            .input('tableId', sql.Int, tableId)
            .input('status', sql.NVarChar, 'paid')
            .query('SELECT * FROM Orders WHERE tableId = @tableId AND status != @status ORDER BY createdAt DESC');
        
        if (result.recordset.length === 0) {
            return null;
        }
        
        const orderData = result.recordset[0]; // En son sipariş
        
        // Sipariş kalemlerini al
        const itemsResult = await pool.request()
            .input('orderId', sql.Int, orderData.id)
            .query('SELECT * FROM OrderItems WHERE orderId = @orderId');
        
        // Order nesnesini oluştur ve items bilgisini ekle
        return new Order({
            ...orderData,
            items: itemsResult.recordset.map(item => new OrderItem(item))
        });
        } catch (error) {
        throw error;
        }
    }
    
    // Sipariş güncelleme
    static async update(id, updateData) {
        const transaction = new sql.Transaction(await global.sqlPool);
        
        try {
        await transaction.begin();
        
        // Ana sipariş güncelleme alanlarını kontrol et
        if (Object.keys(updateData).some(key => key !== 'items')) {
            const updateFields = [];
            const request = new sql.Request(transaction)
            .input('id', sql.Int, id)
            .input('updatedAt', sql.DateTime, new Date());
            
            // Dinamik olarak güncelleme alanlarını hazırla
            if (updateData.tableId !== undefined) {
            request.input('tableId', sql.Int, updateData.tableId);
            updateFields.push('tableId = @tableId');
            }
            if (updateData.waiterId !== undefined) {
            request.input('waiterId', sql.Int, updateData.waiterId);
            updateFields.push('waiterId = @waiterId');
            }
            if (updateData.status !== undefined) {
            request.input('status', sql.NVarChar, updateData.status);
            updateFields.push('status = @status');
            }
            if (updateData.qrOrderCode !== undefined) {
            request.input('qrOrderCode', sql.NVarChar, updateData.qrOrderCode);
            updateFields.push('qrOrderCode = @qrOrderCode');
            }
            if (updateData.subtotal !== undefined) {
            request.input('subtotal', sql.Decimal(10, 2), updateData.subtotal);
            updateFields.push('subtotal = @subtotal');
            }
            if (updateData.tax !== undefined) {
            request.input('tax', sql.Decimal(10, 2), updateData.tax);
            updateFields.push('tax = @tax');
            }
            if (updateData.discount !== undefined) {
            request.input('discount', sql.Decimal(10, 2), updateData.discount);
            updateFields.push('discount = @discount');
            }
            if (updateData.total !== undefined) {
            request.input('total', sql.Decimal(10, 2), updateData.total);
            updateFields.push('total = @total');
            }
            if (updateData.paymentMethod !== undefined) {
            request.input('paymentMethod', sql.NVarChar, updateData.paymentMethod);
            updateFields.push('paymentMethod = @paymentMethod');
            }
            if (updateData.paymentStatus !== undefined) {
            request.input('paymentStatus', sql.NVarChar, updateData.paymentStatus);
            updateFields.push('paymentStatus = @paymentStatus');
            }
            if (updateData.closedAt !== undefined) {
            request.input('closedAt', sql.DateTime, updateData.closedAt);
            updateFields.push('closedAt = @closedAt');
            }
            
            updateFields.push('updatedAt = @updatedAt');
            
            if (updateFields.length > 1) { // updatedAt her zaman olduğu için 1'den büyük olmalı
            await request.query(`
                UPDATE Orders 
                SET ${updateFields.join(', ')} 
                WHERE id = @id
            `);
            }
        }
        
        // Sipariş kalemlerini güncelle (eğer varsa)
        if (updateData.items && updateData.items.length > 0) {
            for (const item of updateData.items) {
            if (item.id) {
                // Mevcut kalem güncelleme
                const itemUpdateFields = [];
                const itemRequest = new sql.Request(transaction)
                .input('id', sql.Int, item.id)
                .input('orderId', sql.Int, id)
                .input('updatedAt', sql.DateTime, new Date());
                
                if (item.productId !== undefined) {
                itemRequest.input('productId', sql.Int, item.productId);
                itemUpdateFields.push('productId = @productId');
                }
                if (item.quantity !== undefined) {
                itemRequest.input('quantity', sql.Int, item.quantity);
                itemUpdateFields.push('quantity = @quantity');
                }
                if (item.price !== undefined) {
                itemRequest.input('price', sql.Decimal(10, 2), item.price);
                itemUpdateFields.push('price = @price');
                }
                if (item.note !== undefined) {
                itemRequest.input('note', sql.NVarChar, item.note);
                itemUpdateFields.push('note = @note');
                }
                if (item.status !== undefined) {
                itemRequest.input('status', sql.NVarChar, item.status);
                itemUpdateFields.push('status = @status');
                }
                
                itemUpdateFields.push('updatedAt = @updatedAt');
                
                await itemRequest.query(`
                UPDATE OrderItems 
                SET ${itemUpdateFields.join(', ')} 
                WHERE id = @id AND orderId = @orderId
                `);
            } else {
                // Yeni kalem ekleme
                await new sql.Request(transaction)
                .input('orderId', sql.Int, id)
                .input('productId', sql.Int, item.productId)
                .input('quantity', sql.Int, item.quantity)
                .input('price', sql.Decimal(10, 2), item.price)
                .input('note', sql.NVarChar, item.note || '')
                .input('status', sql.NVarChar, item.status || 'new')
                .input('createdAt', sql.DateTime, new Date())
                .input('updatedAt', sql.DateTime, new Date())
                .query(`
                    INSERT INTO OrderItems (
                    orderId, productId, quantity, price, note, status, createdAt, updatedAt
                    )
                    VALUES (
                    @orderId, @productId, @quantity, @price, @note, @status, @createdAt, @updatedAt
                    )
                `);
            }
            }
        }
        
        await transaction.commit();
        
        // Güncellenmiş siparişin detaylarını al
        return await Order.findById(id);
        
        } catch (error) {
        await transaction.rollback();
        throw error;
        }
    }
    
    // Sipariş kalem durumu güncelleme
    static async updateOrderItemStatus(itemId, status) {
        try {
        const pool = await global.sqlPool;
        await pool.request()
            .input('id', sql.Int, itemId)
            .input('status', sql.NVarChar, status)
            .input('updatedAt', sql.DateTime, new Date())
            .query(`
            UPDATE OrderItems
            SET status = @status, updatedAt = @updatedAt
            WHERE id = @id
            `);
        
        // Sipariş kaleminin bağlı olduğu siparişin ID'sini bul
        const result = await pool.request()
            .input('id', sql.Int, itemId)
            .query('SELECT orderId FROM OrderItems WHERE id = @id');
        
        if (result.recordset.length > 0) {
            const orderId = result.recordset[0].orderId;
            return await Order.findById(orderId);
        }
        
        return null;
        } catch (error) {
        throw error;
        }
    }
    
    // Sipariş silme (genellikle sadece iptal etme işlemi yapılır)
    static async delete(id) {
        const transaction = new sql.Transaction(await global.sqlPool);
        
        try {
        await transaction.begin();
        
        // Önce sipariş kalemlerini sil (CASCADE ile de yapılabilir ama burada açık olarak belirtiliyor)
        await new sql.Request(transaction)
            .input('orderId', sql.Int, id)
            .query('DELETE FROM OrderItems WHERE orderId = @orderId');
        
        // Sonra siparişi sil
        const result = await new sql.Request(transaction)
            .input('id', sql.Int, id)
            .query('DELETE FROM Orders OUTPUT DELETED.* WHERE id = @id');
        
        await transaction.commit();
        
        if (result.recordset.length > 0) {
            return new Order(result.recordset[0]);
        }
        
        return null;
        } catch (error) {
        await transaction.rollback();
        throw error;
        }
    }
    
    // Siparişi ödenmiş olarak işaretle
    static async markAsPaid(id, paymentData) {
        try {
        const pool = await global.sqlPool;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('status', sql.NVarChar, 'paid')
            .input('paymentStatus', sql.NVarChar, 'paid')
            .input('paymentMethod', sql.NVarChar, paymentData.paymentMethod)
            .input('closedAt', sql.DateTime, new Date())
            .input('updatedAt', sql.DateTime, new Date())
            .query(`
            UPDATE Orders
            SET status = @status, 
                paymentStatus = @paymentStatus, 
                paymentMethod = @paymentMethod, 
                closedAt = @closedAt,
                updatedAt = @updatedAt
            OUTPUT INSERTED.*
            WHERE id = @id
            `);
        
        if (result.recordset.length > 0) {
            // Güncellenmiş siparişin detaylarını al
            return await Order.findById(id);
        }
        
        return null;
        } catch (error) {
        throw error;
        }
    }
    
    // Sipariş özeti (raporlama için)
    static async getSummary(startDate, endDate) {
        try {
        const pool = await global.sqlPool;
        const result = await pool.request()
            .input('startDate', sql.DateTime, new Date(startDate))
            .input('endDate', sql.DateTime, new Date(endDate))
            .input('paidStatus', sql.NVarChar, 'paid')
            .query(`
            SELECT 
                COUNT(*) as totalOrders,
                SUM(subtotal) as totalSubtotal,
                SUM(tax) as totalTax,
                SUM(discount) as totalDiscount,
                SUM(total) as totalAmount,
                AVG(total) as averageOrderValue
            FROM Orders
            WHERE createdAt BETWEEN @startDate AND @endDate
            AND paymentStatus = @paidStatus
            `);
        
        return result.recordset[0];
        } catch (error) {
        throw error;
        }
    }
}

module.exports = { Order, OrderItem }