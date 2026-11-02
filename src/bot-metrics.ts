import { BOT_RADIUS as LOOK_BOT_RADIUS, BOT_CLEARANCE as LOOK_BOT_CLEARANCE } from './bot-look';

/** Shared body radius; the bot's visual model owns the source value. */
export const BOT_RADIUS = LOOK_BOT_RADIUS;
/** Kept for existing diagnostics; navigation uses the explicit clearances below. */
export const BOT_CLEARANCE = LOOK_BOT_CLEARANCE;
export const WALL_HALF_THICKNESS = 0.06;
export const FURNITURE_CLEARANCE = BOT_RADIUS + 0.06;
export const WALL_CLEARANCE = BOT_RADIUS + WALL_HALF_THICKNESS + 0.06;
export const DOOR_JAMB_CLEARANCE = BOT_RADIUS + 0.06;
