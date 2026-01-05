
export interface Hero {
  name: string;
  role: string;
  type: 'AD' | 'AP' | 'Tank' | 'Utility';
}

export interface EnemyState {
  hero: string;
  items: string[];
}

export interface AnalysisResult {
  matchupAnalysis: string;
  recommendedItems: {
    item: string;
    reason: string;
  }[];
  combos: {
    sequence: string;
    description: string;
  }[];
  strategyTips: string[];
}

export const COMMON_HEROES: string[] = [
  "亚索", "永恩", "凯特琳", "拉克丝", "李青", "艾希", "伊泽瑞尔", "金克丝", "迦娜", "娜美", 
  "墨菲特", "盖伦", "德莱厄斯", "卡兹克", "雷恩加尔", "阿狸", "卡特琳娜", "薇恩", "瑟提", "提莫"
];

export const ROLES = ["上路", "打野", "中路", "下路", "辅助"];
