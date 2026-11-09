import assert from 'node:assert/strict';
import {isolatedTestEnvironment} from '../server/scripts/testEnvironment';
const source={DB_HOST:'sentinel-db',DB_PASSWORD:'sentinel-password',DATABASE_URL:'sentinel-url',WHATSAPP_ACCESS_TOKEN:'sentinel-token',META_AD_ACCOUNT_ID:'sentinel-account',RESEND_API_KEY:'sentinel-email',INITIAL_ADMIN_PASSWORD:'sentinel-admin',CREDENTIAL_ENCRYPTION_KEY:'sentinel-key',NODE_ENV:'production',IS_PRODUCTION:'true',PATH:'/fixture/path',HTTPS_PROXY:'fixture-proxy',NODE_EXTRA_CA_CERTS:'/fixture/ca'};
const env=isolatedTestEnvironment(source);
assert.equal(env.NODE_ENV,'test');assert.equal(env.PATH,source.PATH);assert.equal(env.HTTPS_PROXY,source.HTTPS_PROXY);assert.equal(env.NODE_EXTRA_CA_CERTS,source.NODE_EXTRA_CA_CERTS);
for(const key of ['DB_HOST','DB_PASSWORD','DATABASE_URL','WHATSAPP_ACCESS_TOKEN','META_AD_ACCOUNT_ID','RESEND_API_KEY','INITIAL_ADMIN_PASSWORD','CREDENTIAL_ENCRYPTION_KEY','IS_PRODUCTION'])assert.equal(env[key],undefined);
assert.equal(source.NODE_ENV,'production');assert.equal(source.DB_PASSWORD,'sentinel-password');
console.log('Regression environment: inherited DB/provider/admin/encryption credentials excluded; proxy/trust/path retained; parent unchanged.');
