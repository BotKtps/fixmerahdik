# Security Specification: Firebase & Firestore Security Rules

## 1. Data Invariants

1. **Configurations (`/config/{configId}`)**:
   - Only administrative users can read or write configurations.
   - Standard users cannot view or modify the Telegram Bot token or SMTP credentials.

2. **Appeals (`/appeals/{appealId}`)**:
   - Authenticated users can list/get their own appeals.
   - Admins can read all appeals.
   - Creating an appeal must validate that the phone number is in a valid format.
   - Users cannot edit or delete appeal records once they are created (Immutable History).

3. **User Profiles (`/users/{userId}`)**:
   - Users can only read and write their own profile document.
   - Standard users cannot escalate their role to `admin` or `premium` directly via client SDK (Identity Spoofing & Privilege Escalation protection).
   - Only administrators can change roles or modify user balances (`saldo`).

4. **Redeem Codes (`/redeemCodes/{code}`)**:
   - Anyone can get a redeem code to check if it's valid.
   - Only admins can write, create, or delete redeem codes.
   - Standard users can update a code only when claiming it (i.e., changing `isUsed` from false to true and setting `usedBy` to their uid), and this action must be strictly verified.

---

## 2. The "Dirty Dozen" Payloads (Exploit Attempts)

These payloads must be rejected by the Firestore rules:

### Payload 1: Privilege Escalation (User sets role to Admin)
- **Target**: `/users/attacker_uid`
- **Operation**: `create` or `update`
- **Attempt**: Setting `"role": "admin"` to gain access to admin APIs.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 2: Balance Modification (User injects free Saldo)
- **Target**: `/users/attacker_uid`
- **Operation**: `update`
- **Attempt**: Directly increasing `"saldo": 9999999` to purchase unlimited services.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 3: Config Modification by Anonymous/Standard User
- **Target**: `/config/app`
- **Operation**: `create` or `update`
- **Attempt**: Changing the SMTP pass or bot token.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 4: Arbitrary Appeal Tampering (Editing History)
- **Target**: `/appeals/appeal_123`
- **Operation**: `update`
- **Attempt**: Modifying status or target phone number of an existing appeal.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 5: Arbitrary Appeal Deletion
- **Target**: `/appeals/appeal_123`
- **Operation**: `delete`
- **Attempt**: Standard user attempting to delete a logged appeal.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 6: Reading Other Users' Profiles (PII Leak)
- **Target**: `/users/other_user_uid`
- **Operation**: `get`
- **Attempt**: Non-admin reading another user's balance or roles.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 7: Bulk Listing of Appeals by Non-Admins
- **Target**: `/appeals`
- **Operation**: `list`
- **Attempt**: Reading all appeals in the database without admin rights.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 8: Direct Voucher Generation
- **Target**: `/redeemCodes/FIXMERAH-FAKE-CODE`
- **Operation**: `create`
- **Attempt**: Creating a new valid voucher code with 30 days active and 50000 bonus.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 9: Reusing Already Claimed Voucher
- **Target**: `/redeemCodes/FIXMERAH-USED-VOUCHER`
- **Operation**: `update`
- **Attempt**: Updating a voucher that has `"isUsed": true` to change `"usedBy"` to a different user.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 10: Deleting Voucher Code by Standard User
- **Target**: `/redeemCodes/FIXMERAH-VALID-VOUCHER`
- **Operation**: `delete`
- **Attempt**: Removing a voucher from the database.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 11: Spoofed Identifier (User writes profile with mismatched UID)
- **Target**: `/users/victim_uid`
- **Operation**: `create` or `update` with authenticated UID `attacker_uid`.
- **Attempt**: Stealing identity or overwriting victim's data.
- **Expected Outcome**: `PERMISSION_DENIED`

### Payload 12: Resource Poisoning (Giant ID or values)
- **Target**: `/appeals/super_long_junk_id_more_than_128_characters_to_cause_denial_of_wallet`
- **Operation**: `create`
- **Attempt**: Creating a document with a massive string key or oversized fields.
- **Expected Outcome**: `PERMISSION_DENIED`
