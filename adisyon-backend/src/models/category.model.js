const sql = require('mssql');

class Category {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.image = data.image;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.order = data.order !== undefined ? data.order : 0;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  // Kategori oluşturma
  static async create(categoryData) {
    try {
      const pool = await global.sqlPool;
      const result = await pool.request()
        .input('name', sql.NVarChar, categoryData.name)
        .input('description', sql.NVarChar, categoryData.description || null)
        .input('image', sql.NVarChar, categoryData.image || null)
        .input('isActive', sql.Bit, categoryData.isActive !== undefined ? categoryData.isActive : true)
        .input('order', sql.Int, categoryData.order !== undefined ? categoryData.order : 0)
        .input('createdAt', sql.DateTime, new Date())
        .input('updatedAt', sql.DateTime, new Date())
        .query(`
          INSERT INTO Categories (name, description, image, isActive, [order], createdAt, updatedAt)
          OUTPUT INSERTED.*
          VALUES (@name, @description, @image, @isActive, @order, @createdAt, @updatedAt)
        `);
      
      if (result.recordset.length > 0) {
        return new Category(result.recordset[0]);
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Kategoriyi ID'ye göre bulma
  static async findById(id) {
    try {
      const pool = await global.sqlPool;
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('SELECT * FROM Categories WHERE id = @id');
      
      if (result.recordset.length > 0) {
        return new Category(result.recordset[0]);
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Kategori güncelleme
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
      if (updateData.image !== undefined) {
        request.input('image', sql.NVarChar, updateData.image);
        updateFields.push('image = @image');
      }
      if (updateData.isActive !== undefined) {
        request.input('isActive', sql.Bit, updateData.isActive);
        updateFields.push('isActive = @isActive');
      }
      if (updateData.order !== undefined) {
        request.input('order', sql.Int, updateData.order);
        updateFields.push('[order] = @order');
      }

      updateFields.push('updatedAt = @updatedAt');

      const query = `
        UPDATE Categories
        SET ${updateFields.join(', ')}
        OUTPUT INSERTED.*
        WHERE id = @id
      `;

      const result = await request.query(query);
      
      if (result.recordset.length > 0) {
        return new Category(result.recordset[0]);
      }
      return null;
    } catch (error) {
      throw error;
    }
  }

  // Tüm kategorileri getirme
  static async findAll() {
    try {
      const pool = await global.sqlPool;
      const result = await pool.request()
        .query('SELECT * FROM Categories ORDER BY [order]');
      
      return result.recordset.map(category => new Category(category));
    } catch (error) {
      throw error;
    }
  }

  // Aktif kategorileri getirme
  static async findActive() {
    try {
      const pool = await global.sqlPool;
      const result = await pool.request()
        .query('SELECT * FROM Categories WHERE isActive = 1 ORDER BY [order]');
      
      return result.recordset.map(category => new Category(category));
    } catch (error) {
      throw error;
    }
  }

  // Kategori silme
  static async delete(id) {
    try {
      const pool = await global.sqlPool;
      const result = await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM Categories OUTPUT DELETED.* WHERE id = @id');
      
      if (result.recordset.length > 0) {
        return new Category(result.recordset[0]);
      }
      return null;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = { Category };