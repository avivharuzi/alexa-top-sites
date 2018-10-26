import * as crypto from 'crypto';
import * as CryptoJS from 'crypto-js';
import axios from 'axios';
import * as moment from 'moment';
import * as xml2js from 'xml2js';

export class TopSites {
    private static readonly SERVICE_ENDPOINT: string = 'ats.us-west-1.amazonaws.com';
    private static readonly SERVICE_HOST: string = 'ats.amazonaws.com';
    private static readonly SERVICE_URI: string = '/api';
    private static readonly SERVICE_REGION: string = 'us-west-1';
    private static readonly SERVICE_NAME: string =  'AlexaTopSites';
    private static readonly URL_API: string = `https://${TopSites.SERVICE_HOST}${TopSites.SERVICE_URI}`;
    private static readonly ACTION_NAME: string = 'TopSites';
    private static readonly RESPONSE_GROUP_NAME_COUNTRY: string = 'Country';
    private static readonly RESPONSE_GROUP_NAME_COUNTRY_LIST: string = 'ListCountries';
    private static readonly REQUEST_VERSION: string = 'aws4_request';
    private static readonly ALGORITHM_TYPE: string = 'AWS4-HMAC-SHA256';

    public accessKey: string;
    public secretAccessKey: string;

    private _start: number = 1;
    private _count: number = 100;
    private _countryCode: string = '';
    private _isGlobal: boolean = false;

    public constructor(accessKey: string, secretAccessKey: string) {
        this.accessKey = accessKey;
        this.secretAccessKey = secretAccessKey;
    }

    get start(): number {
        return this._start;
    }

    set start(start: number) {
        this._start = start;
    }

    get count(): number {
        return this._count;
    }

    set count(count: number) {
        this._count = count;
    }

    get countryCode(): string {
        return this._countryCode;
    }

    set countryCode(countryCode: string) {
        this._countryCode = countryCode;
    }

    get isGlobal(): boolean {
        return this._isGlobal;
    }

    set isGlobal(isGlobal: boolean) {
        this._isGlobal = isGlobal;
    }

    private getDateStamp(): string {
        return moment().utc().format('YYYYMMDD');
    }

    private getAmzDate(): string {
        return moment().utc().format('YYYYMMDD\\THHmmss\\Z');
    }

    private getSigningKey(dateStamp: string): any {
        const kDate: any = CryptoJS.HmacSHA256(dateStamp, `AWS4${this.secretAccessKey}`);
        const kRegion: any = CryptoJS.HmacSHA256(TopSites.SERVICE_REGION, kDate);
        const kService: any = CryptoJS.HmacSHA256(TopSites.SERVICE_NAME, kRegion);
        return CryptoJS.HmacSHA256(TopSites.REQUEST_VERSION, kService);
    }

