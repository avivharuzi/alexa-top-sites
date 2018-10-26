import TopSitesRoute from './top-sites.route';

export const routes = (app) => {
    app.use('/api/top-sites', TopSitesRoute);
};
