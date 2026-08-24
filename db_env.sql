SELECT id, key, value FROM environment_variables WHERE resourceable_type LIKE '%StandaloneMysql' AND resourceable_id = (SELECT id FROM standalone_mysqls WHERE uuid = 'vi8fycgae9p3w6p4hugft9wa');
