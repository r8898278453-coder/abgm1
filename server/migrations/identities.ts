/** Frozen001–029 identities. Never rebaseline these to make an edited historical migration pass. */
export const LEGACY_MIGRATION_IDENTITIES=Object.freeze({
  "001_core_multi_tenant_schema": {
    "checksum": "95f0c8ff95246526e90ef6a0349c54f48911358074793242a3cafb2e8168a64e",
    "sourceHash": "9c73ba724dcdc3340d0dd2dd5bcf8e4ef68806ac1820b159551b48050ec87c10",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "002_integrations_and_billing_schema": {
    "checksum": "08b5b91e16bb4f1498afd33877da4bb150e0d5d8c76b5c8a679928bbbdda1ee6",
    "sourceHash": "194a2d56d5ef79830bc154d3dcd6b4c4440e7335dc2f5c133c5fba2ced5fe857",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "003_websites_and_seo_telemetry_schema": {
    "checksum": "2e3e9bc29363426afad111d61925f2e6bd67d023ae5bf24ffcba0308988a4e24",
    "sourceHash": "d1000b66c7fae409acfa9ef4d1ab5f8e6f579f7c28b48444912f899f151fc88e",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "004_publishing_campaigns_and_autonomous_schema": {
    "checksum": "ea73eb53938854286ed95662884aa7d1f4cfb31a428c7517d42fbc883d882d8d",
    "sourceHash": "f243bea5581b197224d927ecad81b439e7b749d9e11f62592f869cf52ecad22a",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "005_system_settings_and_metadata_schema": {
    "checksum": "05c541e1ab362e666710c11656b7e278a92a2a10389e10a3bc736b653506eb22",
    "sourceHash": "a55b0c037cfd44a92620cb7fc64302f69f4c6f7fcb4108f46df051c7d172552e",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "006_durable_job_queue_and_campaign_binding": {
    "checksum": "dd6a1f67d4eabf850c26127dbb75fc4a55116f278ed5f52dfeeae0e6c587097d",
    "sourceHash": "bca30d607341c960b89702ac11c530ab4d88aef38f215042fb8cde59b73864b6",
    "file": "server/migrator.ts",
    "selector": "inline-up"
  },
  "007_schema_index_alignment": {
    "checksum": "f167ec3133f9a1879ec1684e68938e809f9919a3bca590172c7a54dc341dbe7d",
    "sourceHash": "e417755fe9b805b0dc2ccf15bc1bc0141f94114ed3d86fb461a0bfa23ce30df3",
    "file": "server/migrations/007_schema_index_alignment.ts",
    "selector": "file"
  },
  "008_queue_action_ledger": {
    "checksum": "5dc357f40e29991faca9a8b5c70a95f1b85f465988de3060ad00bdb3ff3bab35",
    "sourceHash": "df4f256b7071b6a1b237d9d4b9827ec62412c558b57470e4f1a9b962d2ddcdc8",
    "file": "server/migrations/008_queue_action_ledger.ts",
    "selector": "file"
  },
  "009_internal_action_feed": {
    "checksum": "765d3731b4c48df0edfb7b77ad7e28531f8f7c0625abd5a8f6cfacd476587f9c",
    "sourceHash": "b01c16ef9e85da4ff3328f0ac3a82623d42f0f422e369e72513e6dd670fe3df7",
    "file": "server/migrations/009_internal_action_feed.ts",
    "selector": "file"
  },
  "010_notification_occurrences": {
    "checksum": "da1ed28a4a9cf5a29a103559976f9410a884b778ac8013527c1c35ac2a4d3655",
    "sourceHash": "215eac214eeb69039c1c76d5071308b0afbb9bc6be02ccba80aee0d88e0d25f0",
    "file": "server/migrations/010_notification_occurrences.ts",
    "selector": "file"
  },
  "011_notification_dispatch_cursors": {
    "checksum": "fafb71221d670d980ed4e563c0135653e466e3cca62e7a93b5b5078c1af2c1a7",
    "sourceHash": "e3157b6c454ec86ad08aa769c25ab361bc04fd2e6c09ea680a2b0c3c3f6de390",
    "file": "server/migrations/011_notification_dispatch_cursors.ts",
    "selector": "file"
  },
  "012_scheduled_post_dispatch_cursors": {
    "checksum": "52566241fd77ddc54ff8a892b97209f15d1684450429894c7d3cb515ab6134dc",
    "sourceHash": "3ff2693c48204a0c152406dfe1901b33e048fa87856b3f1ec8ead55387041343",
    "file": "server/migrations/012_scheduled_post_dispatch_cursors.ts",
    "selector": "file"
  },
  "013_publishing_dispatch_claims": {
    "checksum": "1707d55dd7037caf7aa4ed549b7ea250e10224192e3b4af2bbd4b04a198e150e",
    "sourceHash": "655b86624de956ef573f34da6f3b1852de9d04bcd181e915d088e847303dd9ee",
    "file": "server/migrations/013_publishing_dispatch_claims.ts",
    "selector": "file"
  },
  "014_publishing_review_audit": {
    "checksum": "d0f54e3704205a6c9964d5536712c36772e46176d884120883d1781cdde471a4",
    "sourceHash": "a43d1f3c59571a582aac2ada8bb6b40cfd1244e62c6d77a839dac9d4a7be44a6",
    "file": "server/migrations/014_publishing_review_audit.ts",
    "selector": "file"
  },
  "015_publishing_verification_audit": {
    "checksum": "06f9dd392d39b31e2c304f6699a54b0075c304b82a9846a7d99b85451e685629",
    "sourceHash": "8679da3e6e08f3e6a86840b50caf7219c57fa03498796702cf5feb94f1f8e9fc",
    "file": "server/migrations/015_publishing_verification_audit.ts",
    "selector": "file"
  },
  "016_publication_draft_intents": {
    "checksum": "bc4716e3e46776a1c9e829dd82467c74bdaefe052ef363013bc82336271913bf",
    "sourceHash": "63101eff07e46933c1e5444d6af084c2fd651d369cf08d0ab55392f9cf801399",
    "file": "server/migrations/016_publication_draft_intents.ts",
    "selector": "file"
  },
  "017_publication_workflow_audit": {
    "checksum": "294f835d21bf15fec31f490e7d32d031030240a0ae6ed7a5e058968b9e8a10bc",
    "sourceHash": "1ab766cb01c311e8da0058f16a4e795b0737dd4c448ea91eb870cde36b2fdee6",
    "file": "server/migrations/017_publication_workflow_audit.ts",
    "selector": "file"
  },
  "018_publication_schedule_history": {
    "checksum": "a6facee44aa7ce131a6a2345ad6d3120a2a1efd6004972216154030d2b03fb5b",
    "sourceHash": "ad922530978130ccfad45701d601c33e3bedb4731a6f0498dd8709eb0087bca7",
    "file": "server/migrations/018_publication_schedule_history.ts",
    "selector": "file"
  },
  "019_publication_policy_binding": {
    "checksum": "36287a4448b31f5687c8959b35283f86c8946c268ed25a3c2e10ed6ff29db05c",
    "sourceHash": "1ee6c25f2eb6c7f3a61032c55f798cddf2328ccf879094d86ce13b16e1b8607c",
    "file": "server/migrations/019_publication_policy_binding.ts",
    "selector": "file"
  },
  "020_queue_pause_deferrals": {
    "checksum": "a885f03ba41e1ffe26ce4f635146729d47a198bea395e1d5c938658d79d449d2",
    "sourceHash": "af0e675dd1b48be5f3106d24e0384d66e65284d402c57ce99fe35d82808ff8bc",
    "file": "server/migrations/020_queue_pause_deferrals.ts",
    "selector": "file"
  },
  "021_daily_work_report_indexes": {
    "checksum": "58c64fb33ae8e24f48eaeee9aacbd0f03c0dee438c03174cdfa81baaf5bffe10",
    "sourceHash": "827e45855eabd535ad9fdc32706de43115a0ed640b9520cc7a9e1649d0684aaa",
    "file": "server/migrations/021_daily_work_report_indexes.ts",
    "selector": "file"
  },
  "022_publication_scoped_controls": {
    "checksum": "4991d56c711e4dd0e31f2822f12ab9d0022214cffa19b249de97196e54a77ee4",
    "sourceHash": "d640c927a842c743d336c5214e7103db27a80e8b6207a0521e38c577d2c5836e",
    "file": "server/migrations/022_publication_scoped_controls.ts",
    "selector": "file"
  },
  "023_publication_admission_limits": {
    "checksum": "758e4e11c8206cc5986c53b980c9296ed9a60f69e6f85235e4b2dea62c60590c",
    "sourceHash": "4167cea99b2604c4d9972ecc38a8ef610c8bc1bf4d185af8d3b3618096bf5a8b",
    "file": "server/migrations/023_publication_admission_limits.ts",
    "selector": "file"
  },
  "024_message_dispatch_intents": {
    "checksum": "dc852c160156db954b46d96e31323bddc4946330c6639d886020a40aae52eb8d",
    "sourceHash": "7fde949ee0e613941706871ad8c082515c06cb363ed0960323cfa4ff3a004ca3",
    "file": "server/migrations/024_message_dispatch_intents.ts",
    "selector": "file"
  },
  "025_message_delivery_receipts": {
    "checksum": "7c4ebb13c2e62afca2507b795c0a2f76de752e8e283892a20d131f304e71e997",
    "sourceHash": "c1fd564bbe581257d89a494b5ab1f2c7963d1e24b8e6518ee9a9734263e9e8ec",
    "file": "server/migrations/025_message_delivery_receipts.ts",
    "selector": "file"
  },
  "026_company_profile_revision": {
    "checksum": "500c7c64acfe555746998bacdcf9aab7edbec57da8f2a2db485dab744457f9b8",
    "sourceHash": "fcf0bc33aaba82420517e8bc79ac159d51aaa4d2bbbf60ead4572b57ba4a787d",
    "file": "server/migrations/026_company_profile_revision.ts",
    "selector": "file"
  },
  "027_dispatcher_journal": {
    "checksum": "cb386fc8396d2c1ad4f1e547351140d68cd9aa89c4b9eeba8c90985283cacbf6",
    "sourceHash": "f8c99ac79ac6461a0b4dbaba163d52e595c57454eff78f416fad39dea328f780",
    "file": "server/migrations/027_dispatcher_journal.ts",
    "selector": "file"
  },
  "028_legacy_export_compatibility": {
    "checksum": "ebc7f76093af7766a731554dde9683a5ca5bbcc5bd0f09c941e39e18dc589bfa",
    "sourceHash": "5674649bea7fc359878aaf3f6c05b94a4c045e1174609cc0fb6a89453fce2d31",
    "file": "server/migrations/028_legacy_export_compatibility.ts",
    "selector": "file"
  },
  "029_public_lead_intakes": {
    "checksum": "d4624cea64e771c8cb730c60db4c718e15e897472a669b35f46ac38208fa33d0",
    "sourceHash": "c0c9c2e77ab892ca7d99a6e83d24027a171ced93134872003489e1c918c379d1",
    "file": "server/migrations/029_public_lead_intakes.ts",
    "selector": "file"
  }
} as const);
for(const record of Object.values(LEGACY_MIGRATION_IDENTITIES))Object.freeze(record);
export const MANIFEST_V1_SOURCE_HASH='3a90f159a77d107f8b90cb96590d93c061260ed659a974cbddda022e93c3569a';
