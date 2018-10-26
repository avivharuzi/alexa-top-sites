import * as express from 'express';
import { TopSites } from './models/top-sites.model';

const accessKey: string = process.env.AWS_ALEX_TOP_SITES_ACCESS_KEY;
const secretAccessKey: string = process.env.AWS_ALEX_TOP_SITES_SECRET_ACCESS_KEY;
const topSites = new TopSites(accessKey, secretAccessKey);

const app = express();

app.get('/top-sites/:start/:countryCode', (req, res) => {
    topSites.getTopSites(req.params.start, 100, req.params.countryCode)
        .then(sites => {
            res.send(sites);
        })
        .catch(err => {
            console.log(err);
            res.status(409).send(err);
        });
});

app.get('/countries', (req, res) => {
    topSites.getCountriesList()
        .then(sites => {
            res.send(sites);
        })
        .catch(err => {
            console.log(err);
            res.status(409).send(err);
        });
});

export default app;