    private buildQueryParams(responseGroupName: string): string {
        const params: object = {
            'Action': TopSites.ACTION_NAME,
            'Count': this.count,
            'CountryCode': this.isGlobal ? '' : this.countryCode,
            'ResponseGroup': responseGroupName,
            'Start': this.start
        };

        let paramsArr: string[] = [];

        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                paramsArr.push(`${key}=${encodeURIComponent(params[key])}`);
            }
        }
        return paramsArr.join('&');
    }
    
    private buildHeaders(amzDate: string, isList: boolean): string {
        const params: object = {
            'host': TopSites.SERVICE_ENDPOINT,
            'x-amz-date': amzDate
        };

        let paramsArr: string[] = [];

        for (let key in params) {
            if (params.hasOwnProperty(key)) {
                let r = isList ? `${key}:${params[key]}` : key;
                paramsArr.push(r);
            }
        }
        return isList ? `${paramsArr.join('\n')}\n` : paramsArr.join(';');
    }
    
    private xmlToJson(xml: string): Promise<any> {
        return new Promise((resolve, reject) => {
            xml2js.parseString(xml, (err, json) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(json);
                }
            });
        });
    }

    private mapCountriesJson(countries: any[]): any[] {
        countries = countries['aws:TopSitesResponse']['aws:Response'][0]['aws:TopSitesResult'][0]['aws:Alexa'][0]['aws:TopSites'][0]['aws:Countries'][0]['aws:Country'];

        const mapCountries: any[] = countries.map(country => {
            return {
                name: country['aws:Name'][0],
                code: country['aws:Code'][0],
                totalSites: country['aws:TotalSites'][0]
            }
        });
        return mapCountries;
    }

    private mapSitesJson(sites: any[]): any[] {
        sites = sites['aws:TopSitesResponse']['aws:Response'][0]['aws:TopSitesResult'][0]['aws:Alexa'][0]['aws:TopSites'][0]['aws:Country'][0]['aws:Sites'][0]['aws:Site'];

        const mapSites: any[] = sites.map(site => {
            return {
                url: site['aws:DataUrl'][0],
                favicon: `https://plus.google.com/_/favicon?domain=${site['aws:DataUrl'][0]}`,
                country: {
                    rank: site['aws:Country'][0]['aws:Rank'][0],
                    reach: {
                        perMillion: site['aws:Country'][0]['aws:Reach'][0]['aws:PerMillion'][0]
                    },
                    pageViews: {
                        perMillion: site['aws:Country'][0]['aws:PageViews'][0]['aws:PerMillion'][0],
                        perUser: site['aws:Country'][0]['aws:PageViews'][0]['aws:PerUser'][0]
                    }
                },
                global: {
                    rank: site['aws:Global'][0]['aws:Rank'][0]
                }
            }
        });
        return mapSites;
    }

    private makeRequest(url: string, authorizationHeader: string, amzDate: string): Promise<any> {
        return axios.get(url, {
            headers: {
                'Authorization': authorizationHeader,
                'Content-Type': 'application/xml',
                'X-Amz-Date': amzDate,
                'Accept': 'application/xml'
            }
        });
    }

    private async processResponse(responseGroupName: string): Promise<any> {
        const dateStamp = this.getDateStamp();
        const amzDate = this.getAmzDate();

        const canonicalQuery: string = this.buildQueryParams(responseGroupName);
        const canonicalHeaders: string = this.buildHeaders(amzDate, true);
        const signedHeaders: string = this.buildHeaders(amzDate, false);
        const payloadHash: string = crypto.createHash('sha256').update('').digest('hex');
        const canonicalRequest: string = `GET\n${TopSites.SERVICE_URI}\n${canonicalQuery}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
        const credentialScope: string = `${dateStamp}/${TopSites.SERVICE_REGION}/${TopSites.SERVICE_NAME}/${TopSites.REQUEST_VERSION}`;
        const stringToSign: string = `${TopSites.ALGORITHM_TYPE}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;
        const signingKey: string = this.getSigningKey(dateStamp);
        const signature: string = CryptoJS.HmacSHA256(stringToSign, signingKey).toString(CryptoJS.enc.Hex);
        const authorizationHeader: string = `${TopSites.ALGORITHM_TYPE} Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
        const url: string = `${TopSites.URL_API}?${canonicalQuery}`;

        try {
            const response: any = await this.makeRequest(url, authorizationHeader, amzDate);
            const responseJson: any = await this.xmlToJson(response.data);
            let responseMap: any = responseJson;

            switch (responseGroupName) {
                case TopSites.RESPONSE_GROUP_NAME_COUNTRY:
                    responseMap = this.mapSitesJson(responseJson);
                    break;
                case TopSites.RESPONSE_GROUP_NAME_COUNTRY_LIST:
                    responseMap = this.mapCountriesJson(responseJson);
                    break;
                default:
                    break;
            }
            return responseMap;
        } catch (e) {
            throw e;
        }
    }

    public async getCountriesList(): Promise<any> {
        return this.processResponse(TopSites.RESPONSE_GROUP_NAME_COUNTRY_LIST);
    }

    public async getTopSites(start: number, count: number, countryCode: string, isGlobal: boolean = false): Promise<any> {
        this.start = start;
        this.count = count;
        this.countryCode = countryCode;
        this.isGlobal = isGlobal;

        return this.processResponse(TopSites.RESPONSE_GROUP_NAME_COUNTRY);
    }
}
