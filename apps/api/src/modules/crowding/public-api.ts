/** The only file other modules may import from the crowding module. */
export { CrowdingModule } from './crowding.module';
export {
  GetReportedRoutes,
  GetRouteCrowdLevels,
  RecentReports,
  type RouteCrowdView,
} from './application/crowd-queries';
export type { CrowdReport } from './domain/crowd-report';
