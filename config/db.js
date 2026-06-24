const mongoose = require("mongoose");
const User = require('../models/User');

function connectDB() {
  return mongoose.connect(process.env.MONGO_URI)
}

async function createDefaultUser() {
    const existing = await User.findOne();
    if (!existing) {
        await User.create({
            name: 'Qasim Ali',
            email: 'qasimali24@gmail.com'
        });
    }
}

mongoose.connection.on('open', async () => {
  console.log('Connected to MongoDB');
  await createDefaultUser();
});

module.exports = connectDB
