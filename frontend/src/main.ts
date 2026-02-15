import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

// ConvexClient는 useGameStore에서 직접 초기화합니다.
// convex/vue subpath가 이 버전에서 제공되지 않으므로
// ConvexClient.onUpdate / .mutation API를 직접 사용합니다.
createApp(App).mount("#app");
