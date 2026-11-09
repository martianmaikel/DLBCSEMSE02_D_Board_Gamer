-- Expected stale-state conflicts must return HTTP 409.
-- SQLSTATE 40001 is reserved for transaction serialization failures.
do $migration$
declare
  function_signature text;
  function_definition text;
begin
  foreach function_signature in array array[
    'private.set_hosting_willingness(uuid,boolean,boolean)',
    'private.save_host_positions(uuid,jsonb)',
    'private.lock_session_for_member(uuid,jsonb)',
    'private.admit_group_member(uuid,uuid,jsonb)',
    'private.leave_group(uuid,timestamptz,uuid,uuid)'
  ]
  loop
    function_definition := pg_catalog.pg_get_functiondef(
      function_signature::pg_catalog.regprocedure
    );

    if pg_catalog.strpos(
      function_definition,
      'errcode = ''40001'''
    ) = 0 then
      raise exception
        'Expected conflict error not found in %',
        function_signature;
    end if;

    execute pg_catalog.replace(
      function_definition,
      'errcode = ''40001''',
      'errcode = ''PT409'''
    );
  end loop;
end;
$migration$;
