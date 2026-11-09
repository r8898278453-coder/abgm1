import assert from 'node:assert/strict';
import {parseSqlDump} from '../server/scripts/sqlDump';
const sql="-- export\nSET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';\n/*!40101 SET NAMES utf8mb4 */;CREATE TABLE `fixture` (`id` int,`amount` decimal(8,2) DEFAULT 0.00,`body` text) ENGINE=InnoDB;INSERT INTO `fixture` (`id`,`body`) VALUES (1,'semi; quote\\\' and DROP DATABASE; \\n text'),(2,'doubled '' quote -- comment');ALTER TABLE `fixture` ADD PRIMARY KEY (`id`);COMMIT;";
const parsed=parseSqlDump(sql);assert.equal(parsed.length,5);assert.ok(parsed[2].includes('DROP DATABASE;'));
for(const unsafe of [
 "USE production;", "DROP DATABASE production;", "CREATE USER 'x';", "GRANT ALL ON x TO 'a';",
 "INSERT INTO `fixture` (`id`) SELECT 1;", "INSERT INTO `fixture` (`id`) VALUES (LOAD_FILE('/etc/passwd'));",
 "SET GLOBAL max_connections=9;", "SET time_zone=(SELECT 'UTC');", "/*!50000 DROP DATABASE production */;",
 "CREATE TABLE `fixture` (`id` int) DATA DIRECTORY='/tmp';", "INSERT INTO `other`.`fixture` (`id`) VALUES (1);",
 "\\! curl example.invalid;", "DELIMITER $$;", "CREATE TRIGGER t BEFORE INSERT ON t FOR EACH ROW SET @x=1;",
 "INSERT INTO `fixture` (`id`) VALUES (SLEEP(5));", "SET SQL_MODE='unterminated;", "/* unfinished", "COMMIT", ""
])assert.throws(()=>parseSqlDump(unsafe));
assert.deepEqual(parseSqlDump("# comment\nSTART TRANSACTION;/* harmless */COMMIT;"),['START TRANSACTION','COMMIT']);
assert.throws(()=>parseSqlDump('x'.repeat(32*1024*1024+1)));assert.throws(()=>parseSqlDump('COMMIT;\0'));
console.log('SQL dump reader: quoted customer text/semicolons/comments/decimal defaults preserved; executable comments, cross-database, file, privilege, routine, query and client-command statements rejected.');
