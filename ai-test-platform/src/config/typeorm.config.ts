import 'dotenv/config';
import { DataSource } from 'typeorm';

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'ai_test_platform',
  entities: ['src/**/*.entity.ts', 'dist/**/*.entity.js'],
  migrations: ['src/migrations/*.ts', 'dist/migrations/*.js'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
});
