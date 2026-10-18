export type Language = 'zh-Hant' | 'en';
export const strings = {
  'zh-Hant': {
    title: 'Hello World 計數器', toggle: 'English', mock: '示範資料 (mock)',
    hello: '來自 API 的問候', counter: '目前計數', loading: '載入中…',
    add: '+1 加一', retry: '重試', loadError: '暫時無法載入資料，請再試一次。',
    incrementError: '未能增加計數，請再試一次。', countStatus: '目前計數：',
    allMode: '全部', counterMode: '計數器',
  },
  en: {
    title: 'Hello World counter', toggle: '中文', mock: 'Mock data',
    hello: 'A greeting from the API', counter: 'Current count', loading: 'Loading…',
    add: '+1 Add one', retry: 'Retry', loadError: 'Could not load the data. Please try again.',
    incrementError: 'Could not increase the count. Please try again.', countStatus: 'Current count: ',
    allMode: 'all', counterMode: 'counter',
  },
};
