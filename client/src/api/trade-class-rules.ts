import { api } from './client';

export type MarketType = 'primary' | 'secondary';

export interface TradeClassRuleRow {
  id: number;
  class_code: string;
  class_name: string | null;
  market_type: MarketType;
}

export interface CreateTradeClassRuleBody {
  class_code: string;
  class_name?: string | null;
  market_type: MarketType;
}

export interface UpdateTradeClassRuleBody {
  class_code?: string;
  class_name?: string | null;
  market_type?: MarketType;
}

export function getTradeClassRules() {
  return api.get<TradeClassRuleRow[]>('/trade-class-rules');
}

export function createTradeClassRule(body: CreateTradeClassRuleBody) {
  return api.post<TradeClassRuleRow>('/trade-class-rules', body);
}

export function updateTradeClassRule(id: number, body: UpdateTradeClassRuleBody) {
  return api.put<TradeClassRuleRow>(`/trade-class-rules/${id}`, body);
}

export function deleteTradeClassRule(id: number) {
  return api.delete(`/trade-class-rules/${id}`);
}
