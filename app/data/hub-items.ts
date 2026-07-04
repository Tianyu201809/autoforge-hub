import type { HubIntegrationFilter, HubItem, HubTypeFilter } from '~/types/hub'

export const HUB_TYPE_FILTERS: HubTypeFilter[] = [
  { id: 'all', label: '全部', icon: 'lucide:layout-grid' },
  { id: 'script', label: 'Script', icon: 'lucide:file-code-2' },
  { id: 'flow', label: 'Flow', icon: 'lucide:workflow' },
  { id: 'app', label: 'Apps', icon: 'lucide:layout-dashboard' },
  { id: 'skill', label: 'Skills', icon: 'lucide:hammer' },
  { id: 'resource', label: 'Resource types', icon: 'lucide:plug-2' }
]

export const HUB_INTEGRATION_FILTERS: HubIntegrationFilter[] = [
  { id: 'all', label: '全部' },
  { id: 'github', label: 'github' },
  { id: 'slack', label: 'slack' },
  { id: 'openai', label: 'openai' },
  { id: 'http', label: 'http' },
  { id: 'postgresql', label: 'postgresql' },
  { id: 'autoforge', label: 'autoforge' },
  { id: 'gmail', label: 'gmail' },
  { id: 'discord', label: 'discord' },
  { id: 'mongodb', label: 'mongodb' },
  { id: 'supabase', label: 'supabase' },
  { id: 'gsheets', label: 'gsheets' }
]

export const HUB_QUICK_TAGS = ['autoforge', 'http', 'github', 'slack', 'openai', 'postgresql']

