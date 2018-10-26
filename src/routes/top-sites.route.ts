import * as express from 'express';

import { Redis } from './../models/redis.model';
import { TopSites } from './../models/top-sites.model';

const router: express.Router = express.Router();

const accessKey: string = process.env.AWS_ALEX_TOP_SITES_ACCESS_KEY;
const secretAccessKey: string = process.env.AWS_ALEX_TOP_SITES_SECRET_ACCESS_KEY;
const topSites: TopSites = new TopSites(accessKey, secretAccessKey);

router.get('/countries', async (req, res) => {
    try {
        const redis: Redis = Redis.getInstance();
        const cacheKey: string = 'top-sites-countries';
    
        let countries: any = await redis.get(cacheKey);
        
        if (!countries) {
            countries = await topSites.getCountriesList();
            const hasCached: any = await redis.set(cacheKey, countries);
            const expire: any = await redis.expire(cacheKey);
        }
        res.send(countries);
    } catch (e) {
        res.status(409).send(e);
    }
});

router.get('/global/:page', async (req, res) => {
    try {
        const page: number = req.params.page;
        
        const redis: Redis = Redis.getInstance();
        const cacheKey: string = `top-sites-global-${page}`;
        
        let sites: any = await redis.get(cacheKey);
        
        if (!sites) {
            sites = await topSites.getTopSites(page, null, true);
            const hasCached: any = await redis.set(cacheKey, sites);
            const expire: any = await redis.expire(cacheKey);
        }
        res.send(sites);
    } catch (e) {
        res.status(409).send(e);
    }
});

router.get('/:countryCode/:page', async (req, res) => {
    try {
        const countryCode: string = req.params.countryCode.toLowerCase();
        const page: number = req.params.page;
    
        const redis: Redis = Redis.getInstance();
        const cacheKey: string = `top-sites-${countryCode}-${page}`;
        
        let sites: any = await redis.get(cacheKey);
        
        if (!sites) {
            sites = await topSites.getTopSites(page, countryCode);
            const hasCached: any = await redis.set(cacheKey, sites);
            const expire: any = await redis.expire(cacheKey);
        }
        res.send(sites);
    } catch (e) {
        res.status(409).send(e);
    }
});

export default router;
