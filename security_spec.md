# Security Specification - A Ponte dos Trolls

## 1. Data Invariants
1. **Admin Authority**: Only verified administrators (`pontedostrolls@gmail.com` or documents in `/admins/{adminId}`) can create, edit, or delete `FundingPackage` documents, alter funding stages, or delete arbitrary suggestions.
2. **Identity Integrity**: Normal authenticated members can only create or edit `ItemRPG` suggestions in their own name (`sugeridoPorId == request.auth.uid`).
3. **Immutability of Key Identifiers**: Document IDs, author identities, and creation timestamps (`id`, `sugeridoPorId`, `criadoEm`) cannot be mutated upon updates.
4. **PII and Sensitive Access Protection**: Private user information (e.g., full applications, contact numbers, private Drive links) cannot be read by unauthenticated or unauthorized users.
5. **Finite Input Boundaries**: All string and payload fields have strict `.size()` constraints preventing resource exhaustion and injection attacks.
6. **No Phantom State Alterations**: Package payments cannot be altered by non-admin users other than updating their own payment declaration when allowed.

## 2. The Dirty Dozen Payloads (Designed to Fail)
1. **Dirty Payload 1 (Identity Spoofing - ItemRPG Creation)**: An unauthenticated client attempts to create an ItemRPG claiming to be another user.
2. **Dirty Payload 2 (Ghost Field Injection - Shadow Update)**: An update to an ItemRPG containing unexpected extra properties like `isVerified: true` or `bypassed: true`.
3. **Dirty Payload 3 (Unbounded String / Denial of Wallet)**: A payload with a 2MB string injected into `nome` or `descricao`.
4. **Dirty Payload 4 (Admin Impersonation without Verification)**: A write signed with `email: 'pontedostrolls@gmail.com'` but `email_verified: false`.
5. **Dirty Payload 5 (Malicious ID Injection)**: Document creation with an ID containing path traversal characters like `../../hack`.
6. **Dirty Payload 6 (Unauthorized Package Mutation)**: A regular user attempting to change `valorTotalBRL` or `etapaFinanciamento` on a FundingPackage.
7. **Dirty Payload 7 (Drive Link Exfiltration Bypass)**: An unauthorized client attempting to retrieve `linkDrive` on non-purchased packages.
8. **Dirty Payload 8 (Arbitrary Deletion of Admin Records)**: Attempting to delete a document in `/admins/{adminId}` without super-admin credentials.
9. **Dirty Payload 9 (Self-Promoting Admin Record Creation)**: A regular user writing to `/admins/{uid}` claiming role `master`.
10. **Dirty Payload 10 (Unauthorized Application Approval)**: A candidate attempting to update their own `MembershipApplication` status to `aprovado`.
11. **Dirty Payload 11 (Type Poisoning on Numeric Value)**: Setting `valorNumerico` to a boolean or object string to crash calculations.
12. **Dirty Payload 12 (Blanket Overwrite of User Profiles)**: A member attempting to overwrite another member's profile in `/users/{userId}`.

## 3. Test Runner (firestore.rules.test.ts)
The test suite ensures all 12 dirty payloads are rejected with PERMISSION_DENIED.
