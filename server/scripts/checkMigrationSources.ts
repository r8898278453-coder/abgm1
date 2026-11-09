import {verifyMigrationSourceIntegrity} from './migrationSourceIntegrity';
import {validateRegisteredMigrations,MIGRATIONS} from '../migrator';
validateRegisteredMigrations();
console.log(JSON.stringify({...await verifyMigrationSourceIntegrity(),registeredMigrations:MIGRATIONS.length,databaseAccess:false}));
