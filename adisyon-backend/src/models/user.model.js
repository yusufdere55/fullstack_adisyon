const sql = require('mssql');
const bcrypt = require('bcrypt');

class User {
    constructor(data) {
        this.id = data.id;
        this.username = data.username;
        this.password = data.password;
        this.name = data.name;
        this.email = data.email;
        this.role = data.role || 'waiter';
        this.phone = data.phone;
        this.isActive = data.isActive != undefined ? data.isActive : true;
        this.createAt = data.createAt;
        this.updateAt = data.updateAt;
    }
    
    //Kullanıcı oluşturma
    static async create(userData){
        try{
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(userData.password, salt);

            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('username', sql.NVarChar, userData.username)
                .input('password', sql.NVarChar, hashedPassword)
                .input('name', sql.NVarChar, userData.name)
                .input('email', sql.NVarChar, userData.email)
                .input('role', sql.NVarChar, userData.role || 'waiter')
                .input('phone', sql.NVarChar, userData.phone || null)
                .input('isActive', sql.Bit, userData.isActive !== undefined ? userData.isActive : true)
                .input('createdAt', sql.DateTime, new Date())
                .input('updatedAt', sql.DateTime, new Date())
                .query(`
                INSERT INTO Users (username, password, name, email, role, phone, isActive, createdAt, updatedAt)
                OUTPUT INSERTED.*
                VALUES (@username, @password, @name, @email, @role, @phone, @isActive, @createdAt, @updatedAt)
                `);
            if(result.recordset.length  > 0 ){
                return new User(result.recordset[0])
            }
            return null;
        }catch(err){
            throw err
        }
    }

    //Kullanıcıyı ID'ye göre bulma
    static async findById(id) {
        try{
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('id',sql.Int,id)
                .query('SELECT * FROM Users WHERE id = @id');
            
            if(result.recordset.length  > 0){
                return new User(result.recordset[0])
            }
            return null;
        }catch(err){
            throw err
        }
    }

    //Kullanıcıyı kullanıcı adına göre bulma
    static async findByUsername(username) {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('username',sql.NVarChar,username)
                .query('SELECT * FROM Users WHERE username = @username');

            if(result.recordset.length  > 0){
                return new User(result.recordset[0])
            }
            return null;
        } catch (error) {
            throw error
        }
    }

    //Kullanıcıyı güncelleme
    static async update(id,updateData) {
        try {
            const updateFields = [];
            const request = (await global.sqlPool).request()
                .input('id',sql.Int,id)
                .query('updateAt',sql.DateTime, new Date());

            if(updateData.username){
                request.input('username',sql.NVarChar,updateData.username);
                updateFields.push('username = @username');
            }
            if(updateData.password){
                const salt = await  bcrypt.salt(10);
                const hashedPassword = await bcrypt.hash(updateData.password, salt)
                request.input('password',sql.NVarChar,hashedPassword);
                updateFields.push('password = @password');
            }
            if(updateData.name){
                request.input('name',sql.NVarChar,updateData.name)
                updateFields.push('name = @name');
            }
            if (updateData.email) {
                request.input('email', sql.NVarChar, updateData.email);
                updateFields.push('email = @email');
            }
            if (updateData.role) {
                request.input('role', sql.NVarChar, updateData.role);
                updateFields.push('role = @role');
            }
            if (updateData.phone !== undefined) {
                request.input('phone', sql.NVarChar, updateData.phone);
                updateFields.push('phone = @phone');
            }
            if (updateData.isActive !== undefined) {
                request.input('isActive', sql.Bit, updateData.isActive);
                updateFields.push('isActive = @isActive');
            }

            updateFields.push('updateAt = @updateAt');

            const query = `
            UPDATE Users
            SET ${updateFields.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
            `;
            
            const result = await request.query(query);

            if(result.recordset.length  > 0 ){
                return new User(result.recordset[0])
            }
            return null;
        } catch (error) {
            throw error
        }
    }

    //Tüm kullanıcıları getirme
    static async findAll() {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .query('SELECT * FROM Users')
            
            return result.recordset.map(user => new User(user))

        } catch (error) {
            throw error
        }
    }

    //Kullanıcı silme
    static async delete(id) {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .query('DELETE FROM Users OUTPUT DELETED.* WHERE id = @id');

            if(result.recordset.length  > 0){
                return new User(result.recordset[0]);   
            }
            return null;
        } catch (error) {
            throw error
        }
    }

    //Şifre doğrulama metodu
    async comparePassword(candidatePassword) {
        return bcrypt.compare(candidatePassword,this.password);
    }
}

module.exports = User 