export const HUB_ITEMS: HubItem[] = [
  {
    id: '1',
    title: 'Send POST Request',
    type: 'script',
    integrations: ['http'],
    verified: true,
    createdAt: '2026-03-12',
    popularity: 98
  },
  {
    id: '2',
    title: 'Send Email',
    type: 'script',
    integrations: ['gmail'],
    verified: true,
    createdAt: '2026-03-10',
    popularity: 95
  },
  {
    id: '3',
    title: 'Execute Query and return results',
    type: 'script',
    integrations: ['postgresql'],
    verified: true,
    createdAt: '2026-02-28',
    popularity: 92
  },
  {
    id: '4',
    title: 'Whenever an HackerNews message contains a mention, publish it to slack with sentiment analysed',
    type: 'flow',
    integrations: ['slack', 'hackernews'],
    verified: true,
    createdAt: '2026-02-20',
    popularity: 88
  },
  {
    id: '5',
    title: 'Notify of new Github repo stars',
    type: 'script',
    integrations: ['github'],
    verified: true,
    tags: ['trigger'],
    createdAt: '2026-02-15',
    popularity: 86
  },
  {
    id: '6',
    title: 'Create completion',
    type: 'script',
    integrations: ['openai'],
    verified: true,
    iconColor: '#10a37e',
    createdAt: '2026-02-10',
    popularity: 94
  },
  {
    id: '7',
    title: 'RSS Feed Fetcher',
    type: 'script',
    integrations: ['http'],
    verified: true,
    tags: ['trigger'],
    createdAt: '2026-01-28',
    popularity: 80
  },
  {
    id: '8',
    title: 'Send direct message',
    type: 'script',
    integrations: ['slack'],
    verified: true,
    createdAt: '2026-01-22',
    popularity: 84
  },
  {
    id: '9',
    title: 'Upon new user signup, check postgres, hash password, add record and send welcome email',
    type: 'flow',
    integrations: ['postgresql', 'gmail', 'autoforge'],
    verified: true,
    createdAt: '2026-01-18',
    popularity: 91
  },
  {
    id: '10',
    title: 'Sync script to Git repo',
    type: 'script',
    integrations: ['github', 'autoforge'],
    verified: true,
    createdAt: '2026-01-12',
    popularity: 89
  },
  {
    id: '11',
    title: 'Send the error to discord',
    type: 'script',
    integrations: ['discord'],
    verified: true,
    tags: ['failure'],
    createdAt: '2026-01-08',
    popularity: 77
  },
  {
    id: '12',
    title: 'Automatically Populate CRM Contact Details from Simple Email',
    type: 'flow',
    integrations: ['openai', 'gmail'],
    verified: true,
    createdAt: '2025-12-20',
    popularity: 82
  },
  {
    id: '13',
    title: 'OCR receipt pictures in gdrive folder and send result to Slack',
    type: 'flow',
    integrations: ['openai', 'slack'],
    verified: true,
    createdAt: '2025-12-15',
    popularity: 79
  },
  {
    id: '14',
    title: 'GitHub native trigger template flow',
    type: 'flow',
    integrations: ['github', 'autoforge'],
    verified: true,
    createdAt: '2025-12-01',
    popularity: 85
  },
  {
    id: '15',
    title: 'Do sentiment analysis on recent Reddit mentions',
    type: 'flow',
    integrations: ['openai', 'http'],
    verified: true,
    createdAt: '2025-11-28',
    popularity: 76
  },
  {
    id: '16',
    title: 'Send a message on discord if an endpoint is down',
    type: 'flow',
    integrations: ['http', 'discord'],
    verified: true,
    createdAt: '2025-11-20',
    popularity: 83
  },
  {
    id: '17',
    title: 'Back-Office of an E-Commerce Business',
    type: 'app',
    integrations: ['supabase'],
    verified: true,
    createdAt: '2025-11-10',
    popularity: 90
  },
  {
    id: '18',
    title: 'Issue Tracker',
    type: 'app',
    integrations: ['supabase', 'github'],
    verified: true,
    createdAt: '2025-10-28',
    popularity: 87
  },
  {
    id: '19',
    title: 'MongoDB Admin',
    type: 'app',
    integrations: ['mongodb'],
    verified: true,
    createdAt: '2025-10-15',
    popularity: 81
  },
  {
    id: '20',
    title: 'CRM App',
    type: 'app',
    integrations: ['gmail'],
    verified: true,
    createdAt: '2025-10-01',
    popularity: 78
  },
  {
    id: '21',
    title: 'Systematic Debugging Skill',
    type: 'skill',
    integrations: ['autoforge'],
    verified: true,
    createdAt: '2026-03-01',
    popularity: 93
  },
  {
    id: '22',
    title: 'Frontend Design Skill',
    type: 'skill',
    integrations: ['autoforge'],
    verified: true,
    createdAt: '2026-02-25',
    popularity: 88
  },
  {
    id: '23',
    title: 'PR to Video Skill',
    type: 'skill',
    integrations: ['github', 'autoforge'],
    verified: false,
    createdAt: '2026-02-18',
    popularity: 72
  },
  {
    id: '24',
    title: 'Anthropic',
    type: 'resource',
    integrations: ['openai'],
    verified: true,
    createdAt: '2025-09-20',
    popularity: 96
  },
  {
    id: '25',
    title: 'Github',
    type: 'resource',
    integrations: ['github'],
    verified: true,
    createdAt: '2025-09-15',
    popularity: 97
  },
  {
    id: '26',
    title: 'Postgresql',
    type: 'resource',
    integrations: ['postgresql'],
    verified: true,
    createdAt: '2025-09-10',
    popularity: 95
  },
  {
    id: '27',
    title: 'Slack',
    type: 'resource',
    integrations: ['slack'],
    verified: true,
    createdAt: '2025-09-05',
    popularity: 94
  },
  {
    id: '28',
    title: 'Clear All Values',
    type: 'script',
    integrations: ['gsheets'],
    verified: true,
    createdAt: '2025-08-28',
    popularity: 70
  },
  {
    id: '29',
    title: 'Enterprise Tool Orchestration Dashboard',
    type: 'app',
    integrations: ['autoforge'],
    verified: false,
    createdAt: '2026-03-05',
    popularity: 65
  },
  {
    id: '30',
    title: 'HTTP flow with preprocessor template',
    type: 'flow',
    integrations: ['http', 'autoforge'],
    verified: true,
    createdAt: '2025-08-10',
    popularity: 84
  }
]
