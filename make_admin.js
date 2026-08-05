const {db} = require('./database'); db.exec("UPDATE users SET is_admin = 1 WHERE email = 'ritishaacharjee2005@gmail.com'"); console.log('Update complete.');
