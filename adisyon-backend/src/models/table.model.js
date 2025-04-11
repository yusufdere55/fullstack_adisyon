const sql = require('mssql');

class Table {
    constructor(data) {
        this.id = data.id;
        this.tableNumber = data.tableNumber;
        this.status = data.status || 'empty';
        this.qrcode = data.qrcode;
        this.currentOrderId = data.currentOrderId;
        this.isActive = data.isActive != undefined ? data.isActive : true;
        this.createAt = data.createAt;
        this.updateAt = data.updateAt;
    }

    //Masa oluşturma
    static async create(tableData) {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('tableNumber',sql.Int,tableData.tableNumber)
                .input('capacity', sql.Int, tableData.capacity || 4)
                .input('status', sql.NVarChar, tableData.status || 'empty')
                .input('qrCode', sql.NVarChar, tableData.qrCode || null)
                .input('currentOrderId', sql.Int, tableData.currentOrderId || null)
                .input('isActive', sql.Bit, tableData.isActive !== undefined ? tableData.isActive : true)
                .input('createdAt', sql.DateTime, new Date())
                .input('updatedAt', sql.DateTime, new Date())
                .query(`
                INSERT INTO Tables (tableNumber, capacity, status, qrCode, currentOrderId, isActive, createdAt, updatedAt)
                OUTPUT INSERTED.*
                VALUES (@tableNumber, @capacity, @status, @qrCode, @currentOrderId, @isActive, @createdAt, @updatedAt)
                `);
            
            if (result.recordset.length > 0) {
                return new Table(result.recordset[0]);
            }
            return null;
        } catch (error) {
            throw error
        }
    }

    //Masayı ID'ye göre bulma
    static async findById(id) {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('id',sql.Int,id)
                .query('SELECT * FROM Tables WHERE id = @id')

            if (result.recordset.length > 0) {
                return new Table(result.recordset[0]);
            }
            return null;
        } catch (error) {
            throw error
        }
    }

    //Masayı numarasına göre bulma
    static async findByTableNumber(tableNumber) {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('tableNumber',sql.Int,tableNumber)
                .query('SELECT * FROM Tables WHERE tableNumber = @tableNumber')

            if (result.recordset.length > 0) {
                return new Table(result.recordset[0]);
            }
            return null;  
        } catch (error) {
            throw error
        }
    }

     // Masa güncelleme
    static async update(id, updateData) {
        try {
        const updateFields = [];
        const request = (await global.sqlPool).request()
            .input('id', sql.Int, id)
            .input('updatedAt', sql.DateTime, new Date());

        // Sadece belirtilen alanları güncelle
        if (updateData.tableNumber !== undefined) {
            request.input('tableNumber', sql.Int, updateData.tableNumber);
            updateFields.push('tableNumber = @tableNumber');
        }
        if (updateData.capacity !== undefined) {
            request.input('capacity', sql.Int, updateData.capacity);
            updateFields.push('capacity = @capacity');
        }
        if (updateData.status) {
            request.input('status', sql.NVarChar, updateData.status);
            updateFields.push('status = @status');
        }
        if (updateData.qrCode !== undefined) {
            request.input('qrCode', sql.NVarChar, updateData.qrCode);
            updateFields.push('qrCode = @qrCode');
        }
        if (updateData.currentOrderId !== undefined) {
            request.input('currentOrderId', sql.Int, updateData.currentOrderId);
            updateFields.push('currentOrderId = @currentOrderId');
        }
        if (updateData.isActive !== undefined) {
            request.input('isActive', sql.Bit, updateData.isActive);
            updateFields.push('isActive = @isActive');
        }

        updateFields.push('updatedAt = @updatedAt');

        const query = `
            UPDATE Tables
            SET ${updateFields.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
        `;

        const result = await request.query(query);
        
        if (result.recordset.length > 0) {
            return new Table(result.recordset[0]);
        }
        return null;
        } catch (error) {
        throw error;
        }
    }

    // Tüm masaları getirme
    static async findAll() {
        try {
        const pool = await global.sqlPool;
        const result = await pool.request()
            .query('SELECT * FROM Tables ORDER BY tableNumber');
        
        return result.recordset.map(table => new Table(table));
        } catch (error) {
        throw error;
        }
    }

    //Active masaları getirme
    static async findActive() {
        try{
            const pool = await global.sqlPool;
            const result = await pool.request()
                .query('SELECT * FROM Tables WHERE isActive = 1 ORDER BY tableNumber')
            return result.recordset.map(table => new Table(table))
        } catch(error){
            throw error
        }
    }

    //Boş masaları getirem
    static async findActive() {
        try{
            const pool = await global.sqlPool;
            const result = await pool.request()
                .query("SELECT * FROM Tables WHERE status = 'empty' AND isActive = 1 ORDER BY tableNumber")
            return result.recordset.map(table => new Table(table))
        } catch(error){
            throw error
        }
    }

    //Masa Silme
    static async delete(id) {
        try {
          const pool = await global.sqlPool;
          const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Tables OUTPUT DELETED.* WHERE id = @id');
          
          if (result.recordset.length > 0) {
            return new Table(result.recordset[0]);
          }
          return null;
        } catch (error) {
          throw error;
        }
    }
}

module.exports = { Table }