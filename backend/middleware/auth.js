// backend/middleware/auth.js
const MOCK_USERS = {
    'netrunnerX': { role: 'admin' },
    'reliefAdmin': { role: 'contributor' },
    'citizen1': { role: 'contributor' }
};

function auth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    const username = authHeader.split(' ')[1];
    const user = MOCK_USERS[username];

    if (!user) {
        return res.status(403).json({ message: 'Forbidden: Invalid user' });
    }

    req.user = { username, ...user };
    next();
}

module.exports = auth;