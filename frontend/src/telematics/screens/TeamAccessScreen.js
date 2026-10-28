import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable } from 'react-native';
import { AppText, Button, Card, TextField, colors } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useManagerData } from '../context/ManagerDataContext';
import { recordId } from '../services/telematicsApi';
import { Screen, Choice, useRequest, RequestState } from '../components/FormControls';

function Check({ label, checked, onPress, disabled }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} disabled={disabled} onPress={onPress} style={{ paddingVertical: 10 }}><AppText>{checked ? '☑' : '☐'} {label}</AppText></Pressable>;
}
function confirm(message, action) {
  if (Platform.OS === 'web') { if (globalThis.confirm(message)) action(); }
  else Alert.alert('Confirm change', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: action }]);
}
export default function TeamAccessScreen({ navigation }) {
  const { user } = useAuth();
  const { service, branches, branchId } = useManagerData();
  const scopeBranch = branchId === 'all' ? undefined : branchId;
  const owner = user.role === 'OWNER';
  const request = useRequest(async () => {
    const [catalog, employees, assignments] = await Promise.all([service.teamRoles(scopeBranch), service.teamEmployees(scopeBranch), service.teamAssignments()]);
    return { ...catalog, employees, assignments };
  }, [service, scopeBranch]);
  const [roleId, setRoleId] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [assignmentScope, setAssignmentScope] = useState(scopeBranch ? 'BRANCH' : 'ENTERPRISE');
  const [targetBranch, setTargetBranch] = useState(scopeBranch || '');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [baseRole, setBaseRole] = useState('MANAGER');
  const [keys, setKeys] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const roles = request.data?.roles || [];
  const selected = roles.find((row) => recordId(row) === roleId);
  const branchRequest = useRequest(() => targetBranch ? service.teamBranchRoles(targetBranch) : Promise.resolve([]), [service, targetBranch, request.data]);
  const branchConfig = branchRequest.data?.find((row) => recordId(row.role) === roleId);
  useEffect(() => { setRoleId(''); setTargetBranch(scopeBranch || ''); setAssignmentScope(scopeBranch ? 'BRANCH' : 'ENTERPRISE'); }, [scopeBranch]);
  useEffect(() => {
    setName(selected?.name || ''); setDescription(selected?.description || ''); setBaseRole(selected?.baseRole || 'MANAGER'); setKeys(selected?.permissionKeys || []);
  }, [selected]);
  useEffect(() => { setOverrides(branchConfig?.overrides || {}); setEnabled(branchConfig?.enabled ?? true); }, [branchConfig]);
  async function write(action, message) {
    if (writing.current) return;
    writing.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setNotice(message); request.reload(); }
    catch (failure) { setError(failure.message); }
    finally { writing.current = false; setBusy(false); }
  }
  function saveRole() {
    if (!selected && name.trim().length < 2) { setError('Enter a role name with at least two characters.'); return; }
    const body = { permissionKeys: keys, ...(!selected?.isImmutable && { name: name.trim(), description: description.trim(), baseRole }) };
    const path = selected ? `roles/${roleId}` : scopeBranch ? `branches/${scopeBranch}/roles` : 'roles';
    write(() => service.teamWrite(path, selected ? 'patch' : 'post', body), 'Role saved.');
  }
  const toggleKey = (key) => setKeys((old) => old.includes(key) ? old.filter((value) => value !== key) : [...old, key]);
  const permissions = request.data?.catalog || [];
  const branchOptions = branches.filter((row) => row.id !== 'all').map((row) => [row.id, row.name]);
  const canEditRole = owner && (!selected || selected.canEditPermissions) && (!scopeBranch || !selected || (selected.scopeType === 'BRANCH' && recordId(selected.branchId) === scopeBranch));
  return <Screen navigation={navigation} title="Team & access"><RequestState request={request} />
    {request.data && <>
      <Choice label="Role" value={roleId} onChange={setRoleId} disabled={busy} options={roles.map((row) => [recordId(row), `${row.name} · ${row.baseRole}`])} />
      {owner && <Button label="Create a role" variant="secondary" disabled={busy} onPress={() => { setRoleId(''); setName(''); setDescription(''); setBaseRole('MANAGER'); setKeys([]); }} />}
      {canEditRole && <Card><TextField label="Role name" value={name} onChangeText={setName} editable={!busy && !selected?.isImmutable} maxLength={60} />
        {!selected?.isImmutable && <><TextField label="Description" value={description} onChangeText={setDescription} editable={!busy} maxLength={300} />
          <Choice label="Access tier" value={baseRole} onChange={setBaseRole} disabled={busy} options={['MANAGER', 'DRIVER', 'FIELD_AGENT'].map((value) => [value, value])} /></>}
        <AppText weight="bold">Permissions</AppText>{permissions.map((permission) => <Check key={permission.key} label={`${permission.group} · ${permission.label}`} checked={keys.includes(permission.key)} disabled={busy} onPress={() => toggleKey(permission.key)} />)}
        <Button label="Save role" loading={busy} onPress={saveRole} />
        {selected?.isEnterpriseOwned && !selected.isImmutable && <Button label="Delete role" variant="danger" disabled={busy} onPress={() => confirm(`Delete ${selected.name}? Roles still assigned to employees cannot be deleted.`, () => write(() => service.teamWrite(`roles/${roleId}`, 'delete'), 'Role deleted.'))} />}
      </Card>}
      {selected && !canEditRole && <AppText muted>This role's definition is read-only for your account.</AppText>}
      <Card><AppText variant="h3">Assign a role</AppText>
        <Choice label="Employee" value={employeeId} onChange={setEmployeeId} disabled={busy} options={request.data.employees.map((row) => [recordId(row), `${[row.firstName, row.lastName].filter(Boolean).join(' ')} · ${row.role}`])} />
        <Choice label="Assignment scope" value={assignmentScope} onChange={setAssignmentScope} disabled={busy || !!scopeBranch} options={scopeBranch ? [['BRANCH', 'Branch']] : [['ENTERPRISE', 'Enterprise'], ['BRANCH', 'Branch']]} />
        {assignmentScope === 'BRANCH' && <Choice label="Branch" value={targetBranch} onChange={setTargetBranch} disabled={busy || !!scopeBranch} options={branchOptions} />}
        <Button label="Assign selected role" disabled={busy || !employeeId || !roleId || (assignmentScope === 'BRANCH' && !targetBranch)} onPress={() => write(() => service.teamWrite('assignments', 'post', { userId: employeeId, roleId, scope: assignmentScope, ...(assignmentScope === 'BRANCH' && { branchId: targetBranch }) }), 'Role assigned.')} />
        {request.data.assignments.filter((row) => (!employeeId || recordId(row.userId) === employeeId) && (!scopeBranch || recordId(row.branchId) === scopeBranch)).map((row) => <Card key={row._id}>
          <AppText>{request.data.employees.find((employee) => recordId(employee) === recordId(row.userId))?.firstName || recordId(row.userId)} · {row.roleId?.name || 'Role'}</AppText><AppText>{row.scope} · {row.branchId?.name || 'Enterprise'}</AppText>
          <Button label="Revoke assignment" variant="danger" disabled={busy} onPress={() => confirm('Revoke this role assignment?', () => write(() => service.teamWrite(`assignments/${row._id}`, 'delete'), 'Assignment revoked.'))} />
        </Card>)}
      </Card>
      <Card><AppText variant="h3">Branch access</AppText>
        <Choice label="Configure branch" value={targetBranch} onChange={setTargetBranch} disabled={busy || !!scopeBranch} options={branchOptions} />
        <RequestState request={branchRequest} />
        {selected && targetBranch && branchConfig && <>
          <Check label="Role enabled in branch" checked={enabled} disabled={busy} onPress={() => setEnabled(!enabled)} />
          {permissions.map((permission) => {
            const baseline = branchConfig.enterprisePermissionKeys.includes(permission.key);
            const value = overrides[permission.key] ?? baseline;
            return <Check key={permission.key} label={permission.label} checked={value} disabled={busy} onPress={() => setOverrides((old) => ({ ...old, [permission.key]: !value }))} />;
          })}
          <Button label="Save branch access" loading={busy} onPress={() => write(() => service.teamWrite(`branches/${targetBranch}/roles/${roleId}`, 'patch', { enabled, permissionOverrides: overrides }), 'Branch access saved.')} />
          <Button label="Reset to enterprise permissions" variant="secondary" disabled={busy} onPress={() => confirm('Reset branch overrides for this role?', () => write(() => service.teamWrite(`branches/${targetBranch}/roles/${roleId}`, 'delete'), 'Branch overrides reset.'))} />
        </>}
      </Card>
    </>}
    {error ? <AppText color={colors.error} accessibilityRole="alert">{error}</AppText> : null}{notice ? <AppText>{notice}</AppText> : null}
  </Screen>;
}
