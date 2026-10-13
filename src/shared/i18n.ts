export const messages = {
  en: {
    dashboard: 'Overview',
    advisor: 'Item advisor',
    skills: 'Skills',
    paragon: 'Paragon',
    builds: 'Builds & transition',
    settings: 'Settings',
  },
  'pt-BR': {
    dashboard: 'Visão geral',
    advisor: 'Análise de itens',
    skills: 'Habilidades',
    paragon: 'Excelência',
    builds: 'Builds e transição',
    settings: 'Configurações',
  },
};
export type Page = keyof typeof messages.en;
