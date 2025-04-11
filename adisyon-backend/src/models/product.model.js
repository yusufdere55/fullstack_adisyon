const sql = require('mssql');

class Product {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.price = data.price;
        this.categoryId = data.categoryId;
        this.ingredients = data.ingredients || [] ;
        this.isActive = data.isActive != undefined ? data.isActive : true;
        this.image = data.image;
        this.preparationTime =  data.preparationTime !== undefined ? data.preparationTime : 10;
        this.createAt = data.createAt;
        this.updateAt = data.updateAt;
    }

    //Ürün oluşturma
    static async create(productData) {
        try {
            const ingredientsJson = JSON.stringify(productData.ingredients || [])

            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('name',sql.NVarChar,productData.name)
                .input('description',sql.NVarChar,productData.description || null)
                .input('price',sql.Decimal(10,2),productData.price)
                .input('categoryId',sql.Int,productData.categoryId)
                .input('image',sql.NVarChar,productData.image || null)
                .input('isActive',sql.Bit,productData.isActive != undefined ? productData.isActive : true)
                .input('ingredients',sql.NVarChar,ingredientsJson)
                .input('preparationTime',sql.Int,productData.preparationTime)
                .input('createAt',sql.DateTime, new Date())
                .input('updateAt',sql.DateTime, new Date())
                .query(`
                INSERT INTO Products (name, description, price, cost, categoryId, image, isActive, ingredients, preparationTime, createdAt, updatedAt)
                OUTPUT INSERTED.*
                VALUES (@name, @description, @price, @cost, @categoryId, @image, @isActive, @ingredients, @preparationTime, @createdAt, @updatedAt)
                `);

            if(result.recordset.length > 0){
                const productRecord = result.recordset[0];

                productRecord.ingredients = JSON.parse(productRecord.ingredients || '[]');
                return new Product(productRecord)
            }
            return null
        } catch (error) {
            throw error
        }
    }

    //Ürünü ID'ye göre bulma
    static async findById(id){
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .input('id', sql.Int, id)
                .query('SELECT * FROM Products WHERE id = @id')
            
            if (result.recordset.length > 0) {
                const productRecord = result.recordset[0];
                // JSON string'i diziye dönüştürme
                productRecord.ingredients = JSON.parse(productRecord.ingredients || '[]');
                return new Product(productRecord);
                }
                return null;
        } catch (error) {
            throw error
        }
    }

    //Ürünü güncelleme
    static async update(id, updateData) {
        try {
          const updateFields = [];
          const request = (await global.sqlPool).request()
            .input('id', sql.Int, id)
            .input('updatedAt', sql.DateTime, new Date());
    
          // Sadece belirtilen alanları güncelle
          if (updateData.name !== undefined) {
            request.input('name', sql.NVarChar, updateData.name);
            updateFields.push('name = @name');
          }
          if (updateData.description !== undefined) {
            request.input('description', sql.NVarChar, updateData.description);
            updateFields.push('description = @description');
          }
          if (updateData.price !== undefined) {
            request.input('price', sql.Decimal(10, 2), updateData.price);
            updateFields.push('price = @price');
          }
          if (updateData.cost !== undefined) {
            request.input('cost', sql.Decimal(10, 2), updateData.cost);
            updateFields.push('cost = @cost');
          }
          if (updateData.categoryId !== undefined) {
            request.input('categoryId', sql.Int, updateData.categoryId);
            updateFields.push('categoryId = @categoryId');
          }
          if (updateData.image !== undefined) {
            request.input('image', sql.NVarChar, updateData.image);
            updateFields.push('image = @image');
          }
          if (updateData.isActive !== undefined) {
            request.input('isActive', sql.Bit, updateData.isActive);
            updateFields.push('isActive = @isActive');
          }
          if (updateData.ingredients !== undefined) {
            request.input('ingredients', sql.NVarChar, JSON.stringify(updateData.ingredients));
            updateFields.push('ingredients = @ingredients');
          }
          if (updateData.preparationTime !== undefined) {
            request.input('preparationTime', sql.Int, updateData.preparationTime);
            updateFields.push('preparationTime = @preparationTime');
          }
    
          updateFields.push('updatedAt = @updatedAt');
    
          const query = `
            UPDATE Products
            SET ${updateFields.join(', ')}
            OUTPUT INSERTED.*
            WHERE id = @id
          `;
    
          const result = await request.query(query);
          
          if (result.recordset.length > 0) {
            const productRecord = result.recordset[0];
            // JSON string'i diziye dönüştürme
            productRecord.ingredients = JSON.parse(productRecord.ingredients || '[]');
            return new Product(productRecord);
          }
          return null;
        } catch (error) {
          throw error;
        }
    }

    //Tüm ürünleri getir
    static async findAll() {
        try {
          const pool = await global.sqlPool;
          const result = await pool.request()
            .query('SELECT * FROM Products ORDER BY name');
          
          return result.recordset.map(product => {
            // JSON string'i diziye dönüştürme
            product.ingredients = JSON.parse(product.ingredients || '[]');
            return new Product(product);
          });
        } catch (error) {
          throw error;
        }
    }

    //Ürünü kategoriye göre bulma
    static async findByCategory(categoryId) {
        try {
          const pool = await global.sqlPool;
          const result = await pool.request()
            .input('categoryId', sql.Int, categoryId)
            .query('SELECT * FROM Products WHERE categoryId = @categoryId ORDER BY name');
          
          return result.recordset.map(product => {
            // JSON string'i diziye dönüştürme
            product.ingredients = JSON.parse(product.ingredients || '[]');
            return new Product(product);
          });
        } catch (error) {
          throw error;
        }
    }

    //Aktif ürünleri getir
    static async findActive() {
        try {
            const pool = await global.sqlPool;
            const result = await pool.request()
                .query('SELECT * FROM Products WHERE isActive = 1 ORDER BY name')

            return result.recordset.map(product => {
                // JSON string'i diziye dönüştürme
                product.ingredients = JSON.parse(product.ingredients || '[]');
                return new Product(product);
                });
        } catch (error) {
            throw error
        }
    }

    //Ürünü sil
    static async delete(id) {
        try {
          const pool = await global.sqlPool;
          const result = await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Products OUTPUT DELETED.* WHERE id = @id');
          
          if (result.recordset.length > 0) {
            const productRecord = result.recordset[0];
            // JSON string'i diziye dönüştürme
            productRecord.ingredients = JSON.parse(productRecord.ingredients || '[]');
            return new Product(productRecord);
          }
          return null;
        } catch (error) {
          throw error;
        }
    }
}

module.exports = { Product }