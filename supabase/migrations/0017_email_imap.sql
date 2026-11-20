-- "Other email (IMAP)": any mailbox reached with IMAP (reading) and SMTP (sending), e.g. Purelymail.
-- The password (an app password, ideally) is kept encrypted in encrypted_refresh_token like the
-- Google / Microsoft logins; the server details are in imap.

alter table email_accounts drop constraint if exists email_accounts_provider_check;
alter table email_accounts add constraint email_accounts_provider_check check (provider in ('gmail', 'outlook', 'imap'));
alter table email_accounts add column if not exists imap jsonb; -- { imapHost, imapPort, smtpHost, smtpPort, username, secureSmtp }
