import { AGENTIC_PATH, allPathVideos as agenticVideos } from './agenticPath'
import { TRACKS } from './data'
import {
  SNOWFLAKE_PATH,
  allPathVideos as snowflakeVideos,
} from './snowflakePath'

/** Product counts from local curriculum constants — always true on static Pages. */
export const PRODUCT_STATS = {
  tracksCount: TRACKS.length,
  agenticVideosCount: agenticVideos().length,
  snowflakeVideosCount: snowflakeVideos().length,
  agenticPhasesCount: AGENTIC_PATH.length,
  snowflakePhasesCount: SNOWFLAKE_PATH.length,
} as const
