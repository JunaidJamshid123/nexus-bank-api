const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    underscored: true,
    timestamps: true,
  },
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,
    idle: 10000,
  },
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('PostgreSQL connected successfully');
  } catch (error) {
    console.error(`PostgreSQL connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
