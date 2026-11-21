import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText, colors } from "../../components/ui";
import SelectField from "../../components/ui/SelectField";
import { useAuth } from "../../context/AuthContext";
import { useManagerData } from "../context/ManagerDataContext";
import { recordId } from "../services/telematicsApi";
import {
  Screen,
  useRequest,
  RequestState,
} from "../components/FormControls";

function confirm(message, action) {
  if (Platform.OS === "web") {
    if (globalThis.confirm(message)) action();
  } else
    Alert.alert("Confirm change", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: action },
    ]);
}

const emptyEmployee = {
  firstName: "",
  lastName: "",
  mobileNumber: "",
  password: "",
  role: "DRIVER",
};

export default function TeamAccessScreen({ navigation }) {
  const { user } = useAuth();
  const { service, branches, branchId } = useManagerData();
  const scopeBranch = branchId === "all" ? undefined : branchId;
  const owner = user?.role === "OWNER";
  const request = useRequest(async () => {
    const [catalog, employees, assignments] = await Promise.all([
      service.teamRoles(scopeBranch),
      service.teamEmployees(scopeBranch),
      service.teamAssignments(),
    ]);
    return { ...catalog, employees, assignments };
  }, [service, scopeBranch]);

  const [newEmployee, setNewEmployee] = useState(emptyEmployee);
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  const [employeeStatus, setEmployeeStatus] = useState("ACTIVE");
  const [roleId, setRoleId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [assignmentScope, setAssignmentScope] = useState(
    scopeBranch ? "BRANCH" : "ENTERPRISE",
  );
  const [targetBranch, setTargetBranch] = useState(scopeBranch || "");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseRole, setBaseRole] = useState("MANAGER");
  const [keys, setKeys] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const writing = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const roles = request.data?.roles || [];
  const selectedEmployee = request.data?.employees?.find(
    (row) => recordId(row) === employeeId,
  );

  useEffect(() => {
    setEmployeeStatus(selectedEmployee?.status || "ACTIVE");
  }, [selectedEmployee]);

  useEffect(() => {
    setEmployeeId("");
    setCreatingEmployee(false);
    setNewEmployee(emptyEmployee);
    setError("");
    setNotice("");
  }, [scopeBranch]);

  const scopedTeamWrite = (path, method, body) =>
    service.teamWrite(path, method, body, scopeBranch);

  const selected = roles.find((row) => recordId(row) === roleId);

  const branchRequest = useRequest(
    () =>
      targetBranch
        ? service.teamBranchRoles(targetBranch)
        : Promise.resolve([]),
    [service, targetBranch, request.data],
  );

  const branchConfig = branchRequest.data?.find(
    (row) => recordId(row.role) === roleId,
  );

  useEffect(() => {
    setRoleId("");
    setTargetBranch(scopeBranch || "");
    setAssignmentScope(scopeBranch ? "BRANCH" : "ENTERPRISE");
  }, [scopeBranch]);

  useEffect(() => {
    setName(selected?.name || "");
    setDescription(selected?.description || "");
    setBaseRole(selected?.baseRole || "MANAGER");
    setKeys(selected?.permissionKeys || []);
  }, [selected]);

  useEffect(() => {
    setOverrides(branchConfig?.overrides || {});
    setEnabled(branchConfig?.enabled ?? true);
  }, [branchConfig]);

  async function write(action, message) {
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
      setNotice(message);
      request.reload();
    } catch (failure) {
      setError(failure.message);
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function saveRole() {
    if (!selected && name.trim().length < 2) {
      setError("Enter a role name with at least two characters.");
      return;
    }
    const body = {
      permissionKeys: keys,
      ...(!selected?.isImmutable && {
        name: name.trim(),
        description: description.trim(),
        baseRole,
      }),
    };
    const path = selected
      ? `roles/${roleId}`
      : scopeBranch
        ? `branches/${scopeBranch}/roles`
        : "roles";
    write(
      () => scopedTeamWrite(path, selected ? "patch" : "post", body),
      "Role saved.",
    );
  }

  const toggleKey = (key) =>
    setKeys((old) =>
      old.includes(key) ? old.filter((value) => value !== key) : [...old, key],
    );

  const permissions = request.data?.catalog || [];
  const branchOptions = branches
    .filter((row) => row.id !== "all")
    .map((row) => [row.id, row.name]);

  const canEditRole =
    owner &&
    (!selected || selected.canEditPermissions) &&
    (!scopeBranch ||
      !selected ||
      (selected.scopeType === "BRANCH" &&
        recordId(selected.branchId) === scopeBranch));

  return (
    <Screen navigation={navigation} title="Team & access">
      <RequestState request={request} />
      {request.data && (
        <View style={styles.container}>
          {/* Top Outlined Button: Add employee */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add employee"
            disabled={busy}
            onPress={() => setCreatingEmployee((prev) => !prev)}
            style={({ pressed }) => [
              styles.outlinedPillButton,
              pressed && { opacity: 0.8 },
              busy && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="person-add" size={18} color="#4F46E5" />
            <AppText style={styles.outlinedPillButtonText}>Add employee</AppText>
          </Pressable>

          {/* New Employee Form Modal/Card */}
          {creatingEmployee && (
            <View style={styles.whiteCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerAvatar}>
                  <Ionicons name="person-add" size={18} color="#4F46E5" />
                </View>
                <AppText style={styles.cardTitle}>New employee</AppText>
              </View>
              <AppText style={styles.cardSubtitle}>
                {scopeBranch
                  ? "Employee will belong to the selected branch."
                  : "Employee will belong to the enterprise."}{" "}
                New employees start pending activation.
              </AppText>

              {[
                {
                  field: "firstName",
                  label: "FIRST NAME",
                  placeholder: "Enter first name...",
                },
                {
                  field: "lastName",
                  label: "LAST NAME",
                  placeholder: "Enter last name...",
                },
                {
                  field: "mobileNumber",
                  label: "MOBILE NUMBER (E.164)",
                  placeholder: "+91...",
                },
                {
                  field: "password",
                  label: "INITIAL PASSWORD (AT LEAST 8 CHARACTERS)",
                  placeholder: "Enter password...",
                },
              ].map(({ field, label, placeholder }) => (
                <View key={field} style={{ marginTop: 12 }}>
                  <AppText style={styles.fieldSectionLabel}>{label}</AppText>
                  <TextInput
                    style={styles.textInput}
                    placeholder={placeholder}
                    placeholderTextColor="#94A3B8"
                    value={newEmployee[field]}
                    secureTextEntry={field === "password"}
                    autoCapitalize={field === "password" ? "none" : "words"}
                    editable={!busy}
                    onChangeText={(value) =>
                      setNewEmployee((old) => ({ ...old, [field]: value }))
                    }
                  />
                </View>
              ))}

              <AppText
                style={[
                  styles.fieldSectionLabel,
                  { marginTop: 14, marginBottom: 6 },
                ]}
              >
                EMPLOYEE TYPE
              </AppText>
              <SelectField
                selectedValue={newEmployee.role}
                onValueChange={(role) =>
                  setNewEmployee((old) => ({ ...old, role }))
                }
                enabled={!busy}
                accessibilityLabel="Employee type"
                triggerStyle={styles.selectTrigger}
                valueStyle={styles.selectValue}
                chevronColor="#0F172A"
              >
                {["DRIVER", "MANAGER", "FIELD_AGENT"].map((value) => (
                  <SelectField.Item key={value} label={value} value={value} />
                ))}
              </SelectField>

              {(() => {
                const isCreateDisabled =
                  busy ||
                  !newEmployee.firstName.trim() ||
                  !newEmployee.lastName.trim() ||
                  !/^\+?[1-9]\d{1,14}$/.test(newEmployee.mobileNumber.trim()) ||
                  newEmployee.password.length < 8;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Create employee"
                    disabled={isCreateDisabled}
                    onPress={() =>
                      write(async () => {
                        await service.teamCreateEmployee(
                          {
                            ...newEmployee,
                            firstName: newEmployee.firstName.trim(),
                            lastName: newEmployee.lastName.trim(),
                            mobileNumber: newEmployee.mobileNumber.trim(),
                          },
                          scopeBranch,
                        );
                        setNewEmployee(emptyEmployee);
                        setCreatingEmployee(false);
                      }, "Employee created. Select them below to activate and assign access.")
                    }
                    style={({ pressed }) => [
                      styles.primaryPillButton,
                      { marginTop: 16 },
                      pressed && !isCreateDisabled && { opacity: 0.85 },
                      isCreateDisabled && { backgroundColor: "#C7D2FE" },
                    ]}
                  >
                    <AppText style={styles.primaryPillButtonText}>
                      Create employee
                    </AppText>
                  </Pressable>
                );
              })()}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                disabled={busy}
                onPress={() => {
                  setCreatingEmployee(false);
                  setNewEmployee(emptyEmployee);
                }}
                style={({ pressed }) => [
                  styles.outlinedPillButton,
                  { marginTop: 8 },
                  pressed && { opacity: 0.85 },
                  busy && { opacity: 0.6 },
                ]}
              >
                <AppText style={styles.outlinedPillButtonText}>Cancel</AppText>
              </Pressable>
            </View>
          )}

          {/* Role Picker Card */}
          <View style={styles.whiteCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerAvatar}>
                <Ionicons name="shield" size={18} color="#4F46E5" />
              </View>
              <AppText style={styles.fieldSectionLabel}>ROLE</AppText>
            </View>
            <View style={{ marginTop: 12 }}>
              <SelectField
                selectedValue={roleId}
                onValueChange={setRoleId}
                enabled={!busy}
                accessibilityLabel="Role"
                triggerStyle={styles.selectTrigger}
                valueStyle={styles.selectValue}
                chevronColor="#0F172A"
              >
                <SelectField.Item label="Choose..." value="" />
                {roles.map((row) => (
                  <SelectField.Item
                    key={recordId(row)}
                    label={`${row.name} · ${row.baseRole}`}
                    value={recordId(row)}
                  />
                ))}
              </SelectField>
            </View>
          </View>

          {/* Create a role Outlined Button */}
          {owner && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create a role"
              disabled={busy}
              onPress={() => {
                setRoleId("");
                setName("");
                setDescription("");
                setBaseRole("MANAGER");
                setKeys([]);
              }}
              style={({ pressed }) => [
                styles.outlinedPillButton,
                pressed && { opacity: 0.8 },
                busy && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="add-circle-outline" size={20} color="#4F46E5" />
              <AppText style={styles.outlinedPillButtonText}>
                Create a role
              </AppText>
            </Pressable>
          )}

          {/* Create / Edit Role Form Card */}
          {canEditRole && (
            <View style={styles.whiteCard}>
              {/* ROLE NAME */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.fieldAvatar}>
                  <Ionicons name="document-text" size={16} color="#4F46E5" />
                </View>
                <AppText style={styles.fieldSectionLabel}>ROLE NAME</AppText>
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Enter role name..."
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={setName}
                editable={!busy && !selected?.isImmutable}
                maxLength={60}
              />

              {!selected?.isImmutable && (
                <>
                  {/* DESCRIPTION */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                    <View style={styles.fieldAvatar}>
                      <Ionicons name="list" size={16} color="#4F46E5" />
                    </View>
                    <AppText style={styles.fieldSectionLabel}>
                      DESCRIPTION
                    </AppText>
                  </View>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter description..."
                    placeholderTextColor="#94A3B8"
                    value={description}
                    onChangeText={setDescription}
                    editable={!busy}
                    maxLength={300}
                  />

                  {/* ACCESS TIER */}
                  <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
                    <View style={styles.fieldAvatar}>
                      <Ionicons name="key" size={16} color="#4F46E5" />
                    </View>
                    <AppText style={styles.fieldSectionLabel}>
                      ACCESS TIER
                    </AppText>
                  </View>
                  <SelectField
                    selectedValue={baseRole}
                    onValueChange={setBaseRole}
                    enabled={!busy}
                    accessibilityLabel="Access tier"
                    triggerStyle={styles.selectTrigger}
                    valueStyle={styles.selectValue}
                    chevronColor="#0F172A"
                  >
                    {["MANAGER", "DRIVER", "FIELD_AGENT"].map((value) => (
                      <SelectField.Item key={value} label={value} value={value} />
                    ))}
                  </SelectField>
                </>
              )}

              {/* Permissions Section Header */}
              <View
                style={[
                  styles.sectionHeaderRow,
                  { marginTop: 18, marginBottom: 12 },
                ]}
              >
                <View style={styles.fieldAvatar}>
                  <Ionicons
                    name="shield-checkmark"
                    size={16}
                    color="#4F46E5"
                  />
                </View>
                <AppText style={styles.permissionsTitle}>Permissions</AppText>
              </View>

              {/* Permissions List */}
              <View style={styles.permissionsList}>
                {permissions.map((permission) => {
                  const checked = keys.includes(permission.key);
                  return (
                    <Pressable
                      key={permission.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked, disabled: busy }}
                      disabled={busy}
                      onPress={() => toggleKey(permission.key)}
                      style={({ pressed }) => [
                        styles.permissionRow,
                        pressed && { opacity: 0.8 },
                      ]}
                    >
                      <Ionicons
                        name={checked ? "checkbox" : "square-outline"}
                        size={20}
                        color={checked ? "#4F46E5" : "#94A3B8"}
                      />
                      <AppText style={styles.permissionText}>
                        {`${permission.group || permission.label} · ${permission.label}`}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save role"
                disabled={busy}
                onPress={saveRole}
                style={({ pressed }) => [
                  styles.primaryPillButton,
                  { marginTop: 16 },
                  pressed && { opacity: 0.85 },
                  busy && { opacity: 0.6 },
                ]}
              >
                <AppText style={styles.primaryPillButtonText}>Save role</AppText>
              </Pressable>

              {selected?.isEnterpriseOwned && !selected.isImmutable && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete role"
                  disabled={busy}
                  onPress={() =>
                    confirm(
                      `Delete ${selected.name}? Roles still assigned to employees cannot be deleted.`,
                      () =>
                        write(
                          () => scopedTeamWrite(`roles/${roleId}`, "delete"),
                          "Role deleted.",
                        ),
                    )
                  }
                  style={({ pressed }) => [
                    styles.dangerPillButton,
                    pressed && { opacity: 0.85 },
                    busy && { opacity: 0.6 },
                  ]}
                >
                  <AppText style={styles.dangerPillButtonText}>
                    Delete role
                  </AppText>
                </Pressable>
              )}
            </View>
          )}

          {selected && !canEditRole && (
            <AppText muted style={{ marginHorizontal: 8 }}>
              This role's definition is read-only for your account.
            </AppText>
          )}

          {/* Assign a role Card */}
          <View style={styles.whiteCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerAvatar}>
                <Ionicons name="people" size={20} color="#4F46E5" />
              </View>
              <AppText style={styles.cardTitle}>Assign a role</AppText>
            </View>

            {/* EMPLOYEE Field */}
            <AppText
              style={[
                styles.fieldSectionLabel,
                { marginTop: 14, marginBottom: 6 },
              ]}
            >
              EMPLOYEE
            </AppText>
            <SelectField
              selectedValue={employeeId}
              onValueChange={setEmployeeId}
              enabled={!busy}
              accessibilityLabel="Employee"
              triggerStyle={styles.selectTrigger}
              valueStyle={styles.selectValue}
              chevronColor="#0F172A"
            >
              <SelectField.Item label="Choose..." value="" />
              {request.data.employees?.map((row) => (
                <SelectField.Item
                  key={recordId(row)}
                  label={`${[row.firstName, row.lastName].filter(Boolean).join(" ")} · ${row.role}`}
                  value={recordId(row)}
                />
              ))}
            </SelectField>

            {selectedEmployee && (
              <View style={styles.employeeStatusBox}>
                <AppText style={styles.employeeStatusText}>
                  Current account status:{" "}
                  <AppText weight="bold">{selectedEmployee.status}</AppText>
                </AppText>
                <SelectField
                  selectedValue={employeeStatus}
                  onValueChange={setEmployeeStatus}
                  enabled={!busy}
                  accessibilityLabel="Account status"
                  triggerStyle={styles.selectTrigger}
                  valueStyle={styles.selectValue}
                  chevronColor="#0F172A"
                >
                  {["PENDING", "ACTIVE", "SUSPENDED"].map((value) => (
                    <SelectField.Item key={value} label={value} value={value} />
                  ))}
                </SelectField>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Update account status"
                  disabled={
                    busy ||
                    employeeStatus === selectedEmployee.status ||
                    employeeId === recordId(user)
                  }
                  onPress={() =>
                    confirm(
                      "Change this employee account status? This affects their account access.",
                      () =>
                        write(
                          () =>
                            service.teamUpdateEmployee(
                              employeeId,
                              { status: employeeStatus },
                              scopeBranch,
                            ),
                          "Employee status updated.",
                        ),
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryPillButton,
                    { marginTop: 10 },
                    pressed && { opacity: 0.85 },
                    (busy ||
                      employeeStatus === selectedEmployee.status ||
                      employeeId === recordId(user)) && {
                      backgroundColor: "#C7D2FE",
                    },
                  ]}
                >
                  <AppText style={styles.primaryPillButtonText}>
                    Update account status
                  </AppText>
                </Pressable>
              </View>
            )}

            {/* ASSIGNMENT SCOPE Field */}
            <AppText
              style={[
                styles.fieldSectionLabel,
                { marginTop: 14, marginBottom: 6 },
              ]}
            >
              ASSIGNMENT SCOPE
            </AppText>
            <SelectField
              selectedValue={assignmentScope}
              onValueChange={setAssignmentScope}
              enabled={!busy && !scopeBranch}
              accessibilityLabel="Assignment scope"
              triggerStyle={styles.selectTrigger}
              valueStyle={styles.selectValue}
              chevronColor="#0F172A"
            >
              {scopeBranch ? (
                <SelectField.Item label="Branch" value="BRANCH" />
              ) : (
                <>
                  <SelectField.Item label="Enterprise" value="ENTERPRISE" />
                  <SelectField.Item label="Branch" value="BRANCH" />
                </>
              )}
            </SelectField>

            {assignmentScope === "BRANCH" && (
              <>
                <AppText
                  style={[
                    styles.fieldSectionLabel,
                    { marginTop: 14, marginBottom: 6 },
                  ]}
                >
                  BRANCH
                </AppText>
                <SelectField
                  selectedValue={targetBranch}
                  onValueChange={setTargetBranch}
                  enabled={!busy && !scopeBranch}
                  accessibilityLabel="Branch"
                  triggerStyle={styles.selectTrigger}
                  valueStyle={styles.selectValue}
                  chevronColor="#0F172A"
                >
                  <SelectField.Item label="Choose..." value="" />
                  {branchOptions.map(([id, branchName]) => (
                    <SelectField.Item key={id} label={branchName} value={id} />
                  ))}
                </SelectField>
              </>
            )}

            {/* Assign selected role Button */}
            {(() => {
              const isAssignDisabled =
                busy ||
                !employeeId ||
                !roleId ||
                (assignmentScope === "BRANCH" && !targetBranch);
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Assign selected role"
                  disabled={isAssignDisabled}
                  onPress={() =>
                    write(
                      () =>
                        scopedTeamWrite("assignments", "post", {
                          userId: employeeId,
                          roleId,
                          scope: assignmentScope,
                          ...(assignmentScope === "BRANCH" && {
                            branchId: targetBranch,
                          }),
                        }),
                      "Role assigned.",
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryPillButton,
                    { marginTop: 18 },
                    pressed && !isAssignDisabled && { opacity: 0.85 },
                    isAssignDisabled && { backgroundColor: "#C7D2FE" },
                  ]}
                >
                  <AppText style={styles.primaryPillButtonText}>
                    Assign selected role
                  </AppText>
                </Pressable>
              );
            })()}
          </View>

          {/* Role Assignments Cards List */}
          {request.data.assignments
            ?.filter(
              (row) =>
                (!employeeId || recordId(row.userId) === employeeId) &&
                (!scopeBranch || recordId(row.branchId) === scopeBranch),
            )
            .map((row) => {
              const emp = request.data.employees?.find(
                (employee) => recordId(employee) === recordId(row.userId),
              );
              const empName =
                [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") ||
                recordId(row.userId);
              const roleName =
                row.roleId?.name ||
                roles.find((r) => recordId(r) === recordId(row.roleId))?.name ||
                "Role";
              const scopeLabel = row.scope || "ENTERPRISE";
              const branchLabel =
                row.branchId?.name ||
                (row.scope === "ENTERPRISE" ? "Enterprise" : "Branch");

              return (
                <View key={row._id} style={styles.assignmentCard}>
                  <View style={styles.assignmentHeaderRow}>
                    <View style={styles.assignmentAvatar}>
                      <Ionicons name="person" size={20} color="#6366F1" />
                    </View>
                    <View style={styles.assignmentInfo}>
                      <AppText style={styles.assignmentTitle}>
                        {empName} - {roleName}
                      </AppText>
                      <AppText style={styles.assignmentSubtext}>
                        {scopeLabel} · {branchLabel}
                      </AppText>
                    </View>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Revoke assignment"
                    disabled={busy}
                    onPress={() =>
                      confirm("Revoke this role assignment?", () =>
                        write(
                          () =>
                            scopedTeamWrite(
                              `assignments/${row._id}`,
                              "delete",
                            ),
                          "Assignment revoked.",
                        ),
                      )
                    }
                    style={({ pressed }) => [
                      styles.revokeButton,
                      pressed && { opacity: 0.85 },
                      busy && { opacity: 0.6 },
                    ]}
                  >
                    <Ionicons name="reload" size={16} color="#FFFFFF" />
                    <AppText style={styles.revokeButtonText}>
                      Revoke assignment
                    </AppText>
                  </Pressable>
                </View>
              );
            })}

          {/* Branch access Card */}
          <View style={styles.whiteCard}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.headerAvatar}>
                <Ionicons name="git-network" size={20} color="#4F46E5" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <AppText style={styles.cardTitle}>Branch access</AppText>
                <AppText style={styles.fieldSectionLabel}>
                  CONFIGURE BRANCH
                </AppText>
              </View>
            </View>

            <View style={{ marginTop: 12 }}>
              <SelectField
                selectedValue={targetBranch}
                onValueChange={setTargetBranch}
                enabled={!busy && !scopeBranch}
                accessibilityLabel="Configure branch"
                triggerStyle={styles.selectTrigger}
                valueStyle={styles.selectValue}
                chevronColor="#0F172A"
              >
                <SelectField.Item label="Choose..." value="" />
                {branchOptions.map(([id, branchName]) => (
                  <SelectField.Item key={id} label={branchName} value={id} />
                ))}
              </SelectField>
            </View>

            <RequestState request={branchRequest} />

            {selected && targetBranch && branchConfig && (
              <View style={{ marginTop: 16 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: enabled, disabled: busy }}
                  disabled={busy}
                  onPress={() => setEnabled(!enabled)}
                  style={[styles.permissionRow, { marginBottom: 10 }]}
                >
                  <Ionicons
                    name={enabled ? "checkbox" : "square-outline"}
                    size={20}
                    color={enabled ? "#4F46E5" : "#94A3B8"}
                  />
                  <AppText style={styles.permissionText}>
                    Role enabled in branch
                  </AppText>
                </Pressable>

                {permissions.map((permission) => {
                  const baseline =
                    branchConfig.enterprisePermissionKeys.includes(
                      permission.key,
                    );
                  const value = overrides[permission.key] ?? baseline;
                  return (
                    <Pressable
                      key={permission.key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: value, disabled: busy }}
                      disabled={busy}
                      onPress={() =>
                        setOverrides((old) => ({
                          ...old,
                          [permission.key]: !value,
                        }))
                      }
                      style={styles.permissionRow}
                    >
                      <Ionicons
                        name={value ? "checkbox" : "square-outline"}
                        size={20}
                        color={value ? "#4F46E5" : "#94A3B8"}
                      />
                      <AppText style={styles.permissionText}>
                        {permission.label}
                      </AppText>
                    </Pressable>
                  );
                })}

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save branch access"
                  disabled={busy}
                  onPress={() =>
                    write(
                      () =>
                        scopedTeamWrite(
                          `branches/${targetBranch}/roles/${roleId}`,
                          "patch",
                          { enabled, permissionOverrides: overrides },
                        ),
                      "Branch access saved.",
                    )
                  }
                  style={({ pressed }) => [
                    styles.primaryPillButton,
                    { marginTop: 14 },
                    pressed && { opacity: 0.85 },
                    busy && { opacity: 0.6 },
                  ]}
                >
                  <AppText style={styles.primaryPillButtonText}>
                    Save branch access
                  </AppText>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Reset to enterprise permissions"
                  disabled={busy}
                  onPress={() =>
                    confirm("Reset branch overrides for this role?", () =>
                      write(
                        () =>
                          scopedTeamWrite(
                            `branches/${targetBranch}/roles/${roleId}`,
                            "delete",
                          ),
                        "Branch overrides reset.",
                      ),
                    )
                  }
                  style={({ pressed }) => [
                    styles.outlinedPillButton,
                    { marginTop: 8 },
                    pressed && { opacity: 0.85 },
                    busy && { opacity: 0.6 },
                  ]}
                >
                  <AppText style={styles.outlinedPillButtonText}>
                    Reset to enterprise permissions
                  </AppText>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      )}

      {error ? (
        <AppText color={colors.error} accessibilityRole="alert">
          {error}
        </AppText>
      ) : null}
      {notice ? <AppText>{notice}</AppText> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  outlinedPillButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  outlinedPillButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4F46E5",
  },
  whiteCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    lineHeight: 18,
  },
  fieldSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.5,
    marginLeft: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldAvatar: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
    minHeight: 48,
  },
  selectTrigger: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#0F172A",
  },
  permissionsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 10,
  },
  permissionsList: {
    marginTop: 4,
  },
  permissionRow: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  permissionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
    flex: 1,
  },
  primaryPillButton: {
    backgroundColor: "#4F46E5",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryPillButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  dangerPillButton: {
    backgroundColor: "#EF4444",
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  dangerPillButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  assignmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F1F5F9",
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  assignmentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  assignmentInfo: {
    marginLeft: 14,
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  assignmentSubtext: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  revokeButton: {
    backgroundColor: "#EF4444",
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  revokeButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  employeeStatusBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
  },
  employeeStatusText: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 6,
  },
});
