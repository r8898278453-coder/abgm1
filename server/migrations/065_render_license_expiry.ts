import {defineSqlMigration} from './manifestV1';

export const renderLicenseExpiry = defineSqlMigration({
 name:'065_render_license_expiry',
 preflight:[{code:'MIGRATION_RENDER_LICENSE_EXPIRY_CONFLICT',sql:"SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='render_asset_approvals' AND ((COLUMN_NAME='license_through' AND (DATA_TYPE<>'date' OR IS_NULLABLE<>'YES')) OR (COLUMN_NAME='license_source' AND (DATA_TYPE<>'varchar' OR CHARACTER_MAXIMUM_LENGTH<>24 OR COLLATION_NAME<>'ascii_bin' OR IS_NULLABLE<>'YES')))"}],
 statements:['ALTER TABLE render_asset_approvals ADD COLUMN IF NOT EXISTS license_through DATE NULL, ADD COLUMN IF NOT EXISTS license_source VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NULL'],
});
