const { verifyToken } = require('../utils/jwt.utils');

const authMiddleware = (req,res,next) => {
    try{
        const authHeader = req.headers.authorization;

        if(!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message : 'Yetkilendirme başlığı bulunamadı' })
        }
        
        const token = authHeader.split(' ')[1];

        const decoded = verifyToken(token);

        req.user = decoded;
        next();
    }catch(err){
        return res.status(401).json({ message : 'Geçersiz token' })
    }
};

const roleMiddleware = (roles) => {
    return (req,res,next) => {
        if(!req.user){
            return res.status(401).json({ message : 'Yetkilendirme başlığı bulunamadı' })
        }

        if(!roles.includes(req.user.role)){
            return res.status(401).json({ message : 'Yetkilendirme başlığı bulunamadı' })
        }

        next();
    };
}


module.exports = { authMiddleware, roleMiddleware }