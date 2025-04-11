const User = require('../models/user.model');
const { generateToken } = require('../utils/jwt.utils');
const sql = require('mssql')

//Kullanıcı girişi
exports.login = async (req,res) => {
    try {
        const { username, password } = req.body;

        //Kullanıcıyı bul
        const user = await User.findByUsername(username)

        if(!user)
            return res.status(401).json({ message : 'Geçersiz kullanıcı adı veya şifre' })

        //Şifre kontrolü
        const isPasswordValid = await user.comparePassword(password);
        if(!isPasswordValid)
            return res.status(401).json({ message : 'Geçersiz kullanıcı adı veya şifre' })

        if(!user.isActive)
            return res.status(403).json({ message : 'Hesabınız devre dışı bırakılmış' })

        //JWT Token oluştur
        const token = generateToken(user);

        res.status(200).json({
            message: 'Giriş Başarılı',
            token,
            user:{
                id:user.id,
                username:user.username,
                name:user.name,
                role:user.role,
                email:user.email
            }
        });


    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Giriş işlemi sırasında bir hata oluştu' });
    }
}

exports.register = async (req,res) => {
    try {
        const { username, password, name, email, role, phone } = req.body;
        
        //Kullanıcı adı veya email zaten kullanıyor mu kontrol et
        const pool = await global.sqlPool;
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('email', sql.NVarChar, email)
            .query('SELECT * FROM Users WHERE username = @username OR email = @email')

        if (result.recordset.length > 0)
            return res.status(400).json({ message : 'Kullanıcı adı ve email zaten kullanılıyor'})

        const userData = {
            username,
            password,
            name,
            email,
            role: role || 'waiter',
            phone
        };

        const user = await User.create(userData);

        if(!user)
            return res.status(500).json({ message : 'Kullanıcı oluşturulamadı' })

        
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
        console.error('Register error:', error);
        res.status(500).json({ message: 'Kullanıcı oluşturma sırasında bir hata oluştu' });
    }
}


exports.getMe = async (req,res) => {
    try {
        const userId = req.user.id;
        
        const user = await User.findById(userId);

        if(!user)
            return res.status(404).json({ message : 'Kullanıcı bulunamadı' })

        
        res.status(200).json({
            user: {
                id:user.id,
                username:user.username,
                name:user.name,
                role:user.role,
                email: user.email,
                phone:user.phone,
                isActive : user.isActive
            }
        });

    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ message: 'Kullanıcı bilgileri alınırken bir hata oluştu' });
    }
}

exports.changePassword = async (req,res) => {
    try {
        const userId = req.user.id;
        const {currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı' });
        }

        //Mevcut şifreyi kontrol et
        const isPasswordValid = await user.comparePassword(currentPassword);
        if(!isPasswordValid)
            return res.status(401).json({ message : 'Mevcut Şifre yanlış' })

        //Şifreyi güncelle
        const updatedUser = await User.update(userId, { password : newPassword})

        if(!updatedUser)
            return res.status(500).json({ message : 'Şifre güncellenemedi' })

        res.status(200).json({ message : 'Şifre başarıyla güncellendi' })

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Şifre değiştirme sırasında bir hata oluştu' });
    }
}