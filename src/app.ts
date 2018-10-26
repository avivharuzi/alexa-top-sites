import * as express from 'express';

import { routes } from './routes';

const app: express.Express = express();

routes(app);

export default app;
