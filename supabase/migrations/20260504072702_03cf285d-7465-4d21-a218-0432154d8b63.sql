DELETE FROM auth.mfa_challenges WHERE factor_id IN (SELECT id FROM auth.mfa_factors WHERE factor_type = 'totp');
DELETE FROM auth.mfa_factors WHERE factor_type = 'totp';