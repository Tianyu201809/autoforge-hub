import type { StoredScript } from '~/types/workspace'
import type { StoredTeam } from '~/types/workspace'
import type { StoredUserRecord } from '~/types/auth'

function generateId(): string {
  return crypto.randomUUID()
}

function iso(daysAgo: number): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

export const MOCK_USER_ID = 'demo-user-001'
export const MOCK_EMAIL = 'demo@autoforge.dev'
export const MOCK_PASSWORD = 'demo123456'

export function createMockUser(): StoredUserRecord {
  return {
    id: MOCK_USER_ID,
    email: MOCK_EMAIL,
    password: MOCK_PASSWORD,
    displayName: 'Demo',
    teamCount: 0,
    joinedTeamIds: []
  }
}

export function createMockTeams(): StoredTeam[] {
  return [
    {
      id: 'mock-team-01',
      name: '前端架构组',
      description: '负责前端框架选型、组件库维护与构建工具优化',
      createdAt: iso(30),
      ownerId: MOCK_USER_ID,
      memberIds: [MOCK_USER_ID, 'user-alice', 'user-bob', 'user-charlie']
    },
    {
      id: 'mock-team-02',
      name: '数据工程组',
      description: '数据管道、ETL 脚本与 BI 报表自动化',
      createdAt: iso(14),
      ownerId: 'user-alice',
      memberIds: [MOCK_USER_ID, 'user-alice', 'user-dave']
    },
    {
      id: 'mock-team-03',
      name: 'DevOps 自动化',
      description: 'CI/CD 流水线、基础设施即代码与监控告警',
      createdAt: iso(7),
      ownerId: 'user-bob',
      memberIds: [MOCK_USER_ID, 'user-bob', 'user-eve', 'user-frank']
    }
  ]
}

export function createMockScripts(): StoredScript[] {
  return [
    {
      id: 'mock-script-01',
      title: '数据清洗预处理',
      description: '对 CSV 数据进行空值填充、类型转换与异常值过滤',
      zipName: 'data-cleaner-v2.1.zip',
      zipSize: 245760,
      tags: ['数据', '清洗', 'Python'],
      createdAt: iso(2),
      updatedAt: iso(2),
      ownerId: MOCK_USER_ID,
      teamId: undefined
    },
    {
      id: 'mock-script-02',
      title: 'GitHub 仓库统计',
      description: '获取仓库的 star、fork、issue 数据并生成趋势报告',
      zipName: 'gh-stats-0.9.zip',
      zipSize: 102400,
      tags: ['GitHub', '统计', 'API'],
      createdAt: iso(5),
      updatedAt: iso(5),
      ownerId: MOCK_USER_ID,
      teamId: undefined
    },
    {
      id: 'mock-script-03',
      title: '邮件模板渲染引擎',
      description: '基于 Markdown 模板批量生成并发送 HTML 邮件',
      zipName: 'mail-renderer-1.0.zip',
      zipSize: 188416,
      tags: ['邮件', '模板', 'Node.js'],
      createdAt: iso(10),
      updatedAt: iso(8),
      ownerId: MOCK_USER_ID,
      teamId: undefined
    },
    {
      id: 'mock-script-04',
      title: '日志聚合分析器',
      description: '收集多台服务器的应用日志，聚合后进行错误归类与趋势分析',
      zipName: 'log-aggr-v3.zip',
      zipSize: 312320,
      tags: ['日志', '分析', 'Go'],
      createdAt: iso(15),
      updatedAt: iso(15),
      ownerId: MOCK_USER_ID,
      teamId: undefined
    },
    {
      id: 'mock-script-05',
      title: 'API 健康检查守护',
      description: '定时检测多个 API 端点可用性，异常时通过 Slack/Discord 告警',
      zipName: 'hc-daemon-2.0.zip',
      zipSize: 90112,
      tags: ['监控', 'API', '告警'],
      createdAt: iso(20),
      updatedAt: iso(18),
      ownerId: MOCK_USER_ID,
      teamId: undefined
    },
    // Team scripts
    {
      id: 'mock-script-06',
      title: '组件库打包脚本',
      description: '自动构建前端组件库，生成 ESM/CJS/UMD 三种格式',
      zipName: 'build-lib-1.2.zip',
      zipSize: 141312,
      tags: ['构建', '组件库', 'Rollup'],
      createdAt: iso(3),
      updatedAt: iso(3),
      ownerId: MOCK_USER_ID,
      teamId: 'mock-team-01'
    },
    {
      id: 'mock-script-07',
      title: 'TypeScript 类型检查自动化',
      description: 'Pre-commit hook 执行 ts 类型检查并生成报告',
      zipName: 'ts-check-hook.zip',
      zipSize: 65536,
      tags: ['TypeScript', 'Lint', 'CI'],
      createdAt: iso(6),
      updatedAt: iso(6),
      ownerId: 'user-alice',
      teamId: 'mock-team-01'
    },
    {
      id: 'mock-script-08',
      title: 'Storybook 自动部署',
      description: 'PR 触发后自动构建 Storybook 并发布到 GitHub Pages',
      zipName: 'sb-deploy-action.zip',
      zipSize: 112640,
      tags: ['Storybook', '部署', 'GitHub Actions'],
      createdAt: iso(9),
      updatedAt: iso(9),
      ownerId: 'user-bob',
      teamId: 'mock-team-01'
    },
    {
      id: 'mock-script-09',
      title: 'Kafka 到 S3 数据管道',
      description: '实时消费 Kafka 消息，分区处理后写入 S3 存储',
      zipName: 'kafka-s3-pipe-v1.zip',
      zipSize: 278528,
      tags: ['Kafka', 'S3', '数据管道'],
      createdAt: iso(4),
      updatedAt: iso(4),
      ownerId: 'user-alice',
      teamId: 'mock-team-02'
    },
    {
      id: 'mock-script-10',
      title: 'ETL 增量同步引擎',
      description: '支持 MySQL 到 ClickHouse 的增量数据同步，断点续传',
      zipName: 'etl-incr-sync-3.1.zip',
      zipSize: 401408,
      tags: ['ETL', 'MySQL', 'ClickHouse'],
      createdAt: iso(8),
      updatedAt: iso(7),
      ownerId: MOCK_USER_ID,
      teamId: 'mock-team-02'
    },
    {
      id: 'mock-script-11',
      title: 'Kubernetes 自动伸缩脚本',
      description: '基于自定义指标自动调整 K8s Deployment 副本数',
      zipName: 'k8s-hpa-custom.zip',
      zipSize: 167936,
      tags: ['Kubernetes', 'HPA', '自动伸缩'],
      createdAt: iso(5),
      updatedAt: iso(5),
      ownerId: 'user-bob',
      teamId: 'mock-team-03'
    },
    {
      id: 'mock-script-12',
      title: '容器镜像清理工具',
      description: '批量清理 Docker Registry 中的过期镜像与 untagged 层',
      zipName: 'image-cleaner-0.5.zip',
      zipSize: 81920,
      tags: ['Docker', '镜像', '清理'],
      createdAt: iso(11),
      updatedAt: iso(11),
      ownerId: MOCK_USER_ID,
      teamId: 'mock-team-03'
    }
  ]
}

