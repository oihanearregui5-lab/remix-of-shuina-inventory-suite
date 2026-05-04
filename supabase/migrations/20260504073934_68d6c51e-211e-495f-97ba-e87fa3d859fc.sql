UPDATE auth.users SET 
  encrypted_password = extensions.crypt('A327560', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'a63267@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('G384767', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'a88443@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('R097033', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'a87244@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('Q896905', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'a30183@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('E683265', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i43777@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('J854708', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i20364@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('P208938', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i25406@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('A979690', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i95242@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('N343539', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i00195@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('L646077', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i45971@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('O993616', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i87517@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('H519817', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i93062@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('A593105', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i06868@transtubari.local';

UPDATE auth.users SET 
  encrypted_password = extensions.crypt('L036960', extensions.gen_salt('bf')),
  raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{force_password_change}', 'true'),
  updated_at = now()
WHERE email = 'i35109@transtubari.local';