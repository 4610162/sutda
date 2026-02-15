// ============================================================
// 싱글톤 ConvexClient — 앱 전체에서 단 하나의 WebSocket 연결 공유
// ============================================================
import { ConvexClient } from "convex/browser";

let _client: ConvexClient | null = null;

export function getConvexClient(): ConvexClient {
  if (!_client) {
    const url = import.meta.env.VITE_CONVEX_URL as string;
    if (!url) throw new Error("VITE_CONVEX_URL 환경변수가 설정되지 않았습니다.");
    _client = new ConvexClient(url);
  }
  return _client;
}
