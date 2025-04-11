const User = require('../models/user.model');
const sql = require('mssql')

exports.getAllUsers = async (req,res) => {
    try {
        const users = await User.findAll();
        const userWithoutPassword = users.map(user  => {
            const {password, ...rest } = user;
            return rest;
        })

        res.status(200).json(userWithoutPassword)
    } catch (error) {
        console.error('getAllUsers error:', error);
        res.status(500).json({ message: 'Kullanıcılar alınırken bir hata oluştu' });
    }
}

exports.getUserById = async (req,res) => {
    try {
        const user = await User.findById(req.user.id);

        if(!user)
            return res.status(404).json({ message : 'Kullanıcı bulunamadı' })

        const {password, ...userWithoutPassword} = user;
        res.status(200).json(userWithoutPassword);
    } catch (error) {
        console.error('getUserById error:', error);
        res.status(500).json({ message: 'Kullanıcı bilgileri alınırken bir hata oluştu' });
    }
}

exports.createUser = async (req,res) => {
    try {
        const { username, password, name, email ,role, phone } = req.body;

        const pool = await global.sqlPool;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE username = @username OR email = @email')
    
        if(result.recordest.length > 0 )
            return res.status(400).json({ message : 'Kullanıcı adı ve email zaten kullanılıyor'})
    
        const user = await User.create({
            username,
            password,
            name,
            email,
            role: role || 'waiter',
            phone,
        });

        if(!user)
            return res.status(500).json({ message: 'Kullanıcı oluşturulamadı' });

        res.status(201).json({
            message:'Kullanıcı başarıyla oluşturuldu',
            user:{
                id:user.id,
                username:user.username,
                name:user.name,
                role:user.role,
                email:user.email,
                phone:user.phone
            }
        });
    } catch (error) {
        console.error('createUser error:', error);
        res.status(500).json({ message: 'Kullanıcı oluşturulurken bir hata oluştu' });
    }
}

exports.updateUser = async (req,res) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;

        const User = await User.findById(userId);
        if(!user)
            return res.status(404).json({ message : 'Kullanıcı bulunamadı' })

        const updatedUser =await User.update(userId,updateData);
        if(!updatedUser)
            return res.status(500).json({ message : 'Kullanıcı güncellenemedi' })

        const { password, ...userData } = updatedUser;
        res.status(200).json({
          message: 'Kullanıcı başarıyla güncellendi',
          user: userData
        });
    } catch (error) {
        console.error('updateUser error:', error);
        res.status(500).json({ message: 'Kullanıcı güncellenirken bir hata oluştu' });
    }
}

exports.deleteUser = async (req,res) => {
    try {
        const userId = req.user.id;

        const deleteUser = await User.delete(userId)
        if(!deleteUser)
            return res.status(404).json({ message : 'Kullanıcı bulunamadı' })

        res.status(200).json({ message : 'Kullanıcı başarıyla silindi' })
    } catch (error) {
        console.error('deleteUser error:', error);
        res.status(500).json({ message: 'Kullanıcı silinirken bir hata oluştu' });
    }
}