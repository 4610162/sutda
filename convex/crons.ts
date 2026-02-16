import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// 매 1분마다 비활성 방 자동 삭제
crons.interval(
  "cleanup inactive rooms",
  { minutes: 1 },
  internal.rooms.cleanupInactiveRooms,
);

export default crons;
