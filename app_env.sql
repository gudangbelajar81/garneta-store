SELECT key, value FROM environment_variables WHERE resourceable_type LIKE '%Application' AND resourceable_id = (SELECT id FROM applications WHERE uuid = 'qy8o93x6nlmon1xo7lrnpf3r');
