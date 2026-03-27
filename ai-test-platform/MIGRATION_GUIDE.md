# 数据库迁移使用说明

## 1. 当前现状

当前项目已具备：

- TypeORM CLI 配置：`src/config/typeorm.config.ts`
- 初始迁移文件：`src/migrations/1774599997645-InitSchema.ts`
- 初始化账号脚本：`src/scripts/seed.ts`

但需要注意：

- 过去开发过程中使用过 `synchronize=true`
- 因此当前本地开发库通常已经存在表结构

## 2. 初始迁移的正确用途

`InitSchema` 的用途是：

- 给一个全新的空数据库初始化完整表结构

不适合：

- 直接对当前已经建过表的开发数据库执行

## 3. 推荐使用方式

### 方式一：新数据库初始化（推荐）

1. 创建新数据库
2. 修改 `.env` 中 `DB_DATABASE`
3. 执行迁移
4. 执行 seed

示例：

```bash
mysql -uroot -p -e "CREATE DATABASE ai_test_platform_new DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 修改 .env
# DB_DATABASE=ai_test_platform_new

npm run migration:run
npm run seed
```

### 方式二：保留老开发库，后续只做增量迁移

适合当前继续快速开发。

策略：

- 当前老库继续使用
- 不执行 `InitSchema`
- 下次结构变更后生成新的增量迁移
- 新环境统一使用初始迁移 + 增量迁移

## 4. 后续开发建议

从现在开始，推荐每次数据库结构变更都按下面流程处理：

```bash
# 1) 修改 entity

# 2) 基于空白/基线数据库生成增量迁移
npm run migration:generate -- src/migrations/YourChangeName

# 3) 检查生成的迁移内容

# 4) 在测试数据库执行
npm run migration:run
```

## 5. 生产建议

- 生产环境关闭 `synchronize`
- 只允许通过迁移变更表结构
- seed 脚本只用于初始化账号或最小基础数据

## 6. 当前阶段最稳妥的结论

如果你的本地库已经可以正常开发联调：

- 不要强行对当前库执行 `InitSchema`
- 当前库继续使用
- 从下一次结构变更开始走增量迁移
- 新环境或新库再执行 `InitSchema`