export function seedMockData(): boolean {
  if (!import.meta.client) return false

  const seeded = localStorage.getItem('autoforge-mock-seeded')
  if (seeded === 'true') return false

  // Seed users
  const usersKey = 'autoforge-users'
  const existingUsers = JSON.parse(localStorage.getItem(usersKey) || '[]')
  if (existingUsers.length === 0) {
    const user = createMockUser()
    user.joinedTeamIds = ['mock-team-01', 'mock-team-02', 'mock-team-03']
    user.teamCount = 1 // owns mock-team-01
    localStorage.setItem(usersKey, JSON.stringify([
      user,
      { id: 'user-alice', email: 'alice@autoforge.dev', password: 'alice123456', displayName: 'Alice', teamCount: 1, joinedTeamIds: ['mock-team-01', 'mock-team-02'] },
      { id: 'user-bob', email: 'bob@autoforge.dev', password: 'bob123456', displayName: 'Bob', teamCount: 1, joinedTeamIds: ['mock-team-01', 'mock-team-03'] },
      { id: 'user-charlie', email: 'charlie@autoforge.dev', password: 'charlie123456', displayName: 'Charlie', teamCount: 0, joinedTeamIds: ['mock-team-01'] },
      { id: 'user-dave', email: 'dave@autoforge.dev', password: 'dave123456', displayName: 'Dave', teamCount: 0, joinedTeamIds: ['mock-team-02'] },
      { id: 'user-eve', email: 'eve@autoforge.dev', password: 'eve123456', displayName: 'Eve', teamCount: 0, joinedTeamIds: ['mock-team-03'] },
      { id: 'user-frank', email: 'frank@autoforge.dev', password: 'frank123456', displayName: 'Frank', teamCount: 0, joinedTeamIds: ['mock-team-03'] }
    ]))
  }

  // Seed teams
  const teamsKey = 'autoforge-teams'
  const existingTeams = JSON.parse(localStorage.getItem(teamsKey) || '[]')
  if (existingTeams.length === 0) {
    localStorage.setItem(teamsKey, JSON.stringify(createMockTeams()))
  }

  // Seed scripts
  const scriptsKey = 'autoforge-scripts'
  const existingScripts = JSON.parse(localStorage.getItem(scriptsKey) || '[]')
  if (existingScripts.length === 0) {
    localStorage.setItem(scriptsKey, JSON.stringify(createMockScripts()))
  }

  localStorage.setItem('autoforge-mock-seeded', 'true')
  return true
}

export function resetMockData() {
  if (!import.meta.client) return
  localStorage.removeItem('autoforge-mock-seeded')
  localStorage.removeItem('autoforge-users')
  localStorage.removeItem('autoforge-teams')
  localStorage.removeItem('autoforge-scripts')
  localStorage.removeItem('autoforge-auth')
}
