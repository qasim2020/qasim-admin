const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require('../models/User');

function connectDB() {
  return mongoose.connect(process.env.DATABASE_URL)
}

async function createDefaultUser() {
    const existing = await User.findOne();
    if (!existing) {
        const defaultPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
        const hashed = await bcrypt.hash(defaultPassword, 12);
        await User.create({
            name: 'Qasim Ali',
            email: 'qasimali24@gmail.com',
            password: hashed,
        });
        console.log(`Default admin created — email: qasimali24@gmail.com, password: ${defaultPassword}`);
        console.warn('⚠️  Change the default password immediately via /forgot-password');
    }
}

mongoose.connection.on('open', async () => {
  console.log('Connected to MongoDB');
  await createDefaultUser();
});

module.exports = connectDB
