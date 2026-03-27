import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User, UserRole, UserStatus } from '../modules/user/entities/user.entity';

const dataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_DATABASE || 'ai_test_platform',
  entities: [User],
  synchronize: false,
  logging: false,
});

async function seed() {
  await dataSource.initialize();
  const userRepository = dataSource.getRepository(User);

  const adminUsername = process.env.SEED_ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'admin123';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const adminRealName = process.env.SEED_ADMIN_REAL_NAME || '平台管理员';

  const existingAdmin = await userRepository.findOne({ where: { username: adminUsername } });
  if (existingAdmin) {
    console.log(`Seed skipped: user '${adminUsername}' already exists.`);
    await dataSource.destroy();
    return;
  }

  const password = await bcrypt.hash(adminPassword, 10);
  const adminUser = userRepository.create({
    username: adminUsername,
    password,
    realName: adminRealName,
    email: adminEmail,
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  });

  await userRepository.save(adminUser);
  console.log(`Seed completed: created admin user '${adminUsername}'.`);
  await dataSource.destroy();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error);
  if (dataSource.isInitialized) {
    await dataSource.destroy();
  }
  process.exit(1);
});
