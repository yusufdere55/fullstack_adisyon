const jwt = require('jsonwebtoken');

const generateToken = (user) => {
    return jwt.sign(
        {
            id: user._id,
            username:user.username,
            role:user.role,
        },
        process.env.JWT_SECRET,
        {
            expiresIn:process.env.JWT_EXPIRES_IN,
        }
    );
};

const verifyToken = (token) => {
    return jwt.verify(token,process.env.JWT_SECRET);
};

module.exports = { generateToken, verifyToken }